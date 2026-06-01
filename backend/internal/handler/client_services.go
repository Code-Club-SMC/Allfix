package handler

import (
	"net/http"

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
