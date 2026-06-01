-- name: CreateIncome :one
INSERT INTO income (date, description, category, amount, source, receipt_url, invoice_id)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: ListIncome :many
SELECT * FROM income
WHERE ($3::date IS NULL OR date >= $3)
  AND ($4::date IS NULL OR date <= $4)
ORDER BY date DESC
LIMIT $1 OFFSET $2;

-- name: CountIncome :one
SELECT COUNT(*) FROM income
WHERE ($1::date IS NULL OR date >= $1)
  AND ($2::date IS NULL OR date <= $2);

-- name: CreateExpense :one
INSERT INTO expenses (date, description, category, amount, vendor_payee, receipt_url)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: ListExpenses :many
SELECT * FROM expenses
WHERE ($3::date IS NULL OR date >= $3)
  AND ($4::date IS NULL OR date <= $4)
ORDER BY date DESC
LIMIT $1 OFFSET $2;

-- name: CountExpenses :one
SELECT COUNT(*) FROM expenses
WHERE ($1::date IS NULL OR date >= $1)
  AND ($2::date IS NULL OR date <= $2);

-- name: GetFinanceOverview :one
SELECT
    COALESCE(SUM(CASE WHEN type = 'income'  THEN amount END), 0)::TEXT AS total_income,
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0)::TEXT AS total_expenses
FROM (
    SELECT amount, 'income'  AS type FROM income
    WHERE ($1::date IS NULL OR date >= $1)
      AND ($2::date IS NULL OR date <= $2)
    UNION ALL
    SELECT amount, 'expense' AS type FROM expenses
    WHERE ($1::date IS NULL OR date >= $1)
      AND ($2::date IS NULL OR date <= $2)
) combined;

-- name: GetMonthlyFinanceData :many
SELECT
    TO_CHAR(month_series, 'Mon YYYY') AS month_label,
    month_series AS month_start,
    COALESCE(inc.total, 0)::TEXT    AS total_income,
    COALESCE(exp.total, 0)::TEXT    AS total_expenses
FROM generate_series(
    COALESCE($1::date, (date_trunc('month', NOW()) - INTERVAL '5 months')::date),
    COALESCE($2::date, date_trunc('month', NOW())::date),
    '1 month'::INTERVAL
) AS month_series
LEFT JOIN (
    SELECT date_trunc('month', date) AS m, SUM(amount) AS total
    FROM income WHERE ($1::date IS NULL OR date >= $1) AND ($2::date IS NULL OR date <= $2)
    GROUP BY m
) inc ON inc.m = month_series
LEFT JOIN (
    SELECT date_trunc('month', date) AS m, SUM(amount) AS total
    FROM expenses WHERE ($1::date IS NULL OR date >= $1) AND ($2::date IS NULL OR date <= $2)
    GROUP BY m
) exp ON exp.m = month_series
ORDER BY month_series ASC;

-- name: UpdateIncome :one
UPDATE income
SET
    date        = COALESCE(sqlc.narg(date), date),
    description = COALESCE(sqlc.narg(description), description),
    category    = COALESCE(sqlc.narg(category), category),
    amount      = COALESCE(sqlc.narg(amount), amount),
    source      = COALESCE(sqlc.narg(source), source),
    receipt_url = COALESCE(sqlc.narg(receipt_url), receipt_url),
    invoice_id  = COALESCE(sqlc.narg(invoice_id), invoice_id),
    updated_at  = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteIncome :exec
DELETE FROM income WHERE id = $1;

-- name: GetIncomeByInvoiceID :one
SELECT * FROM income WHERE invoice_id = $1;

-- name: DeleteIncomeByInvoiceID :exec
DELETE FROM income WHERE invoice_id = $1;

-- name: UpdateExpense :one
UPDATE expenses
SET
    date         = COALESCE(sqlc.narg(date), date),
    description  = COALESCE(sqlc.narg(description), description),
    category     = COALESCE(sqlc.narg(category), category),
    amount       = COALESCE(sqlc.narg(amount), amount),
    vendor_payee = COALESCE(sqlc.narg(vendor_payee), vendor_payee),
    receipt_url  = COALESCE(sqlc.narg(receipt_url), receipt_url),
    updated_at   = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteExpense :exec
DELETE FROM expenses WHERE id = $1;

-- name: GetPendingPayables :one
SELECT COALESCE(SUM(net_payable), 0)::TEXT AS total
FROM salary_payments
WHERE status = 'pending';

-- System Account Queries
-- name: GetSystemAccount :one
SELECT * FROM system_accounts WHERE id = $1;

-- name: ListSystemAccounts :many
SELECT * FROM system_accounts ORDER BY name ASC;

-- name: UpdateAccountBalance :one
UPDATE system_accounts
SET current_balance = current_balance + $2
WHERE id = $1
RETURNING *;

-- Account Transaction Queries
-- name: CreateAccountTransaction :one
INSERT INTO account_transactions
    (account_id, transaction_type, amount, description, reference_type, reference_id)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetAccountTransactionByReference :one
SELECT * FROM account_transactions
WHERE reference_type = $1 AND reference_id = $2
ORDER BY created_at DESC
LIMIT 1;

-- name: ListAccountTransactions :many
SELECT * FROM account_transactions
WHERE account_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountAccountTransactions :one
SELECT COUNT(*) FROM account_transactions WHERE account_id = $1;

-- name: GetTransactionSummary :many
SELECT
    transaction_type,
    SUM(amount) as total
FROM account_transactions
WHERE account_id = $1
  AND ($2::timestamptz IS NULL OR created_at >= $2)
  AND ($3::timestamptz IS NULL OR created_at <= $3)
GROUP BY transaction_type;

-- name: GetIncomeTotal :one
SELECT COALESCE(SUM(amount), 0)::TEXT AS total
FROM income
WHERE ($1::date IS NULL OR date >= $1)
  AND ($2::date IS NULL OR date <= $2);

-- name: GetExpenseTotal :one
SELECT COALESCE(SUM(amount), 0)::TEXT AS total
FROM expenses
WHERE ($1::date IS NULL OR date >= $1)
  AND ($2::date IS NULL OR date <= $2);

-- name: GetExpense :one
SELECT * FROM expenses WHERE id = $1;
