package config

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port            string
	Env             string
	DatabaseURL     string
	JWTSecret       string
	JWTExpiryHours  int
	BootstrapSecret string
	AllowedOrigins  []string
	CookieSecure    bool
	CookieSameSite  http.SameSite
}

func Load() (*Config, error) {
	env := os.Getenv("ENV")
	if env == "" {
		env = "development"
	}

	// Load .env.{environment} first, then fall back to .env
	_ = godotenv.Load(".env." + env)
	_ = godotenv.Load(".env")

	cookieSecure, err := getBoolEnv("COOKIE_SECURE", env == "production")
	if err != nil {
		return nil, err
	}

	cookieSameSite, err := parseSameSite(getEnv("COOKIE_SAMESITE", defaultSameSite(env)))
	if err != nil {
		return nil, err
	}

	cfg := &Config{
		Port:            getEnv("PORT", "8000"),
		Env:             env,
		DatabaseURL:     getEnv("DATABASE_URL", ""),
		JWTSecret:       getEnv("JWT_SECRET", ""),
		BootstrapSecret: getEnv("ADMIN_BOOTSTRAP_SECRET", ""),
		AllowedOrigins:  parseCSV(getEnv("ALLOWED_ORIGINS", "")),
		CookieSecure:    cookieSecure,
		CookieSameSite:  cookieSameSite,
	}

	expiryStr := getEnv("JWT_EXPIRY_HOURS", "72")
	expiry, err := strconv.Atoi(expiryStr)
	if err != nil {
		return nil, fmt.Errorf("invalid JWT_EXPIRY_HOURS: %w", err)
	}
	cfg.JWTExpiryHours = expiry

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}
	if cfg.BootstrapSecret == "" {
		return nil, fmt.Errorf("ADMIN_BOOTSTRAP_SECRET is required")
	}
	if len(cfg.AllowedOrigins) == 0 {
		if env == "production" {
			return nil, fmt.Errorf("ALLOWED_ORIGINS is required in production")
		}
		cfg.AllowedOrigins = []string{"http://localhost:5173", "http://localhost:3000"}
	}
	if cfg.CookieSameSite == http.SameSiteNoneMode && !cfg.CookieSecure {
		return nil, fmt.Errorf("COOKIE_SECURE=true is required when COOKIE_SAMESITE=none")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getBoolEnv(key string, fallback bool) (bool, error) {
	v := os.Getenv(key)
	if v == "" {
		return fallback, nil
	}

	parsed, err := strconv.ParseBool(v)
	if err != nil {
		return false, fmt.Errorf("invalid %s: %w", key, err)
	}
	return parsed, nil
}

func defaultSameSite(env string) string {
	if env == "production" {
		return "none"
	}
	return "lax"
}

func parseSameSite(value string) (http.SameSite, error) {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "", "default":
		return http.SameSiteDefaultMode, nil
	case "lax":
		return http.SameSiteLaxMode, nil
	case "strict":
		return http.SameSiteStrictMode, nil
	case "none":
		return http.SameSiteNoneMode, nil
	default:
		return http.SameSiteDefaultMode, fmt.Errorf("invalid COOKIE_SAMESITE: %s", value)
	}
}

func parseCSV(value string) []string {
	parts := strings.Split(value, ",")
	items := make([]string, 0, len(parts))
	for _, part := range parts {
		item := strings.TrimSpace(part)
		if item != "" {
			items = append(items, item)
		}
	}
	return items
}
