-- Add request_line_items table to support multi-service requests
CREATE TABLE request_line_items (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id  UUID        NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    service_id  UUID        NOT NULL REFERENCES services(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_request_line_items_request_id ON request_line_items(request_id);
