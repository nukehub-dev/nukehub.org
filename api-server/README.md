# NukeHub API Server

Small Go HTTP service behind `api.nukehub.org`. Receives contact form and
survey submissions from the static site, persists survey responses and
newsletter subscribers to SQLite, forwards submissions via SMTP, and sends
newsletter campaigns with one-click unsubscribe links. Also provides an
admin API for browsing and exporting survey responses and managing the
newsletter.

Written in Go for minimal resource usage (~5-10MB RAM).

## Local development

The recommended way to run locally is with Docker Compose, which automatically
loads `api-server/.env`:

```bash
cd api-server
cp .env.example .env          # edit secrets
docker compose up -d
```

To run with Go directly instead, export the variables from `.env` first. The
Go binary does not auto-load `.env` files:

```bash
cd api-server
cp .env.example .env          # edit secrets
set -a && source .env && set +a
go run main.go
```

The server listens on `http://localhost:3000` and creates `data/nukehub.db`
relative to the working directory.

## Production deployment

```bash
cd api-server
docker compose up -d
```

Or manually:

```bash
# Build
docker build -t nukehub-api .

# Run
docker run -d \
  --name nukehub-api \
  -p 127.0.0.1:3000:3000 \
  -v nukehub-api-data:/app/data \
  --env-file .env \
  nukehub-api
```

## Data storage and backups

The compose file uses a named Docker volume `nukehub-api-data` mounted at
`/app/data`. SQLite WAL files (`*.db-wal`, `*.db-shm`) live alongside the main
`.db` file and must be backed up together.

Back up the volume:

```bash
docker run --rm \
  -v nukehub-api-data:/data \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/nukehub-api-data.tar.gz -C /data .
```

Restore:

```bash
# Stop the container first
docker run --rm \
  -v nukehub-api-data:/data \
  -v $(pwd)/backup:/backup \
  alpine sh -c "cd /data && tar xzf /backup/nukehub-api-data.tar.gz"
```

## Environment Variables

Copy `.env.example` to `.env` and configure. Key variables:

- `DATABASE_PATH` — SQLite database file path. Defaults to `./data/nukehub.db`
  when running locally or `/app/data/nukehub.db` in the container.
- `CONTACT_TO_EMAIL` — recipient for contact form submissions.
- `SURVEY_TO_EMAIL` — recipient for survey submissions (defaults to `CONTACT_TO_EMAIL`).
- `AUTH_URL`, `AUTH_REALM`, `AUTH_CLIENT_ID` — NukeAuth config for admin token verification.
  - `survey-admin` — full survey access (read, export, delete).
  - `survey-viewer` — read-only survey access (list surveys, view submissions, stats, CSV export).
  - `newsletter-admin` — full newsletter access (subscribers + compose, send, delete campaigns).
  - `newsletter-staff` — manage subscribers and create/edit/test campaigns, but not send or delete them.
- `NEWSLETTER_TOKEN_SECRET` — HMAC secret signing unsubscribe links (required in production).
- `NEWSLETTER_FROM_EMAIL`, `BLOG_FROM_EMAIL`, `NEWSLETTER_FROM_NAME` — campaign sender
  addresses. `SMTP_USER` must be permitted to send as them (e.g. mailcow aliases).
- `NEWSLETTER_SEND_DELAY_MS` — delay between campaign sends (default 1000).
- `SITE_URL`, `API_PUBLIC_URL` — public origins used in email links.
- `BLOG_AUTO_SEND` — set to `true` to auto-send a campaign from `BLOG_FROM_EMAIL`
  for every new post found in `BLOG_RSS_URL` (polls every
  `BLOG_RSS_POLL_INTERVAL_MS`, default 30 min). The first poll only records the
  newest post, never sends the backlog. Default `false`.
- `BOUNCE_EMAIL` — envelope sender for campaign emails; async bounces land here
  (must be a real mailcow mailbox or alias). With `BOUNCE_CHECK_ENABLED=true`
  the server polls it over IMAP (defaults to the `SMTP_*` host/credentials,
  overridable via `BOUNCE_IMAP_*`, every `BOUNCE_CHECK_INTERVAL_MS`, default
  1 hour) and removes hard-bounced subscribers. Default `false`.

## API Endpoints

### Public

- `GET /health` - Health check
- `POST /contact` - Submit contact form
- `POST /survey` - Submit YAML-driven survey responses
- `POST /newsletter` - Subscribe to the newsletter
- `POST /newsletter/unsubscribe` - Unsubscribe (Turnstile-verified)
- `POST /newsletter/unsubscribe/confirm` - Token-based unsubscribe from email links (RFC 8058 one-click)

### Admin (requires bearer token + role)

Survey endpoints (`survey-admin` / `survey-viewer`):

- `GET /admin/health/db` - Database connectivity check
- `GET /admin/surveys` - List surveys with submission counts
- `GET /admin/surveys/{slug}` - Paginated submissions
- `GET /admin/surveys/{slug}/stats` - Aggregate statistics
- `GET /admin/surveys/{slug}/export.csv` - CSV export

Newsletter endpoints (`newsletter-admin` / `newsletter-staff`; send and
campaign delete are `newsletter-admin` only):

- `GET /admin/newsletter/subscribers` - Paginated subscriber list
- `GET /admin/newsletter/subscribers/export.csv` - Subscriber CSV export
- `DELETE /admin/newsletter/subscribers/{id}` - Delete a subscriber
- `GET /admin/newsletter/config` - Allowed campaign sender addresses
- `GET|POST /admin/newsletter/campaigns` - List campaigns / create draft
- `GET|PUT|DELETE /admin/newsletter/campaigns/{id}` - Detail / edit draft / delete
- `POST /admin/newsletter/campaigns/{id}/send` - Send to all subscribers
- `POST /admin/newsletter/campaigns/{id}/test` - Send a test email
- `POST /admin/newsletter/campaigns/preview` - Render markdown to email HTML

## Security Features

- Rate limiting (5 requests/hour per IP)
- Turnstile CAPTCHA verification
- JWT validation against the NukeAuth (Keycloak) JWKS endpoint for admin endpoints
- Input sanitization
- Email header injection prevention
- HTML escaping (XSS protection)
- Field validation
- CORS restricted to your domain
