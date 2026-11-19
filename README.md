# Ukuran

Ukuran is a web application with a Next.js frontend and a Go backend backed by PostgreSQL.

## Layout

```
assets/          Shared brand assets such as the logo and fonts
src/frontend/    Next.js app (TypeScript, Tailwind, Vitest, Playwright)
src/backend/     Go API server (net/http, slog, pgx, goose)
.github/         CI workflows for the frontend and the backend
```

## Prerequisites

- Node.js 22 (run `nvm use` to pick up the version in `.nvmrc`) and npm
- Go, at the version declared in `src/backend/go.mod`
- Docker with Compose v2 or later
- GNU Make

## Quick start

```sh
cp .env.example .env    # adjust the values if needed
make db-up              # start Postgres on localhost:5432
make backend-dev        # in one terminal
make frontend-dev       # in another terminal
```

Install the frontend dependencies with `npm install` inside `src/frontend` before the first run.

Once both servers are running:

- Frontend: http://localhost:3000
- Backend health check: http://localhost:8080/healthz

Run `make` or `make help` to list every target. The most common ones are `make test`, `make lint` and `make db-down`.
