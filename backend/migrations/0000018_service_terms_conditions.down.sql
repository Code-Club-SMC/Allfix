-- Remove terms_and_conditions column from services
ALTER TABLE services DROP COLUMN IF EXISTS terms_and_conditions;
