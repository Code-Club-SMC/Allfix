-- name: CreateRequest :one
INSERT INTO service_requests (
    request_number, client_id, service_id, description,
    preferred_date, preferred_time, urgency,
    full_name, phone, email, address, city, area
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
) RETURNING *;

-- name: GetRequestByID :one
SELECT
    sr.*,
    s.name  AS service_name,
    u.name  AS client_name,
    w.name  AS worker_name,
    w.phone AS worker_phone,
    v.id    AS vendor_id,
    v.name  AS vendor_name,
    v.contact_phone AS vendor_phone
FROM service_requests sr
JOIN services s ON s.id = sr.service_id
JOIN users    u ON u.id = sr.client_id
    LEFT JOIN workers w ON w.id = sr.assigned_worker_id
    LEFT JOIN vendors v ON v.id = sr.vendor_id
    WHERE sr.id = $1;

-- name: ListRequestsByClient :many
SELECT
    sr.*,
    s.name AS service_name,
    COALESCE(li.service_count, 1::bigint) AS service_count,
    COALESCE(li.service_summary, s.name) AS service_summary
FROM service_requests sr
JOIN services s ON s.id = sr.service_id
LEFT JOIN (
    SELECT
        rli.request_id,
        COUNT(*)::bigint AS service_count,
        STRING_AGG(s.name, ', ' ORDER BY rli.created_at) AS service_summary
    FROM request_line_items rli
    JOIN services s ON s.id = rli.service_id
    GROUP BY rli.request_id
) li ON li.request_id = sr.id
WHERE sr.client_id = $1
ORDER BY sr.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountRequestsByClient :one
SELECT COUNT(*) FROM service_requests WHERE client_id = $1;

-- name: ListAllRequests :many
SELECT
    sr.*,
    s.name  AS service_name,
    COALESCE(li.service_count, 1::bigint) AS service_count,
    COALESCE(li.service_summary, s.name) AS service_summary,
    u.name  AS client_name,
    rw_agg.worker_names AS worker_names,
    sr.vendor_id AS vendor_id,
    v.name  AS vendor_name
FROM service_requests sr
JOIN services s ON s.id = sr.service_id
LEFT JOIN (
    SELECT
        rli.request_id,
        COUNT(*)::bigint AS service_count,
        STRING_AGG(s.name, ', ' ORDER BY rli.created_at) AS service_summary
    FROM request_line_items rli
    JOIN services s ON s.id = rli.service_id
    GROUP BY rli.request_id
) li ON li.request_id = sr.id
JOIN users    u ON u.id = sr.client_id
LEFT JOIN (
    SELECT
        rw.request_id,
        STRING_AGG(w.name, ', ' ORDER BY rw.assigned_at) AS worker_names
    FROM request_workers rw
    JOIN workers w ON w.id = rw.worker_id
    GROUP BY rw.request_id
) rw_agg ON rw_agg.request_id = sr.id
LEFT JOIN vendors v ON v.id = sr.vendor_id
WHERE
    ($1::text   IS NULL OR $1 = ''   OR sr.status     = $1)   AND
    ($2::text   IS NULL OR $2 = ''   OR sr.urgency    = $2)   AND
    ($3::uuid   IS NULL OR $3 = '00000000-0000-0000-0000-000000000000' OR sr.service_id = $3)   AND
    ($4::text   IS NULL OR $4 = ''   OR
        u.name  ILIKE '%' || $4 || '%' OR
        sr.request_number ILIKE '%' || $4 || '%'
    )                                            AND
    ($7::date   IS NULL OR $7 = '0001-01-01' OR sr.created_at::date >= $7) AND
    ($8::date   IS NULL OR $8 = '0001-01-01' OR sr.created_at::date <= $8) AND
    ($9::text   IS NULL OR $9 = '' OR $9 = 'all' OR
        ($9 = 'workers' AND sr.assigned_worker_id IS NOT NULL AND sr.vendor_id IS NULL) OR
        ($9 = 'vendors' AND sr.vendor_id IS NOT NULL) OR
        ($9 = 'unassigned' AND sr.assigned_worker_id IS NULL AND sr.vendor_id IS NULL AND NOT EXISTS (
            SELECT 1 FROM request_workers rw WHERE rw.request_id = sr.id
        ))
    )
ORDER BY sr.created_at DESC
LIMIT $5 OFFSET $6;

