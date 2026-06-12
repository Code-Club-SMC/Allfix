package handler

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	db "github.com/AbdulRehman-z/allfix/internal/db/sqlc"
	"github.com/AbdulRehman-z/allfix/internal/middleware"
)

type AdminInvoicesHandler struct {
	q    *db.Queries
	pool *pgxpool.Pool
}

func NewAdminInvoicesHandler(pool *pgxpool.Pool, q *db.Queries) *AdminInvoicesHandler {
	return &AdminInvoicesHandler{pool: pool, q: q}
}

// calculateVendorCommissionAmount computes the commission amount from a percentage.
// The stored VendorCommission is a percentage (e.g. 75 = 75%).
// Returns the monetary amount: total * percentage / 100.
func calculateVendorCommissionAmount(invoice db.Invoice) float64 {
	if !invoice.VendorCommission.Valid || invoice.VendorCommission.Int == nil {
		return 0
	}
	pct, err := strconv.ParseFloat(pgNumericToString(invoice.VendorCommission), 64)
	if err != nil {
		return 0
	}
	total, err := strconv.ParseFloat(pgNumericToString(invoice.Total), 64)
	if err != nil {
		return 0
	}
	return (total * pct) / 100
}

// createIncomeForPaidInvoice creates an income record for a paid invoice.
// Net income = invoice total - worker commissions - vendor commission.
func createIncomeForPaidInvoice(ctx context.Context, qtx *db.Queries, invoice db.Invoice) error {
	commList, _ := qtx.ListInvoiceCommissions(ctx, invoice.ID)
	var totalCommission float64
	for _, c := range commList {
		amt, _ := strconv.ParseFloat(pgNumericToString(c.Amount), 64)
		totalCommission += amt
	}

	vendorCommission := calculateVendorCommissionAmount(invoice)

	totalStr := pgNumericToString(invoice.Total)
	total, _ := strconv.ParseFloat(totalStr, 64)
	netIncome := total - totalCommission - vendorCommission
	if netIncome < 0 {
		netIncome = 0
	}

	incomeAmount := fmt.Sprintf("%.2f", netIncome)
	description := fmt.Sprintf("Invoice payment: %s", invoice.InvoiceNumber)

	_, err := qtx.CreateIncome(ctx, db.CreateIncomeParams{
		Date:        time.Now(),
		Description: description,
		Category:    "invoice_payment",
		Amount:      stringToPgNumeric(&incomeAmount),
		Source:      &invoice.ClientName,
		InvoiceID:   uuidToPgtype(&invoice.ID),
	})
	return err
}

// updateIncomeForPaidInvoice updates the existing income record for a paid invoice.
func updateIncomeForPaidInvoice(ctx context.Context, qtx *db.Queries, invoice db.Invoice) error {
	existingIncome, err := qtx.GetIncomeByInvoiceID(ctx, uuidToPgtype(&invoice.ID))
	if err != nil {
		return createIncomeForPaidInvoice(ctx, qtx, invoice)
	}

	commList, _ := qtx.ListInvoiceCommissions(ctx, invoice.ID)
	var totalCommission float64
	for _, c := range commList {
		amt, _ := strconv.ParseFloat(pgNumericToString(c.Amount), 64)
		totalCommission += amt
	}

	vendorCommission := calculateVendorCommissionAmount(invoice)

	totalStr := pgNumericToString(invoice.Total)
	total, _ := strconv.ParseFloat(totalStr, 64)
	netIncome := total - totalCommission - vendorCommission
	if netIncome < 0 {
		netIncome = 0
	}

	incomeAmount := fmt.Sprintf("%.2f", netIncome)
	description := fmt.Sprintf("Invoice payment: %s", invoice.InvoiceNumber)

	_, err = qtx.UpdateIncome(ctx, db.UpdateIncomeParams{
		ID:          existingIncome.ID,
		Amount:      stringToPgNumeric(&incomeAmount),
		Description: &description,
		Source:      &invoice.ClientName,
	})
	return err
}

// deleteIncomeForInvoice deletes the income record linked to an invoice.
func deleteIncomeForInvoice(ctx context.Context, qtx *db.Queries, invoiceID uuid.UUID) error {
	return qtx.DeleteIncomeByInvoiceID(ctx, uuidToPgtype(&invoiceID))
}

