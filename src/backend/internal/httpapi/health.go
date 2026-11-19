package httpapi

import (
	"context"
	"log/slog"
	"net/http"
	"time"
)

// healthCheckTimeout bounds how long the database ping may take.
const healthCheckTimeout = 2 * time.Second

type healthResponse struct {
	Status   string `json:"status"`
	Database string `json:"database"`
}

// healthHandler responds with 200 when the database answers a ping and 503 otherwise.
func healthHandler(logger *slog.Logger, db Pinger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")

		ctx, cancel := context.WithTimeout(r.Context(), healthCheckTimeout)
		defer cancel()

		if err := db.Ping(ctx); err != nil {
			logger.WarnContext(r.Context(), "health check failed", slog.Any("error", err))
			writeJSON(w, logger, http.StatusServiceUnavailable, healthResponse{
				Status:   "unavailable",
				Database: "unavailable",
			})
			return
		}

		writeJSON(w, logger, http.StatusOK, healthResponse{Status: "ok", Database: "ok"})
	})
}
