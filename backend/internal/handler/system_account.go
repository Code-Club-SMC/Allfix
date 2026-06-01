package handler

import (
	"context"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/AbdulRehman-z/allfix/internal/db/sqlc"
)

type SystemAccountHandler struct {
	q *db.Queries
}

func NewSystemAccountHandler(q *db.Queries) *SystemAccountHandler {
	return &SystemAccountHandler{q: q}
}

// GET /api/admin/finance/account
func (h *SystemAccountHandler) GetAccount(w http.ResponseWriter, r *http.Request) {
	accounts, err := h.q.ListSystemAccounts(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch accounts")
		return
	}
	if len(accounts) == 0 {
		writeJSON(w, http.StatusOK, map[string]any{
			"accounts": []any{},
			"balance":  "0.00",
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"accounts": accounts,
		"balance":  accounts[0].CurrentBalance,
	})
}

// GET /api/admin/finance/transactions
func (h *SystemAccountHandler) ListTransactions(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(q.Get("pageSize"))
	if pageSize < 1 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	// Get default account (first one)
	accounts, err := h.q.ListSystemAccounts(r.Context())
	if err != nil || len(accounts) == 0 {
		writeError(w, http.StatusInternalServerError, "no system account found")
		return
	}
	accountID := accounts[0].ID

	transactions, err := h.q.ListAccountTransactions(r.Context(), db.ListAccountTransactionsParams{
		AccountID: accountID,
		Limit:     int32(pageSize),
		Offset:    int32(offset),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch transactions")
		return
	}

	total, _ := h.q.CountAccountTransactions(r.Context(), accountID)
	writePaginated(w, transactions, total, page, pageSize)
}

// DeductFromAccount is a helper to deduct amount from the default account and record a transaction
func (h *SystemAccountHandler) DeductFromAccount(ctx context.Context, amount string, transactionType string, description string, referenceType string, referenceID *uuid.UUID) error {
	accounts, err := h.q.ListSystemAccounts(ctx)
	if err != nil || len(accounts) == 0 {
		return err
	}
	accountID := accounts[0].ID

	// Update balance
	deltaStr := "-" + amount
	_, err = h.q.UpdateAccountBalance(ctx, db.UpdateAccountBalanceParams{
		ID:             accountID,
		CurrentBalance: stringToPgNumeric(&deltaStr),
	})
	if err != nil {
		return err
	}

	// Record transaction
	var refUUID pgtype.UUID
	if referenceID != nil {
		refUUID = pgtype.UUID{Bytes: *referenceID, Valid: true}
	}
	_, err = h.q.CreateAccountTransaction(ctx, db.CreateAccountTransactionParams{
		AccountID:       accountID,
		TransactionType: transactionType,
		Amount:          stringToPgNumeric(&amount),
		Description:     description,
		ReferenceType:   func() *string { if referenceType != "" { return &referenceType }; return nil }(),
		ReferenceID:     refUUID,
	})
	return err
}

// AddToAccount is a helper to add amount to the default account and record a transaction
func (h *SystemAccountHandler) AddToAccount(ctx context.Context, amount string, transactionType string, description string, referenceType string, referenceID *uuid.UUID) error {
	accounts, err := h.q.ListSystemAccounts(ctx)
	if err != nil || len(accounts) == 0 {
		return err
	}
	accountID := accounts[0].ID

	// Update balance
	_, err = h.q.UpdateAccountBalance(ctx, db.UpdateAccountBalanceParams{
		ID:             accountID,
		CurrentBalance: stringToPgNumeric(&amount),
	})
	if err != nil {
		return err
	}

	// Record transaction
	var refUUID pgtype.UUID
	if referenceID != nil {
		refUUID = pgtype.UUID{Bytes: *referenceID, Valid: true}
	}
	_, err = h.q.CreateAccountTransaction(ctx, db.CreateAccountTransactionParams{
		AccountID:       accountID,
		TransactionType: transactionType,
		Amount:          stringToPgNumeric(&amount),
		Description:     description,
		ReferenceType:   func() *string { if referenceType != "" { return &referenceType }; return nil }(),
		ReferenceID:     refUUID,
	})
	return err
}
