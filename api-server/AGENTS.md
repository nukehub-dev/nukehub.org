# NukeHub API Server

## Purpose

Small Go HTTP service behind `api.nukehub.org`. Receives the static site's
contact-form submissions, YAML-driven survey submissions, and newsletter
subscriptions, persists survey responses and subscribers to SQLite, forwards
submissions via SMTP, and sends newsletter campaigns to subscribers
(background worker, per-recipient tracking, one-click unsubscribe). Reverse
proxied by `api-server/api.nukehub.org.conf`.

## Ownership

All files under `api-server/**`: `main.go`, `newsletter_campaign.go`,
`blog_watch.go`, `bounce_watch.go`, `go.mod`, `Dockerfile`, `compose.yml`,
`README.md`, and `api.nukehub.org.conf`.

## Local Contracts

- Go 1.22+. Flat `package main` files — no internal packages.
- Runtime footprint target: ~5-10MB RAM.
- Deployed either directly (`go build -o api-server . && ./api-server`) or
  via `docker ./compose.yml` (the canonical production path). Listens on
  `127.0.0.1:3000` and is proxied by nginx.
- Build the whole package (`go build .`), never `go build main.go` — the
  newsletter campaign code lives in `newsletter_campaign.go`.

## Work Guidance

### Files

- `main.go` — routing, schema, and the contact/survey/newsletter-subscription
  endpoints. Endpoints: `GET /health`, `POST /contact`, `POST /survey`,
  `POST /newsletter`, `POST /newsletter/unsubscribe`, and admin endpoints
  under `/admin/surveys` and `/admin/newsletter`. Includes SQLite persistence,
  rate limiting, Turnstile verification, JWT validation against the Keycloak
  JWKS endpoint, input sanitization, HTML escaping, and email
  header-injection prevention.
- `newsletter_campaign.go` — newsletter campaigns: HMAC-signed one-click
  unsubscribe tokens (`POST /newsletter/unsubscribe/confirm`, RFC 8058),
  campaign CRUD/send/test/preview admin endpoints, the background sender
  worker, goldmark markdown → HTML rendering, and the bulk mailer with
  `List-Unsubscribe` headers. Campaigns flow `draft → sending → sent`;
  deliveries are snapshotted from the subscriber list at send time and only
  ever transition `pending → sent|failed`, so restarting the server mid-send
  never double-sends.
- `blog_watch.go` — opt-in (`BLOG_AUTO_SEND=true`) RSS watcher that polls
  `BLOG_RSS_URL` and auto-sends a campaign from `BLOG_FROM_EMAIL` for every
  new post. The newest-seen post GUID is kept in the `settings` table. First
  run records the cursor without sending (no archive spam); if the cursor
  ages out of the feed it resets silently; failed sends are retried next
  tick. With zero subscribers the cursor still advances but no campaign is
  created. Auto campaigns carry `source = 'blog-rss'` (an `ALTER TABLE`
  migration adds the column to older databases).
- `bounce_watch.go` — opt-in (`BOUNCE_CHECK_ENABLED=true`) IMAP poller for
  the bounce mailbox. Campaign emails use `BOUNCE_EMAIL` as envelope sender
  so async bounces land there. Parses RFC 3464 delivery-status blocks:
  permanent 5xx failures delete the subscriber, transient 4xx are ignored.
  Only DSN messages are marked `\Seen`; nothing is ever deleted from the
  mailbox. Requires `github.com/emersion/go-imap/v2`.

### Abuse protection

- **Per-IP rate limiting** — `POST /contact`, `POST /survey`, and
  `POST /newsletter` each have their own 5-request-per-hour bucket. The store
  is mutex-protected and stale entries are cleaned up every 10 minutes.
- **Trusted proxy IP extraction** — `X-Real-IP` / `X-Forwarded-For` are only
  trusted when the direct connection comes from a loopback or private address
  (i.e. the nginx reverse proxy). Otherwise `RemoteAddr` is used, so clients
  cannot spoof their IP to bypass the rate limiter.
- **Global concurrency limit** — at most 100 in-flight requests are accepted
  at once. Excess requests receive `503 Service Unavailable` with a
  `Retry-After: 10` header.
- **Request body cap** — JSON bodies for `/contact` and `/survey` are limited
  to 2 MiB via `http.MaxBytesReader`.
- `Dockerfile` — builds the static Go binary inside a build stage and copies
  it into a minimal runtime image.
- `compose.yml` — local + production container composition. Reads secrets from
  `api-server/.env` (not committed).
- `README.md` — operator quick-start, env-var list, and security feature list.
- `api.nukehub.org.conf` — top-level nginx vhost that redirects HTTP → HTTPS,
  proxies `/health`, `/contact`, `/survey`, `/newsletter`, `/newsletter/unsubscribe`,
  and `/admin` to `127.0.0.1:3000`, and applies security headers. This vhost is
  unrelated to the static site's `public/_headers` (served by Cloudflare Pages).

### Environment variables

Secrets live in `api-server/.env` (gitignored). Required:

