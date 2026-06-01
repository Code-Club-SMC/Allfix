package handler

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	db "github.com/AbdulRehman-z/allfix/internal/db/sqlc"
)

type AdminFinanceHandler struct {
	q    *db.Queries
	pool *pgxpool.Pool
}

func NewAdminFinanceHandler(pool *pgxpool.Pool, q *db.Queries) *AdminFinanceHandler {
	return &AdminFinanceHandler{q: q, pool: pool}
}

// parseDateRange extracts optional from/to date params from the request.
func parseDateRange(r *http.Request) (fromDate, toDate *time.Time) {
	q := r.URL.Query()
	if f := q.Get("from"); f != "" {
		if t, err := time.Parse("2006-01-02", f); err == nil {
			fromDate = &t
		}
	}
	if t := q.Get("to"); t != "" {
		if parsed, err := time.Parse("2006-01-02", t); err == nil {
			toDate = &parsed
		}
	}
	return
}

// GET /api/admin/finance/overview
func (h *AdminFinanceHandler) Overview(w http.ResponseWriter, r *http.Request) {
	fromDate, toDate := parseDateRange(r)

	overview, err := h.q.GetFinanceOverview(r.Context(), db.GetFinanceOverviewParams{
		Column1: ptrTimeToTime(fromDate),
		Column2: ptrTimeToTime(toDate),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch finance overview")
		return
	}

	pendingPayables, _ := h.q.GetPendingPayables(r.Context())
	monthlyData, _ := h.q.GetMonthlyFinanceData(r.Context(), db.GetMonthlyFinanceDataParams{
		Column1: ptrTimeToTime(fromDate),
		Column2: ptrTimeToTime(toDate),
	})

	netProfit := subtractStrings(overview.TotalIncome, overview.TotalExpenses)

	writeJSON(w, http.StatusOK, map[string]any{
		"totalIncome":     overview.TotalIncome,
		"totalExpenses":   overview.TotalExpenses,
		"netProfit":       netProfit,
		"pendingPayables": pendingPayables,
		"monthlyData":     monthlyData,
	})
}

// GET /api/admin/finance/income
func (h *AdminFinanceHandler) ListIncome(w http.ResponseWriter, r *http.Request) {
	fromDate, toDate := parseDateRange(r)
	page, pageSize := parsePagination(r)
	offset := (page - 1) * pageSize

	income, err := h.q.ListIncome(r.Context(), db.ListIncomeParams{
		Limit:   int32(pageSize),
		Offset:  int32(offset),
		Column3: ptrTimeToTime(fromDate),
		Column4: ptrTimeToTime(toDate),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch income")
		return
	}

	total, _ := h.q.CountIncome(r.Context(), db.CountIncomeParams{
		Column1: ptrTimeToTime(fromDate),
		Column2: ptrTimeToTime(toDate),
	})
	writePaginated(w, income, total, page, pageSize)
}

// POST /api/admin/finance/income
func (h *AdminFinanceHandler) CreateIncome(w http.ResponseWriter, r *http.Request) {
	body, err := decode[struct {
		Date        string  `json:"date"`
		Description string  `json:"description"`
		Category    string  `json:"category"`
		Amount      string  `json:"amount"`
		Source      *string `json:"source"`
		ReceiptURL  *string `json:"receiptUrl"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	date, err := time.Parse("2006-01-02", body.Date)
	if err != nil {
		writeError(w, http.StatusBadRequest, "date must be YYYY-MM-DD")
		return
	}

	income, err := h.q.CreateIncome(r.Context(), db.CreateIncomeParams{
		Date:        date,
		Description: body.Description,
		Category:    body.Category,
		Amount:      stringToPgNumeric(&body.Amount),
		Source:      body.Source,
		ReceiptUrl:  body.ReceiptURL,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create income record")
		return
	}

	writeJSON(w, http.StatusCreated, income)
}

// GET /api/admin/finance/expenses
func (h *AdminFinanceHandler) ListExpenses(w http.ResponseWriter, r *http.Request) {
	fromDate, toDate := parseDateRange(r)
	page, pageSize := parsePagination(r)
	offset := (page - 1) * pageSize

	expenses, err := h.q.ListExpenses(r.Context(), db.ListExpensesParams{
		Limit:   int32(pageSize),
		Offset:  int32(offset),
		Column3: ptrTimeToTime(fromDate),
		Column4: ptrTimeToTime(toDate),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch expenses")
		return
	}

	total, _ := h.q.CountExpenses(r.Context(), db.CountExpensesParams{
		Column1: ptrTimeToTime(fromDate),
		Column2: ptrTimeToTime(toDate),
	})
	writePaginated(w, expenses, total, page, pageSize)
}

// POST /api/admin/finance/expenses
func (h *AdminFinanceHandler) CreateExpense(w http.ResponseWriter, r *http.Request) {
	body, err := decode[struct {
		Date        string  `json:"date"`
		Description string  `json:"description"`
		Category    string  `json:"category"`
		Amount      string  `json:"amount"`
		VendorPayee *string `json:"vendorPayee"`
		ReceiptURL  *string `json:"receiptUrl"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	date, err := time.Parse("2006-01-02", body.Date)
	if err != nil {
		writeError(w, http.StatusBadRequest, "date must be YYYY-MM-DD")
		return
	}

	// Wrap expense creation and account deduction in a transaction
	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not start transaction")
		return
	}
	defer tx.Rollback(r.Context())
	qtx := h.q.WithTx(tx)

	expense, err := qtx.CreateExpense(r.Context(), db.CreateExpenseParams{
		Date:        date,
		Description: body.Description,
		Category:    body.Category,
		Amount:      stringToPgNumeric(&body.Amount),
		VendorPayee: body.VendorPayee,
		ReceiptUrl:  body.ReceiptURL,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create expense record")
		return
	}

	// Deduct expense amount from system account
	accounts, err := qtx.ListSystemAccounts(r.Context())
	if err == nil && len(accounts) > 0 {
		accountID := accounts[0].ID
		deltaStr := "-" + body.Amount
		_, _ = qtx.UpdateAccountBalance(r.Context(), db.UpdateAccountBalanceParams{
			ID:             accountID,
			CurrentBalance: stringToPgNumeric(&deltaStr),
		})
		_, _ = qtx.CreateAccountTransaction(r.Context(), db.CreateAccountTransactionParams{
			AccountID:       accountID,
			TransactionType: "expense",
			Amount:          stringToPgNumeric(&body.Amount),
			Description:     fmt.Sprintf("Expense: %s", body.Description),
			ReferenceType:   func() *string { s := "expense"; return &s }(),
			ReferenceID:     pgtype.UUID{Bytes: expense.ID, Valid: true},
		})
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "could not commit transaction")
		return
	}

	writeJSON(w, http.StatusCreated, expense)
}

// PATCH /api/admin/finance/income/{id}
func (h *AdminFinanceHandler) UpdateIncome(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	body, err := decode[struct {
		Date        *string `json:"date"`
		Description *string `json:"description"`
		Category    *string `json:"category"`
		Amount      *string `json:"amount"`
		Source      *string `json:"source"`
		ReceiptURL  *string `json:"receiptUrl"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var date *time.Time
	if body.Date != nil {
		if d, err := time.Parse("2006-01-02", *body.Date); err == nil {
			date = &d
		}
	}

	income, err := h.q.UpdateIncome(r.Context(), db.UpdateIncomeParams{
		ID:          id,
		Date:        timeToPgDate(date),
		Description: body.Description,
		Category:    body.Category,
		Amount:      stringToPgNumeric(body.Amount),
		Source:      body.Source,
		ReceiptUrl:  body.ReceiptURL,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update income")
		return
	}

	writeJSON(w, http.StatusOK, income)
}

// DELETE /api/admin/finance/income/{id}
func (h *AdminFinanceHandler) DeleteIncome(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	if err := h.q.DeleteIncome(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete income")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// PATCH /api/admin/finance/expenses/{id}
func (h *AdminFinanceHandler) UpdateExpense(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	body, err := decode[struct {
		Date        *string `json:"date"`
		Description *string `json:"description"`
		Category    *string `json:"category"`
		Amount      *string `json:"amount"`
		VendorPayee *string `json:"vendorPayee"`
		ReceiptURL  *string `json:"receiptUrl"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Fetch old expense amount for account adjustment
	oldExpense, err := h.q.GetExpense(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch expense")
		return
	}

	var date *time.Time
	if body.Date != nil {
		if d, err := time.Parse("2006-01-02", *body.Date); err == nil {
			date = &d
		}
	}

	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not start transaction")
		return
	}
	defer tx.Rollback(r.Context())
	qtx := h.q.WithTx(tx)

	expense, err := qtx.UpdateExpense(r.Context(), db.UpdateExpenseParams{
		ID:           id,
		Date:         timeToPgDate(date),
		Description:  body.Description,
		Category:     body.Category,
		Amount:       stringToPgNumeric(body.Amount),
		VendorPayee:  body.VendorPayee,
		ReceiptUrl:   body.ReceiptURL,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update expense")
		return
	}

	// Adjust account balance if amount changed
	if body.Amount != nil {
		oldAmt, _ := strconv.ParseFloat(pgNumericToString(oldExpense.Amount), 64)
		newAmt, _ := strconv.ParseFloat(*body.Amount, 64)
		delta := oldAmt - newAmt // positive if expense reduced, negative if increased
		if delta != 0 {
			accounts, _ := qtx.ListSystemAccounts(r.Context())
			if len(accounts) > 0 {
				accountID := accounts[0].ID
				deltaStr := fmt.Sprintf("%.2f", delta)
				_, _ = qtx.UpdateAccountBalance(r.Context(), db.UpdateAccountBalanceParams{
					ID:             accountID,
					CurrentBalance: stringToPgNumeric(&deltaStr),
				})
			}
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "could not commit transaction")
		return
	}

	writeJSON(w, http.StatusOK, expense)
}

// DELETE /api/admin/finance/expenses/{id}
func (h *AdminFinanceHandler) DeleteExpense(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	// Fetch expense amount before deleting so we can reverse the account deduction
	expense, err := h.q.GetExpense(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch expense")
		return
	}

	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not start transaction")
		return
	}
	defer tx.Rollback(r.Context())
	qtx := h.q.WithTx(tx)

	if err := qtx.DeleteExpense(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete expense")
		return
	}

	// Credit expense amount back to system account
	accounts, err := qtx.ListSystemAccounts(r.Context())
	if err == nil && len(accounts) > 0 {
		accountID := accounts[0].ID
		amtStr := pgNumericToString(expense.Amount)
		_, _ = qtx.UpdateAccountBalance(r.Context(), db.UpdateAccountBalanceParams{
			ID:             accountID,
			CurrentBalance: stringToPgNumeric(&amtStr),
		})
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "could not commit transaction")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GET /api/admin/finance/income/total
func (h *AdminFinanceHandler) GetIncomeTotal(w http.ResponseWriter, r *http.Request) {
	fromDate, toDate := parseDateRange(r)

	total, err := h.q.GetIncomeTotal(r.Context(), db.GetIncomeTotalParams{
		Column1: ptrTimeToTime(fromDate),
		Column2: ptrTimeToTime(toDate),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch income total")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"total": total})
}

// GET /api/admin/finance/expenses/total
func (h *AdminFinanceHandler) GetExpenseTotal(w http.ResponseWriter, r *http.Request) {
	fromDate, toDate := parseDateRange(r)

	total, err := h.q.GetExpenseTotal(r.Context(), db.GetExpenseTotalParams{
		Column1: ptrTimeToTime(fromDate),
		Column2: ptrTimeToTime(toDate),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch expense total")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"total": total})
}

// POST /api/admin/finance/account/deposit
func (h *AdminFinanceHandler) DepositToAccount(w http.ResponseWriter, r *http.Request) {
	body, err := decode[struct {
		Amount      string  `json:"amount"`
		Description *string `json:"description"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	accounts, err := h.q.ListSystemAccounts(r.Context())
	if err != nil || len(accounts) == 0 {
		writeError(w, http.StatusInternalServerError, "system account not found")
		return
	}
	accountID := accounts[0].ID

	desc := "Manual deposit"
	if body.Description != nil && *body.Description != "" {
		desc = *body.Description
	}

	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not start transaction")
		return
	}
	defer tx.Rollback(r.Context())
	qtx := h.q.WithTx(tx)

	if _, err := qtx.UpdateAccountBalance(r.Context(), db.UpdateAccountBalanceParams{
		ID:             accountID,
		CurrentBalance: stringToPgNumeric(&body.Amount),
	}); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update balance")
		return
	}

	if _, err := qtx.CreateAccountTransaction(r.Context(), db.CreateAccountTransactionParams{
		AccountID:       accountID,
		TransactionType: "income",
		Amount:          stringToPgNumeric(&body.Amount),
		Description:     desc,
		ReferenceType:   func() *string { s := "deposit"; return &s }(),
		ReferenceID:     pgtype.UUID{Valid: false},
	}); err != nil {
		writeError(w, http.StatusInternalServerError, "could not record transaction")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "could not commit transaction")
		return
	}

	updated, _ := h.q.GetSystemAccount(r.Context(), accountID)
	writeJSON(w, http.StatusOK, updated)
}
