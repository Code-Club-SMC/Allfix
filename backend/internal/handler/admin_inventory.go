package handler

import (
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/AbdulRehman-z/allfix/internal/db/sqlc"
)

type AdminInventoryHandler struct {
	q *db.Queries
}

func NewAdminInventoryHandler(q *db.Queries) *AdminInventoryHandler {
	return &AdminInventoryHandler{q: q}
}

// GET /api/admin/inventory
func (h *AdminInventoryHandler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.q.ListInventory(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch inventory")
		return
	}
	writeJSON(w, http.StatusOK, items)
}

// POST /api/admin/inventory
func (h *AdminInventoryHandler) Create(w http.ResponseWriter, r *http.Request) {
	body, err := decode[struct {
		Name              string  `json:"name"`
		Category          string  `json:"category"`
		Quantity          int32   `json:"quantity"`
		Unit              string  `json:"unit"`
		Condition         string  `json:"condition"`
		AssignedWorkerID  *string `json:"assignedWorkerId"`
		PurchaseDate      *string `json:"purchaseDate"`
		Cost              *string `json:"cost"`
		LowStockThreshold int32   `json:"lowStockThreshold"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	params := db.CreateInventoryItemParams{
		Name:              body.Name,
		Category:          body.Category,
		Quantity:          body.Quantity,
		Unit:              body.Unit,
		Condition:         body.Condition,
		Cost:              stringToPgNumeric(body.Cost),
		LowStockThreshold: body.LowStockThreshold,
	}

	if body.AssignedWorkerID != nil {
		wid, err := parseUUID(*body.AssignedWorkerID)
		if err == nil {
			params.AssignedWorkerID = pgtype.UUID{Bytes: wid, Valid: true}
		}
	}

	if body.PurchaseDate != nil {
		d, err := time.Parse("2006-01-02", *body.PurchaseDate)
		if err == nil {
			params.PurchaseDate = pgtype.Date{Time: d, Valid: true}
		}
	}

	item, err := h.q.CreateInventoryItem(r.Context(), params)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create inventory item")
		return
	}

	writeJSON(w, http.StatusCreated, item)
}

// PATCH /api/admin/inventory/{id}
func (h *AdminInventoryHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	body, err := decode[struct {
		Name              *string `json:"name"`
		Category          *string `json:"category"`
		Quantity          *int32  `json:"quantity"`
		Unit              *string `json:"unit"`
		Condition         *string `json:"condition"`
		AssignedWorkerID  *string `json:"assignedWorkerId"`
		PurchaseDate      *string `json:"purchaseDate"`
		Cost              *string `json:"cost"`
		LowStockThreshold *int32  `json:"lowStockThreshold"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	params := db.UpdateInventoryItemParams{
		ID:                id,
		Name:              body.Name,
		Category:          body.Category,
		Quantity:          body.Quantity,
		Unit:              body.Unit,
		Condition:         body.Condition,
		Cost:              stringToPgNumeric(body.Cost),
		LowStockThreshold: body.LowStockThreshold,
	}

	if body.AssignedWorkerID != nil {
		wid, err := parseUUID(*body.AssignedWorkerID)
		if err == nil {
			params.AssignedWorkerID = pgtype.UUID{Bytes: wid, Valid: true}
		}
	} else {
		params.AssignedWorkerID = pgtype.UUID{Valid: false}
	}

	if body.PurchaseDate != nil {
		d, err := time.Parse("2006-01-02", *body.PurchaseDate)
		if err == nil {
			params.PurchaseDate = pgtype.Date{Time: d, Valid: true}
		}
	} else {
		params.PurchaseDate = pgtype.Date{Valid: false}
	}

	item, err := h.q.UpdateInventoryItem(r.Context(), params)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update item")
		return
	}

	writeJSON(w, http.StatusOK, item)
}

// DELETE /api/admin/inventory/{id}
func (h *AdminInventoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	if err := h.q.DeleteInventoryItem(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete item")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
