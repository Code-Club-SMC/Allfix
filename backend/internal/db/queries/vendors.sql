-- name: CreateVendor :one
INSERT INTO vendors (
    name, contact_name, contact_phone, contact_email,
    services_offered, notes
) VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetVendorByID :one
SELECT * FROM vendors WHERE id = $1;

-- name: ListVendors :many
SELECT * FROM vendors
WHERE
    (sqlc.narg('search')::text IS NULL OR sqlc.narg('search') = '' OR name ILIKE '%' || sqlc.narg('search') || '%') AND
    (sqlc.narg('status')::text IS NULL OR sqlc.narg('status') = '' OR status = sqlc.narg('status'))
ORDER BY name ASC
LIMIT sqlc.arg('limit') OFFSET sqlc.arg('offset');

-- name: UpdateVendor :one
UPDATE vendors
SET
    name             = COALESCE(sqlc.narg(name), name),
    contact_name     = COALESCE(sqlc.narg(contact_name), contact_name),
    contact_phone    = COALESCE(sqlc.narg(contact_phone), contact_phone),
    contact_email    = COALESCE(sqlc.narg(contact_email), contact_email),
    services_offered = COALESCE(sqlc.narg(services_offered), services_offered),
    notes            = COALESCE(sqlc.narg(notes), notes),
    status           = COALESCE(sqlc.narg(status), status),
    updated_at       = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteVendor :one
UPDATE vendors
SET status = 'inactive', updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: GetActiveVendors :many
SELECT * FROM vendors
WHERE status = 'active'
ORDER BY name ASC;

-- name: AssignVendorToRequest :one
INSERT INTO request_vendors (
    request_id, vendor_id
) VALUES ($1, $2)
RETURNING *;

-- name: GetRequestVendorDetails :one
SELECT
    rv.id,
    rv.request_id,
    rv.vendor_id,
    rv.created_at,
    rv.updated_at,
    v.name AS vendor_name,
    v.contact_name AS vendor_contact_name,
    v.contact_phone AS vendor_contact_phone,
    v.contact_email AS vendor_contact_email,
    v.services_offered AS vendor_services_offered,
    v.status AS vendor_status
FROM request_vendors rv
JOIN vendors v ON v.id = rv.vendor_id
WHERE rv.request_id = $1;

-- name: RemoveVendorFromRequest :exec
DELETE FROM request_vendors
WHERE request_id = $1;

-- name: GetVendorProfile :one
SELECT
    v.id,
    v.name,
    v.status,
    v.services_offered,
    v.contact_name,
    v.contact_phone,
    v.contact_email,
    v.notes,
    COALESCE(SUM(
        CASE WHEN i.status = 'paid' THEN i.vendor_commission ELSE 0 END
    ), 0)::numeric AS total_commissions,
    COUNT(CASE WHEN i.status = 'paid' THEN 1 END)::integer AS commission_count,
    COUNT(r.id)::integer AS jobs_count
FROM vendors v
LEFT JOIN service_requests r ON r.vendor_id = v.id
LEFT JOIN invoices i ON i.request_id = r.id
WHERE v.id = $1
GROUP BY v.id;

-- name: GetVendorInvoices :many
SELECT
    i.id,
    i.invoice_number,
    i.total,
    i.vendor_commission,
    i.status,
    i.created_at,
    r.request_number,
    s.name AS service_name
FROM invoices i
JOIN service_requests r ON r.id = i.request_id
JOIN services s ON s.id = r.service_id
WHERE r.vendor_id = $1
ORDER BY i.created_at DESC;

-- name: CountVendors :one
SELECT COUNT(*) FROM vendors
WHERE
    (sqlc.narg('search')::text IS NULL OR sqlc.narg('search') = '' OR name ILIKE '%' || sqlc.narg('search') || '%') AND
    (sqlc.narg('status')::text IS NULL OR sqlc.narg('status') = '' OR status = sqlc.narg('status'));

-- name: CountVendorAssignedRequests :one
SELECT COUNT(*) FROM service_requests WHERE vendor_id = $1;

-- name: GetVendorRequests :many
SELECT
    r.id,
    r.request_number,
    r.full_name,
    r.status,
    r.preferred_date,
    s.name AS service_name
FROM service_requests r
JOIN services s ON s.id = r.service_id
WHERE r.vendor_id = $1
ORDER BY r.preferred_date DESC;