- `SMTP_*` — SMTP host, port, user, password, from-address.
- `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile server secret paired with
  `PUBLIC_TURNSTILE_SITE_KEY` on the static site.
- `ALLOWED_ORIGINS` — CORS allow-list (must contain `https://nukehub.org`).
- `CONTACT_TO_EMAIL` — default recipient for contact form submissions
  (`contact@nukehub.org`).
- `SURVEY_TO_EMAIL` — recipient for survey submissions. Defaults to
  `CONTACT_TO_EMAIL` if unset.
- `DATABASE_PATH` — SQLite database file path. Defaults to `./data/nukehub.db`.
- `AUTH_URL`, `AUTH_REALM`, `AUTH_CLIENT_ID` — NukeAuth config used to verify
  admin bearer tokens. Must match the static site's `PUBLIC_AUTH_*` values.
- **Survey admin access** is granted by the `survey-admin` client role;
  read-only survey access by `survey-viewer` (both under `AUTH_CLIENT_ID`).
- **Newsletter access** is granted by the `newsletter-admin` and
  `newsletter-staff` client roles under the same `AUTH_CLIENT_ID`. Staff can
  view/export/delete subscribers and create/edit/test campaigns; only
  `newsletter-admin` can send or delete campaigns.
- `NEWSLETTER_TOKEN_SECRET` — HMAC key signing unsubscribe tokens. Required
  in production; unset means an ephemeral key per boot, which invalidates
  unsubscribe links already sent out.
- `NEWSLETTER_FROM_EMAIL`, `BLOG_FROM_EMAIL`, `NEWSLETTER_FROM_NAME` —
  allowed campaign sender addresses (defaults `news@nukehub.org`,
  `blog@nukehub.org`, `NukeHub`). `SMTP_USER` must be allowed to send as
  them (mailcow alias / sender ACL on the SMTP_USER mailbox).
- `NEWSLETTER_SEND_DELAY_MS` — delay between campaign sends (default 1000).
- `SITE_URL`, `API_PUBLIC_URL` — public origins used in email links
  (unsubscribe page and RFC 8058 one-click URL).
- `BLOG_AUTO_SEND` — `true` enables the RSS watcher that auto-sends a
  campaign from `BLOG_FROM_EMAIL` for every new blog post. Default `false`.
- `BLOG_RSS_URL`, `BLOG_URL` — feed to poll (default
  `https://blog.nukehub.org/rss.xml`) and the blog origin linked in the
  auto-generated campaign body.
- `BLOG_RSS_POLL_INTERVAL_MS` — poll interval, minimum 60000 (default
  30 minutes).
- `BOUNCE_EMAIL` — envelope sender for campaign emails; async bounces land
  here. Must be a real mailcow mailbox or an alias delivering to the polled
  mailbox.
- `BOUNCE_CHECK_ENABLED` — `true` enables the bounce watcher. Default
  `false`.
- `BOUNCE_IMAP_HOST`/`PORT`/`USER`/`PASS`/`FOLDER` — IMAP connection for the
  bounce mailbox; each defaults to the `SMTP_*` equivalent (host, user,
  pass), `993`, and `INBOX`.
- `BOUNCE_CHECK_INTERVAL_MS` — poll interval, minimum 300000 (default
  1 hour).

