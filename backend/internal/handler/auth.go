package handler

import (
	"fmt"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	db "github.com/AbdulRehman-z/allfix/internal/db/sqlc"
	mw "github.com/AbdulRehman-z/allfix/internal/middleware"
)

type AuthHandler struct {
	q         *db.Queries
	jwtSecret string
	jwtExpiry time.Duration
	cookie    CookieConfig
}

func NewAuthHandler(q *db.Queries, jwtSecret string, expiryHours int, cookie CookieConfig) *AuthHandler {
	return &AuthHandler{
		q:         q,
		jwtSecret: jwtSecret,
		jwtExpiry: time.Duration(expiryHours) * time.Hour,
		cookie:    cookie,
	}
}

// POST /api/auth/sign-up  (clients only)
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	body, err := decode[struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if body.Name == "" || body.Email == "" || len(body.Password) < 8 {
		writeError(w, http.StatusBadRequest, "name, email, and password (min 8 chars) are required")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not hash password")
		return
	}

	user, err := h.q.CreateUser(r.Context(), db.CreateUserParams{
		Name:         body.Name,
		Email:        body.Email,
		PasswordHash: string(hash),
		Role:         "client",
	})
	if err != nil {
		writeError(w, http.StatusConflict, "email already registered")
		return
	}

	token, err := h.issueToken(user.ID, user.Role)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not issue token")
		return
	}

	h.setTokenCookie(w, token)
	writeJSON(w, http.StatusOK, map[string]any{
		"token": token,
		"user": map[string]any{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
			"role":  user.Role,
		},
	})
}

// POST /api/auth/sign-in
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	body, err := decode[struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, err := h.q.GetUserByEmail(r.Context(), body.Email)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(body.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	token, err := h.issueToken(user.ID, user.Role)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not issue token")
		return
	}

	h.setTokenCookie(w, token)
	writeJSON(w, http.StatusOK, map[string]any{
		"token": token,
		"user": map[string]any{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
			"role":  user.Role,
		},
	})
}

// POST /api/auth/sign-out
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	h.clearTokenCookie(w)
	writeJSON(w, http.StatusOK, map[string]string{"message": "signed out"})
}

func (h *AuthHandler) clearTokenCookie(w http.ResponseWriter) {
	http.SetCookie(w, clearTokenCookie(h.cookie))
}

// GET /api/auth/session
func (h *AuthHandler) GetSession(w http.ResponseWriter, r *http.Request) {
	userID, ok := mw.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	user, err := h.q.GetUserByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "user not found")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"user": map[string]any{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
			"role":  user.Role,
		},
	})
}

// GET /api/admin/clients
func (h *AuthHandler) ListClients(w http.ResponseWriter, r *http.Request) {
	clients, err := h.q.ListClients(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch clients")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"clients": clients})
}

func (h *AuthHandler) issueToken(userID uuid.UUID, role string) (string, error) {
	claims := mw.Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(h.jwtExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ID:        uuid.New().String(),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(h.jwtSecret))
	if err != nil {
		return "", fmt.Errorf("sign token: %w", err)
	}
	return signed, nil
}

func (h *AuthHandler) setTokenCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, tokenCookie(token, int(h.jwtExpiry.Seconds()), h.cookie))
}
