-- Revert platform_fee_percentage rename
ALTER TABLE invoices RENAME COLUMN platform_fee_percentage TO vendor_commission;

-- Revert expense category data before changing constraint
UPDATE expenses SET category = 'vendor_commission' WHERE category = 'platform_fee';

-- Revert expenses category constraint
ALTER TABLE expenses
DROP CONSTRAINT IF EXISTS expenses_category_check;

ALTER TABLE expenses
ADD CONSTRAINT expenses_category_check
CHECK (category IN ('materials', 'tools', 'fuel', 'utilities', 'salary', 'vendor_commission', 'miscellaneous'));

-- Revert transaction type data before changing constraint
UPDATE account_transactions SET transaction_type = 'vendor_commission_payout' WHERE transaction_type = 'vendor_payout';

-- Revert account_transactions transaction_type constraint
ALTER TABLE account_transactions
DROP CONSTRAINT IF EXISTS account_transactions_transaction_type_check;

ALTER TABLE account_transactions
ADD CONSTRAINT account_transactions_transaction_type_check
CHECK (transaction_type IN (
    'income', 'expense', 'salary_payment', 'commission_payout',
    'advance_given', 'invoice_payment', 'refund', 'vendor_commission_payout'
));
