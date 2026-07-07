# Contact Server

Receives contact form submissions from your static site and sends emails via SMTP.

Written in Go for minimal resource usage (~5-10MB RAM).

## Quick Start

```bash
# Build
go build -o contact-server main.go

# Run
./contact-server
```

## Docker Deployment

```bash
docker compose up -d
```

Or manually:

```bash
# Build
docker build -t nukehub-contact .

# Run
docker run -d \
  --name nukehub-contact \
  -p 127.0.0.1:3000:3000 \
  --env-file .env \
  nukehub-contact
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
