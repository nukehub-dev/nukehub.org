# NukeHub API Server

## Purpose

Small Go HTTP service behind `api.nukehub.org`. Receives the static site's
contact-form submissions and YAML-driven survey submissions, persists survey
responses to SQLite, and forwards submissions via SMTP. Reverse proxied by
`api-server/api.nukehub.org.conf`.

## Ownership

All files under `api-server/**`: `main.go`, `go.mod`, `Dockerfile`,
`compose.yml`, `README.md`, and `api.nukehub.org.conf`.

## Local Contracts

- Go 1.22+. Single-file `main.go` + `go.mod` — no internal packages.
- Runtime footprint target: ~5-10MB RAM.
- Deployed either directly (`go build -o api-server main.go && ./api-server`)
  or via `docker ./compose.yml` (the canonical production path). Listens on
  `127.0.0.1:3000` and is proxied by nginx.

## Work Guidance

### Files

- `main.go` — entire service. Endpoints: `GET /health`, `POST /contact`,
  `POST /survey`, and admin endpoints under `/admin/surveys`. Includes SQLite
  persistence, rate limiting, Turnstile verification, JWT validation against
  the Keycloak JWKS endpoint, input sanitization, HTML escaping, and email
  header-injection prevention.

### Abuse protection

- **Per-IP rate limiting** — `POST /contact` and `POST /survey` allow 5
  submissions per IP per hour. The store is mutex-protected and stale entries
  are cleaned up every 10 minutes.
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
  proxies `/health`, `/contact`, and `/survey` to `127.0.0.1:3000`, and applies
  security headers. This vhost is unrelated to the static site's
  `public/_headers` (served by Cloudflare Pages).

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
- **Admin access** is granted by the `survey-admin` client role under
  `AUTH_CLIENT_ID`.
- **Read-only access** is granted by the `survey-viewer` client role under the
  same `AUTH_CLIENT_ID`.

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
  `AUTH_CLIENT_ID` must match the static site's Keycloak config.
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
go build -o api-server main.go
./api-server &            # listens on 127.0.0.1:3000
curl http://127.0.0.1:3000/health

# Submit a test survey (Turnstile will fail without a real token, but routing is exercised)
curl -s -X POST http://127.0.0.1:3000/survey \
  -H "Content-Type: application/json" \
  -d '{"surveySlug":"test","surveyTitle":"Test Survey","responses":{"email":"dev@nukehub.org","feedback":"hello"},"turnstileToken":"fake"}'
```

## Child NAD Index

- None.
