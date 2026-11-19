package httpapi

import (
	"bytes"
	"encoding/json"
	"errors"
	"log/slog"
	"maps"
	"net/http"
	"net/http/httptest"
	"strings"
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

func TestRecoverPanicsWritesErrorBodyAndStack(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logs, nil))

	handler := recoverPanics(logger, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic(errors.New("database exploded"))
	}))

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/things", nil))

	var body map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if want := map[string]string{"error": "internal server error"}; !maps.Equal(body, want) {
		t.Errorf("body = %v, want %v", body, want)
	}

	var record map[string]any
	if err := json.Unmarshal(logs.Bytes(), &record); err != nil {
		t.Fatalf("decode log record %q: %v", logs.String(), err)
	}
	if record["level"] != "ERROR" {
		t.Errorf("level = %v, want ERROR", record["level"])
	}
	if record["panic"] != "database exploded" {
		t.Errorf("panic = %v, want the error message", record["panic"])
	}
	if record["method"] != http.MethodPost || record["path"] != "/things" {
		t.Errorf("method and path = %v %v, want POST /things", record["method"], record["path"])
	}
	if stack, _ := record["stack"].(string); !strings.Contains(stack, "goroutine") {
		t.Errorf("stack = %q, want a goroutine trace", stack)
	}
}

func TestRecoverPanicsPassesThroughNormalResponses(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logs, nil))

	handler := recoverPanics(logger, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusAccepted)
	}))

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))

	if rec.Code != http.StatusAccepted {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusAccepted)
	}
	if logs.Len() != 0 {
		t.Errorf("logged %s, want nothing", logs.String())
	}
}

func TestLogRequestsRecordsAbortedRequests(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logs, nil))

	handler := logRequests(logger, recoverPanics(logger, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic(http.ErrAbortHandler)
	})))

	func() {
		defer func() {
			if got := recover(); got != http.ErrAbortHandler {
				t.Errorf("recovered %v, want http.ErrAbortHandler", got)
			}
		}()
		handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/aborted", nil))
	}()

	if !bytes.Contains(logs.Bytes(), []byte(`"path":"/aborted"`)) {
		t.Errorf("aborted request was not logged: %s", logs.String())
	}
}

func TestLogRequestsKeepsTheFirstStatus(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logs, nil))

	handler := logRequests(logger, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte("created"))
	}))
	handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/", nil))

	if !bytes.Contains(logs.Bytes(), []byte(`"status":201`)) {
		t.Errorf("request log does not record status 201: %s", logs.String())
	}
}

func TestLogRequestsSupportsFlushing(t *testing.T) {
	handler := logRequests(discardLogger(), http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("partial"))
		if err := http.NewResponseController(w).Flush(); err != nil {
			t.Errorf("flush through the request logger: %v", err)
		}
	}))

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))

	if !rec.Flushed {
		t.Error("response was not flushed")
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
