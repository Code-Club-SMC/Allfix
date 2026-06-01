-- name: CreateUser :one
INSERT INTO users (name, email, password_hash, role)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1
LIMIT 1;

-- name: GetUserByID :one
SELECT * FROM users
WHERE id = $1
LIMIT 1;

-- name: GetAdminCount :one
SELECT COUNT(*) FROM users WHERE role = 'admin';

-- name: GetFirstAdmin :one
SELECT * FROM users WHERE role = 'admin' LIMIT 1;

-- name: UpdateAdminByID :one
UPDATE users
SET
    name          = COALESCE(sqlc.narg(name), name),
    email         = COALESCE(sqlc.narg(email), email),
    password_hash = COALESCE(sqlc.narg(password_hash), password_hash),
    updated_at    = NOW()
WHERE id = $1 AND role = 'admin'
RETURNING *;

-- name: ListClients :many
SELECT id, name, email FROM users WHERE role = 'client' ORDER BY name;

-- name: UpdateAdminByEmail :one
UPDATE users
SET
    name          = COALESCE(sqlc.narg(name), name),
    email         = COALESCE(sqlc.narg(new_email), email),
    password_hash = COALESCE(sqlc.narg(password_hash), password_hash),
    updated_at    = NOW()
WHERE email = $1 AND role = 'admin'
RETURNING *;
