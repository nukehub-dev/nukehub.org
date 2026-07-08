# NukeHub API Server

Small Go HTTP service behind `api.nukehub.org`. Receives contact form and
survey submissions from the static site and forwards them via SMTP.

Written in Go for minimal resource usage (~5-10MB RAM).

## Quick Start

```bash
# Build
go build -o api-server main.go

# Run
./api-server
```

## Docker Deployment

```bash
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
  --env-file .env \
  nukehub-api
```

## Environment Variables

Copy `.env.example` to `.env` and configure. Key variables:

- `CONTACT_TO_EMAIL` — recipient for contact form submissions.
- `SURVEY_TO_EMAIL` — recipient for survey submissions (defaults to `CONTACT_TO_EMAIL`).

## API Endpoints

- `GET /contact/health` - Health check
- `POST /contact` - Submit contact form
- `POST /survey` - Submit YAML-driven survey responses

## Security Features

- Rate limiting (5 requests/hour per IP)
- Turnstile CAPTCHA verification
- Input sanitization
- Email header injection prevention
- HTML escaping (XSS protection)
- Field validation
- CORS restricted to your domain
