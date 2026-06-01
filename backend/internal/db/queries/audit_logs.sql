-- name: CreateAuditLog :one
INSERT INTO audit_logs (action, actor_id, actor_email, entity_type, entity_id, details)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: ListAuditLogs :many
SELECT *
FROM audit_logs
WHERE ($1::text IS NULL OR $1 = '' OR entity_type = $1)
  AND ($2::uuid IS NULL OR entity_id = $2)
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountAuditLogs :one
SELECT COUNT(*) FROM audit_logs
WHERE ($1::text IS NULL OR $1 = '' OR entity_type = $1)
  AND ($2::uuid IS NULL OR entity_id = $2);
