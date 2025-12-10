# Build frontend
FROM node:22-alpine AS frontend
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Build Go binary
FROM golang:1.24-alpine AS backend
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Copy frontend dist for embedding (migrations are already in cmd/server/migrations)
COPY --from=frontend /app/web/dist ./cmd/server/web/dist
RUN CGO_ENABLED=0 go build -o server ./cmd/server

# Final image
FROM alpine:3.20
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=backend /app/server /app/server

# Create data directory for SQLite
RUN mkdir -p /data

ENV DATABASE_PATH=/data/characters.db
ENV PORT=8080

EXPOSE 8080

VOLUME ["/data"]

CMD ["/app/server"]
