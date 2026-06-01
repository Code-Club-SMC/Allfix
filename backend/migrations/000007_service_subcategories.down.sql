-- Revert payroll columns
ALTER TABLE salary_payments
    DROP COLUMN IF EXISTS commission_paid_this_month,
    DROP COLUMN IF EXISTS advance_deducted_this_month;

-- Drop advance deductions
DROP TABLE IF EXISTS advance_deductions;

-- Drop worker advances
DROP TABLE IF EXISTS worker_advances;

-- Drop account transactions
DROP TABLE IF EXISTS account_transactions;

-- Drop system accounts
DROP TABLE IF EXISTS system_accounts;

-- Remove sub-category columns
ALTER TABLE services DROP COLUMN IF EXISTS parent_id;
ALTER TABLE services DROP COLUMN IF EXISTS is_subcategory;
