-- Revert expenses category constraint
ALTER TABLE expenses 
DROP CONSTRAINT expenses_category_check;

ALTER TABLE expenses 
ADD CONSTRAINT expenses_category_check 
CHECK (category IN ('materials', 'tools', 'fuel', 'utilities', 'salary', 'miscellaneous'));

-- Remove vendor_commission from invoices
ALTER TABLE invoices 
DROP COLUMN IF EXISTS vendor_commission;

-- Remove vendor_id from service_requests
DROP INDEX IF EXISTS idx_requests_vendor_id;

ALTER TABLE service_requests 
DROP COLUMN IF EXISTS vendor_id;

-- Drop request_vendors table
DROP INDEX IF EXISTS idx_request_vendors_vendor_id;
DROP INDEX IF EXISTS idx_request_vendors_request_id;

DROP TABLE IF EXISTS request_vendors;

-- Drop new vendors table
DROP INDEX IF EXISTS idx_vendors_name;
DROP INDEX IF EXISTS idx_vendors_status;

DROP TABLE IF EXISTS vendors CASCADE;

-- Recreate old vendors table (for materials/tools vendors)
CREATE TABLE vendors (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT        NOT NULL,
    category        TEXT        NOT NULL CHECK (category IN ('materials', 'tools', 'equipment', 'subcontract')),
    contact_name    TEXT,
    contact_phone   TEXT,
    contact_email   TEXT,
    address         TEXT,
    notes           TEXT,
    status          TEXT        NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
