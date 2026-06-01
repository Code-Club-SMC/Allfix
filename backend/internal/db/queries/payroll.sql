-- name: UpsertSalaryPayment :one
INSERT INTO salary_payments (
    worker_id, month, year, base_amount, jobs_count,
    commission_earned, deductions, net_payable, status,
    commission_paid_this_month, advance_deducted_this_month
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
ON CONFLICT (worker_id, month, year)
DO UPDATE SET
    base_amount                 = EXCLUDED.base_amount,
    jobs_count                  = EXCLUDED.jobs_count,
    commission_earned           = EXCLUDED.commission_earned,
    deductions                  = EXCLUDED.deductions,
    net_payable                 = EXCLUDED.net_payable,
    status                      = EXCLUDED.status,
    commission_paid_this_month  = EXCLUDED.commission_paid_this_month,
    advance_deducted_this_month = EXCLUDED.advance_deducted_this_month
RETURNING *;

-- name: ListPayroll :many
SELECT sp.*, w.name AS worker_name, w.compensation_type
FROM salary_payments sp
JOIN workers w ON w.id = sp.worker_id
WHERE ($1::integer IS NULL OR sp.month = $1)
  AND ($2::integer IS NULL OR sp.year  = $2)
ORDER BY w.name ASC;

-- name: MarkPayrollPaid :one
UPDATE salary_payments
SET status = 'paid', paid_at = NOW()
WHERE id = $1
RETURNING *;

-- name: ListPendingPayrollForMonth :many
SELECT sp.*, w.name AS worker_name, w.compensation_type
FROM salary_payments sp
JOIN workers w ON w.id = sp.worker_id
WHERE sp.month = $1 AND sp.year = $2 AND sp.status = 'pending'
ORDER BY w.name ASC;

-- name: MarkAllPayrollPaidForMonth :exec
UPDATE salary_payments
SET status = 'paid', paid_at = NOW()
WHERE month = $1 AND year = $2 AND status = 'pending';

-- name: GetPayrollByID :one
SELECT sp.*, w.name AS worker_name, w.compensation_type
FROM salary_payments sp
JOIN workers w ON w.id = sp.worker_id
WHERE sp.id = $1;

-- name: UpdatePayroll :one
UPDATE salary_payments
SET
    base_amount                 = COALESCE(sqlc.narg(base_amount), base_amount),
    jobs_count                  = COALESCE(sqlc.narg(jobs_count), jobs_count),
    commission_earned           = COALESCE(sqlc.narg(commission_earned), commission_earned),
    deductions                  = COALESCE(sqlc.narg(deductions), deductions),
    net_payable                 = COALESCE(sqlc.narg(net_payable), net_payable),
    status                      = COALESCE(sqlc.narg(status), status),
    commission_paid_this_month  = COALESCE(sqlc.narg(commission_paid_this_month), commission_paid_this_month),
    advance_deducted_this_month = COALESCE(sqlc.narg(advance_deducted_this_month), advance_deducted_this_month),
    paid_at                     = CASE
                                    WHEN sqlc.narg(status)::text = 'pending' THEN NULL
                                    WHEN sqlc.narg(status)::text = 'paid' AND paid_at IS NULL THEN NOW()
                                    ELSE paid_at
                                END,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