// processInvoicePayment handles all financial side effects when an invoice is marked as paid.
// This includes: crediting account, deducting commissions, creating worker_commissions, and income.
func processInvoicePayment(ctx context.Context, qtx *db.Queries, invoice db.Invoice) error {
	// 1. Create worker_commissions and calculate total commission
	commList, err := qtx.ListInvoiceCommissions(ctx, invoice.ID)
	if err != nil {
		return fmt.Errorf("list invoice commissions: %w", err)
	}
	var totalCommission float64
	for _, c := range commList {
		amt, err := strconv.ParseFloat(pgNumericToString(c.Amount), 64)
		if err != nil {
			return fmt.Errorf("parse commission amount: %w", err)
		}
		totalCommission += amt
		if _, err := qtx.CreateWorkerCommission(ctx, db.CreateWorkerCommissionParams{
			WorkerID:  c.WorkerID,
			InvoiceID: invoice.ID,
			Amount:    c.Amount,
		}); err != nil {
			return fmt.Errorf("create worker commission: %w", err)
		}
	}

	accounts, err := qtx.ListSystemAccounts(ctx)
	if err != nil || len(accounts) == 0 {
		return fmt.Errorf("list system accounts: %w", err)
	}
	accountID := accounts[0].ID

	// 2. Credit system account with invoice total
	totalStr := pgNumericToString(invoice.Total)
	if _, err := qtx.UpdateAccountBalance(ctx, db.UpdateAccountBalanceParams{
		ID:             accountID,
		CurrentBalance: stringToPgNumeric(&totalStr),
	}); err != nil {
		return fmt.Errorf("credit account: %w", err)
	}
	if _, err := qtx.CreateAccountTransaction(ctx, db.CreateAccountTransactionParams{
		AccountID:       accountID,
		TransactionType: "invoice_payment",
		Amount:          stringToPgNumeric(&totalStr),
		Description:     fmt.Sprintf("Invoice payment received: %s", invoice.InvoiceNumber),
		ReferenceType:   func() *string { s := "invoice"; return &s }(),
		ReferenceID:     pgtype.UUID{Bytes: invoice.ID, Valid: true},
	}); err != nil {
		return fmt.Errorf("create invoice payment transaction: %w", err)
	}

	// 3. Deduct worker commissions from account
	if totalCommission > 0 {
		commStr := fmt.Sprintf("%.2f", totalCommission)
		deltaStr := "-" + commStr
		if _, err := qtx.UpdateAccountBalance(ctx, db.UpdateAccountBalanceParams{
			ID:             accountID,
			CurrentBalance: stringToPgNumeric(&deltaStr),
		}); err != nil {
			return fmt.Errorf("deduct commission from account: %w", err)
		}
		if _, err := qtx.CreateAccountTransaction(ctx, db.CreateAccountTransactionParams{
			AccountID:       accountID,
			TransactionType: "commission_payout",
			Amount:          stringToPgNumeric(&commStr),
			Description:     fmt.Sprintf("Commission payout for invoice %s", invoice.InvoiceNumber),
			ReferenceType:   func() *string { s := "invoice"; return &s }(),
			ReferenceID:     pgtype.UUID{Bytes: invoice.ID, Valid: true},
		}); err != nil {
			return fmt.Errorf("create commission transaction: %w", err)
		}
	}

	// 4. Deduct vendor commission from account
	vendorCommissionAmt := calculateVendorCommissionAmount(invoice)
	if vendorCommissionAmt > 0 && invoice.RequestID.Valid {
		vcStr := fmt.Sprintf("%.2f", vendorCommissionAmt)
		deltaStr := "-" + vcStr
		if _, err := qtx.UpdateAccountBalance(ctx, db.UpdateAccountBalanceParams{
			ID:             accountID,
			CurrentBalance: stringToPgNumeric(&deltaStr),
		}); err != nil {
			return fmt.Errorf("deduct vendor commission: %w", err)
		}
		if _, err := qtx.CreateAccountTransaction(ctx, db.CreateAccountTransactionParams{
			AccountID:       accountID,
			TransactionType: "vendor_commission_payout",
			Amount:          stringToPgNumeric(&vcStr),
			Description:     fmt.Sprintf("Vendor commission for invoice %s", invoice.InvoiceNumber),
			ReferenceType:   func() *string { s := "invoice"; return &s }(),
			ReferenceID:     pgtype.UUID{Bytes: invoice.ID, Valid: true},
		}); err != nil {
			return fmt.Errorf("create vendor commission transaction: %w", err)
		}
	}

	// 5. Create income record
	if err := createIncomeForPaidInvoice(ctx, qtx, invoice); err != nil {
		return fmt.Errorf("create income: %w", err)
	}
	return nil
}

