-- name: GetNextInvoiceNumber :one
SELECT COALESCE(
    'INV-' || LPAD(
        (CAST(SUBSTRING(MAX(invoice_number) FROM 'INV-([0-9]+)') AS INTEGER) + 1)::TEXT,
        4, '0'
    ),
    'INV-0001'
) AS next_number
FROM invoices;

-- name: CreateInvoice :one
INSERT INTO invoices (
    invoice_number, request_id, client_id, client_name, client_address, client_phone,
    service_name, service_description, subtotal, total, notes, status, vendor_commission
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
RETURNING *;

-- name: GetInvoiceByID :one
SELECT * FROM invoices WHERE id = $1;

-- name: ListInvoices :many
SELECT i.*, u.name AS client_user_name
FROM invoices i
JOIN users u ON u.id = i.client_id
WHERE ($1::text IS NULL OR $1 = '' OR i.status = $1)
  AND ($4::date IS NULL OR $4 = '0001-01-01' OR i.created_at::date >= $4)
  AND ($5::date IS NULL OR $5 = '0001-01-01' OR i.created_at::date <= $5)
ORDER BY i.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountInvoices :one
SELECT COUNT(*) FROM invoices
WHERE ($1::text IS NULL OR $1 = '' OR status = $1)
  AND ($2::date IS NULL OR $2 = '0001-01-01' OR created_at::date >= $2)
  AND ($3::date IS NULL OR $3 = '0001-01-01' OR created_at::date <= $3);

-- name: UpdateInvoice :one
UPDATE invoices
SET
    client_name         = COALESCE(sqlc.narg(client_name), client_name),
    client_address      = COALESCE(sqlc.narg(client_address), client_address),
    client_phone        = COALESCE(sqlc.narg(client_phone), client_phone),
    service_name        = COALESCE(sqlc.narg(service_name), service_name),
    service_description = COALESCE(sqlc.narg(service_description), service_description),
    subtotal            = COALESCE(sqlc.narg(subtotal), subtotal),
    total               = COALESCE(sqlc.narg(total), total),
    notes               = COALESCE(sqlc.narg(notes), notes),
    status              = COALESCE(sqlc.narg(status), status),
    vendor_commission   = COALESCE(sqlc.narg(vendor_commission), vendor_commission),
    updated_at          = NOW()
WHERE id = $1
RETURNING *;

-- name: CreateLineItem :one
INSERT INTO invoice_line_items (invoice_id, description, quantity, rate, amount)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: DeleteLineItemsByInvoice :exec
DELETE FROM invoice_line_items WHERE invoice_id = $1;

-- name: DeleteInvoice :exec
DELETE FROM invoices WHERE id = $1;

-- name: ListLineItemsByInvoice :many
SELECT * FROM invoice_line_items WHERE invoice_id = $1;

-- name: CreateInvoiceCommission :one
INSERT INTO invoice_commissions (invoice_id, worker_id, amount, created_by)
VALUES ($1, $2, $3, $4)
ON CONFLICT (invoice_id, worker_id)
DO UPDATE SET amount = EXCLUDED.amount, created_by = EXCLUDED.created_by
RETURNING *;

-- name: ListInvoiceCommissions :many
SELECT ic.*, w.name AS worker_name
FROM invoice_commissions ic
JOIN workers w ON w.id = ic.worker_id
WHERE ic.invoice_id = $1
ORDER BY w.name ASC;

-- name: DeleteInvoiceCommissionsByInvoice :exec
DELETE FROM invoice_commissions WHERE invoice_id = $1;

-- name: GetWorkerInvoiceCommissionTotal :one
SELECT COALESCE(SUM(ic.amount), 0)::text AS total
FROM invoice_commissions ic
JOIN invoices i ON i.id = ic.invoice_id
WHERE ic.worker_id = $1
  AND i.created_at >= $2
  AND i.created_at < $3;

-- name: ListRequestsWithoutInvoice :many
SELECT
    sr.id, sr.request_number, sr.client_id, sr.service_id, sr.description,
    sr.preferred_date, sr.preferred_time, sr.urgency, sr.full_name, sr.phone,
    sr.email, sr.address, sr.city, sr.area, sr.status, sr.assigned_worker_id,
    sr.internal_notes, sr.created_at, sr.updated_at,
    s.name AS service_name,
    COALESCE(li.service_summary, s.name) AS service_summary,
    COALESCE(wc.worker_count, 0)::bigint AS worker_count
FROM service_requests sr
JOIN services s ON s.id = sr.service_id
LEFT JOIN invoices inv ON inv.request_id = sr.id
LEFT JOIN (
    SELECT rli.request_id, STRING_AGG(s2.name, ', ' ORDER BY rli.created_at) AS service_summary
    FROM request_line_items rli
    JOIN services s2 ON s2.id = rli.service_id
    GROUP BY rli.request_id
) li ON li.request_id = sr.id
LEFT JOIN (
    SELECT request_id, COUNT(*)::bigint AS worker_count
    FROM request_workers
    GROUP BY request_id
) wc ON wc.request_id = sr.id
WHERE inv.id IS NULL
  AND sr.status != 'invoiced'
ORDER BY sr.created_at DESC
LIMIT $1 OFFSET $2;

-- name: CountRequestsWithoutInvoice :one
SELECT COUNT(*)
FROM service_requests sr
LEFT JOIN invoices inv ON inv.request_id = sr.id
WHERE inv.id IS NULL
  AND sr.status != 'invoiced';

-- name: GetWorkerPaidCommissionTotalForMonth :one
SELECT COALESCE(SUM(wc.amount), 0)::TEXT AS total
FROM worker_commissions wc
WHERE wc.worker_id = $1
  AND wc.paid_at >= $2
  AND wc.paid_at < $3;
