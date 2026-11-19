package config

import (
	"log/slog"
	"strings"
	"testing"
)

const testDatabaseURL = "postgres://ukuran:ukuran@localhost:5432/ukuran?sslmode=disable"

func envFrom(values map[string]string) func(string) string {
	return func(key string) string { return values[key] }
}

func TestLoad(t *testing.T) {
	tests := []struct {
		name string
		env  map[string]string
		want Config
	}{
		{
			name: "defaults",
			env:  map[string]string{"DATABASE_URL": testDatabaseURL},
			want: Config{DatabaseURL: testDatabaseURL, HTTPAddr: ":8080", LogLevel: slog.LevelInfo},
		},
		{
			name: "explicit values",
			env: map[string]string{
				"DATABASE_URL": testDatabaseURL,
				"HTTP_ADDR":    "127.0.0.1:9000",
				"LOG_LEVEL":    "debug",
			},
			want: Config{DatabaseURL: testDatabaseURL, HTTPAddr: "127.0.0.1:9000", LogLevel: slog.LevelDebug},
		},
		{
			name: "surrounding whitespace and upper case level",
			env: map[string]string{
				"DATABASE_URL": "  " + testDatabaseURL + "\n",
				"HTTP_ADDR":    " :8081 ",
				"LOG_LEVEL":    "WARN",
			},
			want: Config{DatabaseURL: testDatabaseURL, HTTPAddr: ":8081", LogLevel: slog.LevelWarn},
		},
		{
			name: "IPv6 loopback address and error level",
			env: map[string]string{
				"DATABASE_URL": testDatabaseURL,
				"HTTP_ADDR":    "[::1]:8080",
				"LOG_LEVEL":    "error",
			},
			want: Config{DatabaseURL: testDatabaseURL, HTTPAddr: "[::1]:8080", LogLevel: slog.LevelError},
		},
		{
			name: "blank optional values fall back to defaults",
			env: map[string]string{
				"DATABASE_URL": testDatabaseURL,
				"HTTP_ADDR":    "   ",
				"LOG_LEVEL":    "\t",
			},
			want: Config{DatabaseURL: testDatabaseURL, HTTPAddr: ":8080", LogLevel: slog.LevelInfo},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Load(envFrom(tt.env))
			if err != nil {
				t.Fatalf("Load returned error: %v", err)
			}
			if got != tt.want {
				t.Errorf("Load = %+v, want %+v", got, tt.want)
			}
		})
	}
}

func TestLoadErrors(t *testing.T) {
	tests := []struct {
		name     string
		env      map[string]string
		contains []string
	}{
		{
			name:     "missing database URL",
			env:      map[string]string{},
			contains: []string{"DATABASE_URL is required"},
		},
		{
			name:     "blank database URL",
			env:      map[string]string{"DATABASE_URL": "   "},
			contains: []string{"DATABASE_URL is required"},
		},
		{
			name:     "address without port",
			env:      map[string]string{"DATABASE_URL": testDatabaseURL, "HTTP_ADDR": "localhost"},
			contains: []string{"HTTP_ADDR"},
		},
		{
			name:     "address with a scheme",
			env:      map[string]string{"DATABASE_URL": testDatabaseURL, "HTTP_ADDR": "http://localhost:8080"},
			contains: []string{"HTTP_ADDR"},
		},
		{
			name:     "IPv6 address without brackets",
			env:      map[string]string{"DATABASE_URL": testDatabaseURL, "HTTP_ADDR": "::1:8080"},
			contains: []string{"HTTP_ADDR"},
		},
		{
			name:     "unknown log level",
			env:      map[string]string{"DATABASE_URL": testDatabaseURL, "LOG_LEVEL": "verbose"},
			contains: []string{"LOG_LEVEL"},
		},
		{
			name:     "several problems are reported together",
			env:      map[string]string{"HTTP_ADDR": "nope", "LOG_LEVEL": "loud"},
			contains: []string{"DATABASE_URL", "HTTP_ADDR", "LOG_LEVEL"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := Load(envFrom(tt.env))
			if err == nil {
				t.Fatal("Load returned nil error")
			}
			for _, want := range tt.contains {
				if !strings.Contains(err.Error(), want) {
					t.Errorf("error %q does not mention %q", err, want)
				}
			}
		})
	}
}
