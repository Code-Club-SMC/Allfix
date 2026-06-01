-- Service Sub-Categories
ALTER TABLE services ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES services(id) ON DELETE SET NULL;
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_subcategory BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_services_parent ON services(parent_id);
CREATE INDEX IF NOT EXISTS idx_services_subcategory ON services(is_subcategory);

-- System Accounts (Wallet)
CREATE TABLE IF NOT EXISTS system_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    current_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default main account if not exists
INSERT INTO system_accounts (name, current_balance)
SELECT 'Main Account', 0
WHERE NOT EXISTS (SELECT 1 FROM system_accounts WHERE name = 'Main Account');

-- Account Transaction Ledger
CREATE TABLE IF NOT EXISTS account_transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id          UUID NOT NULL REFERENCES system_accounts(id),
    transaction_type    TEXT NOT NULL CHECK (transaction_type IN (
        'income', 'expense', 'salary_payment', 'commission_payout',
        'advance_given', 'invoice_payment', 'refund'
    )),
    amount              NUMERIC(12,2) NOT NULL,
    description         TEXT NOT NULL,
    reference_type      TEXT,
    reference_id        UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_account ON account_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON account_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON account_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON account_transactions(created_at DESC);

-- Worker Advances
CREATE TABLE IF NOT EXISTS worker_advances (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id           UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    amount              NUMERIC(12,2) NOT NULL,
    reason              TEXT,
    date_given          DATE NOT NULL,
    total_installments  INTEGER NOT NULL DEFAULT 1,
    installment_amount  NUMERIC(12,2) NOT NULL,
    remaining_amount    NUMERIC(12,2) NOT NULL,
    status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paused', 'paid_off')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advances_worker ON worker_advances(worker_id);
CREATE INDEX IF NOT EXISTS idx_advances_status ON worker_advances(status);

-- Advance Deductions (links advances to payroll)
CREATE TABLE IF NOT EXISTS advance_deductions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advance_id      UUID NOT NULL REFERENCES worker_advances(id) ON DELETE CASCADE,
    payroll_id      UUID NOT NULL REFERENCES salary_payments(id) ON DELETE CASCADE,
    amount_deducted NUMERIC(12,2) NOT NULL,
    deducted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(advance_id, payroll_id)
);

-- Payroll Enhancements
ALTER TABLE salary_payments
    ADD COLUMN IF NOT EXISTS commission_paid_this_month NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS advance_deducted_this_month NUMERIC(12,2) NOT NULL DEFAULT 0;
