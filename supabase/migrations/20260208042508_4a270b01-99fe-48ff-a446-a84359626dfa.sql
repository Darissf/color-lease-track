-- Create table for storing deleted invoice numbers that can be reused
CREATE TABLE deleted_invoice_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  invoice_sequence INTEGER NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, invoice_sequence)
);

-- Enable RLS
ALTER TABLE deleted_invoice_numbers ENABLE ROW LEVEL SECURITY;

-- RLS Policy - Users can only manage their own deleted invoice numbers
CREATE POLICY "Users can view their own deleted invoice numbers"
  ON deleted_invoice_numbers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deleted invoice numbers"
  ON deleted_invoice_numbers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deleted invoice numbers"
  ON deleted_invoice_numbers
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for faster lookup
CREATE INDEX idx_deleted_invoice_numbers_user_sequence 
  ON deleted_invoice_numbers(user_id, invoice_sequence ASC);