// reverseInvoicePayment reverses all financial side effects when an invoice is un-paid.
func reverseInvoicePayment(ctx context.Context, qtx *db.Queries, invoice db.Invoice) error {
	accounts, err := qtx.ListSystemAccounts(ctx)
	if err != nil || len(accounts) == 0 {
		return err
	}
	accountID := accounts[0].ID

	// 1. Reverse invoice total credit (debit account)
	totalStr := pgNumericToString(invoice.Total)
	deltaStr := "-" + totalStr
	if _, err := qtx.UpdateAccountBalance(ctx, db.UpdateAccountBalanceParams{
		ID:             accountID,
		CurrentBalance: stringToPgNumeric(&deltaStr),
	}); err != nil {
		return fmt.Errorf("reverse invoice total credit: %w", err)
	}

	// 2. Reverse commission deductions (credit account back)
	commList, err := qtx.ListInvoiceCommissions(ctx, invoice.ID)
	if err != nil {
		return fmt.Errorf("list invoice commissions: %w", err)
	}
	var totalCommission float64
	for _, c := range commList {
		amt, err := strconv.ParseFloat(pgNumericToString(c.Amount), 64)
		if err != nil {
			return fmt.Errorf("parse commission amount: %w", err)
		}
		totalCommission += amt
	}
	if totalCommission > 0 {
		commStr := fmt.Sprintf("%.2f", totalCommission)
		if _, err := qtx.UpdateAccountBalance(ctx, db.UpdateAccountBalanceParams{
			ID:             accountID,
			CurrentBalance: stringToPgNumeric(&commStr),
		}); err != nil {
			return fmt.Errorf("reverse commission deduction: %w", err)
		}
	}

	// 3. Reverse vendor commission deduction
	vendorCommissionAmt := calculateVendorCommissionAmount(invoice)
	if vendorCommissionAmt > 0 && invoice.RequestID.Valid {
		vcStr := fmt.Sprintf("%.2f", vendorCommissionAmt)
		if _, err := qtx.UpdateAccountBalance(ctx, db.UpdateAccountBalanceParams{
			ID:             accountID,
			CurrentBalance: stringToPgNumeric(&vcStr),
		}); err != nil {
			return fmt.Errorf("reverse vendor commission: %w", err)
		}
	}

	// 4. Delete worker_commissions
	if err := qtx.DeleteWorkerCommissionsByInvoice(ctx, invoice.ID); err != nil {
		return fmt.Errorf("delete worker commissions: %w", err)
	}

	// 5. Delete income record
	if err := deleteIncomeForInvoice(ctx, qtx, invoice.ID); err != nil {
		return fmt.Errorf("delete income: %w", err)
	}
	return nil
}

// GET /api/admin/invoices
func (h *AdminInvoicesHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	status := q.Get("status")
	page, pageSize := parsePagination(r)
	offset := (page - 1) * pageSize

	var fromDate, toDate *time.Time
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

	invoices, err := h.q.ListInvoices(r.Context(), db.ListInvoicesParams{
		Column1: status,
		Limit:   int32(pageSize),
		Offset:  int32(offset),
		Column4: ptrTimeToTime(fromDate),
		Column5: ptrTimeToTime(toDate),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch invoices")
		return
	}

	total, _ := h.q.CountInvoices(r.Context(), db.CountInvoicesParams{
		Column1: status,
		Column2: ptrTimeToTime(fromDate),
		Column3: ptrTimeToTime(toDate),
	})
	writePaginated(w, invoices, total, page, pageSize)
}

// GET /api/admin/invoices/{id}
func (h *AdminInvoicesHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	invoice, err := h.q.GetInvoiceByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "invoice not found")
		return
	}

	lineItems, _ := h.q.ListLineItemsByInvoice(r.Context(), invoice.ID)
	commissions, _ := h.q.ListInvoiceCommissions(r.Context(), invoice.ID)

	// Fetch workers if invoice is linked to a request
	var workers []db.Worker
	if invoice.RequestID.Valid {
		workers, _ = h.q.ListWorkersByRequest(r.Context(), invoice.RequestID.Bytes)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"invoice":     invoice,
		"lineItems":   lineItems,
		"commissions": commissions,
		"workers":     workers,
	})
}

