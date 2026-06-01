-- Create worker_commissions table to track paid commissions per worker per invoice
CREATE TABLE worker_commissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id       UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid')),
    paid_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_worker_commissions_worker_id ON worker_commissions(worker_id);
CREATE INDEX idx_worker_commissions_invoice_id ON worker_commissions(invoice_id);
CREATE INDEX idx_worker_commissions_paid_at ON worker_commissions(paid_at DESC);

-- Backfill existing paid commissions from invoice_commissions
INSERT INTO worker_commissions (worker_id, invoice_id, amount, status, paid_at, created_at)
SELECT 
    ic.worker_id,
    ic.invoice_id,
    ic.amount,
    'paid',
    i.created_at,  -- Use invoice creation date as approximation of payment date
    ic.created_at
FROM invoice_commissions ic
JOIN invoices i ON i.id = ic.invoice_id
WHERE i.status = 'paid'
ON CONFLICT DO NOTHING;
