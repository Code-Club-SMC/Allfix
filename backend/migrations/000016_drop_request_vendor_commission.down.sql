-- Restore commission_percentage on request_vendors
ALTER TABLE request_vendors ADD COLUMN commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (commission_percentage >= 0 AND commission_percentage <= 100);
