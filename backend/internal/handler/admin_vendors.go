package handler

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"

	db "github.com/AbdulRehman-z/allfix/internal/db/sqlc"
)

type AdminVendorsHandler struct {
	q *db.Queries
}

func NewAdminVendorsHandler(q *db.Queries) *AdminVendorsHandler {
	return &AdminVendorsHandler{q: q}
}

// Validation helpers
var (
	// Phone format: supports +92-XXX-XXXXXXX, +92XXXXXXXXXX, 03XX-XXXXXXX, etc.
	phoneRegex = regexp.MustCompile(`^(\+92|0)?[0-9]{3}-?[0-9]{7,8}$`)
	// Email format: basic email validation
	emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
)

func validatePhone(phone string) bool {
	if phone == "" {
		return false
	}
	return phoneRegex.MatchString(phone)
}

func validateEmail(email string) bool {
	if email == "" {
		return true // email is optional
	}
	return emailRegex.MatchString(email)
}

func validateServicesOffered(services []string) bool {
	if len(services) == 0 {
		return false
	}
	for _, s := range services {
		if strings.TrimSpace(s) == "" {
			return false
		}
	}
	return true
}

// POST /api/admin/vendors
func (h *AdminVendorsHandler) CreateVendorHandler(w http.ResponseWriter, r *http.Request) {
	body, err := decode[struct {
		Name            string   `json:"name"`
		ContactName     *string  `json:"contactName"`
		ContactPhone    string   `json:"contactPhone"`
		ContactEmail    *string  `json:"contactEmail"`
		ServicesOffered []string `json:"servicesOffered"`
		Notes           *string  `json:"notes"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate required fields
	if strings.TrimSpace(body.Name) == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}

	if !validatePhone(body.ContactPhone) {
		writeError(w, http.StatusBadRequest, "invalid phone format")
		return
	}

	if body.ContactEmail != nil && !validateEmail(*body.ContactEmail) {
		writeError(w, http.StatusBadRequest, "invalid email format")
		return
	}

	if !validateServicesOffered(body.ServicesOffered) {
		writeError(w, http.StatusBadRequest, "services_offered must contain at least one non-empty service")
		return
	}

	vendor, err := h.q.CreateVendor(r.Context(), db.CreateVendorParams{
		Name:            body.Name,
		ContactName:     body.ContactName,
		ContactPhone:    body.ContactPhone,
		ContactEmail:    body.ContactEmail,
		ServicesOffered: body.ServicesOffered,
		Notes:           body.Notes,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create vendor")
		return
	}

	// Create audit log
	auditLog(r.Context(), h.q, "vendor.created", "vendor", vendor.ID, map[string]any{
		"vendor_id":   vendor.ID.String(),
		"vendor_name": vendor.Name,
	})

	writeJSON(w, http.StatusCreated, vendor)
}

// GET /api/admin/vendors/:id
func (h *AdminVendorsHandler) GetVendorHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	vendor, err := h.q.GetVendorByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "vendor not found")
		return
	}

	writeJSON(w, http.StatusOK, vendor)
}

// GET /api/admin/vendors
func (h *AdminVendorsHandler) ListVendorsHandler(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	search := q.Get("search")
	status := q.Get("status")
	page, pageSize := parsePagination(r)
	offset := (page - 1) * pageSize

	vendors, err := h.q.ListVendors(r.Context(), db.ListVendorsParams{
		Search: stringToPtr(search),
		Status: stringToPtr(status),
		Limit:  int32(pageSize),
		Offset: int32(offset),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch vendors")
		return
	}

	total, _ := h.q.CountVendors(r.Context(), db.CountVendorsParams{
		Search: stringToPtr(search),
		Status: stringToPtr(status),
	})
	writePaginated(w, vendors, total, page, pageSize)
}

// PUT /api/admin/vendors/:id
func (h *AdminVendorsHandler) UpdateVendorHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	body, err := decode[struct {
		Name            *string  `json:"name"`
		ContactName     *string  `json:"contactName"`
		ContactPhone    *string  `json:"contactPhone"`
		ContactEmail    *string  `json:"contactEmail"`
		ServicesOffered []string `json:"servicesOffered"`
		Notes           *string  `json:"notes"`
		Status          *string  `json:"status"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate name if provided
	if body.Name != nil && strings.TrimSpace(*body.Name) == "" {
		writeError(w, http.StatusBadRequest, "name cannot be empty")
		return
	}

	// Validate phone if provided
	if body.ContactPhone != nil && !validatePhone(*body.ContactPhone) {
		writeError(w, http.StatusBadRequest, "invalid phone format")
		return
	}

	// Validate email if provided
	if body.ContactEmail != nil && !validateEmail(*body.ContactEmail) {
		writeError(w, http.StatusBadRequest, "invalid email format")
		return
	}

	// Validate services_offered if provided
	if body.ServicesOffered != nil && !validateServicesOffered(body.ServicesOffered) {
		writeError(w, http.StatusBadRequest, "services_offered must contain at least one non-empty service")
		return
	}

	// Validate status if provided
	if body.Status != nil {
		status := *body.Status
		if status != "active" && status != "inactive" {
			writeError(w, http.StatusBadRequest, "status must be 'active' or 'inactive'")
			return
		}
	}

	vendor, err := h.q.UpdateVendor(r.Context(), db.UpdateVendorParams{
		ID:              id,
		Name:            body.Name,
		ContactName:     body.ContactName,
		ContactPhone:    body.ContactPhone,
		ContactEmail:    body.ContactEmail,
		ServicesOffered: body.ServicesOffered,
		Notes:           body.Notes,
		Status:          body.Status,
	})
	if err != nil {
		writeError(w, http.StatusNotFound, "vendor not found")
		return
	}

	writeJSON(w, http.StatusOK, vendor)
}

// DELETE /api/admin/vendors/:id
func (h *AdminVendorsHandler) DeleteVendorHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	// Get vendor name for audit log and error messages
	vendor, err := h.q.GetVendorByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "vendor not found")
		return
	}

	// Check for assigned requests before deleting
	assignedCount, err := h.q.CountVendorAssignedRequests(r.Context(), uuidToPgtype(&id))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not check vendor assignments")
		return
	}
	if assignedCount > 0 {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("cannot delete vendor with %d assigned request(s). Reassign or remove them first.", assignedCount))
		return
	}

	_, err = h.q.DeleteVendor(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete vendor")
		return
	}

	auditLog(r.Context(), h.q, "vendor.deleted", "vendor", id, map[string]any{
		"vendor_name": vendor.Name,
	})

	w.WriteHeader(http.StatusNoContent)
}

// GET /api/admin/vendors/:id/profile
func (h *AdminVendorsHandler) GetVendorProfile(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	profile, err := h.q.GetVendorProfile(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "vendor not found")
		return
	}

	pgID := uuidToPgtype(&id)
	invoices, err := h.q.GetVendorInvoices(r.Context(), pgID)
	if err != nil {
		invoices = []db.GetVendorInvoicesRow{}
	}

	requests, err := h.q.GetVendorRequests(r.Context(), pgID)
	if err != nil {
		requests = []db.GetVendorRequestsRow{}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"profile":  profile,
		"invoices": invoices,
		"requests": requests,
	})
}
