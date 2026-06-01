-- name: CreateAdvance :one
INSERT INTO worker_advances
    (worker_id, amount, reason, date_given, total_installments, installment_amount, remaining_amount)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetAdvanceByID :one
SELECT * FROM worker_advances WHERE id = $1;

-- name: ListWorkerAdvances :many
SELECT wa.*, w.name as worker_name
FROM worker_advances wa
JOIN workers w ON w.id = wa.worker_id
WHERE wa.worker_id = $1
ORDER BY wa.date_given DESC;

-- name: ListActiveAdvances :many
SELECT wa.*, w.name as worker_name
FROM worker_advances wa
JOIN workers w ON w.id = wa.worker_id
WHERE wa.status = 'active'
ORDER BY wa.date_given DESC;

-- name: ListAdvances :many
SELECT wa.*, w.name as worker_name
FROM worker_advances wa
JOIN workers w ON w.id = wa.worker_id
ORDER BY wa.date_given DESC
LIMIT $1 OFFSET $2;

-- name: CountAdvances :one
SELECT COUNT(*) FROM worker_advances;

-- name: UpdateAdvanceStatus :one
UPDATE worker_advances
SET status = $2
WHERE id = $1
RETURNING *;

-- name: UpdateAdvanceRemaining :one
UPDATE worker_advances
SET remaining_amount = $2, status = COALESCE($3, status)
WHERE id = $1
RETURNING *;

-- name: RecordAdvanceDeduction :one
INSERT INTO advance_deductions (advance_id, payroll_id, amount_deducted)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetAdvanceTotalDeductions :one
SELECT COALESCE(SUM(amount_deducted), 0)::NUMERIC as total_deducted
FROM advance_deductions
WHERE advance_id = $1;

-- name: GetAdvanceDeductionsForPayroll :many
SELECT ad.*, wa.worker_id, wa.reason
FROM advance_deductions ad
JOIN worker_advances wa ON wa.id = ad.advance_id
WHERE ad.payroll_id = $1;

-- name: GetActiveAdvancesForWorker :many
SELECT * FROM worker_advances
WHERE worker_id = $1 AND status = 'active'
ORDER BY date_given ASC;
