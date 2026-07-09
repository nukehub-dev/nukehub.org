# NukeHub API Server

Small Go HTTP service behind `api.nukehub.org`. Receives contact form and
survey submissions from the static site, persists survey responses to SQLite,
and forwards submissions via SMTP. Also provides an admin API for browsing and
exporting survey responses.

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
- `AUTH_URL`, `AUTH_REALM`, `AUTH_CLIENT_ID` — NukeAuth config for admin token verification. Admin access requires the `survey-admin` client role under `AUTH_CLIENT_ID`.

## API Endpoints

### Public

- `GET /contact/health` - Health check
- `POST /contact` - Submit contact form
- `POST /survey` - Submit YAML-driven survey responses

### Admin (requires bearer token + allowed admin email)

- `GET /admin/health/db` - Database connectivity check
- `GET /admin/surveys` - List surveys with submission counts
- `GET /admin/surveys/{slug}` - Paginated submissions
- `GET /admin/surveys/{slug}/stats` - Aggregate statistics
- `GET /admin/surveys/{slug}/export.csv` - CSV export

## Security Features

- Rate limiting (5 requests/hour per IP)
- Turnstile CAPTCHA verification
- JWT validation against the NukeAuth (Keycloak) JWKS endpoint for admin endpoints
- Input sanitization
- Email header injection prevention
- HTML escaping (XSS protection)
- Field validation
- CORS restricted to your domain
