-- Rename vendor_commission to platform_fee_percentage to reflect the new business model
-- (vendors now give the platform a percentage, instead of the platform giving vendors a commission)
ALTER TABLE invoices RENAME COLUMN vendor_commission TO platform_fee_percentage;

-- Update expenses category constraint
ALTER TABLE expenses
DROP CONSTRAINT IF EXISTS expenses_category_check;

ALTER TABLE expenses
ADD CONSTRAINT expenses_category_check
CHECK (category IN ('materials', 'tools', 'fuel', 'utilities', 'salary', 'platform_fee', 'miscellaneous'));

-- Update account_transactions transaction_type constraint
ALTER TABLE account_transactions
DROP CONSTRAINT IF EXISTS account_transactions_transaction_type_check;

ALTER TABLE account_transactions
ADD CONSTRAINT account_transactions_transaction_type_check
CHECK (transaction_type IN (
    'income', 'expense', 'salary_payment', 'commission_payout',
    'advance_given', 'invoice_payment', 'refund', 'vendor_payout'
));
