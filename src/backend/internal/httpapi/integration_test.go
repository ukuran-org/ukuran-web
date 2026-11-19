package httpapi_test

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/ukuran-org/ukuran-web/src/backend/internal/database"
	"github.com/ukuran-org/ukuran-web/src/backend/internal/httpapi"
)

// TestHealthAgainstPostgres runs the migrations against a real database and
// checks the health endpoint end to end. It needs DATABASE_URL to be set.
func TestHealthAgainstPostgres(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL is not set, skipping the Postgres integration test")
	}

	ctx, cancel := context.WithTimeout(t.Context(), 30*time.Second)
	defer cancel()

	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))

	pool, err := database.Open(ctx, databaseURL)
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	t.Cleanup(pool.Close)

	// Running the migrations twice proves that startup is idempotent.
	for range 2 {
		if err := database.Migrate(ctx, pool, logger); err != nil {
			t.Fatalf("migrate: %v", err)
		}
	}

	var exists bool
	if err := pool.QueryRow(ctx, "SELECT to_regproc('set_updated_at') IS NOT NULL").Scan(&exists); err != nil {
		t.Fatalf("look up set_updated_at: %v", err)
	}
	if !exists {
		t.Error("migration did not create the set_updated_at function")
	}

	server := httptest.NewServer(httpapi.NewHandler(logger, pool))
	t.Cleanup(server.Close)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, server.URL+"/healthz", nil)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	resp, err := server.Client().Do(req)
	if err != nil {
		t.Fatalf("GET /healthz: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("status = %d, want %d", resp.StatusCode, http.StatusOK)
	}
	if got := resp.Header.Get("Content-Type"); got != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", got)
	}
	var body map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if body["status"] != "ok" || body["database"] != "ok" {
		t.Errorf("body = %v, want status and database to be ok", body)
	}
}
