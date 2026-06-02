package middleware

import (
	"net/http"
	"strings"

	"github.com/go-chi/cors"
)

func normalizeOrigins(origins []string) []string {
	out := make([]string, 0, len(origins))
	for _, o := range origins {
		o = strings.TrimSpace(o)
		if o == "" {
			continue
		}
		out = append(out, strings.TrimSuffix(o, "/"))
	}
	return out
}

func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	return cors.Handler(cors.Options{
		AllowedOrigins:   normalizeOrigins(allowedOrigins),
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "x-bootstrap-secret"},
		AllowCredentials: true,
		MaxAge:           300,
	})
}
