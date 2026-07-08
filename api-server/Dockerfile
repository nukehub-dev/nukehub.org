# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /build
COPY go.mod main.go ./
RUN go build -o api-server main.go

# Runtime stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app
COPY --from=builder /build/api-server .

# Persist SQLite database and WAL files outside the container image
RUN mkdir -p /app/data
VOLUME ["/app/data"]

CMD ["./api-server"]
