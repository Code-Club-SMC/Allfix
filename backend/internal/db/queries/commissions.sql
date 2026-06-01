-- name: CreateWorkerCommission :one
INSERT INTO worker_commissions (worker_id, invoice_id, amount, paid_at)
VALUES ($1, $2, $3, NOW())
RETURNING *;

-- name: ListWorkerCommissions :many
SELECT wc.*, i.invoice_number, i.total as invoice_total, i.created_at as invoice_date
FROM worker_commissions wc
JOIN invoices i ON i.id = wc.invoice_id
WHERE wc.worker_id = $1
ORDER BY wc.paid_at DESC
LIMIT $2 OFFSET $3;

-- name: CountWorkerCommissions :one
SELECT COUNT(*) FROM worker_commissions WHERE worker_id = $1;

-- name: GetWorkerCommissionTotalForMonth :one
SELECT COALESCE(SUM(amount), 0)::text
FROM worker_commissions
WHERE worker_id = $1
  AND paid_at >= $2
  AND paid_at < $3;

-- name: DeleteWorkerCommissionsByInvoice :exec
DELETE FROM worker_commissions WHERE invoice_id = $1;

-- name: GetWorkerCommissionDetailsForMonth :many
SELECT
    wc.amount,
    wc.invoice_id,
    i.invoice_number,
    wc.paid_at AS invoice_date
FROM worker_commissions wc
JOIN invoices i ON i.id = wc.invoice_id
WHERE wc.worker_id = $1
  AND wc.paid_at >= $2
  AND wc.paid_at < $3
ORDER BY wc.paid_at DESC;

-- name: ListWorkerCommissionsByDateRange :many
SELECT wc.*, i.invoice_number, i.total as invoice_total, i.created_at as invoice_date
FROM worker_commissions wc
JOIN invoices i ON i.id = wc.invoice_id
WHERE wc.worker_id = $1
  AND ($2::date IS NULL OR wc.paid_at::date >= $2)
  AND ($3::date IS NULL OR wc.paid_at::date <= $3)
ORDER BY wc.paid_at DESC
LIMIT $4 OFFSET $5;

-- name: GetWorkerCommissionTotalByDateRange :one
SELECT COALESCE(SUM(amount), 0)::text
FROM worker_commissions
WHERE worker_id = $1
  AND ($2::date IS NULL OR paid_at::date >= $2)
  AND ($3::date IS NULL OR paid_at::date <= $3);
