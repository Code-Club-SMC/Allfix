.PHONY: dev build run migrate sqlc bootstrap-status bootstrap-create docker-up docker-down

# Run in development (loads .env.development)
dev:
	ENV=development go run ./cmd/server

# Build binary
build:
	CGO_ENABLED=0 go build -ldflags="-w -s" -o bin/allfix ./cmd/server

# Run built binary
run: build
	./bin/allfix

# Run migrations manually
migrate:
	bash ./scripts/migrate.sh up

# Regenerate sqlc code (run after editing query files)
sqlc:
	sqlc generate

# Check bootstrap status (local)
bootstrap-status:
	./scripts/super-admin-bootstrap.sh --env local status

# Create admin interactively (local)
bootstrap-create:
	./scripts/super-admin-bootstrap.sh --env local create

# Docker development
docker-up:
	docker compose up --build

docker-down:
	docker compose down

# Install tools
tools:
	go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
	go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Lint
lint:
	golangci-lint run ./...

# Tests
test:
	go test ./... -v -race
