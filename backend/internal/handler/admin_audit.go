package handler

import (
	"net/http"

	db "github.com/AbdulRehman-z/allfix/internal/db/sqlc"
)

type AdminAuditHandler struct {
	q *db.Queries
}

func NewAdminAuditHandler(q *db.Queries) *AdminAuditHandler {
	return &AdminAuditHandler{q: q}
}

// GET /api/admin/audit-logs
func (h *AdminAuditHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	entityType := q.Get("entityType")

	page, pageSize := parsePagination(r)
	offset := (page - 1) * pageSize

	logs, err := h.q.ListAuditLogs(r.Context(), db.ListAuditLogsParams{
		Column1: entityType,
		Limit:   int32(pageSize),
		Offset:  int32(offset),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch audit logs")
		return
	}

	total, _ := h.q.CountAuditLogs(r.Context(), db.CountAuditLogsParams{
		Column1: entityType,
	})
	writePaginated(w, logs, total, page, pageSize)
}
