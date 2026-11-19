FRONTEND_DIR := src/frontend
BACKEND_DIR := src/backend

# Load local settings from .env when it exists and pass them to child processes.
-include .env
export POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB DATABASE_URL HTTP_ADDR

.DEFAULT_GOAL := help

.PHONY: help db-up db-down frontend-dev backend-dev frontend-test backend-test test frontend-lint backend-lint lint

help: ## Show available targets
	@awk 'BEGIN { FS = ":.*## " } /^[a-zA-Z0-9_-]+:.*## / { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

db-up: ## Start Postgres and wait until it is healthy
	docker compose up -d --wait postgres

db-down: ## Stop Postgres and keep its data volume
	docker compose down

frontend-dev: ## Run the Next.js dev server on http://localhost:3000
	cd $(FRONTEND_DIR) && npm run dev

backend-dev: ## Run the Go API server on http://localhost:8080
	cd $(BACKEND_DIR) && go run ./cmd/server

frontend-test: ## Run the frontend unit tests with Vitest
	cd $(FRONTEND_DIR) && npm test -- --run

backend-test: ## Run the backend tests
	cd $(BACKEND_DIR) && go test ./...

test: frontend-test backend-test ## Run all tests

frontend-lint: ## Lint and type check the frontend
	cd $(FRONTEND_DIR) && npm run lint
	cd $(FRONTEND_DIR) && npx tsc --noEmit

backend-lint: ## Vet the backend and check its formatting
	cd $(BACKEND_DIR) && go vet ./...
	cd $(BACKEND_DIR) && test -z "$$(gofmt -l .)" || { gofmt -l .; exit 1; }

lint: frontend-lint backend-lint ## Run all linters
