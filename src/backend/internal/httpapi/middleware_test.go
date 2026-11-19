package httpapi

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestLogRequests(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logs, nil))

	handler := logRequests(logger, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTeapot)
	}))

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/brew?strength=high", nil))

	var record map[string]any
	if err := json.Unmarshal(logs.Bytes(), &record); err != nil {
		t.Fatalf("decode log record %q: %v", logs.String(), err)
	}
	if record["msg"] != "http request" {
		t.Errorf("msg = %v, want http request", record["msg"])
	}
	if record["method"] != http.MethodGet {
		t.Errorf("method = %v, want GET", record["method"])
	}
	if record["path"] != "/brew" {
		t.Errorf("path = %v, want /brew", record["path"])
	}
	if record["status"] != float64(http.StatusTeapot) {
		t.Errorf("status = %v, want %d", record["status"], http.StatusTeapot)
	}
	if _, ok := record["duration_ms"].(float64); !ok {
		t.Errorf("duration_ms = %v, want a number", record["duration_ms"])
	}
}

func TestLogRequestsDefaultsToOK(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logs, nil))

	handler := logRequests(logger, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("hello"))
	}))
	handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil))

	var record map[string]any
	if err := json.Unmarshal(logs.Bytes(), &record); err != nil {
		t.Fatalf("decode log record: %v", err)
	}
	if record["status"] != float64(http.StatusOK) {
		t.Errorf("status = %v, want 200", record["status"])
	}
}

func TestRecoverPanics(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logs, nil))

	handler := logRequests(logger, recoverPanics(logger, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("boom")
	})))

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/explode", nil))

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
	}
	if got := rec.Header().Get("Content-Type"); got != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", got)
	}
	if !bytes.Contains(logs.Bytes(), []byte(`"panic":"boom"`)) {
		t.Errorf("logs do not record the panic value: %s", logs.String())
	}
	if !bytes.Contains(logs.Bytes(), []byte(`"status":500`)) {
		t.Errorf("request log does not record status 500: %s", logs.String())
	}
}

func TestRecoverPanicsRethrowsAbort(t *testing.T) {
	handler := recoverPanics(discardLogger(), http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic(http.ErrAbortHandler)
	}))

	defer func() {
		if got := recover(); got != http.ErrAbortHandler {
			t.Errorf("recovered %v, want http.ErrAbortHandler", got)
		}
	}()
	handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil))
}
