package httpapi

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestUnknownRouteReturnsNotFound(t *testing.T) {
	var logs bytes.Buffer
	handler := NewHandler(slog.New(slog.NewJSONHandler(&logs, nil)), &fakePinger{})

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/nope", nil))

	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusNotFound)
	}
	if !bytes.Contains(logs.Bytes(), []byte(`"status":404`)) {
		t.Errorf("request log does not record status 404: %s", logs.String())
	}
}

func TestWriteJSON(t *testing.T) {
	rec := httptest.NewRecorder()
	writeJSON(rec, discardLogger(), http.StatusCreated, map[string]int{"answer": 42})

	if rec.Code != http.StatusCreated {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusCreated)
	}
	if got := rec.Header().Get("Content-Type"); got != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", got)
	}
	if got := rec.Body.String(); got != "{\"answer\":42}\n" {
		t.Errorf("body = %q, want {\"answer\":42} and a newline", got)
	}
}

func TestWriteJSONLogsEncodingErrors(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logs, nil))

	// Channels cannot be encoded as JSON, so the encoder fails after the header is sent.
	rec := httptest.NewRecorder()
	writeJSON(rec, logger, http.StatusOK, map[string]any{"bad": make(chan int)})

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	var record map[string]any
	if err := json.Unmarshal(logs.Bytes(), &record); err != nil {
		t.Fatalf("decode log record %q: %v", logs.String(), err)
	}
	if record["msg"] != "write JSON response" || record["level"] != "ERROR" {
		t.Errorf("log record = %v, want an error about writing the response", record)
	}
}
