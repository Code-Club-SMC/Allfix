CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    email       TEXT        UNIQUE NOT NULL,
    password_hash TEXT      NOT NULL,
    role        TEXT        NOT NULL CHECK (role IN ('admin', 'client')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);

-- ─── Services ─────────────────────────────────────────────────────────────────
CREATE TABLE services (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        UNIQUE NOT NULL,
    description TEXT        NOT NULL,
    icon        TEXT        NOT NULL DEFAULT 'wrench',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Workers ──────────────────────────────────────────────────────────────────
CREATE TABLE workers (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT        NOT NULL,
    phone               TEXT        NOT NULL,
    cnic                TEXT,
    trades              TEXT[]      NOT NULL DEFAULT '{}',
    compensation_type   TEXT        NOT NULL CHECK (compensation_type IN ('fixed_salary', 'commission')),
    monthly_salary      NUMERIC(12,2),
    commission_pct      NUMERIC(5,2),
    min_guarantee       NUMERIC(12,2),
    availability_days   INTEGER[]   NOT NULL DEFAULT '{}',
    availability_start  TIME,
    availability_end    TIME,
    status              TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workers_status ON workers(status);

-- ─── Service Requests ─────────────────────────────────────────────────────────
CREATE TABLE service_requests (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number      TEXT        UNIQUE NOT NULL,
    client_id           UUID        NOT NULL REFERENCES users(id),
    service_id          UUID        NOT NULL REFERENCES services(id),
    description         TEXT        NOT NULL,
    preferred_date      DATE        NOT NULL,
    preferred_time      TEXT        NOT NULL,
    urgency             TEXT        NOT NULL CHECK (urgency IN ('standard', 'urgent')),
    full_name           TEXT        NOT NULL,
    phone               TEXT        NOT NULL,
    email               TEXT        NOT NULL,
    address             TEXT        NOT NULL,
    city                TEXT        NOT NULL,
    area                TEXT        NOT NULL,
    status              TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'invoiced')),
    assigned_worker_id  UUID        REFERENCES workers(id),
    internal_notes      TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_requests_client_id  ON service_requests(client_id);
CREATE INDEX idx_requests_status     ON service_requests(status);
CREATE INDEX idx_requests_created_at ON service_requests(created_at DESC);

-- ─── Request Images ───────────────────────────────────────────────────────────
CREATE TABLE request_images (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id  UUID        NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    url         TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Vendors ──────────────────────────────────────────────────────────────────
CREATE TABLE vendors (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT        NOT NULL,
    category        TEXT        NOT NULL CHECK (category IN ('materials', 'tools', 'equipment', 'subcontract')),
    contact_name    TEXT,
    contact_phone   TEXT,
    contact_email   TEXT,
    address         TEXT,
    payment_terms   TEXT        NOT NULL DEFAULT 'net_30' CHECK (payment_terms IN ('net_15', 'net_30', 'immediate')),
    notes           TEXT,
    status          TEXT        NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Invoices ─────────────────────────────────────────────────────────────────
CREATE TABLE invoices (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number      TEXT        UNIQUE NOT NULL,
    request_id          UUID        REFERENCES service_requests(id),
    client_id           UUID        NOT NULL REFERENCES users(id),
    client_name         TEXT        NOT NULL,
    client_address      TEXT,
    client_phone        TEXT,
    service_name        TEXT        NOT NULL,
    service_description TEXT,
    discount            NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_rate            NUMERIC(5,2)  NOT NULL DEFAULT 0,
    subtotal            NUMERIC(12,2) NOT NULL DEFAULT 0,
    total               NUMERIC(12,2) NOT NULL DEFAULT 0,
    notes               TEXT,
    status              TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_status     ON invoices(status);
CREATE INDEX idx_invoices_client_id  ON invoices(client_id);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);

-- ─── Invoice Line Items ───────────────────────────────────────────────────────
CREATE TABLE invoice_line_items (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id  UUID            NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT            NOT NULL,
    quantity    NUMERIC(10,2)   NOT NULL DEFAULT 1,
    rate        NUMERIC(12,2)   NOT NULL DEFAULT 0,
    amount      NUMERIC(12,2)   NOT NULL DEFAULT 0
);

-- ─── Income ───────────────────────────────────────────────────────────────────
CREATE TABLE income (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    date        DATE        NOT NULL,
    description TEXT        NOT NULL,
    category    TEXT        NOT NULL CHECK (category IN ('invoice_payment', 'advance', 'other')),
    amount      NUMERIC(12,2) NOT NULL,
    source      TEXT,
    receipt_url TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_income_date ON income(date DESC);

-- ─── Expenses ─────────────────────────────────────────────────────────────────
CREATE TABLE expenses (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    date         DATE        NOT NULL,
    description  TEXT        NOT NULL,
    category     TEXT        NOT NULL CHECK (category IN ('materials', 'tools', 'fuel', 'utilities', 'salary', 'miscellaneous')),
    amount       NUMERIC(12,2) NOT NULL,
    vendor_payee TEXT,
    receipt_url  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_date ON expenses(date DESC);

-- ─── Salary Payments ──────────────────────────────────────────────────────────
CREATE TABLE salary_payments (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id        UUID        NOT NULL REFERENCES workers(id),
    month            INTEGER     NOT NULL CHECK (month BETWEEN 1 AND 12),
    year             INTEGER     NOT NULL,
    base_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
    jobs_count       INTEGER     NOT NULL DEFAULT 0,
    commission_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
    deductions       NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_payable      NUMERIC(12,2) NOT NULL DEFAULT 0,
    status           TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    paid_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(worker_id, month, year)
);

-- ─── Inventory ────────────────────────────────────────────────────────────────
CREATE TABLE inventory (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 TEXT        NOT NULL,
    category             TEXT        NOT NULL CHECK (category IN ('power_tools', 'hand_tools', 'consumables', 'safety_equipment')),
    quantity             INTEGER     NOT NULL DEFAULT 0,
    unit                 TEXT        NOT NULL DEFAULT 'piece',
    condition            TEXT        NOT NULL DEFAULT 'good' CHECK (condition IN ('new', 'good', 'needs_repair', 'retired')),
    assigned_worker_id   UUID        REFERENCES workers(id),
    purchase_date        DATE,
    cost                 NUMERIC(12,2),
    low_stock_threshold  INTEGER     NOT NULL DEFAULT 2,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
