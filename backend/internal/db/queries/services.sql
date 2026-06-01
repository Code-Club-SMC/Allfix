-- name: ListServices :many
SELECT * FROM services ORDER BY name ASC;

-- name: GetServiceByID :one
SELECT * FROM services WHERE id = $1;

-- name: CreateService :one
INSERT INTO services (name, description, icon, parent_id, is_subcategory)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: UpdateService :one
UPDATE services
SET
    name           = COALESCE(sqlc.narg(name), name),
    description    = COALESCE(sqlc.narg(description), description),
    icon           = COALESCE(sqlc.narg(icon), icon),
    parent_id      = COALESCE(sqlc.narg(parent_id), parent_id),
    is_subcategory = COALESCE(sqlc.narg(is_subcategory), is_subcategory)
WHERE id = $1
RETURNING *;

-- name: ListServiceCategories :many
SELECT * FROM services WHERE parent_id IS NULL ORDER BY name ASC;

-- name: ListSubCategories :many
SELECT * FROM services WHERE parent_id = $1 ORDER BY name ASC;

-- name: ListAllServicesWithParent :many
SELECT
    s.*,
    p.name as parent_name
FROM services s
LEFT JOIN services p ON s.parent_id = p.id
ORDER BY COALESCE(p.name, s.name), s.name;

-- name: CountSubCategories :one
SELECT COUNT(*) FROM services WHERE parent_id = $1;

-- name: DeleteService :exec
DELETE FROM services WHERE id = $1;
