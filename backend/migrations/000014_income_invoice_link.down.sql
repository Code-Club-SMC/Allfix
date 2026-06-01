DROP INDEX IF EXISTS idx_income_invoice_id;
ALTER TABLE income DROP COLUMN IF EXISTS invoice_id;
