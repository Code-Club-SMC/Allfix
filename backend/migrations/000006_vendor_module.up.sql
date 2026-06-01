-- Drop the old vendors table (was for materials/tools vendors)
DROP TABLE IF EXISTS vendors CASCADE;

-- Create new vendors table for third-party service providers
CREATE TABLE vendors (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT        NOT NULL,
    contact_name    TEXT,
    contact_phone   TEXT        NOT NULL,
    contact_email   TEXT,
    services_offered TEXT[]     NOT NULL DEFAULT '{}',
    status          TEXT        NOT NULL DEFAULT 'active' 
                        CHECK (status IN ('active', 'inactive')),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_name ON vendors(name);

-- Create request_vendors junction table for vendor assignments
CREATE TABLE request_vendors (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id              UUID        NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    vendor_id               UUID        NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    commission_percentage   NUMERIC(5,2) NOT NULL DEFAULT 0 
                                CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(request_id)
);

CREATE INDEX idx_request_vendors_request_id ON request_vendors(request_id);
CREATE INDEX idx_request_vendors_vendor_id ON request_vendors(vendor_id);

-- Add vendor_id to service_requests table
ALTER TABLE service_requests 
ADD COLUMN vendor_id UUID REFERENCES vendors(id);

CREATE INDEX idx_requests_vendor_id ON service_requests(vendor_id);

-- Add vendor_commission to invoices table
ALTER TABLE invoices 
ADD COLUMN vendor_commission NUMERIC(12,2) DEFAULT 0;

-- Update expenses category constraint to include vendor_commission
ALTER TABLE expenses 
DROP CONSTRAINT expenses_category_check;

ALTER TABLE expenses 
ADD CONSTRAINT expenses_category_check 
CHECK (category IN ('materials', 'tools', 'fuel', 'utilities', 'salary', 'vendor_commission', 'miscellaneous'));
