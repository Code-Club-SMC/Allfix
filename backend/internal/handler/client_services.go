package handler

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/AbdulRehman-z/allfix/internal/db/sqlc"
)

type ClientServicesHandler struct {
	q *db.Queries
}

func NewClientServicesHandler(q *db.Queries) *ClientServicesHandler {
	return &ClientServicesHandler{q: q}
}

// GET /api/services
func (h *ClientServicesHandler) List(w http.ResponseWriter, r *http.Request) {
	services, err := h.q.ListServices(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch services")
		return
	}
	writeJSON(w, http.StatusOK, services)
}

// GET /api/services/categories
func (h *ClientServicesHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	categories, err := h.q.ListCategoriesWithCounts(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch categories")
		return
	}
	writeJSON(w, http.StatusOK, categories)
}

// GET /api/services/category/{id}
func (h *ClientServicesHandler) GetCategory(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	category, err := h.q.GetCategoryWithCount(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "category not found")
		return
	}

	services, err := h.q.ListServicesByCategory(r.Context(), pgtype.UUID{Bytes: id, Valid: true})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch services")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"category": category,
		"services": services,
	})
}
