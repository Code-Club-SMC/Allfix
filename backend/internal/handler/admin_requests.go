package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/AbdulRehman-z/allfix/internal/db/sqlc"
	"github.com/AbdulRehman-z/allfix/internal/middleware"
)

type AdminRequestsHandler struct {
	q *db.Queries
}

func NewAdminRequestsHandler(q *db.Queries) *AdminRequestsHandler {
	return &AdminRequestsHandler{q: q}
}

// GET /api/admin/requests
func (h *AdminRequestsHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	status := q.Get("status")
	urgency := q.Get("urgency")
	search := q.Get("search")
	assignmentType := q.Get("assignment_type")

	var serviceID uuid.UUID
	if sid := q.Get("serviceId"); sid != "" {
		if parsed, err := uuid.Parse(sid); err == nil {
			serviceID = parsed
		}
	}

	var fromDate, toDate time.Time
	if f := q.Get("from"); f != "" {
		if t, err := time.Parse("2006-01-02", f); err == nil {
			fromDate = t
		}
	}
	if t := q.Get("to"); t != "" {
		if parsed, err := time.Parse("2006-01-02", t); err == nil {
			toDate = parsed
		}
	}

	page, pageSize := parsePagination(r)
	offset := (page - 1) * pageSize

	requests, err := h.q.ListAllRequests(r.Context(), db.ListAllRequestsParams{
		Column1: status,
		Column2: urgency,
		Column3: serviceID,
		Column4: search,
		Limit:   int32(pageSize),
		Offset:  int32(offset),
		Column7: fromDate,
		Column8: toDate,
		Column9: assignmentType,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch requests")
		return
	}

	total, _ := h.q.CountAllRequests(r.Context(), db.CountAllRequestsParams{
		Column1: status,
		Column2: urgency,
		Column3: serviceID,
		Column4: search,
		Column5: fromDate,
		Column6: toDate,
	})

	// Map []byte STRING_AGG results to string so JSON serializes as plain text
	// (sqlc generates []byte for STRING_AGG results with pgx driver)
	type requestRow struct {
		db.ListAllRequestsRow
		ServiceSummary string `json:"service_summary"`
		WorkerNames    string `json:"worker_names"`
	}
	mapped := make([]requestRow, len(requests))
	for i, r := range requests {
		mapped[i] = requestRow{
			ListAllRequestsRow: r,
			ServiceSummary:     string(r.ServiceSummary),
			WorkerNames:        string(r.WorkerNames),
		}
	}

	writePaginated(w, mapped, total, page, pageSize)
}

// GET /api/admin/requests/{id}
func (h *AdminRequestsHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	req, err := h.q.GetRequestByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "request not found")
		return
	}

	images, _ := h.q.ListRequestImages(r.Context(), req.ID)
	services, _ := h.q.ListRequestLineItems(r.Context(), req.ID)
	writeJSON(w, http.StatusOK, map[string]any{
		"request":  req,
		"images":   images,
		"services": services,
	})
}

// GET /api/admin/requests/{id}/workers
func (h *AdminRequestsHandler) ListRequestWorkers(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	workers, err := h.q.ListWorkersByRequest(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch request workers")
		return
	}

	writeJSON(w, http.StatusOK, workers)
}

// POST /api/admin/requests/{id}/workers
func (h *AdminRequestsHandler) AssignWorkers(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	body, err := decode[struct {
		WorkerIDs []string `json:"workerIds"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.q.ClearRequestWorkers(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "could not clear workers")
		return
	}

	// Clear vendor assignment when assigning workers (mutual exclusivity)
	if err := h.q.RemoveVendorFromRequest(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "could not remove vendor")
		return
	}
	if _, err := h.q.ClearRequestVendor(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "could not clear vendor")
		return
	}

	actorID, _ := middleware.UserIDFromContext(r.Context())
	actor := uuidToPgtype(&actorID)

	var workerUUIDs []uuid.UUID
	for _, wid := range body.WorkerIDs {
		parsed, err := uuid.Parse(wid)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid workerIds")
			return
		}
		workerUUIDs = append(workerUUIDs, parsed)
		if err := h.q.AssignWorkerToRequest(r.Context(), db.AssignWorkerToRequestParams{
			RequestID:  id,
			WorkerID:   parsed,
			AssignedBy: actor,
		}); err != nil {
			writeError(w, http.StatusInternalServerError, "could not assign workers")
			return
		}
	}

	var primary *uuid.UUID
	if len(workerUUIDs) > 0 {
		primary = &workerUUIDs[0]
	}
	_, err = h.q.SetRequestAssignedWorker(r.Context(), db.SetRequestAssignedWorkerParams{
		ID:               id,
		AssignedWorkerID: uuidToPgtype(primary),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update request")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"workerIds": body.WorkerIDs})
}

// PATCH /api/admin/requests/{id}
func (h *AdminRequestsHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	body, err := decode[struct {
		Status           *string `json:"status"`
		AssignedWorkerID *string `json:"assignedWorkerId"`
		InternalNotes    *string `json:"internalNotes"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Fetch request to check current state
	existingReq, err := h.q.GetRequestByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "request not found")
		return
	}

	// Validate: cannot advance status past "pending" without workers or vendor
	if body.Status != nil && *body.Status != "pending" && existingReq.Status == "pending" {
		workerCount, _ := h.q.CountRequestWorkers(r.Context(), id)
		hasVendor := existingReq.VendorID.Valid
		if workerCount == 0 && !hasVendor {
			writeError(w, http.StatusBadRequest, "cannot change status: no workers or vendor assigned")
			return
		}
	}

	params := db.UpdateRequestParams{
		ID:            id,
		Status:        body.Status,
		InternalNotes: body.InternalNotes,
	}
	if body.AssignedWorkerID != nil {
		wid, err := uuid.Parse(*body.AssignedWorkerID)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid assignedWorkerId")
			return
		}
		params.AssignedWorkerID = uuidToPgtype(&wid)
	}

	req, err := h.q.UpdateRequest(r.Context(), params)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update request")
		return
	}

	writeJSON(w, http.StatusOK, req)
}

