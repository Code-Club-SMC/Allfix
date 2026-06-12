package handler

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/AbdulRehman-z/allfix/internal/db/sqlc"
)

type AdminServicesHandler struct {
	q *db.Queries
}

func NewAdminServicesHandler(q *db.Queries) *AdminServicesHandler {
	return &AdminServicesHandler{q: q}
}

// POST /api/admin/services
func (h *AdminServicesHandler) Create(w http.ResponseWriter, r *http.Request) {
	body, err := decode[struct {
		Name                string   `json:"name"`
		Description         string   `json:"description"`
		Icon                string   `json:"icon"`
		ParentID            *string  `json:"parentId"`
		IsSubcategory       bool     `json:"isSubcategory"`
		ImageUrl            *string  `json:"imageUrl"`
		Price               *string  `json:"price"`
		DiscountPercentage  *int32   `json:"discountPercentage"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if body.Name == "" || body.Description == "" {
		writeError(w, http.StatusBadRequest, "name and description are required")
		return
	}

	icon := body.Icon
	if icon == "" {
		icon = "wrench"
	}

	params := db.CreateServiceParams{
		Name:          body.Name,
		Description:   body.Description,
		Icon:          icon,
		IsSubcategory: body.IsSubcategory,
		ImageUrl:      body.ImageUrl,
	}

	// Parse price if provided
	if body.Price != nil && *body.Price != "" {
		var price pgtype.Numeric
		if err := price.Scan(*body.Price); err != nil {
			writeError(w, http.StatusBadRequest, "invalid price value")
			return
		}
		params.Price = price
	}

	if body.DiscountPercentage != nil {
		params.DiscountPercentage = *body.DiscountPercentage
	}

	if body.ParentID != nil && *body.ParentID != "" {
		pid, err := parseUUID(*body.ParentID)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid parentId")
			return
		}
		// Validate parent exists and is not itself a sub-category
		parent, err := h.q.GetServiceByID(r.Context(), pid)
		if err != nil {
			writeError(w, http.StatusBadRequest, "parent service not found")
			return
		}
		if parent.IsSubcategory {
			writeError(w, http.StatusBadRequest, "cannot nest sub-categories")
			return
		}
		params.ParentID = pgtype.UUID{Bytes: pid, Valid: true}
		params.IsSubcategory = true
	}

	svc, err := h.q.CreateService(r.Context(), params)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create service")
		return
	}

	writeJSON(w, http.StatusCreated, svc)
}

// PATCH /api/admin/services/{id}
func (h *AdminServicesHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	body, err := decode[struct {
		Name                *string  `json:"name"`
		Description         *string  `json:"description"`
		Icon                *string  `json:"icon"`
		ParentID            *string  `json:"parentId"`
		IsSubcategory       *bool    `json:"isSubcategory"`
		ImageUrl            *string  `json:"imageUrl"`
		Price               *string  `json:"price"`
		DiscountPercentage  *int32   `json:"discountPercentage"`
		Rating              *string  `json:"rating"`
		ReviewCount         *int32   `json:"reviewCount"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	params := db.UpdateServiceParams{
		ID:          id,
		Name:        body.Name,
		Description: body.Description,
		Icon:        body.Icon,
		ImageUrl:    body.ImageUrl,
	}

	// Parse price if provided
	if body.Price != nil && *body.Price != "" {
		var price pgtype.Numeric
		if err := price.Scan(*body.Price); err != nil {
			writeError(w, http.StatusBadRequest, "invalid price value")
			return
		}
		params.Price = price
	}

	if body.DiscountPercentage != nil {
		params.DiscountPercentage = body.DiscountPercentage
	}

	if body.Rating != nil && *body.Rating != "" {
		var rating pgtype.Numeric
		if err := rating.Scan(*body.Rating); err != nil {
			writeError(w, http.StatusBadRequest, "invalid rating value")
			return
		}
		params.Rating = rating
	}

	if body.ReviewCount != nil {
		params.ReviewCount = body.ReviewCount
	}

	if body.ParentID != nil {
		if *body.ParentID == "" {
			// Clear parent (set to NULL)
			params.ParentID = pgtype.UUID{Valid: false}
			params.IsSubcategory = func() *bool { b := false; return &b }()
		} else {
			pid, err := parseUUID(*body.ParentID)
			if err != nil {
				writeError(w, http.StatusBadRequest, "invalid parentId")
				return
			}
			// Validate parent exists and is not itself a sub-category
			parent, err := h.q.GetServiceByID(r.Context(), pid)
			if err != nil {
				writeError(w, http.StatusBadRequest, "parent service not found")
				return
			}
			if parent.IsSubcategory {
				writeError(w, http.StatusBadRequest, "cannot nest sub-categories")
				return
			}
			params.ParentID = pgtype.UUID{Bytes: pid, Valid: true}
			params.IsSubcategory = func() *bool { b := true; return &b }()
		}
	}
	if body.IsSubcategory != nil {
		params.IsSubcategory = body.IsSubcategory
	}

	svc, err := h.q.UpdateService(r.Context(), params)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update service")
		return
	}

	writeJSON(w, http.StatusOK, svc)
}

// DELETE /api/admin/services/{id}
func (h *AdminServicesHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	// Check if service has sub-categories
	count, err := h.q.CountSubCategories(r.Context(), pgtype.UUID{Bytes: id, Valid: true})
	if err == nil && count > 0 {
		writeError(w, http.StatusBadRequest, "cannot delete service with sub-categories")
		return
	}

	if err := h.q.DeleteService(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete service")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GET /api/admin/services/hierarchical
func (h *AdminServicesHandler) ListHierarchical(w http.ResponseWriter, r *http.Request) {
	services, err := h.q.ListAllServicesWithParent(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch services")
		return
	}
	writeJSON(w, http.StatusOK, services)
}

// GET /api/admin/services/categories
func (h *AdminServicesHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	categories, err := h.q.ListServiceCategories(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch categories")
		return
	}
	writeJSON(w, http.StatusOK, categories)
}

// GET /api/admin/services/categories-with-counts
func (h *AdminServicesHandler) ListCategoriesWithCounts(w http.ResponseWriter, r *http.Request) {
	categories, err := h.q.ListCategoriesWithCounts(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch categories")
		return
	}
	writeJSON(w, http.StatusOK, categories)
}

// GET /api/admin/services/category/{id}
func (h *AdminServicesHandler) GetCategoryWithServices(w http.ResponseWriter, r *http.Request) {
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
