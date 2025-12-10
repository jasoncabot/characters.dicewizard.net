package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/jasoncabot/dicewizard-characters/internal/api"
	"github.com/jasoncabot/dicewizard-characters/internal/store"
	"github.com/pressly/goose/v3"
)

//go:embed migrations/*.sql
var embedMigrations embed.FS

//go:embed web/dist
var embedFrontend embed.FS

func main() {
	// Flags
	port := flag.String("port", getEnv("PORT", "8080"), "HTTP server port")
	dbPath := flag.String("db", getEnv("DATABASE_PATH", "./data/characters.db"), "SQLite database path")
	jwtSecret := flag.String("jwt-secret", "", "JWT secret key (required in production)")
	migrateOnly := flag.Bool("migrate-only", false, "Run migrations and exit")
	devMode := flag.Bool("dev", false, "Development mode (don't serve embedded frontend)")
	flag.Parse()

	// JWT secret from env or flag
	secret := *jwtSecret
	if secret == "" {
		secret = os.Getenv("JWT_SECRET")
	}
	if secret == "" {
		secret = "dev-secret-change-in-production"
		log.Println("WARNING: Using default JWT secret. Set JWT_SECRET env var in production!")
	}

	// Ensure data directory exists
	dbDir := filepath.Dir(*dbPath)
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		log.Fatalf("Failed to create database directory: %v", err)
	}

	// Initialize store
	s, err := store.NewFromPath(*dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize store: %v", err)
	}
	defer s.Close()

	// Run migrations
	goose.SetBaseFS(embedMigrations)
	if err := goose.SetDialect("sqlite3"); err != nil {
		log.Fatalf("Failed to set dialect: %v", err)
	}
	if err := goose.Up(s.DB(), "migrations"); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}
	log.Println("Migrations completed successfully")

	if *migrateOnly {
		log.Println("Migration-only mode, exiting")
		return
	}

	// Create handler with JWT secret
	handler := api.NewHandler(s, secret)

	// Setup frontend filesystem
	var frontendFS fs.FS
	if !*devMode {
		var err error
		frontendFS, err = fs.Sub(embedFrontend, "web/dist")
		if err != nil {
			log.Printf("Warning: Failed to load embedded frontend: %v", err)
			log.Println("Running in API-only mode")
		}
	} else {
		log.Println("Development mode: not serving embedded frontend")
	}

	// Create router
	router := api.NewRouter(handler, frontendFS)

	// Start server
	addr := fmt.Sprintf(":%s", *port)
	log.Printf("Starting server on %s", addr)
	log.Printf("Database: %s", *dbPath)
	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
