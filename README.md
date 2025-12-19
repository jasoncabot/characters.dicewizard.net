# Self-Hosted D&D Character Sheets

A self-hostable Dungeons & Dragons 5th Edition character sheet application with a Go backend and React frontend. Supports multiple user accounts with separate character sheets per account.

## Features

- 📝 Full D&D 5e character sheet management
- 👥 Multi-user support with authentication
- 🎲 Automatic calculation of modifiers and derived stats
- 💾 SQLite database for persistent storage
- 📊 Prometheus metrics for monitoring
- 🐳 Docker support with volume mounting for data persistence
- 🎨 Modern React + Tailwind CSS 4 frontend
- 🔐 JWT-based authentication

## Quick Start

### Using Docker (Recommended)

```bash
docker pull ghcr.io/jasoncabot/dicewizard-characters:latest
docker run -d \
  -p 8080:8080 \
  -v ./data:/data \
  -e JWT_SECRET=your-secret-key-here \
  ghcr.io/jasoncabot/dicewizard-characters:latest
```

Access the app at http://localhost:8080

### Building from Source

Prerequisites:
- Go 1.24+
- Node.js 22+
- npm

```bash
# Install dependencies
make deps
make frontend-deps

# Build
make build

# Run
JWT_SECRET=your-secret-key ./bin/server
```

## Development

### Hot Reloading Frontend

For frontend development with hot reloading:

```bash
# Terminal 1: Run backend in dev mode
make backend-dev
# OR: JWT_SECRET=devsecret go run ./cmd/server -dev

# Terminal 2: Run frontend dev server (with hot reload)
make frontend-dev
# OR: cd web && npm run dev
```

The frontend dev server runs on http://localhost:5173 and proxies API requests to the backend on http://localhost:8080.

### Custom API URL

You can point the frontend to a different API server by setting `VITE_API_URL` at build time:

```bash
# Build frontend pointing to a custom API server
VITE_API_URL=https://api.example.com/api npm run build

# Or for development
VITE_API_URL=http://localhost:9000/api npm run dev
```

The frontend uses `VITE_API_URL` environment variable (defaults to `/api` for same-origin requests).

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port |
| `DATABASE_PATH` | `./data/characters.db` | SQLite database file path |
| `JWT_SECRET` | (required in prod) | Secret key for JWT tokens |

Command line flags:
- `-port`: HTTP server port
- `-db`: SQLite database path
- `-jwt-secret`: JWT secret key
- `-dev`: Run in development mode (don't serve embedded frontend)
- `-migrate-only`: Run migrations and exit

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and get JWT token |
| `GET` | `/api/auth/me` | Get current user (requires auth) |

### Characters (requires authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/characters` | List all characters for current user |
| `POST` | `/api/characters` | Create a new character |
| `GET` | `/api/characters/{id}` | Get a character by ID |
| `PUT` | `/api/characters/{id}` | Update a character |
| `DELETE` | `/api/characters/{id}` | Delete a character |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/metrics` | Prometheus metrics |
| `GET` | `/health` | Health check |

## Docker Compose Example

```yaml
version: '3.8'
services:
  character-sheets:
    image: ghcr.io/jasoncabot/characters.dicewizard.net:main
    ports:
      - "8080:8080"
    volumes:
      - ./data:/data
    environment:
      - JWT_SECRET=change-this-to-a-secure-random-string
      - DATABASE_PATH=/data/characters.db
    restart: unless-stopped
```

## TrueNAS Example

```yaml
services:
  characters:
    environment:
      ASSETS_PATH: /assets
      DATABASE_PATH: /data/characters.db
      JWT_SECRET: some-secure-random-string
      PORT: '8080'
    healthcheck:
      interval: 30s
      retries: 5
      start_period: 30s
      test:
        - CMD
        - wget
        - '-q'
        - '--spider'
        - http://0.0.0.0:8080/health
      timeout: 5s
    image: ghcr.io/jasoncabot/characters.dicewizard.net:main
    ports:
      - 8080:8080
    read_only: False
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    user: '568:568'
    volumes:
      - /mnt/some/path/data:/data
      - /mnt/some/path/assets:/assets
```

## License

MIT
