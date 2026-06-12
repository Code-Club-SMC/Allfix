-- name: ListServices :many
SELECT * FROM services ORDER BY name ASC;

-- name: GetServiceByID :one
SELECT * FROM services WHERE id = $1;

-- name: CreateService :one
INSERT INTO services (name, description, icon, parent_id, is_subcategory, image_url, price, discount_percentage)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: UpdateService :one
UPDATE services
SET
    name           = COALESCE(sqlc.narg(name), name),
    description    = COALESCE(sqlc.narg(description), description),
    icon           = COALESCE(sqlc.narg(icon), icon),
    parent_id      = COALESCE(sqlc.narg(parent_id), parent_id),
    is_subcategory = COALESCE(sqlc.narg(is_subcategory), is_subcategory),
    image_url      = COALESCE(sqlc.narg(image_url), image_url),
    price          = COALESCE(sqlc.narg(price), price),
    discount_percentage = COALESCE(sqlc.narg(discount_percentage), discount_percentage),
    rating         = COALESCE(sqlc.narg(rating), rating),
    review_count   = COALESCE(sqlc.narg(review_count), review_count)
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

-- name: UpdateServicePricing :one
UPDATE services
SET
    price                = COALESCE(sqlc.narg(price), price),
    discount_percentage  = COALESCE(sqlc.narg(discount_percentage), discount_percentage),
    image_url            = COALESCE(sqlc.narg(image_url), image_url),
    rating               = COALESCE(sqlc.narg(rating), rating),
    review_count         = COALESCE(sqlc.narg(review_count), review_count)
WHERE id = $1
RETURNING *;

-- name: ListServicesByCategory :many
SELECT * FROM services WHERE parent_id = $1 ORDER BY name ASC;

-- name: GetCategoryWithCount :one
SELECT
    s.*,
    (SELECT COUNT(*) FROM services WHERE parent_id = s.id) as sub_service_count
FROM services s WHERE s.id = $1 AND s.parent_id IS NULL;

-- name: ListCategoriesWithCounts :many
SELECT
    s.*,
    (SELECT COUNT(*) FROM services WHERE parent_id = s.id) as sub_service_count
FROM services s WHERE s.parent_id IS NULL ORDER BY s.name ASC;

-- name: CreateUploadedFile :one
INSERT INTO uploaded_files (file_path, file_name, mime_type, size_bytes, uploaded_by)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListUploadedFiles :many
SELECT * FROM uploaded_files ORDER BY created_at DESC;

-- name: DeleteUploadedFile :exec
DELETE FROM uploaded_files WHERE id = $1;