Do **not** copy these into the static-site `.env`. (See root NAD
"Environment variables" for that file's contents.)

### Endpoints

- `GET /health` — 200 `"ok"`.
- `POST /contact` — accepts the contact-form payload, verifies Turnstile,
  sanitizes/escapes inputs, and sends the email via SMTP.
- `POST /survey` — accepts a YAML-driven survey submission, verifies
  Turnstile, sanitizes responses, persists them to SQLite (with a 10,000-char
  cap per response value), and emails them to `SURVEY_TO_EMAIL` (falling back
  to `CONTACT_TO_EMAIL`). A valid `email` response field becomes the email's
  `Reply-To` header.
- `POST /newsletter` — subscribe an email address. Emails are lowercased before
  validation and storage; the optional `source` is normalized to lowercase
  alphanumeric/hyphen/underscore (default `newsletter`). Returns `409 Conflict`
  if the email already exists.
- `POST /newsletter/unsubscribe` — remove an email address from the subscriber
  list (Turnstile-verified). Idempotent: succeeds even if the email is not
  subscribed.
- `POST /newsletter/unsubscribe/confirm` — token-based unsubscribe used by
  email links. Accepts the site confirm page's JSON `{"token"}` and RFC 8058
  one-click POSTs from mail clients (token in query). Never acts on GET, so
  link-scanner prefetches cannot unsubscribe anyone.
- `GET /admin/health/db` — DB connectivity check (`survey-admin` or
  `survey-viewer`).
- `GET /admin/surveys` — list surveys with submission counts.
- `GET /admin/surveys/{slug}` — paginated submissions.
- `GET /admin/surveys/{slug}/stats` — aggregate statistics.
- `GET /admin/surveys/{slug}/export.csv` — CSV export.
- `DELETE /admin/surveys/{slug}` — delete every response for a survey
  (`survey-admin` only).
- `DELETE /admin/surveys/{slug}/submissions` — bulk delete by IDs
  (`survey-admin` only). Body: `{"ids": [1, 2, 3]}`.
- `DELETE /admin/surveys/{slug}/submissions/{id}` — delete a single response
  (`survey-admin` only).
- `GET /admin/newsletter/subscribers` — paginated subscriber list
  (`newsletter-admin` or `newsletter-staff`).
- `GET /admin/newsletter/subscribers/export.csv` — subscriber CSV export
  (`newsletter-admin` or `newsletter-staff`).
- `DELETE /admin/newsletter/subscribers/{id}` — delete a single subscriber
  (`newsletter-admin` or `newsletter-staff`).
- `GET /admin/newsletter/config` — configured sender name and allowed From
  addresses (`newsletter-admin` or `newsletter-staff`).
- `GET /admin/newsletter/campaigns` — list campaigns with delivery stats
  (`newsletter-admin` or `newsletter-staff`).
- `POST /admin/newsletter/campaigns` — create a draft campaign
  (`newsletter-admin` or `newsletter-staff`). Body:
  `{"title","subject","fromEmail","bodyMarkdown"}`.
- `GET /admin/newsletter/campaigns/{id}` — campaign detail with stats.
- `PUT /admin/newsletter/campaigns/{id}` — edit a draft campaign.
- `DELETE /admin/newsletter/campaigns/{id}` — delete a non-sending campaign
  (`newsletter-admin` only).
- `POST /admin/newsletter/campaigns/{id}/send` — snapshot subscribers and
  start sending (`newsletter-admin` only).
- `POST /admin/newsletter/campaigns/{id}/test` — send a test email. Body:
  `{"email"}`.
- `POST /admin/newsletter/campaigns/preview` — render markdown to the email
  body HTML. Body: `{"bodyMarkdown"}`.

### Common pitfalls

- **This service does not run on Cloudflare Pages.** It runs on a separate
  VPS/VM behind `api.nukehub.org`. The static site only calls it cross-origin
  from `PUBLIC_API_URL`; CORS is the single trust boundary — keep
  `ALLOWED_ORIGINS` tight.
- **No tests in this folder.** Bug fixes should add direct validation in
  `main.go`; if/when a unit harness lands, document it in this NAD.
- **Turnstile site key vs secret.** The site key is `PUBLIC_*` and bundled
  into the static bundle; the secret is server-only here. They must match the
  same Turnstile widget.
- **Admin auth uses NukeAuth + client roles.** `AUTH_URL`, `AUTH_REALM`, and
  `AUTH_CLIENT_ID` must match the static site's Keycloak config. Survey
  (`survey-admin`, `survey-viewer`) and newsletter (`newsletter-admin`,
  `newsletter-staff`) roles are separate; assign both sets in Keycloak.
- **Always set `NEWSLETTER_TOKEN_SECRET` in production.** Without it,
  unsubscribe links in sent campaigns die on the next restart.
- **Campaign From addresses must exist in mailcow.** Add `news@` and `blog@`
  as aliases of the `SMTP_USER` mailbox (or grant send-as); otherwise the
  SMTP session rejects the message and every delivery is marked failed.
- **Bounce processing is opt-in and needs a bounce mailbox.** Create
  `bounces@nukehub.org` in mailcow (mailbox or alias into the polled
  account), set `BOUNCE_EMAIL` to it so campaigns use it as envelope
  sender, then enable `BOUNCE_CHECK_ENABLED`. Without it, async bounces
  just pile up in the `SMTP_USER` inbox and dead addresses stay on the
  list — clean them manually via the admin dashboard.
- **Enable `BLOG_AUTO_SEND` only after the From addresses work.** The first
  poll with the flag on just records the newest post (no backlog is sent),
  so the safe rollout is: deploy, verify a manual campaign delivers, then
  flip the flag.
- **Back up the SQLite database.** `DATABASE_PATH` defaults to
  `./data/nukehub.db` and is mounted as a Docker volume. The WAL files
  (`*.db-wal`, `*.db-shm`) must be backed up together with the main file.
- **Local `npm run dev` / `npm run preview` requests are cross-origin.**
  Add `http://localhost:4321` to `ALLOWED_ORIGINS` in `api-server/.env` or the
  browser will block API calls.

## Verification

```bash
cd api-server
# The Go binary does not auto-load .env; source it first or use docker compose.
set -a && source .env && set +a
go build -o api-server .
./api-server &            # listens on 127.0.0.1:3000
curl http://127.0.0.1:3000/health

# Submit a test survey (Turnstile will fail without a real token, but routing is exercised)
curl -s -X POST http://127.0.0.1:3000/survey \
  -H "Content-Type: application/json" \
  -d '{"surveySlug":"test","surveyTitle":"Test Survey","responses":{"email":"dev@nukehub.org","feedback":"hello"},"turnstileToken":"fake"}'
```

## Child NAD Index

- None.
