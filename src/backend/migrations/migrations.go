// Package migrations embeds the SQL migrations that define the database schema.
//
// Files are applied in version order by goose. Name new files with the next
// sequential number, for example 00002_create_users.sql.
package migrations

import "embed"

// FS holds every migration file in this directory.
//
//go:embed *.sql
var FS embed.FS
