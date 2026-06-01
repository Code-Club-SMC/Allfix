package handler

import (
	"testing"
	"time"

	middleware "github.com/AbdulRehman-z/allfix/internal/middleware"
	"github.com/google/uuid"
	"pgregory.net/rapid"
)

// Feature: allfix-backend, Property 7: JWT token round-trip preserves claims
// Validates: Requirements 1.4, 8.4
func TestIssueToken_RoundTrip(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		secret := rapid.StringN(16, 64, -1).Draw(t, "secret")
		role := rapid.SampledFrom([]string{"client", "admin", "worker"}).Draw(t, "role")
		id := uuid.New()

		h := &ClientRequestsHandler{
			jwtSecret: secret,
			jwtExpiry: time.Hour,
		}
		tokenStr, err := h.issueToken(id, role)
		if err != nil {
			t.Fatalf("issueToken failed: %v", err)
		}

		claims, err := middleware.ParseToken(tokenStr, secret)
		if err != nil {
			t.Fatalf("ParseToken failed: %v", err)
		}
		if claims.UserID != id {
			t.Fatalf("UserID mismatch: got %v, want %v", claims.UserID, id)
		}
		if claims.Role != role {
			t.Fatalf("Role mismatch: got %v, want %v", claims.Role, role)
		}
	})
}
