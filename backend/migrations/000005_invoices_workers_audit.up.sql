-- request_workers junction table for multi-worker assignment
CREATE TABLE request_workers (
    request_id  UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    worker_id   UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    PRIMARY KEY (request_id, worker_id)
);

CREATE INDEX idx_request_workers_request_id ON request_workers(request_id);
CREATE INDEX idx_request_workers_worker_id ON request_workers(worker_id);

-- invoice_commissions table for per-worker commission tracking
CREATE TABLE invoice_commissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    worker_id   UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  UUID REFERENCES users(id),
    UNIQUE(invoice_id, worker_id)
);

CREATE INDEX idx_invoice_commissions_invoice_id ON invoice_commissions(invoice_id);
CREATE INDEX idx_invoice_commissions_worker_id ON invoice_commissions(worker_id);

-- audit_logs table for complete audit trail
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action      TEXT NOT NULL,
    actor_id    UUID REFERENCES users(id),
    actor_email TEXT,
    entity_type TEXT NOT NULL,
    entity_id   UUID,
    details     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
