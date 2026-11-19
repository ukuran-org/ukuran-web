// Package httpapi wires the HTTP routes, handlers and middleware of the service.
package httpapi

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
)

// Pinger reports whether the database is reachable.
// *pgxpool.Pool satisfies it, and tests can supply a fake.
type Pinger interface {
	Ping(ctx context.Context) error
}

// NewHandler returns the root handler with every route and middleware attached.
func NewHandler(logger *slog.Logger, db Pinger) http.Handler {
	mux := http.NewServeMux()
	mux.Handle("GET /healthz", healthHandler(logger, db))

	return logRequests(logger, recoverPanics(logger, mux))
}

// writeJSON encodes body as JSON and writes it with the given status code.
func writeJSON(w http.ResponseWriter, logger *slog.Logger, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		logger.Error("write JSON response", slog.Any("error", err))
	}
}
