-- Add columns to track payment source and who confirmed
ALTER TABLE contract_payments ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'manual';
ALTER TABLE contract_payments ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES auth.users(id);

-- Add comment for clarity
COMMENT ON COLUMN contract_payments.payment_source IS 'Payment source: manual (admin confirmed) or auto (automatic via Mutasibank/Moota)';
COMMENT ON COLUMN contract_payments.confirmed_by IS 'User ID who confirmed the payment (null if automatic)';