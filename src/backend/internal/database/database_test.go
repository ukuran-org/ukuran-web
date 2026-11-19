package database

import (
	"strings"
	"testing"
)

const secret = "s3cret-password"

func TestOpenHidesCredentialsInParseErrors(t *testing.T) {
	for _, databaseURL := range []string{
		"postgres://ukuran:" + secret + "@localhost:notaport/ukuran",
		"postgres://ukuran:" + secret + "@localhost:5432/ukuran?pool_max_conns=many",
	} {
		_, err := Open(t.Context(), databaseURL)
		if err == nil {
			t.Fatalf("Open(%q) returned nil error", databaseURL)
		}
		if strings.Contains(err.Error(), secret) {
			t.Errorf("error %q leaks the password", err)
		}
		if !strings.Contains(err.Error(), "invalid connection string") {
			t.Errorf("error %q does not say the connection string is invalid", err)
		}
	}
}

func TestOpenReportsUnreachableDatabase(t *testing.T) {
	// Nothing listens on port 1, so the ping that Open performs fails at once.
	_, err := Open(t.Context(), "postgres://ukuran:"+secret+"@127.0.0.1:1/ukuran?sslmode=disable&connect_timeout=1")
	if err == nil {
		t.Fatal("Open returned nil error")
	}
	if !strings.Contains(err.Error(), "connect to database") {
		t.Errorf("error %q does not mention connecting to the database", err)
	}
	if strings.Contains(err.Error(), secret) {
		t.Errorf("error %q leaks the password", err)
	}
}
