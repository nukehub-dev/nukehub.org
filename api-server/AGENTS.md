# NukeHub API Server

## Purpose

Small Go HTTP service behind `api.nukehub.org`. Receives the static site's
contact-form submissions and YAML-driven survey submissions, and forwards them
via SMTP. Reverse proxied by `nginx/api.nukehub.org.conf`.

## Ownership

All files under `api-server/**`: `main.go`, `go.mod`, `Dockerfile`,
`compose.yml`, `README.md`. Plus the proxy vhost under `nginx/` only insofar
as the `/contact` route is concerned.

## Local Contracts

- Go 1.22+. Single-file `main.go` + `go.mod` — no internal packages.
- Runtime footprint target: ~5-10MB RAM.
- Deployed either directly (`go build -o api-server main.go && ./api-server`)
  or via `docker ./compose.yml` (the canonical production path). Listens on
  `127.0.0.1:3000` and is proxied by nginx.

## Work Guidance

### Files

- `main.go` — entire service. Endpoints: `GET /contact/health` (health
  check), `POST /contact` (submit form), and `POST /survey` (submit YAML-driven
  survey responses). In-process rate limiter, Turnstile CAPTCHA verification,
  input sanitization, HTML escaping, and email header-injection prevention all
  live here.
- `Dockerfile` — builds the static Go binary inside a build stage and copies
  it into a minimal runtime image. The `docker ./compose.yml` mirrors this.
- `compose.yml` — local + production container composition. Reads secrets
  from `api-server/.env` (not committed).
- `README.md` — operator quick-start, env-var list, and security feature list.
- `nginx/api.nukehub.org.conf` — top-level nginx vhost that:
  - Redirects HTTP → HTTPS.
  - Serves `/contact` and `/survey` (proxy_pass to `127.0.0.1:3000`) and
    applies the security headers (X-Frame-Options, X-Content-Type-Options,
    X-XSS-Protection, Referrer-Policy).
  - This vhost is unrelated to the static site's `_headers` (which lives at
    `public/_headers` and is served by Cloudflare Pages).

### Environment variables

Secrets live in `api-server/.env` (gitignored). Required:

- `SMTP_*` — SMTP host, port, user, password, from-address.
- `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile server secret paired with
  `PUBLIC_TURNSTILE_SITE_KEY` on the static site.
- `ALLOWED_ORIGINS` — CORS allow-list enforced by the Go server
  (must contain `https://nukehub.org`).
- `CONTACT_TO_EMAIL` — default recipient for contact form submissions
  (`contact@nukehub.org`).
- `SURVEY_TO_EMAIL` — recipient for survey submissions. Defaults to
  `CONTACT_TO_EMAIL` if unset.
  Set to `survey@nukehub.org` to route surveys separately.

Do **not** copy these into the static-site `.env` (root NAD "Environment
variables" lists that file's contents).

### Endpoints

- `GET /contact/health` — 200 `"ok"` (used by the nginx readiness probe).
- `POST /contact` — accepts the contact-form payload (Turnstile token,
  name/email/message), verifies the token with Cloudflare, sanitizes/escapes
  inputs, and sends the email via SMTP. Returns JSON status.
- `POST /survey` — accepts a YAML-driven survey submission (survey slug,
  title, responses map, Turnstile token), verifies the token, sanitizes
  responses, enforces a 10,000-character cap per response value, and emails
  them to `SURVEY_TO_EMAIL` (falling back to `CONTACT_TO_EMAIL`). If the
  responses contain a valid `email` field, it is used as the email's
  `Reply-To` header. Returns JSON status.

### Common pitfalls

- **This service does not run on Cloudflare Pages.** It runs on a separate
  VPS/VM behind `api.nukehub.org`. The static site only calls it cross-origin
  from `PUBLIC_CONTACT_API_URL`; CORS is the single trust boundary — keep
  `ALLOWED_ORIGINS` tight.
- **No tests in this folder.** Bug fixes should add direct validation in
  `main.go`; if/when a unit harness lands, document it in this NAD.
- **Turnstile site key vs secret.** The site key is `PUBLIC_*` and bundled
  into the static bundle; the secret is server-only here. They must match
  the same Turnstile widget or verification will fail.

## Verification

```bash
cd api-server
go build -o api-server main.go
./api-server &            # listens on 127.0.0.1:3000
curl http://127.0.0.1:3000/contact/health

# Submit a test survey (will fail Turnstile without a real token, but exercises routing)
curl -s -X POST http://127.0.0.1:3000/survey \
  -H "Content-Type: application/json" \
  -d '{"surveySlug":"test","surveyTitle":"Test Survey","responses":{"email":"dev@nukehub.org","feedback":"hello"},"turnstileToken":"fake"}'
```

## Child NAD Index

- None (single Go file; no sub-packages).
