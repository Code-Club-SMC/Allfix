package handler

import (
	"fmt"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	db "github.com/AbdulRehman-z/allfix/internal/db/sqlc"
)

type AdminDataHandler struct {
	pool *pgxpool.Pool
	q    *db.Queries
}

func NewAdminDataHandler(pool *pgxpool.Pool, q *db.Queries) *AdminDataHandler {
	return &AdminDataHandler{pool: pool, q: q}
}

// POST /api/admin/data/clear
func (h *AdminDataHandler) ClearData(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	tx, err := h.pool.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not begin transaction")
		return
	}
	defer tx.Rollback(ctx)

	// Delete in dependency order (children first, parents last)
	deleteOrder := []string{
		"worker_commissions",
		"invoice_commissions",
		"invoice_line_items",
		"invoices",
		"salary_payments",
		"advance_deductions",
		"worker_advances",
		"request_line_items",
		"request_images",
		"request_workers",
		"request_vendors",
		"service_requests",
		"audit_logs",
		"account_transactions",
		"expenses",
		"income",
		"inventory",
	}

	for _, t := range deleteOrder {
		if _, err := tx.Exec(ctx, fmt.Sprintf("DELETE FROM %s", t)); err != nil {
			writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to clear %s: %v", t, err))
			return
		}
	}

	// Reset account balance
	if _, err := tx.Exec(ctx, "UPDATE system_accounts SET current_balance = 0"); err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to reset account: %v", err))
		return
	}

	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "could not commit transaction")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Database cleared"})
}
