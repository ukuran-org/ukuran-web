package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// fakePinger returns err from Ping and records whether the context had a deadline.
type fakePinger struct {
	err         error
	hadDeadline bool
}

func (p *fakePinger) Ping(ctx context.Context) error {
	_, p.hadDeadline = ctx.Deadline()
	return p.err
}

func discardLogger() *slog.Logger {
	return slog.New(slog.NewJSONHandler(io.Discard, nil))
}

func TestHealth(t *testing.T) {
	tests := []struct {
		name       string
		pingErr    error
		wantStatus int
		wantBody   healthResponse
	}{
		{
			name:       "database reachable",
			wantStatus: http.StatusOK,
			wantBody:   healthResponse{Status: "ok", Database: "ok"},
		},
		{
			name:       "database unreachable",
			pingErr:    errors.New("connection refused"),
			wantStatus: http.StatusServiceUnavailable,
			wantBody:   healthResponse{Status: "unavailable", Database: "unavailable"},
		},
		{
			name:       "database ping times out",
			pingErr:    context.DeadlineExceeded,
			wantStatus: http.StatusServiceUnavailable,
			wantBody:   healthResponse{Status: "unavailable", Database: "unavailable"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pinger := &fakePinger{err: tt.pingErr}
			handler := NewHandler(discardLogger(), pinger)

			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/healthz", nil))

			if rec.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", rec.Code, tt.wantStatus)
			}
			if got := rec.Header().Get("Content-Type"); got != "application/json" {
				t.Errorf("Content-Type = %q, want application/json", got)
			}
			var body healthResponse
			if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
				t.Fatalf("decode body: %v", err)
			}
			if body != tt.wantBody {
				t.Errorf("body = %+v, want %+v", body, tt.wantBody)
			}
			if !pinger.hadDeadline {
				t.Error("Ping was called without a deadline")
			}
		})
	}
}

func TestHealthRejectsOtherMethods(t *testing.T) {
	handler := NewHandler(discardLogger(), &fakePinger{})

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/healthz", nil))

	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusMethodNotAllowed)
	}
}

func TestHealthPingRespectsTimeout(t *testing.T) {
	blocking := pingerFunc(func(ctx context.Context) error {
		<-ctx.Done()
		return ctx.Err()
	})
	handler := NewHandler(discardLogger(), blocking)

	start := time.Now()
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/healthz", nil))

	if rec.Code != http.StatusServiceUnavailable {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusServiceUnavailable)
	}
	if elapsed := time.Since(start); elapsed > healthCheckTimeout+time.Second {
		t.Errorf("health check took %v, want at most about %v", elapsed, healthCheckTimeout)
	}
}

type pingerFunc func(ctx context.Context) error

func (f pingerFunc) Ping(ctx context.Context) error { return f(ctx) }
