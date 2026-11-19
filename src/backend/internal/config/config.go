// Package config loads the service configuration from environment variables.
package config

import (
	"errors"
	"fmt"
	"log/slog"
	"net"
	"strings"
)

// DefaultHTTPAddr is the address the HTTP server listens on when HTTP_ADDR is unset.
const DefaultHTTPAddr = ":8080"

// Config holds the settings the service needs at startup.
type Config struct {
	// DatabaseURL is the Postgres connection string.
	DatabaseURL string
	// HTTPAddr is the host and port the HTTP server listens on.
	HTTPAddr string
	// LogLevel is the minimum level of log records that are written.
	LogLevel slog.Level
}

// Load reads the configuration using getenv, which is usually os.Getenv.
// It reports every invalid or missing value at once so they can all be fixed in one pass.
func Load(getenv func(string) string) (Config, error) {
	cfg := Config{
		DatabaseURL: strings.TrimSpace(getenv("DATABASE_URL")),
		HTTPAddr:    strings.TrimSpace(getenv("HTTP_ADDR")),
		LogLevel:    slog.LevelInfo,
	}

	var errs []error

	if cfg.DatabaseURL == "" {
		errs = append(errs, errors.New("DATABASE_URL is required"))
	}

	if cfg.HTTPAddr == "" {
		cfg.HTTPAddr = DefaultHTTPAddr
	} else if _, _, err := net.SplitHostPort(cfg.HTTPAddr); err != nil {
		errs = append(errs, fmt.Errorf("HTTP_ADDR %q is not a valid host:port address: %w", cfg.HTTPAddr, err))
	}

	if level := strings.TrimSpace(getenv("LOG_LEVEL")); level != "" {
		if err := cfg.LogLevel.UnmarshalText([]byte(level)); err != nil {
			errs = append(errs, fmt.Errorf("LOG_LEVEL %q must be one of debug, info, warn or error", level))
		}
	}

	if len(errs) > 0 {
		return Config{}, fmt.Errorf("invalid configuration: %w", errors.Join(errs...))
	}
	return cfg, nil
}
