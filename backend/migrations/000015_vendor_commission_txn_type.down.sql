-- Revert account_transactions transaction_type check constraint
ALTER TABLE account_transactions DROP CONSTRAINT IF EXISTS account_transactions_transaction_type_check;
ALTER TABLE account_transactions ADD CONSTRAINT account_transactions_transaction_type_check
    CHECK (transaction_type IN (
        'income', 'expense', 'salary_payment', 'commission_payout',
        'advance_given', 'invoice_payment', 'refund'
    ));
