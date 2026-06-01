-- name: CreateWorker :one
INSERT INTO workers (
    name, phone, cnic, trades, compensation_type,
    monthly_salary, commission_pct, min_guarantee,
    availability_days, availability_start, availability_end,
    status, notes
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
) RETURNING *;

-- name: ListWorkers :many
SELECT * FROM workers ORDER BY name ASC;

-- name: ListActiveWorkers :many
SELECT * FROM workers WHERE status = 'active' ORDER BY name ASC;

-- name: GetWorkerByID :one
SELECT * FROM workers WHERE id = $1;

-- name: UpdateWorker :one
UPDATE workers
SET
    name               = COALESCE(sqlc.narg(name), name),
    phone              = COALESCE(sqlc.narg(phone), phone),
    cnic               = COALESCE(sqlc.narg(cnic), cnic),
    trades             = COALESCE(sqlc.narg(trades), trades),
    compensation_type  = COALESCE(sqlc.narg(compensation_type), compensation_type),
    monthly_salary     = COALESCE(sqlc.narg(monthly_salary), monthly_salary),
    commission_pct     = COALESCE(sqlc.narg(commission_pct), commission_pct),
    min_guarantee      = COALESCE(sqlc.narg(min_guarantee), min_guarantee),
    availability_days  = COALESCE(sqlc.narg(availability_days), availability_days),
    availability_start = COALESCE(sqlc.narg(availability_start), availability_start),
    availability_end   = COALESCE(sqlc.narg(availability_end), availability_end),
    status             = COALESCE(sqlc.narg(status), status),
    notes              = COALESCE(sqlc.narg(notes), notes),
    updated_at         = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteWorker :exec
DELETE FROM workers WHERE id = $1;

-- name: CountActiveWorkers :one
SELECT COUNT(*) FROM workers WHERE status = 'active';

-- name: CountWorkersOnLeave :one
SELECT COUNT(*) FROM workers WHERE status = 'on_leave';

-- Worker Profile Queries
-- name: GetWorkerProfile :one
SELECT 
    w.*,
    COALESCE(SUM(wc.amount), 0)::text as total_commissions,
    COUNT(DISTINCT wc.id)::bigint as commission_count,
    COALESCE(SUM(sp.net_payable), 0)::text as total_salary_paid,
    COUNT(DISTINCT sp.id)::bigint as salary_count,
    COUNT(DISTINCT CASE WHEN sr.status = 'completed' THEN sr.id END)::bigint as jobs_completed
FROM workers w
LEFT JOIN worker_commissions wc ON wc.worker_id = w.id
LEFT JOIN salary_payments sp ON sp.worker_id = w.id AND sp.status = 'paid'
LEFT JOIN request_workers rw ON rw.worker_id = w.id
LEFT JOIN service_requests sr ON sr.id = rw.request_id
WHERE w.id = $1
GROUP BY w.id;

-- name: ListWorkerRequests :many
SELECT sr.*, s.name as service_name
FROM service_requests sr
JOIN request_workers rw ON rw.request_id = sr.id
JOIN services s ON s.id = sr.service_id
WHERE rw.worker_id = $1
ORDER BY sr.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountWorkerRequests :one
SELECT COUNT(*) FROM request_workers WHERE worker_id = $1;
