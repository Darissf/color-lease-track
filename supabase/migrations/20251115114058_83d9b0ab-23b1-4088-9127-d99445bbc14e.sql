-- Add bank_account_id and transaction_name columns to expenses table
ALTER TABLE expenses 
ADD COLUMN bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL,
ADD COLUMN transaction_name text,
ADD COLUMN checked boolean DEFAULT false;

-- Add index for better performance
CREATE INDEX idx_expenses_bank_account_id ON expenses(bank_account_id);
CREATE INDEX idx_expenses_checked ON expenses(checked);