# Backend

Go HTTP API for Ukuran. It uses the standard library router, `pgx` for Postgres and `goose` for schema migrations.

## Layout

```
cmd/server/          entry point that wires config, database and HTTP server
internal/config/     environment variable parsing and validation
internal/database/   connection pool and migration runner
internal/httpapi/    routes, handlers and middleware
migrations/          SQL migrations embedded into the binary
```

## Running locally

From the repository root:

```sh
cp .env.example .env   # first time only
make db-up             # start Postgres in Docker
make backend-dev       # run the server on http://localhost:8080
```

Then check it is healthy:

```sh
curl -i localhost:8080/healthz
```

On startup the server connects to Postgres, applies any pending migrations and then starts listening. It stops gracefully on `SIGINT` or `SIGTERM`, giving in-flight requests up to 15 seconds to finish.

## Environment variables

| Variable       | Required | Default | Description                                          |
| -------------- | -------- | ------- | ---------------------------------------------------- |
| `DATABASE_URL` | yes      |         | Postgres connection string                           |
| `HTTP_ADDR`    | no       | `:8080` | Address the server listens on, as `host:port`        |
| `LOG_LEVEL`    | no       | `info`  | Minimum log level: `debug`, `info`, `warn`, `error`  |

The server exits with a clear error if any value is missing or invalid. Logs are written to stdout as JSON.

## Endpoints

| Method | Path       | Description                                                                                                |
| ------ | ---------- | ---------------------------------------------------------------------------------------------------------- |
| GET    | `/healthz` | `200 {"status":"ok","database":"ok"}` when Postgres answers a ping, otherwise `503` with `"database":"unavailable"` |

## Tests

```sh
make backend-test
```

Unit tests need no database. The Postgres integration test runs only when `DATABASE_URL` is set, so start the database first to include it:

```sh
make db-up
cd src/backend
DATABASE_URL=postgres://ukuran:ukuran@localhost:5432/ukuran?sslmode=disable go test ./...
```

## Adding a migration

Migrations are plain SQL files in `migrations/`, applied in order at startup. Create the next file in sequence, for example `migrations/00002_create_users.sql`:

```sql
-- +goose Up
CREATE TABLE users (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email      text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- +goose Down
DROP TABLE users;
```

Every file needs a `-- +goose Up` section and should have a matching `-- +goose Down` section. Wrap statements that contain semicolons, such as function bodies, in `-- +goose StatementBegin` and `-- +goose StatementEnd`. Files are embedded at build time, so restart the server to apply a new migration. Never edit a migration that has already been applied anywhere. Add a new one instead.

The first migration creates `set_updated_at()`, a trigger function that tables can attach to keep their `updated_at` column current, as shown above.
