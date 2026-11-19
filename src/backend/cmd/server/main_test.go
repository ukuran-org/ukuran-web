package main

import (
	"bytes"
	"context"
	"io"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
)

func envFrom(values map[string]string) func(string) string {
	return func(key string) string { return values[key] }
}

// syncBuffer is a bytes.Buffer that the server goroutine and the test can share.
type syncBuffer struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (b *syncBuffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.Write(p)
}

func (b *syncBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.String()
}

func TestRunRejectsInvalidConfig(t *testing.T) {
	err := run(t.Context(), envFrom(map[string]string{"LOG_LEVEL": "loud"}), io.Discard)
	if err == nil {
		t.Fatal("run returned nil error")
	}
	for _, want := range []string{"DATABASE_URL", "LOG_LEVEL"} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("error %q does not mention %s", err, want)
		}
	}
}

func TestRunFailsWhenDatabaseIsUnreachable(t *testing.T) {
	env := envFrom(map[string]string{
		"DATABASE_URL": "postgres://ukuran:ukuran@127.0.0.1:1/ukuran?sslmode=disable&connect_timeout=1",
		"HTTP_ADDR":    "127.0.0.1:0",
	})

	err := run(t.Context(), env, io.Discard)
	if err == nil || !strings.Contains(err.Error(), "connect to database") {
		t.Fatalf("run error = %v, want a database connection error", err)
	}
}

// freeAddr returns a loopback address with a port that was free a moment ago.
func freeAddr(t *testing.T) string {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("find a free port: %v", err)
	}
	addr := listener.Addr().String()
	listener.Close()
	return addr
}

// TestRunServesAndShutsDown starts the real server against Postgres, checks
// the health endpoint and then stops it the way a signal would.
func TestRunServesAndShutsDown(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL is not set, skipping the server integration test")
	}

	addr := freeAddr(t)
	env := envFrom(map[string]string{"DATABASE_URL": databaseURL, "HTTP_ADDR": addr})
	var logs syncBuffer

	ctx, stop := context.WithCancel(t.Context())
	defer stop()
	done := make(chan error, 1)
	go func() { done <- run(ctx, env, &logs) }()

	client := &http.Client{Timeout: time.Second}
	deadline := time.Now().Add(30 * time.Second)
	for {
		resp, err := client.Get("http://" + addr + "/healthz")
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode != http.StatusOK {
				t.Fatalf("status = %d, want %d", resp.StatusCode, http.StatusOK)
			}
			break
		}
		select {
		case err := <-done:
			t.Fatalf("server stopped early: %v\nlogs: %s", err, logs.String())
		default:
		}
		if time.Now().After(deadline) {
			t.Fatalf("server did not answer in time: %v\nlogs: %s", err, logs.String())
		}
		time.Sleep(50 * time.Millisecond)
	}

	stop()
	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("run returned %v after shutdown, want nil", err)
		}
	case <-time.After(shutdownTimeout + 5*time.Second):
		t.Fatal("server did not shut down in time")
	}

	for _, want := range []string{`"msg":"http server listening"`, `"msg":"shutting down"`, `"msg":"server stopped"`} {
		if !strings.Contains(logs.String(), want) {
			t.Errorf("logs do not contain %s: %s", want, logs.String())
		}
	}
}
