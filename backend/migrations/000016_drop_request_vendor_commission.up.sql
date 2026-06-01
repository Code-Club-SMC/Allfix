-- Drop commission_percentage from request_vendors
ALTER TABLE request_vendors DROP COLUMN IF EXISTS commission_percentage;
