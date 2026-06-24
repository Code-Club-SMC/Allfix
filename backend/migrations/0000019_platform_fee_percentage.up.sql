-- Rename vendor_commission to platform_fee_percentage to reflect the new business model
-- (vendors now give the platform a percentage, instead of the platform giving vendors a commission)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invoices' AND column_name = 'vendor_commission'
    ) THEN
        ALTER TABLE invoices RENAME COLUMN vendor_commission TO platform_fee_percentage;
    END IF;
END $$;

-- Migrate existing expense categories before changing the constraint
UPDATE expenses SET category = 'platform_fee' WHERE category = 'vendor_commission';

-- Update expenses category constraint
ALTER TABLE expenses
DROP CONSTRAINT IF EXISTS expenses_category_check;

ALTER TABLE expenses
ADD CONSTRAINT expenses_category_check
CHECK (category IN ('materials', 'tools', 'fuel', 'utilities', 'salary', 'platform_fee', 'miscellaneous'));

-- Migrate existing transaction types before changing the constraint
UPDATE account_transactions SET transaction_type = 'vendor_payout' WHERE transaction_type = 'vendor_commission_payout';

-- Update account_transactions transaction_type constraint
ALTER TABLE account_transactions
DROP CONSTRAINT IF EXISTS account_transactions_transaction_type_check;

ALTER TABLE account_transactions
ADD CONSTRAINT account_transactions_transaction_type_check
CHECK (transaction_type IN (
    'income', 'expense', 'salary_payment', 'commission_payout',
    'advance_given', 'invoice_payment', 'refund', 'vendor_payout'
));
