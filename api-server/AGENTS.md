# NukeHub API Server

## Purpose

Small Go HTTP service behind `api.nukehub.org`. Receives the static site's
contact-form submissions and YAML-driven survey submissions, persists survey
responses to SQLite, and forwards submissions via SMTP. Reverse proxied by
`api-server/api.nukehub.org.conf`.

## Ownership

All files under `api-server/**`: `main.go`, `go.mod`, `Dockerfile`,
`compose.yml`, `README.md`, and `api.nukehub.org.conf` (nginx vhost).

## Local Contracts

- Go 1.22+. Single-file `main.go` + `go.mod` — no internal packages.
- Runtime footprint target: ~5-10MB RAM.
- Deployed either directly (`go build -o api-server main.go && ./api-server`)
  or via `docker ./compose.yml` (the canonical production path). Listens on
  `127.0.0.1:3000` and is proxied by nginx.

## Work Guidance

### Files

- `main.go` — entire service. Endpoints: `GET /health` (health check),
  `POST /contact` (submit form), `POST /survey` (submit YAML-driven survey
  responses), and admin endpoints under `/admin/surveys`. Also includes SQLite
  persistence, in-process rate limiter, Turnstile CAPTCHA verification, JWT
  validation against the Keycloak JWKS endpoint, input sanitization, HTML
  escaping, and email header-injection prevention.
- `Dockerfile` — builds the static Go binary inside a build stage and copies
  it into a minimal runtime image. The `docker ./compose.yml` mirrors this.
- `compose.yml` — local + production container composition. Reads secrets
  from `api-server/.env` (not committed).
- `README.md` — operator quick-start, env-var list, and security feature list.
- `api.nukehub.org.conf` — top-level nginx vhost that:
  - Redirects HTTP → HTTPS.
  - Serves `/health`, `/contact` and `/survey` (proxy_pass to
    `127.0.0.1:3000`) and applies the security headers (X-Frame-Options,
    X-Content-Type-Options, X-XSS-Protection, Referrer-Policy).
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
- `DATABASE_PATH` — SQLite database file path. Defaults to `./data/nukehub.db`.
- `AUTH_URL`, `AUTH_REALM`, `AUTH_CLIENT_ID` — NukeAuth (Keycloak-backed)
  config used to verify admin bearer tokens. Must match the static site's
  `PUBLIC_AUTH_*` values.
- **Admin access** is granted by the `survey-admin` client role under
  `AUTH_CLIENT_ID` (e.g. `nukehub-web`).
- **Read-only access** is granted by the `survey-viewer` client role under the
  same `AUTH_CLIENT_ID`. Viewers can list surveys, view submissions, see stats,
  and export CSV, but cannot delete data.

Do **not** copy these into the static-site `.env` (root NAD "Environment
variables" lists that file's contents).

### Endpoints

- `GET /health` — 200 `"ok"` (used by the nginx readiness probe).
- `POST /contact` — accepts the contact-form payload (Turnstile token,
  name/email/message), verifies the token with Cloudflare, sanitizes/escapes
  inputs, and sends the email via SMTP. Returns JSON status.
- `POST /survey` — accepts a YAML-driven survey submission (survey slug,
  title, responses map, Turnstile token), verifies the token, sanitizes
  responses, persists them to SQLite, enforces a 10,000-character cap per
  response value, and emails them to `SURVEY_TO_EMAIL` (falling back to
  `CONTACT_TO_EMAIL`). If the responses contain a valid `email` field, it is
  used as the email's `Reply-To` header. Returns JSON status.
- `GET /admin/health/db` — DB connectivity check (requires `survey-admin` or
  `survey-viewer`).
- `GET /admin/surveys` — list surveys with submission counts (requires
  `survey-admin` or `survey-viewer`).
- `GET /admin/surveys/{slug}` — paginated submissions for a survey (requires
  `survey-admin` or `survey-viewer`). Pagination is applied in SQL, so it stays
  fast even with tens of thousands of responses.
- `GET /admin/surveys/{slug}/stats` — aggregate statistics (requires
  `survey-admin` or `survey-viewer`).
- `GET /admin/surveys/{slug}/export.csv` — CSV export (requires `survey-admin`
  or `survey-viewer`).
- `DELETE /admin/surveys/{slug}` — delete every response for a survey (requires
  `survey-admin`). Returns `{success, deleted}`.
- `DELETE /admin/surveys/{slug}/submissions` — bulk delete responses by IDs
  (requires `survey-admin`). Body: `{"ids": [1, 2, 3]}`. Returns
  `{success, deleted}`.
- `DELETE /admin/surveys/{slug}/submissions/{id}` — delete a single response
  (requires `survey-admin`). Returns `{success, deleted}`.

### Common pitfalls

- **This service does not run on Cloudflare Pages.** It runs on a separate
  VPS/VM behind `api.nukehub.org`. The static site only calls it cross-origin
  from `PUBLIC_API_URL`; CORS is the single trust boundary — keep
  `ALLOWED_ORIGINS` tight.
- **No tests in this folder.** Bug fixes should add direct validation in
  `main.go`; if/when a unit harness lands, document it in this NAD.
- **Turnstile site key vs secret.** The site key is `PUBLIC_*` and bundled
  into the static bundle; the secret is server-only here. They must match
  the same Turnstile widget or verification will fail.
- **Admin auth uses NukeAuth + client roles.** `/admin/*` endpoints accept
  either the `survey-admin` role (full access) or the `survey-viewer` role
  (read-only). `DELETE` endpoints require `survey-admin`. `AUTH_URL`,
  `AUTH_REALM`, and `AUTH_CLIENT_ID` must match the static site's Keycloak
  config, or all admin endpoints will reject requests.
- **Back up the SQLite database.** `DATABASE_PATH` defaults to
  `./data/nukehub.db` and is mounted as a Docker volume. The WAL files
  (`*.db-wal`, `*.db-shm`) must be backed up together with the main file.
- **Local `npm run dev` / `npm run preview` requests are cross-origin.**
  `astro dev` and `astro preview` serve on `http://localhost:4321` by default.
  Add that origin to `ALLOWED_ORIGINS` in `api-server/.env` or the browser
  will block API calls with a missing-CORS-header error.

## Verification

```bash
cd api-server
# The Go binary does not auto-load .env; source it first or use docker compose.
set -a && source .env && set +a
go build -o api-server main.go
./api-server &            # listens on 127.0.0.1:3000
curl http://127.0.0.1:3000/health

# Submit a test survey (will fail Turnstile without a real token, but exercises routing)
curl -s -X POST http://127.0.0.1:3000/survey \
  -H "Content-Type: application/json" \
  -d '{"surveySlug":"test","surveyTitle":"Test Survey","responses":{"email":"dev@nukehub.org","feedback":"hello"},"turnstileToken":"fake"}'
```

## Child NAD Index

- None (single Go file; no sub-packages).
