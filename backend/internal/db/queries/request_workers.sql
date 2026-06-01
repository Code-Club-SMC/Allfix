-- name: AssignWorkerToRequest :exec
INSERT INTO request_workers (request_id, worker_id, assigned_by)
VALUES ($1, $2, $3)
ON CONFLICT (request_id, worker_id) DO NOTHING;

-- name: RemoveWorkerFromRequest :exec
DELETE FROM request_workers
WHERE request_id = $1 AND worker_id = $2;

-- name: ClearRequestWorkers :exec
DELETE FROM request_workers WHERE request_id = $1;

-- name: ListWorkersByRequest :many
SELECT w.*
FROM workers w
JOIN request_workers rw ON rw.worker_id = w.id
WHERE rw.request_id = $1
ORDER BY w.name ASC;

-- name: ListRequestWorkerIDs :many
SELECT worker_id FROM request_workers WHERE request_id = $1;

-- name: CountRequestWorkers :one
SELECT COUNT(*) FROM request_workers WHERE request_id = $1;
