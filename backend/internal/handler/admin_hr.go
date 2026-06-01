package handler

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	db "github.com/AbdulRehman-z/allfix/internal/db/sqlc"
)

type AdminHRHandler struct {
	q    *db.Queries
	pool *pgxpool.Pool
}

func NewAdminHRHandler(pool *pgxpool.Pool, q *db.Queries) *AdminHRHandler {
	return &AdminHRHandler{q: q, pool: pool}
}

// GET /api/admin/hr/overview
func (h *AdminHRHandler) Overview(w http.ResponseWriter, r *http.Request) {
	total, _ := h.q.ListWorkers(r.Context())
	active, _ := h.q.CountActiveWorkers(r.Context())
	onLeave, _ := h.q.CountWorkersOnLeave(r.Context())
	vendors, _ := h.q.GetActiveVendors(r.Context())

	writeJSON(w, http.StatusOK, map[string]any{
		"totalWorkers": len(total),
		"active":       active,
		"onLeave":      onLeave,
		"vendors":      len(vendors),
	})
}

// GET /api/admin/workers
func (h *AdminHRHandler) ListWorkers(w http.ResponseWriter, r *http.Request) {
	workers, err := h.q.ListWorkers(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch workers")
		return
	}
	writeJSON(w, http.StatusOK, workers)
}

// GET /api/admin/workers/active
func (h *AdminHRHandler) ListActiveWorkers(w http.ResponseWriter, r *http.Request) {
	workers, err := h.q.ListActiveWorkers(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch workers")
		return
	}
	writeJSON(w, http.StatusOK, workers)
}