-- name: CountAllRequests :one
SELECT COUNT(*)
FROM service_requests sr
JOIN users u ON u.id = sr.client_id
WHERE
    ($1::text IS NULL OR $1 = '' OR sr.status     = $1) AND
    ($2::text IS NULL OR $2 = '' OR sr.urgency    = $2) AND
    ($3::uuid IS NULL OR $3 = '00000000-0000-0000-0000-000000000000' OR sr.service_id = $3) AND
    ($4::text IS NULL OR $4 = '' OR
        u.name ILIKE '%' || $4 || '%' OR
        sr.request_number ILIKE '%' || $4 || '%'
    )                                        AND
    ($5::date IS NULL OR $5 = '0001-01-01' OR sr.created_at::date >= $5) AND
    ($6::date IS NULL OR $6 = '0001-01-01' OR sr.created_at::date <= $6);

-- name: UpdateRequest :one
UPDATE service_requests
SET
    status             = COALESCE(sqlc.narg(status), status),
    assigned_worker_id = COALESCE(sqlc.narg(assigned_worker_id), assigned_worker_id),
    internal_notes     = COALESCE(sqlc.narg(internal_notes), internal_notes),
    updated_at         = NOW()
WHERE id = $1
RETURNING *;

-- name: MarkRequestInvoiced :one
UPDATE service_requests
SET status = 'invoiced', updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: SetRequestAssignedWorker :one
UPDATE service_requests
SET assigned_worker_id = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: SetRequestVendor :one
UPDATE service_requests
SET vendor_id = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: ClearRequestVendor :one
UPDATE service_requests
SET vendor_id = NULL, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: CountRequestsToday :one
SELECT COUNT(*) FROM service_requests
WHERE created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day';

-- name: CountRequestsInRange :one
SELECT COUNT(*) FROM service_requests
WHERE
    ($1::date IS NULL OR created_at::date >= $1) AND
    ($2::date IS NULL OR created_at::date <= $2);

-- name: CountActiveRequests :one
SELECT COUNT(*) FROM service_requests
WHERE status IN ('pending', 'assigned', 'in_progress');

-- name: GetRecentRequests :many
SELECT
    sr.*,
    s.name AS service_name,
    COALESCE(li.service_count, 1::bigint) AS service_count,
    COALESCE(li.service_summary, s.name) AS service_summary,
    u.name AS client_name,
    w.name AS worker_name
FROM service_requests sr
JOIN services s ON s.id = sr.service_id
LEFT JOIN (
    SELECT
        rli.request_id,
        COUNT(*)::bigint AS service_count,
        STRING_AGG(s2.name, ', ' ORDER BY rli.created_at) AS service_summary
    FROM request_line_items rli
    JOIN services s2 ON s2.id = rli.service_id
    GROUP BY rli.request_id
) li ON li.request_id = sr.id
JOIN users    u ON u.id = sr.client_id
LEFT JOIN workers w ON w.id = sr.assigned_worker_id
ORDER BY sr.created_at DESC
LIMIT $1;

-- name: GetRecentRequestsInRange :many
SELECT
    sr.*,
    s.name AS service_name,
    COALESCE(li.service_count, 1::bigint) AS service_count,
    COALESCE(li.service_summary, s.name) AS service_summary,
    u.name AS client_name,
    w.name AS worker_name
FROM service_requests sr
JOIN services s ON s.id = sr.service_id
LEFT JOIN (
    SELECT
        rli.request_id,
        COUNT(*)::bigint AS service_count,
        STRING_AGG(s2.name, ', ' ORDER BY rli.created_at) AS service_summary
    FROM request_line_items rli
    JOIN services s2 ON s2.id = rli.service_id
    GROUP BY rli.request_id
) li ON li.request_id = sr.id
JOIN users    u ON u.id = sr.client_id
LEFT JOIN workers w ON w.id = sr.assigned_worker_id
WHERE
    ($2::date IS NULL OR sr.created_at::date >= $2) AND
    ($3::date IS NULL OR sr.created_at::date <= $3)
ORDER BY sr.created_at DESC
LIMIT $1;

-- name: GetServiceDistribution :many
SELECT s.name AS service_name, COUNT(sr.id) AS request_count
FROM service_requests sr
JOIN services s ON s.id = sr.service_id
WHERE
    ($1::date IS NULL OR sr.created_at::date >= $1) AND
    ($2::date IS NULL OR sr.created_at::date <= $2)
GROUP BY s.name
ORDER BY request_count DESC
LIMIT 6;

-- name: CreateRequestImage :one
INSERT INTO request_images (request_id, url) VALUES ($1, $2) RETURNING *;

-- name: ListRequestImages :many
SELECT * FROM request_images WHERE request_id = $1;

-- name: CreateRequestLineItem :one
INSERT INTO request_line_items (request_id, service_id) VALUES ($1, $2) RETURNING *;

-- name: ListRequestLineItems :many
SELECT rli.*, s.name AS service_name, s.price AS service_price
FROM request_line_items rli
JOIN services s ON s.id = rli.service_id
WHERE rli.request_id = $1
ORDER BY rli.created_at;
