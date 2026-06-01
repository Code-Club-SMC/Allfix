-- name: CreateInventoryItem :one
INSERT INTO inventory (
    name, category, quantity, unit, condition,
    assigned_worker_id, purchase_date, cost, low_stock_threshold
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: ListInventory :many
SELECT i.*, w.name AS worker_name
FROM inventory i
LEFT JOIN workers w ON w.id = i.assigned_worker_id
ORDER BY i.name ASC;

-- name: GetInventoryItemByID :one
SELECT i.*, w.name AS worker_name
FROM inventory i
LEFT JOIN workers w ON w.id = i.assigned_worker_id
WHERE i.id = $1;

-- name: UpdateInventoryItem :one
UPDATE inventory
SET
    name                = COALESCE(sqlc.narg(name), name),
    category            = COALESCE(sqlc.narg(category), category),
    quantity            = COALESCE(sqlc.narg(quantity), quantity),
    unit                = COALESCE(sqlc.narg(unit), unit),
    condition           = COALESCE(sqlc.narg(condition), condition),
    assigned_worker_id  = COALESCE(sqlc.narg(assigned_worker_id), assigned_worker_id),
    purchase_date       = COALESCE(sqlc.narg(purchase_date), purchase_date),
    cost                = COALESCE(sqlc.narg(cost), cost),
    low_stock_threshold = COALESCE(sqlc.narg(low_stock_threshold), low_stock_threshold),
    updated_at          = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteInventoryItem :exec
DELETE FROM inventory WHERE id = $1;