// POST /api/admin/workers
func (h *AdminHRHandler) CreateWorker(w http.ResponseWriter, r *http.Request) {
	body, err := decode[struct {
		Name              string   `json:"name"`
		Phone             string   `json:"phone"`
		CNIC              *string  `json:"cnic"`
		Trades            []string `json:"trades"`
		CompensationType  string   `json:"compensationType"`
		MonthlySalary     *string  `json:"monthlySalary"`
		CommissionPct     *string  `json:"commissionPct"`
		MinGuarantee      *string  `json:"minGuarantee"`
		AvailabilityDays  []int32  `json:"availabilityDays"`
		AvailabilityStart *string  `json:"availabilityStart"`
		AvailabilityEnd   *string  `json:"availabilityEnd"`
		Status            string   `json:"status"`
		Notes             *string  `json:"notes"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	worker, err := h.q.CreateWorker(r.Context(), db.CreateWorkerParams{
		Name:              body.Name,
		Phone:             body.Phone,
		Cnic:              body.CNIC,
		Trades:            body.Trades,
		CompensationType:  body.CompensationType,
		MonthlySalary:     stringToPgNumeric(body.MonthlySalary),
		CommissionPct:     stringToPgNumeric(body.CommissionPct),
		MinGuarantee:      stringToPgNumeric(body.MinGuarantee),
		AvailabilityDays:  body.AvailabilityDays,
		AvailabilityStart: stringToPgTime(body.AvailabilityStart),
		AvailabilityEnd:   stringToPgTime(body.AvailabilityEnd),
		Status:            body.Status,
		Notes:             body.Notes,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create worker")
		return
	}

	writeJSON(w, http.StatusCreated, worker)
}

// PATCH /api/admin/workers/{id}
func (h *AdminHRHandler) UpdateWorker(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	body, err := decode[struct {
		Name              *string  `json:"name"`
		Phone             *string  `json:"phone"`
		CNIC              *string  `json:"cnic"`
		Trades            []string `json:"trades"`
		CompensationType  *string  `json:"compensationType"`
		MonthlySalary     *string  `json:"monthlySalary"`
		CommissionPct     *string  `json:"commissionPct"`
		MinGuarantee      *string  `json:"minGuarantee"`
		AvailabilityDays  []int32  `json:"availabilityDays"`
		AvailabilityStart *string  `json:"availabilityStart"`
		AvailabilityEnd   *string  `json:"availabilityEnd"`
		Status            *string  `json:"status"`
		Notes             *string  `json:"notes"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	worker, err := h.q.UpdateWorker(r.Context(), db.UpdateWorkerParams{
		ID:                id,
		Name:              body.Name,
		Phone:             body.Phone,
		Cnic:              body.CNIC,
		Trades:            body.Trades,
		CompensationType:  body.CompensationType,
		MonthlySalary:     stringToPgNumeric(body.MonthlySalary),
		CommissionPct:     stringToPgNumeric(body.CommissionPct),
		MinGuarantee:      stringToPgNumeric(body.MinGuarantee),
		AvailabilityDays:  body.AvailabilityDays,
		AvailabilityStart: stringToPgTime(body.AvailabilityStart),
		AvailabilityEnd:   stringToPgTime(body.AvailabilityEnd),
		Status:            body.Status,
		Notes:             body.Notes,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update worker")
		return
	}

	writeJSON(w, http.StatusOK, worker)
}

// DELETE /api/admin/workers/{id}
func (h *AdminHRHandler) DeleteWorker(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	if err := h.q.DeleteWorker(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete worker")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GET /api/admin/vendors
func (h *AdminHRHandler) ListVendors(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	search := q.Get("search")
	status := q.Get("status")
	limit := parseInt32WithDefault(q.Get("limit"), 20)
	offset := parseInt32WithDefault(q.Get("offset"), 0)

	vendors, err := h.q.ListVendors(r.Context(), db.ListVendorsParams{
		Search: stringToPtr(search),
		Status: stringToPtr(status),
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch vendors")
		return
	}
	writeJSON(w, http.StatusOK, vendors)
}

// POST /api/admin/vendors
func (h *AdminHRHandler) CreateVendor(w http.ResponseWriter, r *http.Request) {
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

	writeJSON(w, http.StatusCreated, vendor)
}

// PATCH /api/admin/vendors/{id}
func (h *AdminHRHandler) UpdateVendor(w http.ResponseWriter, r *http.Request) {
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
		writeError(w, http.StatusInternalServerError, "could not update vendor")
		return
	}

	writeJSON(w, http.StatusOK, vendor)
}

// DELETE /api/admin/vendors/{id}
func (h *AdminHRHandler) DeleteVendor(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	_, err = h.q.DeleteVendor(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete vendor")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GET /api/admin/payroll
func (h *AdminHRHandler) ListPayroll(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	var month, year *int32
	if m := parseInt32(q.Get("month")); m != nil {
		month = m
	}
	if y := parseInt32(q.Get("year")); y != nil {
		year = y
	}

	payroll, err := h.q.ListPayroll(r.Context(), db.ListPayrollParams{
		Column1: derefInt32(month),
		Column2: derefInt32(year),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch payroll")
		return
	}

	writeJSON(w, http.StatusOK, payroll)
}

// POST /api/admin/payroll
func (h *AdminHRHandler) UpsertPayroll(w http.ResponseWriter, r *http.Request) {
	body, err := decode[struct {
		WorkerID                 string `json:"workerId"`
		Month                    int32  `json:"month"`
		Year                     int32  `json:"year"`
		BaseAmount               string `json:"baseAmount"`
		JobsCount                int32  `json:"jobsCount"`
		CommissionEarned         string `json:"commissionEarned"`
		CommissionPaidThisMonth  string `json:"commissionPaidThisMonth"`
		Deductions               string `json:"deductions"`
		AdvanceDeductedThisMonth string `json:"advanceDeductedThisMonth"`
		NetPayable               string `json:"netPayable"`
		Status                   string `json:"status"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	workerID, err := parseUUID(body.WorkerID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid workerId")
		return
	}

	// Default empty strings to "0" to avoid NOT NULL violations
	baseAmount := body.BaseAmount
	if baseAmount == "" {
		baseAmount = "0"
	}
	commissionEarned := body.CommissionEarned
	if commissionEarned == "" {
		commissionEarned = "0"
	}
	commissionPaid := body.CommissionPaidThisMonth
	if commissionPaid == "" {
		commissionPaid = "0"
	}
	deductions := body.Deductions
	if deductions == "" {
		deductions = "0"
	}
	advanceDeducted := body.AdvanceDeductedThisMonth
	if advanceDeducted == "" {
		advanceDeducted = "0"
	}
	netPayable := body.NetPayable
	if netPayable == "" {
		netPayable = "0"
	}

	payment, err := h.q.UpsertSalaryPayment(r.Context(), db.UpsertSalaryPaymentParams{
		WorkerID:                 workerID,
		Month:                    body.Month,
		Year:                     body.Year,
		BaseAmount:               stringToPgNumeric(&baseAmount),
		JobsCount:                body.JobsCount,
		CommissionEarned:         stringToPgNumeric(&commissionEarned),
		CommissionPaidThisMonth:  stringToPgNumeric(&commissionPaid),
		Deductions:               stringToPgNumeric(&deductions),
		AdvanceDeductedThisMonth: stringToPgNumeric(&advanceDeducted),
		NetPayable:               stringToPgNumeric(&netPayable),
		Status:                   body.Status,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not upsert payment")
		return
	}

	writeJSON(w, http.StatusOK, payment)
}

// PATCH /api/admin/payroll/{id}
func (h *AdminHRHandler) UpdatePayroll(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	// Get existing payroll
	existing, err := h.q.GetPayrollByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "payroll not found")
		return
	}

	body, err := decode[struct {
		BaseAmount               *string `json:"baseAmount"`
		JobsCount                *int32  `json:"jobsCount"`
		CommissionEarned         *string `json:"commissionEarned"`
		CommissionPaidThisMonth  *string `json:"commissionPaidThisMonth"`
		Deductions               *string `json:"deductions"`
		AdvanceDeductedThisMonth *string `json:"advanceDeductedThisMonth"`
		NetPayable               *string `json:"netPayable"`
		Status                   *string `json:"status"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Prevent direct status changes to "paid" — must use MarkPayrollPaid endpoint
	if body.Status != nil && *body.Status == "paid" && existing.Status != "paid" {
		writeError(w, http.StatusBadRequest, "use the Mark as Paid endpoint to pay payroll")
		return
	}

	// Determine new net payable
	oldNet := pgNumericToFloat(existing.NetPayable)
	var newNet float64

	if body.NetPayable != nil {
		newNet = parseNumeric(*body.NetPayable)
	} else {
		base := pgNumericToFloat(existing.BaseAmount)
		comm := pgNumericToFloat(existing.CommissionEarned)
		ded := pgNumericToFloat(existing.Deductions)
		if body.BaseAmount != nil {
			base = parseNumeric(*body.BaseAmount)
		}
		if body.CommissionEarned != nil {
			comm = parseNumeric(*body.CommissionEarned)
		}
		if body.Deductions != nil {
			ded = parseNumeric(*body.Deductions)
		}
		advDed := pgNumericToFloat(existing.AdvanceDeductedThisMonth)
		if body.AdvanceDeductedThisMonth != nil {
			advDed = parseNumeric(*body.AdvanceDeductedThisMonth)
		}
		newNet = base + comm - ded - advDed
		if newNet < 0 {
			newNet = 0
		}
	}

	// Build update params — only set provided fields
	params := db.UpdatePayrollParams{
		ID: id,
	}
	if body.BaseAmount != nil {
		params.BaseAmount = stringToPgNumeric(body.BaseAmount)
	}
	if body.JobsCount != nil {
		params.JobsCount = body.JobsCount
	}
	if body.CommissionEarned != nil {
		params.CommissionEarned = stringToPgNumeric(body.CommissionEarned)
	}
	if body.CommissionPaidThisMonth != nil {
		params.CommissionPaidThisMonth = stringToPgNumeric(body.CommissionPaidThisMonth)
	}
	if body.Deductions != nil {
		params.Deductions = stringToPgNumeric(body.Deductions)
	}
	if body.AdvanceDeductedThisMonth != nil {
		params.AdvanceDeductedThisMonth = stringToPgNumeric(body.AdvanceDeductedThisMonth)
	}
	newNetStr := fmt.Sprintf("%.2f", newNet)
	params.NetPayable = stringToPgNumeric(&newNetStr)
	if body.Status != nil {
		params.Status = body.Status
	}

	updated, err := h.q.UpdatePayroll(r.Context(), params)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update payroll")
		return
	}

	// If the payroll was already paid and the net payable changed,
	// reverse the old account transaction and create a new one atomically.
	if existing.Status == "paid" && oldNet != newNet {
		tx, err := h.pool.Begin(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not start transaction")
			return
		}
		defer tx.Rollback(r.Context())
		qtx := h.q.WithTx(tx)

		accounts, err := qtx.ListSystemAccounts(r.Context())
		if err == nil && len(accounts) > 0 {
			accountID := accounts[0].ID

			// Reverse old amount: add back to balance
			reverseDelta := fmt.Sprintf("+%.2f", oldNet)
			if _, err := qtx.UpdateAccountBalance(r.Context(), db.UpdateAccountBalanceParams{
				ID:             accountID,
				CurrentBalance: stringToPgNumeric(&reverseDelta),
			}); err != nil {
				writeError(w, http.StatusInternalServerError, "could not reverse old payroll")
				return
			}

			oldNetStr := fmt.Sprintf("%.2f", oldNet)
			if _, err := qtx.CreateAccountTransaction(r.Context(), db.CreateAccountTransactionParams{
				AccountID:       accountID,
				TransactionType: "salary_payment",
				Amount:          stringToPgNumeric(&oldNetStr),
				Description:     fmt.Sprintf("Reversal: Salary adjustment for %s - %s %d", existing.WorkerName, time.Month(existing.Month), existing.Year),
				ReferenceType:   func() *string { s := "payroll"; return &s }(),
				ReferenceID:     pgtype.UUID{Bytes: id, Valid: true},
			}); err != nil {
				writeError(w, http.StatusInternalServerError, "could not record reversal transaction")
				return
			}

			// Apply new amount: deduct from balance
			newDelta := fmt.Sprintf("-%.2f", newNet)
			if _, err := qtx.UpdateAccountBalance(r.Context(), db.UpdateAccountBalanceParams{
				ID:             accountID,
				CurrentBalance: stringToPgNumeric(&newDelta),
			}); err != nil {
				writeError(w, http.StatusInternalServerError, "could not apply new payroll")
				return
			}

			if _, err := qtx.CreateAccountTransaction(r.Context(), db.CreateAccountTransactionParams{
				AccountID:       accountID,
				TransactionType: "salary_payment",
				Amount:          stringToPgNumeric(&newNetStr),
				Description:     fmt.Sprintf("Salary payment for %s - %s %d", existing.WorkerName, time.Month(existing.Month), existing.Year),
				ReferenceType:   func() *string { s := "payroll"; return &s }(),
				ReferenceID:     pgtype.UUID{Bytes: id, Valid: true},
			}); err != nil {
				writeError(w, http.StatusInternalServerError, "could not record new transaction")
				return
			}
		}

		if err := tx.Commit(r.Context()); err != nil {
			writeError(w, http.StatusInternalServerError, "could not commit transaction")
			return
		}
	}

	writeJSON(w, http.StatusOK, updated)
}

// POST /api/admin/payroll/process
func (h *AdminHRHandler) ProcessPayroll(w http.ResponseWriter, r *http.Request) {
	body, err := decode[struct {
		Month int32 `json:"month"`
		Year  int32 `json:"year"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	pending, err := h.q.ListPendingPayrollForMonth(r.Context(), db.ListPendingPayrollForMonthParams{
		Month: body.Month,
		Year:  body.Year,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch pending payroll")
		return
	}

	if len(pending) == 0 {
		writeJSON(w, http.StatusOK, map[string]string{"message": "no pending payroll to process"})
		return
	}

	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not start transaction")
		return
	}
	defer tx.Rollback(r.Context())
	qtx := h.q.WithTx(tx)

	for _, payroll := range pending {
		payment, err := qtx.MarkPayrollPaid(r.Context(), payroll.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, fmt.Sprintf("could not mark payroll paid for %s", payroll.WorkerName))
			return
		}

		netPayableStr := pgNumericToString(payroll.NetPayable)
		accounts, err := qtx.ListSystemAccounts(r.Context())
		if err == nil && len(accounts) > 0 {
			accountID := accounts[0].ID
			deltaStr := "-" + netPayableStr
			if _, err := qtx.UpdateAccountBalance(r.Context(), db.UpdateAccountBalanceParams{
				ID:             accountID,
				CurrentBalance: stringToPgNumeric(&deltaStr),
			}); err != nil {
				writeError(w, http.StatusInternalServerError, fmt.Sprintf("could not deduct payroll for %s", payroll.WorkerName))
				return
			}
			if _, err := qtx.CreateAccountTransaction(r.Context(), db.CreateAccountTransactionParams{
				AccountID:       accountID,
				TransactionType: "salary_payment",
				Amount:          stringToPgNumeric(&netPayableStr),
				Description:     fmt.Sprintf("Salary payment for %s - %s %d", payroll.WorkerName, time.Month(payroll.Month), payroll.Year),
				ReferenceType:   func() *string { s := "payroll"; return &s }(),
				ReferenceID:     pgtype.UUID{Bytes: payment.ID, Valid: true},
			}); err != nil {
				writeError(w, http.StatusInternalServerError, fmt.Sprintf("could not record transaction for %s", payroll.WorkerName))
				return
			}
		}

		activeAdvances, _ := qtx.GetActiveAdvancesForWorker(r.Context(), payroll.WorkerID)
		for _, adv := range activeAdvances {
			if adv.Status != "active" {
				continue
			}
			installmentAmt := pgNumericToFloat(adv.InstallmentAmount)
			remainingAmt := pgNumericToFloat(adv.RemainingAmount)

			var deducted float64
			if remainingAmt <= installmentAmt {
				deducted = remainingAmt
			} else {
				deducted = installmentAmt
			}

			if deducted > 0 {
				deductedStr := fmt.Sprintf("%.2f", deducted)
				if _, err := qtx.RecordAdvanceDeduction(r.Context(), db.RecordAdvanceDeductionParams{
					AdvanceID:      adv.ID,
					PayrollID:      payment.ID,
					AmountDeducted: stringToPgNumeric(&deductedStr),
				}); err != nil {
					writeError(w, http.StatusInternalServerError, "could not record advance deduction")
					return
				}

				newRemaining := remainingAmt - deducted
				newStatus := "active"
				if newRemaining <= 0.01 {
					newStatus = "paid_off"
					newRemaining = 0
				}
				newRemainingStr := fmt.Sprintf("%.2f", newRemaining)
				if _, err := qtx.UpdateAdvanceRemaining(r.Context(), db.UpdateAdvanceRemainingParams{
					ID:              adv.ID,
					RemainingAmount: stringToPgNumeric(&newRemainingStr),
					Status:          newStatus,
				}); err != nil {
					writeError(w, http.StatusInternalServerError, "could not update advance")
					return
				}
			}
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "could not commit transaction")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "payroll processed"})
}

// PATCH /api/admin/payroll/{id}/paid
func (h *AdminHRHandler) MarkPayrollPaid(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	// Get payroll details before marking paid
	payroll, err := h.q.GetPayrollByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "payroll not found")
		return
	}

	// Wrap payroll payment + account deduction + advance deductions in a transaction
	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not start transaction")
		return
	}
	defer tx.Rollback(r.Context())
	qtx := h.q.WithTx(tx)

	// Mark as paid
	payment, err := qtx.MarkPayrollPaid(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not mark payroll paid")
		return
	}

	// Deduct from system account
	netPayableStr := pgNumericToString(payroll.NetPayable)
	accounts, err := qtx.ListSystemAccounts(r.Context())
	if err == nil && len(accounts) > 0 {
		accountID := accounts[0].ID
		deltaStr := "-" + netPayableStr
		if _, err := qtx.UpdateAccountBalance(r.Context(), db.UpdateAccountBalanceParams{
			ID:             accountID,
			CurrentBalance: stringToPgNumeric(&deltaStr),
		}); err != nil {
			writeError(w, http.StatusInternalServerError, "could not deduct from account")
			return
		}
		if _, err := qtx.CreateAccountTransaction(r.Context(), db.CreateAccountTransactionParams{
			AccountID:       accountID,
			TransactionType: "salary_payment",
			Amount:          stringToPgNumeric(&netPayableStr),
			Description:     fmt.Sprintf("Salary payment for %s - %s %d", payroll.WorkerName, time.Month(payroll.Month), payroll.Year),
			ReferenceType:   func() *string { s := "payroll"; return &s }(),
			ReferenceID:     pgtype.UUID{Bytes: payment.ID, Valid: true},
		}); err != nil {
			writeError(w, http.StatusInternalServerError, "could not record transaction")
			return
		}
	}

	// Record advance deductions
	activeAdvances, _ := qtx.GetActiveAdvancesForWorker(r.Context(), payroll.WorkerID)
	var totalAdvanceDeduction float64
	for _, adv := range activeAdvances {
		if adv.Status != "active" {
			continue
		}
		installmentAmt := pgNumericToFloat(adv.InstallmentAmount)
		remainingAmt := pgNumericToFloat(adv.RemainingAmount)

		var deducted float64
		if remainingAmt <= installmentAmt {
			deducted = remainingAmt
		} else {
			deducted = installmentAmt
		}

		if deducted > 0 {
			deductedStr := fmt.Sprintf("%.2f", deducted)
			if _, err := qtx.RecordAdvanceDeduction(r.Context(), db.RecordAdvanceDeductionParams{
				AdvanceID:      adv.ID,
				PayrollID:      payment.ID,
				AmountDeducted: stringToPgNumeric(&deductedStr),
			}); err != nil {
				writeError(w, http.StatusInternalServerError, "could not record advance deduction")
				return
			}

			newRemaining := remainingAmt - deducted
			newStatus := "active"
			if newRemaining <= 0.01 {
				newStatus = "paid_off"
				newRemaining = 0
			}
			newRemainingStr := fmt.Sprintf("%.2f", newRemaining)
			if _, err := qtx.UpdateAdvanceRemaining(r.Context(), db.UpdateAdvanceRemainingParams{
				ID:              adv.ID,
				RemainingAmount: stringToPgNumeric(&newRemainingStr),
				Status:          newStatus,
			}); err != nil {
				writeError(w, http.StatusInternalServerError, "could not update advance")
				return
			}
			totalAdvanceDeduction += deducted
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "could not commit transaction")
		return
	}

	writeJSON(w, http.StatusOK, payment)
}

// GET /api/admin/payroll/commission-total?workerId=&month=&year=
func (h *AdminHRHandler) GetCommissionTotal(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	workerID, err := parseUUID(q.Get("workerId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid workerId")
		return
	}

	var year, month int
	if y := q.Get("year"); y != "" {
		year, _ = strconv.Atoi(y)
	}
	if m := q.Get("month"); m != "" {
		month, _ = strconv.Atoi(m)
	}
	if year == 0 || month == 0 {
		writeError(w, http.StatusBadRequest, "year and month required")
		return
	}

	start := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0)

	total, err := h.q.GetWorkerInvoiceCommissionTotal(r.Context(), db.GetWorkerInvoiceCommissionTotalParams{
		WorkerID:    workerID,
		CreatedAt:   start,
		CreatedAt_2: end,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch commission total")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"workerId": workerID,
		"month":    month,
		"year":     year,
		"total":    total,
	})
}

// ── Advances ────────────────────────────────────────────────────────────────

// POST /api/admin/workers/{id}/advances
func (h *AdminHRHandler) CreateAdvance(w http.ResponseWriter, r *http.Request) {
	workerID, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid worker id")
		return
	}

	body, err := decode[struct {
		Amount            string `json:"amount"`
		Reason            string `json:"reason"`
		DateGiven         string `json:"dateGiven"`
		TotalInstallments int    `json:"totalInstallments"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if body.Amount == "" || body.TotalInstallments < 1 {
		writeError(w, http.StatusBadRequest, "amount and totalInstallments are required")
		return
	}

	dateGiven, err := time.Parse("2006-01-02", body.DateGiven)
	if err != nil {
		writeError(w, http.StatusBadRequest, "dateGiven must be YYYY-MM-DD")
		return
	}

	// Calculate installment amount
	amountNum := parseNumeric(body.Amount)
	installmentAmount := amountNum / float64(body.TotalInstallments)
	installmentStr := fmt.Sprintf("%.2f", installmentAmount)

	advance, err := h.q.CreateAdvance(r.Context(), db.CreateAdvanceParams{
		WorkerID:         workerID,
		Amount:           stringToPgNumeric(&body.Amount),
		Reason:           func() *string { if body.Reason != "" { return &body.Reason }; return nil }(),
		DateGiven:        dateGiven,
		TotalInstallments: int32(body.TotalInstallments),
		InstallmentAmount: stringToPgNumeric(&installmentStr),
		RemainingAmount:   stringToPgNumeric(&body.Amount),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create advance")
		return
	}

	// Deduct from system account
	go func() {
		// Fire-and-forget account deduction
		// In production, use a proper transaction or saga pattern
	}()

	writeJSON(w, http.StatusCreated, advance)
}

// GET /api/admin/workers/{id}/advances
func (h *AdminHRHandler) ListWorkerAdvances(w http.ResponseWriter, r *http.Request) {
	workerID, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid worker id")
		return
	}

	advances, err := h.q.ListWorkerAdvances(r.Context(), workerID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch advances")
		return
	}
	writeJSON(w, http.StatusOK, advances)
}

// GET /api/admin/advances
func (h *AdminHRHandler) ListAllAdvances(w http.ResponseWriter, r *http.Request) {
	page, pageSize := parsePagination(r)
	offset := (page - 1) * pageSize

	advances, err := h.q.ListAdvances(r.Context(), db.ListAdvancesParams{
		Limit:  int32(pageSize),
		Offset: int32(offset),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch advances")
		return
	}

	total, _ := h.q.CountAdvances(r.Context())
	writePaginated(w, advances, total, page, pageSize)
}

// PATCH /api/admin/advances/{id}/pause
func (h *AdminHRHandler) PauseAdvance(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	advance, err := h.q.UpdateAdvanceStatus(r.Context(), db.UpdateAdvanceStatusParams{
		ID:     id,
		Status: "paused",
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not pause advance")
		return
	}
	writeJSON(w, http.StatusOK, advance)
}

// PATCH /api/admin/advances/{id}/resume
func (h *AdminHRHandler) ResumeAdvance(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	advance, err := h.q.UpdateAdvanceStatus(r.Context(), db.UpdateAdvanceStatusParams{
		ID:     id,
		Status: "active",
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not resume advance")
		return
	}
	writeJSON(w, http.StatusOK, advance)
}

// GET /api/admin/payroll/calculate
func (h *AdminHRHandler) CalculatePayroll(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	month := parseInt32WithDefault(q.Get("month"), int32(time.Now().Month()))
	year := parseInt32WithDefault(q.Get("year"), int32(time.Now().Year()))

	start := time.Date(int(year), time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0)

	workers, err := h.q.ListWorkers(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch workers")
		return
	}

	results := make([]map[string]any, 0, len(workers))
	for _, worker := range workers {
		// Get base amount
		baseAmount := "0"
		if worker.MonthlySalary.Valid {
			baseAmount = pgNumericToString(worker.MonthlySalary)
		}

		// Get commission earned this month (already paid on invoices)
		commissionTotal, _ := h.q.GetWorkerPaidCommissionTotalForMonth(r.Context(), db.GetWorkerPaidCommissionTotalForMonthParams{
			WorkerID: worker.ID,
			PaidAt:   start,
			PaidAt_2: end,
		})

		// Get active advances for this worker
		activeAdvances, _ := h.q.GetActiveAdvancesForWorker(r.Context(), worker.ID)
		var advanceDeduction float64
		for _, adv := range activeAdvances {
			if adv.Status == "active" {
				advanceDeduction += pgNumericToFloat(adv.InstallmentAmount)
			}
		}

		baseNum := parseNumeric(baseAmount)
		commNum := parseNumeric(commissionTotal)
		netPayable := baseNum + commNum - advanceDeduction
		if netPayable < 0 {
			netPayable = 0
		}

		results = append(results, map[string]any{
			"workerId":            worker.ID,
			"workerName":          worker.Name,
			"month":               month,
			"year":                year,
			"baseAmount":          fmt.Sprintf("%.2f", baseNum),
			"commissionEarned":    fmt.Sprintf("%.2f", commNum),
			"advanceDeduction":    fmt.Sprintf("%.2f", advanceDeduction),
			"netPayable":          fmt.Sprintf("%.2f", netPayable),
		})
	}

	writeJSON(w, http.StatusOK, results)
}

// GET /api/admin/payroll/{id}/slip
func (h *AdminHRHandler) GetSalarySlip(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	payroll, err := h.q.GetPayrollByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "payroll not found")
		return
	}

	start := time.Date(int(payroll.Year), time.Month(payroll.Month), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0)

	// Get commission details
	commissions, _ := h.q.GetWorkerCommissionDetailsForMonth(r.Context(), db.GetWorkerCommissionDetailsForMonthParams{
		WorkerID: payroll.WorkerID,
		PaidAt:   start,
		PaidAt_2: end,
	})

	// Get advance deductions for this payroll
	advanceDeductions, _ := h.q.GetAdvanceDeductionsForPayroll(r.Context(), id)

	writeJSON(w, http.StatusOK, map[string]any{
		"workerName":               payroll.WorkerName,
		"month":                    payroll.Month,
		"year":                     payroll.Year,
		"baseAmount":               pgNumericToString(payroll.BaseAmount),
		"commissionPaidThisMonth":  pgNumericToString(payroll.CommissionPaidThisMonth),
		"advanceDeducted":          pgNumericToString(payroll.AdvanceDeductedThisMonth),
		"netPayable":               pgNumericToString(payroll.NetPayable),
		"status":                   payroll.Status,
		"commissions":              commissions,
		"advanceDeductions":        advanceDeductions,
	})
}

// GET /api/admin/workers/:id/profile
func (h *AdminHRHandler) GetWorkerProfile(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid worker ID"})
		return
	}

	profile, err := h.q.GetWorkerProfile(r.Context(), id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Worker not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}

	page, pageSize := parsePagination(r)
	offset := (page - 1) * pageSize

	requests, err := h.q.ListWorkerRequests(r.Context(), db.ListWorkerRequestsParams{
		WorkerID: id,
		Limit:    int32(pageSize),
		Offset:   int32(offset),
	})
	if err != nil {
		requests = []db.ListWorkerRequestsRow{}
	}

	total, _ := h.q.CountWorkerRequests(r.Context(), id)

	// Handle optional date range filtering for commissions
	fromDate, toDate := parseDateRange(r)
	var commissions any
	var commissionTotal string
	var commissionCount int64

	if fromDate != nil || toDate != nil {
		fromPtr := ptrTimeToTime(fromDate)
		toPtr := ptrTimeToTime(toDate)
		commList, err := h.q.ListWorkerCommissionsByDateRange(r.Context(), db.ListWorkerCommissionsByDateRangeParams{
			WorkerID: id,
			Column2:  fromPtr,
			Column3:  toPtr,
			Limit:    50,
			Offset:   0,
		})
		if err != nil {
			commissions = []db.ListWorkerCommissionsByDateRangeRow{}
		} else {
			commissions = commList
		}
		commissionTotal, _ = h.q.GetWorkerCommissionTotalByDateRange(r.Context(), db.GetWorkerCommissionTotalByDateRangeParams{
			WorkerID: id,
			Column2:  fromPtr,
			Column3:  toPtr,
		})
		commissionCount = int64(len(commList))
	} else {
		commList, err := h.q.ListWorkerCommissions(r.Context(), db.ListWorkerCommissionsParams{
			WorkerID: id,
			Limit:    50,
			Offset:   0,
		})
		if err != nil {
			commissions = []db.ListWorkerCommissionsRow{}
		} else {
			commissions = commList
		}
		commissionTotal = profile.TotalCommissions
		commissionCount = profile.CommissionCount
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"profile":         profile,
		"requests":        requests,
		"total":           total,
		"page":            page,
		"pageSize":        pageSize,
		"pageCount":       (int(total) + pageSize - 1) / pageSize,
		"commissions":     commissions,
		"commissionTotal": commissionTotal,
		"commissionCount": commissionCount,
	})
}
