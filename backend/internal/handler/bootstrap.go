package handler

import (
	"net/http"

	"golang.org/x/crypto/bcrypt"

	db "github.com/AbdulRehman-z/allfix/internal/db/sqlc"
)

type BootstrapHandler struct {
	q               *db.Queries
	bootstrapSecret string
}

func NewBootstrapHandler(q *db.Queries, secret string) *BootstrapHandler {
	return &BootstrapHandler{q: q, bootstrapSecret: secret}
}

func (h *BootstrapHandler) authorize(r *http.Request) bool {
	return r.Header.Get("x-bootstrap-secret") == h.bootstrapSecret
}

// GET /api/internal/bootstrap-admin
func (h *BootstrapHandler) Status(w http.ResponseWriter, r *http.Request) {
	if !h.authorize(r) {
		writeError(w, http.StatusNotFound, "not found")
		return
	}

	count, err := h.q.GetAdminCount(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"bootstrapped":    count > 0,
		"superAdminCount": count,
	})
}

// POST /api/internal/bootstrap-admin
func (h *BootstrapHandler) Create(w http.ResponseWriter, r *http.Request) {
	if !h.authorize(r) {
		writeError(w, http.StatusNotFound, "not found")
		return
	}

	count, err := h.q.GetAdminCount(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}
	if count > 0 {
		writeError(w, http.StatusConflict, "an admin account already exists")
		return
	}

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
		writeError(w, http.StatusBadRequest, "name, email, and password (min 8 chars) required")
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
		Role:         "admin",
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create admin: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"mode":   "created",
		"userId": user.ID,
	})
}

// PATCH /api/internal/bootstrap-admin
func (h *BootstrapHandler) Update(w http.ResponseWriter, r *http.Request) {
	if !h.authorize(r) {
		writeError(w, http.StatusNotFound, "not found")
		return
	}

	body, err := decode[struct {
		UserID       *string `json:"userId"`
		CurrentEmail *string `json:"currentEmail"`
		Name         *string `json:"name"`
		Email        *string `json:"email"`
		Password     *string `json:"password"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if body.Name == nil && body.Email == nil && body.Password == nil {
		writeError(w, http.StatusBadRequest, "provide at least one of name, email, or password")
		return
	}

	// Build partial update params
	params := db.UpdateAdminByIDParams{}

	if body.Name != nil {
		params.Name = body.Name
	}
	if body.Email != nil {
		params.Email = body.Email
	}
	if body.Password != nil {
		if len(*body.Password) < 8 {
			writeError(w, http.StatusBadRequest, "password must be at least 8 characters")
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(*body.Password), bcrypt.DefaultCost)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not hash password")
			return
		}
		s := string(hash)
		params.PasswordHash = &s
	}

	// Resolve target admin
	if body.UserID != nil {
		uid, err := parseUUID(*body.UserID)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid userId")
			return
		}
		params.ID = uid
		user, err := h.q.UpdateAdminByID(r.Context(), params)
		if err != nil {
			writeError(w, http.StatusNotFound, "admin not found")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"userId": user.ID})
		return
	}

	if body.CurrentEmail != nil {
		var hashPtr *string
		if body.Password != nil {
			hash, err := bcrypt.GenerateFromPassword([]byte(*body.Password), bcrypt.DefaultCost)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "could not hash password")
				return
			}
			s := string(hash)
			hashPtr = &s
		}
		emailParams := db.UpdateAdminByEmailParams{
			Email:        *body.CurrentEmail,
			NewEmail:     body.Email,
			Name:         body.Name,
			PasswordHash: hashPtr,
		}
		user, err := h.q.UpdateAdminByEmail(r.Context(), emailParams)
		if err != nil {
			writeError(w, http.StatusNotFound, "admin with that email not found")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"userId": user.ID})
		return
	}

	// Auto-select: only valid if exactly one admin exists
	count, _ := h.q.GetAdminCount(r.Context())
	if count != 1 {
		writeError(w, http.StatusBadRequest, "multiple admins exist — provide userId or currentEmail to target one")
		return
	}
	admin, err := h.q.GetFirstAdmin(r.Context())
	if err != nil {
		writeError(w, http.StatusNotFound, "no admin found")
		return
	}
	params.ID = admin.ID
	user, err := h.q.UpdateAdminByID(r.Context(), params)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "update failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"userId": user.ID})
}
