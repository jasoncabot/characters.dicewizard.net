.PHONY: build dev frontend backend migrate clean docker test gen vet deps frontend-deps release

# Build everything
build: frontend copy-assets
	go build -o bin/server ./cmd/server

# Build frontend only
frontend:
	cd web && npm ci && npm run build

# Copy frontend dist to cmd/server for embedding
copy-assets:
	mkdir -p cmd/server/web
	cp -r web/dist cmd/server/web/

# Run frontend dev server
frontend-dev:
	cd web && npm run dev

# Run backend with hot reload (requires air: go install github.com/air-verse/air@latest)
backend-dev:
	JWT_SECRET=devsecret go run ./cmd/server -dev

# Run backend without hot reload
backend:
	go run ./cmd/server

# Run in development mode (frontend proxy to backend)
dev:
	@echo "Run 'make frontend-dev' in one terminal and 'make backend-dev' in another"

# Run database migrations
migrate:
	go run ./cmd/server -migrate-only

# Generate sqlc code
gen:
	go tool sqlc generate -f internal/store/sqlc.yaml

# Verify sqlc queries
verify:
	go tool sqlc vet -f internal/store/sqlc.yaml

# Clean build artifacts
clean:
	rm -rf bin/
	rm -rf web/dist/
	rm -rf cmd/server/web/

# Build Docker image
docker:
	docker build -t character-sheets .

# Run tests
test:
	go test -v ./...

# Download Go dependencies
deps:
	go mod download
	go mod tidy

# Install frontend dependencies
frontend-deps:
	cd web && npm install

# Tag and push a release (VERSION=vX.Y.Z)
release:
	@test -n "$(VERSION)" || (echo "VERSION required, e.g. make release VERSION=v1.2.3" && exit 1)
	git tag $(VERSION)
	git push origin $(VERSION)
