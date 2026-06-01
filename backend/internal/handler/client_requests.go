package handler

import (
	"fmt"
	"net/http"
	"time"

	jwt "github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	db "github.com/AbdulRehman-z/allfix/internal/db/sqlc"
	mw "github.com/AbdulRehman-z/allfix/internal/middleware"
)

type ClientRequestsHandler struct {
	pool      *pgxpool.Pool
	q         *db.Queries
	jwtSecret string
	jwtExpiry time.Duration
	cookie    CookieConfig
}

func NewClientRequestsHandler(pool *pgxpool.Pool, q *db.Queries, jwtSecret string, expiryHours int, cookie CookieConfig) *ClientRequestsHandler {
	return &ClientRequestsHandler{
		pool:      pool,
		q:         q,
		jwtSecret: jwtSecret,
		jwtExpiry: time.Duration(expiryHours) * time.Hour,
		cookie:    cookie,
	}
}

// POST /api/requests
func (h *ClientRequestsHandler) Create(w http.ResponseWriter, r *http.Request) {
	body, err := decode[struct {
		ServiceID     string   `json:"serviceId"`
		ServiceIDs    []string `json:"serviceIds"`
		Description   string   `json:"description"`
		PreferredDate string   `json:"preferredDate"`
		PreferredTime string   `json:"preferredTime"`
		Urgency       string   `json:"urgency"`
		FullName      string   `json:"fullName"`
		Phone         string   `json:"phone"`
		Email         string   `json:"email"`
		Address       string   `json:"address"`
		City          string   `json:"city"`
		Area          string   `json:"area"`
		ImageURLs     []string `json:"imageUrls"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not start request transaction")
		return
	}
	defer func() {
		_ = tx.Rollback(r.Context())
	}()

	qtx := h.q.WithTx(tx)

	var clientID uuid.UUID
	var clientRole string
	if id, ok := mw.UserIDFromContext(r.Context()); ok {
		clientID = id
	} else {
		// Anonymous submission: Auto-create or find user
		user, err := qtx.GetUserByEmail(r.Context(), body.Email)
		if err != nil {
			// Needs a dummy password since it's required
			user, err = qtx.CreateUser(r.Context(), db.CreateUserParams{
				Name:         body.FullName,
				Email:        body.Email,
				PasswordHash: "$2a$10$w3Yx.1Xv9R7d7fEIf.g9vOvQ2BOr0qR6jP5P/kU6Z4wP6Mv1T4e2G", // hashed "guest_account"
				Role:         "client",
			})
			if err != nil {
				writeError(w, http.StatusInternalServerError, "could not auto-create guest account")
				return
			}
		}
		clientID = user.ID
		clientRole = user.Role
	}

	// Support multiple service IDs (frontend sends serviceIds[]) but keep
	// backwards compatibility with single serviceId.
	serviceIDs := body.ServiceIDs
	if len(serviceIDs) == 0 && body.ServiceID != "" {
		serviceIDs = []string{body.ServiceID}
	}
	if len(serviceIDs) == 0 {
		writeError(w, http.StatusBadRequest, "serviceId required")
		return
	}

	// Use the first service as the primary service_id on the top-level request
	serviceID, err := parseUUID(serviceIDs[0])
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid serviceId")
		return
	}

	preferredDate, err := time.Parse("2006-01-02", body.PreferredDate)
	if err != nil {
		writeError(w, http.StatusBadRequest, "preferredDate must be YYYY-MM-DD")
		return
	}

	reqNumber := generateRequestNumber()

	req, err := qtx.CreateRequest(r.Context(), db.CreateRequestParams{
		RequestNumber: reqNumber,
		ClientID:      clientID,
		ServiceID:     serviceID,
		Description:   body.Description,
		PreferredDate: preferredDate,
		PreferredTime: body.PreferredTime,
		Urgency:       body.Urgency,
		FullName:      body.FullName,
		Phone:         body.Phone,
		Email:         body.Email,
		Address:       body.Address,
		City:          body.City,
		Area:          body.Area,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create request")
		return
	}

	for _, url := range body.ImageURLs {
		_, _ = qtx.CreateRequestImage(r.Context(), db.CreateRequestImageParams{
			RequestID: req.ID,
			Url:       url,
		})
	}

	// Insert line items for all selected services. Reject malformed ids so the
	// transaction can roll back cleanly instead of leaving a partial request.
	for _, sid := range serviceIDs {
		sidUUID, err := parseUUID(sid)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid serviceId")
			return
		}
		_, _ = qtx.CreateRequestLineItem(r.Context(), db.CreateRequestLineItemParams{
			RequestID: req.ID,
			ServiceID: sidUUID,
		})
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "could not finalize request")
		return
	}

	if clientRole != "" {
		// Auto-login the guest only after the request has been committed.
		token, _ := h.issueToken(clientID, clientRole)
		http.SetCookie(w, tokenCookie(token, int(h.jwtExpiry.Seconds()), h.cookie))
	}

	writeJSON(w, http.StatusCreated, req)
}

// GET /api/requests
func (h *ClientRequestsHandler) List(w http.ResponseWriter, r *http.Request) {
	clientID, ok := mw.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	page, pageSize := parsePagination(r)
	offset := (page - 1) * pageSize

	requests, err := h.q.ListRequestsByClient(r.Context(), db.ListRequestsByClientParams{
		ClientID: clientID,
		Limit:    int32(pageSize),
		Offset:   int32(offset),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch requests")
		return
	}

	total, _ := h.q.CountRequestsByClient(r.Context(), clientID)

	// Map []byte ServiceSummary to string so JSON serializes it as plain text
	// (sqlc generates []byte for STRING_AGG results with pgx driver)
	type clientRequestRow struct {
		db.ListRequestsByClientRow
		ServiceSummary string `json:"service_summary"`
	}
	mapped := make([]clientRequestRow, len(requests))
	for i, r := range requests {
		mapped[i] = clientRequestRow{
			ListRequestsByClientRow: r,
			ServiceSummary:          string(r.ServiceSummary),
		}
	}

	writePaginated(w, mapped, total, page, pageSize)
}

// GET /api/requests/{id}
func (h *ClientRequestsHandler) Get(w http.ResponseWriter, r *http.Request) {
	clientID, _ := mw.UserIDFromContext(r.Context())

	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request id")
		return
	}

	req, err := h.q.GetRequestByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "request not found")
		return
	}

	// Clients can only see their own requests
	if req.ClientID != clientID {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}

	images, _ := h.q.ListRequestImages(r.Context(), req.ID)
	// Also include line items (services) so clients and admins can show all
	// selected services for the request.
	items, _ := h.q.ListRequestLineItems(r.Context(), req.ID)
	writeJSON(w, http.StatusOK, map[string]any{
		"request":  req,
		"images":   images,
		"services": items,
	})
}

func generateRequestNumber() string {
	return fmt.Sprintf("CR-%d", time.Now().UnixNano()%100000)
}

func (h *ClientRequestsHandler) issueToken(userID uuid.UUID, role string) (string, error) {
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
	return token.SignedString([]byte(h.jwtSecret))
}
