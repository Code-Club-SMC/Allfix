-- Add terms_and_conditions JSONB column to services
ALTER TABLE services ADD COLUMN IF NOT EXISTS terms_and_conditions JSONB;