// POST /api/admin/requests/{id}/vendor
func (h *AdminRequestsHandler) AssignVendorToRequest(w http.ResponseWriter, r *http.Request) {
	requestID, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	body, err := decode[struct {
		VendorID string `json:"vendor_id"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	vendorID, err := uuid.Parse(body.VendorID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid vendor_id")
		return
	}

	// Check vendor exists and is active
	vendor, err := h.q.GetVendorByID(r.Context(), vendorID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Vendor not found")
		return
	}

	if vendor.Status != "active" {
		writeError(w, http.StatusBadRequest, "Cannot assign inactive vendor to request")
		return
	}

	// Check if vendor is already assigned
	_, err = h.q.GetRequestVendorDetails(r.Context(), requestID)
	if err == nil {
		writeError(w, http.StatusConflict, "Request already has a vendor assigned")
		return
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusInternalServerError, "could not check vendor assignment")
		return
	}

	// Clear assigned workers
	if err := h.q.ClearRequestWorkers(r.Context(), requestID); err != nil {
		writeError(w, http.StatusInternalServerError, "could not clear workers")
		return
	}
	if _, err := h.q.SetRequestAssignedWorker(r.Context(), db.SetRequestAssignedWorkerParams{
		ID:               requestID,
		AssignedWorkerID: pgtype.UUID{Valid: false},
	}); err != nil {
		writeError(w, http.StatusInternalServerError, "could not clear assigned worker")
		return
	}

	// Assign vendor to request_vendors table
	requestVendor, err := h.q.AssignVendorToRequest(r.Context(), db.AssignVendorToRequestParams{
		RequestID: requestID,
		VendorID:  vendorID,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not assign vendor")
		return
	}

	// Update service_requests.vendor_id
	_, err = h.q.SetRequestVendor(r.Context(), db.SetRequestVendorParams{
		ID:       requestID,
		VendorID: uuidToPgtype(&vendorID),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update request vendor")
		return
	}

	// Create audit log
	auditLog(r.Context(), h.q, "vendor.assigned", "request", requestID, map[string]any{
		"vendor_id":   vendorID.String(),
		"vendor_name": vendor.Name,
	})

	writeJSON(w, http.StatusOK, requestVendor)
}

// DELETE /api/admin/requests/{id}/vendor
func (h *AdminRequestsHandler) RemoveVendorFromRequest(w http.ResponseWriter, r *http.Request) {
	requestID, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	// Get vendor details before removing for audit log
	vendorDetails, err := h.q.GetRequestVendorDetails(r.Context(), requestID)
	if err != nil {
		writeError(w, http.StatusNotFound, "No vendor assigned to this request")
		return
	}

	// Remove from request_vendors table
	err = h.q.RemoveVendorFromRequest(r.Context(), requestID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not remove vendor assignment")
		return
	}

	// Clear vendor_id from service_requests
	_, err = h.q.ClearRequestVendor(r.Context(), requestID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not clear request vendor")
		return
	}

	// Create audit log
	auditLog(r.Context(), h.q, "vendor.unassigned", "request", requestID, map[string]any{
		"vendor_id":   vendorDetails.VendorID.String(),
		"vendor_name": vendorDetails.VendorName,
	})

	writeJSON(w, http.StatusOK, map[string]string{"message": "Vendor removed successfully"})
}