type lineItemInput struct {
	Description string  `json:"description"`
	Quantity    float64 `json:"quantity"`
	Rate        float64 `json:"rate"`
	Amount      float64 `json:"amount"`
}

type commissionInput struct {
	WorkerID string `json:"workerId"`
	Amount   string `json:"amount"`
}

// POST /api/admin/invoices
func (h *AdminInvoicesHandler) Create(w http.ResponseWriter, r *http.Request) {
	body, err := decode[struct {
		RequestID          *string         `json:"requestId"`
		ClientID           string          `json:"clientId"`
		ClientName         string          `json:"clientName"`
		ClientAddress      *string         `json:"clientAddress"`
		ClientPhone        *string         `json:"clientPhone"`
		ServiceName        string          `json:"serviceName"`
		ServiceDescription *string         `json:"serviceDescription"`
		Subtotal           string          `json:"subtotal"`
		Total              string          `json:"total"`
		Notes              *string         `json:"notes"`
		Status             string          `json:"status"`
		VendorCommission   *string         `json:"vendorCommission"`
		LineItems          []lineItemInput `json:"lineItems"`
		Commissions        []commissionInput `json:"commissions"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	clientID, err := parseUUID(body.ClientID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid clientId")
		return
	}

	invNumberRaw, err := h.q.GetNextInvoiceNumber(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not generate invoice number")
		return
	}
	invNumber, ok := invNumberRaw.(string)
	if !ok {
		if b, ok := invNumberRaw.([]byte); ok {
			invNumber = string(b)
		} else {
			writeError(w, http.StatusInternalServerError, "could not generate invoice number")
			return
		}
	}

	params := db.CreateInvoiceParams{
		InvoiceNumber:      invNumber,
		ClientID:           clientID,
		ClientName:         body.ClientName,
		ClientAddress:      body.ClientAddress,
		ClientPhone:        body.ClientPhone,
		ServiceName:        body.ServiceName,
		ServiceDescription: body.ServiceDescription,
		Subtotal:           stringToPgNumericOrZero(&body.Subtotal),
		Total:              stringToPgNumericOrZero(&body.Total),
		Notes:              body.Notes,
		Status:             body.Status,
		VendorCommission:   stringToPgNumericOrZero(body.VendorCommission),
	}

	if body.RequestID != nil {
		rid, err := parseUUID(*body.RequestID)
		if err == nil {
			params.RequestID = pgtype.UUID{Bytes: rid, Valid: true}
		}
	}

	var invoice db.Invoice
	var lineItems []db.InvoiceLineItem
	var commissions []db.ListInvoiceCommissionsRow

	// If creating as "paid", wrap EVERYTHING in a transaction to ensure atomicity
	if body.Status == "paid" {
		tx, err := h.pool.Begin(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not begin transaction")
			return
		}
		defer tx.Rollback(r.Context())
		qtx := h.q.WithTx(tx)

		invoice, err = qtx.CreateInvoice(r.Context(), params)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not create invoice")
			return
		}

		for _, li := range body.LineItems {
			qStr := fmt.Sprintf("%g", li.Quantity)
			rStr := fmt.Sprintf("%g", li.Rate)
			aStr := fmt.Sprintf("%g", li.Amount)
			if _, err := qtx.CreateLineItem(r.Context(), db.CreateLineItemParams{
				InvoiceID:   invoice.ID,
				Description: li.Description,
				Quantity:    stringToPgNumericOrZero(&qStr),
				Rate:        stringToPgNumericOrZero(&rStr),
				Amount:      stringToPgNumericOrZero(&aStr),
			}); err != nil {
				writeError(w, http.StatusInternalServerError, "could not create line item")
				return
			}
		}

		actorID, _ := middleware.UserIDFromContext(r.Context())
		for _, c := range body.Commissions {
			wid, err := parseUUID(c.WorkerID)
			if err != nil {
				continue
			}
			if _, err := qtx.CreateInvoiceCommission(r.Context(), db.CreateInvoiceCommissionParams{
				InvoiceID: invoice.ID,
				WorkerID:  wid,
				Amount:    stringToPgNumericOrZero(&c.Amount),
				CreatedBy: uuidToPgtype(&actorID),
			}); err != nil {
				writeError(w, http.StatusInternalServerError, "could not create commission")
				return
			}
		}

		if body.RequestID != nil {
			rid, err := parseUUID(*body.RequestID)
			if err == nil {
				if _, err := qtx.MarkRequestInvoiced(r.Context(), rid); err != nil {
					writeError(w, http.StatusInternalServerError, "could not mark request invoiced")
					return
				}
			}
		}

		if err := processInvoicePayment(r.Context(), qtx, invoice); err != nil {
			writeError(w, http.StatusInternalServerError, "could not process payment")
			return
		}

		if err := tx.Commit(r.Context()); err != nil {
			writeError(w, http.StatusInternalServerError, "could not commit transaction")
			return
		}

		// Read back outside tx for response
		lineItems, _ = h.q.ListLineItemsByInvoice(r.Context(), invoice.ID)
		commissions, _ = h.q.ListInvoiceCommissions(r.Context(), invoice.ID)
	} else {
		// Non-paid invoice: no transaction needed
		invoice, err = h.q.CreateInvoice(r.Context(), params)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not create invoice")
			return
		}

		for _, li := range body.LineItems {
			qStr := fmt.Sprintf("%g", li.Quantity)
			rStr := fmt.Sprintf("%g", li.Rate)
			aStr := fmt.Sprintf("%g", li.Amount)
			if _, err := h.q.CreateLineItem(r.Context(), db.CreateLineItemParams{
				InvoiceID:   invoice.ID,
				Description: li.Description,
				Quantity:    stringToPgNumericOrZero(&qStr),
				Rate:        stringToPgNumericOrZero(&rStr),
				Amount:      stringToPgNumericOrZero(&aStr),
			}); err != nil {
				writeError(w, http.StatusInternalServerError, "could not create line item")
				return
			}
		}

		actorID, _ := middleware.UserIDFromContext(r.Context())
		for _, c := range body.Commissions {
			wid, err := parseUUID(c.WorkerID)
			if err != nil {
				continue
			}
			if _, err := h.q.CreateInvoiceCommission(r.Context(), db.CreateInvoiceCommissionParams{
				InvoiceID: invoice.ID,
				WorkerID:  wid,
				Amount:    stringToPgNumericOrZero(&c.Amount),
				CreatedBy: uuidToPgtype(&actorID),
			}); err != nil {
				writeError(w, http.StatusInternalServerError, "could not create commission")
				return
			}
		}

		if body.RequestID != nil {
			rid, err := parseUUID(*body.RequestID)
			if err == nil {
				if _, err := h.q.MarkRequestInvoiced(r.Context(), rid); err != nil {
					writeError(w, http.StatusInternalServerError, "could not mark request invoiced")
					return
				}
			}
		}

		lineItems, _ = h.q.ListLineItemsByInvoice(r.Context(), invoice.ID)
		commissions, _ = h.q.ListInvoiceCommissions(r.Context(), invoice.ID)
	}

	auditLog(r.Context(), h.q, "invoice.created", "invoice", invoice.ID, map[string]any{
		"requestId": body.RequestID,
		"clientId":  body.ClientID,
		"total":     body.Total,
	})

	writeJSON(w, http.StatusCreated, map[string]any{
		"invoice":     invoice,
		"lineItems":   lineItems,
		"commissions": commissions,
	})
}

// PATCH /api/admin/invoices/{id}
func (h *AdminInvoicesHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	existingInvoice, err := h.q.GetInvoiceByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "invoice not found")
		return
	}

	body, err := decode[struct {
		ClientName         *string           `json:"clientName"`
		ClientAddress      *string           `json:"clientAddress"`
		ClientPhone        *string           `json:"clientPhone"`
		ServiceName        *string           `json:"serviceName"`
		ServiceDescription *string           `json:"serviceDescription"`
		Subtotal           *string           `json:"subtotal"`
		Total              *string           `json:"total"`
		Notes              *string           `json:"notes"`
		Status             *string           `json:"status"`
		VendorCommission   *string           `json:"vendorCommission"`
		LineItems          []lineItemInput   `json:"lineItems"`
		Commissions        []commissionInput `json:"commissions"`
	}](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	statusChanged := body.Status != nil && *body.Status == "paid" && existingInvoice.Status != "paid"

	var invoice db.Invoice
	var lineItems []db.InvoiceLineItem
	var commissions []db.ListInvoiceCommissionsRow

	// If status is changing to "paid", wrap everything in a transaction
	if statusChanged {
		tx, err := h.pool.Begin(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not begin transaction")
			return
		}
		defer tx.Rollback(r.Context())

		qtx := h.q.WithTx(tx)

		// 1. Update invoice
		params := db.UpdateInvoiceParams{
			ID:                 id,
			ClientName:         body.ClientName,
			ClientAddress:      body.ClientAddress,
			ClientPhone:        body.ClientPhone,
			ServiceName:        body.ServiceName,
			ServiceDescription: body.ServiceDescription,
			Subtotal:           stringToPgNumericOrZero(body.Subtotal),
			Total:              stringToPgNumericOrZero(body.Total),
			Notes:              body.Notes,
			Status:             body.Status,
			VendorCommission: func() pgtype.Numeric {
				if body.VendorCommission != nil {
					return stringToPgNumeric(body.VendorCommission)
				}
				return existingInvoice.VendorCommission
			}(),
		}
		invoice, err = qtx.UpdateInvoice(r.Context(), params)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not update invoice")
			return
		}

		// 2. Update line items
		if body.LineItems != nil {
			_ = qtx.DeleteLineItemsByInvoice(r.Context(), invoice.ID)
			for _, li := range body.LineItems {
				qStr := fmt.Sprintf("%g", li.Quantity)
				rStr := fmt.Sprintf("%g", li.Rate)
				aStr := fmt.Sprintf("%g", li.Amount)
				_, _ = qtx.CreateLineItem(r.Context(), db.CreateLineItemParams{
					InvoiceID:   invoice.ID,
					Description: li.Description,
					Quantity:    stringToPgNumericOrZero(&qStr),
					Rate:        stringToPgNumericOrZero(&rStr),
					Amount:      stringToPgNumericOrZero(&aStr),
				})
			}
		}

		// 3. Update commission records
		if body.Commissions != nil {
			_ = qtx.DeleteInvoiceCommissionsByInvoice(r.Context(), invoice.ID)
			actorID, _ := middleware.UserIDFromContext(r.Context())
			for _, c := range body.Commissions {
				wid, err := parseUUID(c.WorkerID)
				if err != nil {
					continue
				}
				_, _ = qtx.CreateInvoiceCommission(r.Context(), db.CreateInvoiceCommissionParams{
					InvoiceID: invoice.ID,
					WorkerID:  wid,
					Amount:    stringToPgNumericOrZero(&c.Amount),
					CreatedBy: uuidToPgtype(&actorID),
				})
			}
		}

		// 4. Mark request as invoiced
		if invoice.RequestID.Valid {
			_, _ = qtx.MarkRequestInvoiced(r.Context(), invoice.RequestID.Bytes)
		}

		// 5. Process all payment side effects atomically
		if err := processInvoicePayment(r.Context(), qtx, invoice); err != nil {
			writeError(w, http.StatusInternalServerError, "could not process payment")
			return
		}

		if err := tx.Commit(r.Context()); err != nil {
			writeError(w, http.StatusInternalServerError, "could not commit transaction")
			return
		}
	} else {
		// Non-status-change update
		// If the invoice was already paid, wrap everything in a transaction
		// so invoice/line-items/commissions and financial side-effects are atomic.
		if existingInvoice.Status == "paid" {
			tx, err := h.pool.Begin(r.Context())
			if err != nil {
				writeError(w, http.StatusInternalServerError, "could not begin transaction")
				return
			}
			defer tx.Rollback(r.Context())
			qtx := h.q.WithTx(tx)

			// Reverse old financial side effects FIRST, before updating anything,
			// so we use the original invoice values for the reversal.
			if err := reverseInvoicePayment(r.Context(), qtx, existingInvoice); err != nil {
				writeError(w, http.StatusInternalServerError, "could not reverse old payment")
				return
			}

			params := db.UpdateInvoiceParams{
				ID:                 id,
				ClientName:         body.ClientName,
				ClientAddress:      body.ClientAddress,
				ClientPhone:        body.ClientPhone,
				ServiceName:        body.ServiceName,
				ServiceDescription: body.ServiceDescription,
				Subtotal:           stringToPgNumericOrZero(body.Subtotal),
				Total:              stringToPgNumericOrZero(body.Total),
				Notes:              body.Notes,
				Status:             body.Status,
				VendorCommission: func() pgtype.Numeric {
					if body.VendorCommission != nil {
						return stringToPgNumeric(body.VendorCommission)
					}
					return existingInvoice.VendorCommission
				}(),
			}
			invoice, err = qtx.UpdateInvoice(r.Context(), params)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "could not update invoice")
				return
			}

			if body.LineItems != nil {
				if err := qtx.DeleteLineItemsByInvoice(r.Context(), invoice.ID); err != nil {
					writeError(w, http.StatusInternalServerError, "could not update line items")
					return
				}
				for _, li := range body.LineItems {
					qStr := fmt.Sprintf("%g", li.Quantity)
					rStr := fmt.Sprintf("%g", li.Rate)
					aStr := fmt.Sprintf("%g", li.Amount)
					if _, err := qtx.CreateLineItem(r.Context(), db.CreateLineItemParams{
						InvoiceID:   invoice.ID,
						Description: li.Description,
						Quantity:    stringToPgNumericOrZero(&qStr),
						Rate:        stringToPgNumericOrZero(&rStr),
						Amount:      stringToPgNumericOrZero(&aStr),
					}); err != nil {
						writeError(w, http.StatusInternalServerError, "could not create line item")
						return
					}
				}
			}

			if body.Commissions != nil {
				if err := qtx.DeleteInvoiceCommissionsByInvoice(r.Context(), invoice.ID); err != nil {
					writeError(w, http.StatusInternalServerError, "could not update commissions")
					return
				}
				actorID, _ := middleware.UserIDFromContext(r.Context())
				for _, c := range body.Commissions {
					wid, err := parseUUID(c.WorkerID)
					if err != nil {
						continue
					}
					if _, err := qtx.CreateInvoiceCommission(r.Context(), db.CreateInvoiceCommissionParams{
						InvoiceID: invoice.ID,
						WorkerID:  wid,
						Amount:    stringToPgNumericOrZero(&c.Amount),
						CreatedBy: uuidToPgtype(&actorID),
					}); err != nil {
						writeError(w, http.StatusInternalServerError, "could not create commission")
						return
					}
				}
			}

			// Re-apply financial side effects if the invoice remains paid
			if body.Status == nil || *body.Status == "paid" {
				if err := processInvoicePayment(r.Context(), qtx, invoice); err != nil {
					writeError(w, http.StatusInternalServerError, "could not re-process payment")
					return
				}
			}

			if err := tx.Commit(r.Context()); err != nil {
				writeError(w, http.StatusInternalServerError, "could not commit transaction")
				return
			}
		} else {
			// Invoice was not paid — no financial side-effects, update normally
			params := db.UpdateInvoiceParams{
				ID:                 id,
				ClientName:         body.ClientName,
				ClientAddress:      body.ClientAddress,
				ClientPhone:        body.ClientPhone,
				ServiceName:        body.ServiceName,
				ServiceDescription: body.ServiceDescription,
				Subtotal:           stringToPgNumericOrZero(body.Subtotal),
				Total:              stringToPgNumericOrZero(body.Total),
				Notes:              body.Notes,
				Status:             body.Status,
				VendorCommission: func() pgtype.Numeric {
					if body.VendorCommission != nil {
						return stringToPgNumeric(body.VendorCommission)
					}
					return existingInvoice.VendorCommission
				}(),
			}
			invoice, err = h.q.UpdateInvoice(r.Context(), params)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "could not update invoice")
				return
			}

			if body.LineItems != nil {
				_ = h.q.DeleteLineItemsByInvoice(r.Context(), invoice.ID)
				for _, li := range body.LineItems {
					qStr := fmt.Sprintf("%g", li.Quantity)
					rStr := fmt.Sprintf("%g", li.Rate)
					aStr := fmt.Sprintf("%g", li.Amount)
					_, _ = h.q.CreateLineItem(r.Context(), db.CreateLineItemParams{
						InvoiceID:   invoice.ID,
						Description: li.Description,
						Quantity:    stringToPgNumericOrZero(&qStr),
						Rate:        stringToPgNumericOrZero(&rStr),
						Amount:      stringToPgNumericOrZero(&aStr),
					})
				}
			}

			if body.Commissions != nil {
				_ = h.q.DeleteInvoiceCommissionsByInvoice(r.Context(), invoice.ID)
				actorID, _ := middleware.UserIDFromContext(r.Context())
				for _, c := range body.Commissions {
					wid, err := parseUUID(c.WorkerID)
					if err != nil {
						continue
					}
					_, _ = h.q.CreateInvoiceCommission(r.Context(), db.CreateInvoiceCommissionParams{
						InvoiceID: invoice.ID,
						WorkerID:  wid,
						Amount:    stringToPgNumericOrZero(&c.Amount),
						CreatedBy: uuidToPgtype(&actorID),
					})
				}
			}
		}
	}

	auditLog(r.Context(), h.q, "invoice.updated", "invoice", id, map[string]any{
		"status": body.Status,
		"total":  body.Total,
	})

	lineItems, _ = h.q.ListLineItemsByInvoice(r.Context(), invoice.ID)
	commissions, _ = h.q.ListInvoiceCommissions(r.Context(), invoice.ID)
	writeJSON(w, http.StatusOK, map[string]any{
		"invoice":     invoice,
		"lineItems":   lineItems,
		"commissions": commissions,
	})
}

// DELETE /api/admin/invoices/{id}
func (h *AdminInvoicesHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDFromPath(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	invoice, err := h.q.GetInvoiceByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "invoice not found")
		return
	}

	// If the invoice was paid, reverse financial side effects atomically
	if invoice.Status == "paid" {
		tx, err := h.pool.Begin(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not begin transaction")
			return
		}
		defer tx.Rollback(r.Context())
		qtx := h.q.WithTx(tx)

		if err := reverseInvoicePayment(r.Context(), qtx, invoice); err != nil {
			writeError(w, http.StatusInternalServerError, "could not reverse payment effects")
			return
		}

		if err := qtx.DeleteInvoice(r.Context(), id); err != nil {
			writeError(w, http.StatusInternalServerError, "could not delete invoice")
			return
		}

		if err := tx.Commit(r.Context()); err != nil {
			writeError(w, http.StatusInternalServerError, "could not commit transaction")
			return
		}
	} else {
		if err := h.q.DeleteInvoice(r.Context(), id); err != nil {
			writeError(w, http.StatusInternalServerError, "could not delete invoice")
			return
		}
	}

	auditLog(r.Context(), h.q, "invoice.deleted", "invoice", id, nil)
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/admin/invoices/requests-without-invoice
func (h *AdminInvoicesHandler) ListRequestsWithoutInvoice(w http.ResponseWriter, r *http.Request) {
	page, pageSize := parsePagination(r)
	offset := (page - 1) * pageSize

	requests, err := h.q.ListRequestsWithoutInvoice(r.Context(), db.ListRequestsWithoutInvoiceParams{
		Limit:  int32(pageSize),
		Offset: int32(offset),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch requests")
		return
	}

	// Map []byte ServiceSummary to string for proper JSON serialization
	type invoiceRequestRow struct {
		db.ListRequestsWithoutInvoiceRow
		ServiceSummary string `json:"service_summary"`
	}
	mapped := make([]invoiceRequestRow, len(requests))
	for i, r := range requests {
		mapped[i] = invoiceRequestRow{
			ListRequestsWithoutInvoiceRow: r,
			ServiceSummary:                string(r.ServiceSummary),
		}
	}

	total, _ := h.q.CountRequestsWithoutInvoice(r.Context())
	writePaginated(w, mapped, total, page, pageSize)
}
