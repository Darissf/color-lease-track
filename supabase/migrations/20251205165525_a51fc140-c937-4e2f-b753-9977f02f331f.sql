-- Buat tabel contract_payments untuk tracking pembayaran parsial
CREATE TABLE public.contract_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contract_id UUID NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  payment_number INTEGER NOT NULL DEFAULT 1,
  income_source_id UUID REFERENCES income_sources(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Buat index untuk performa query
CREATE INDEX idx_contract_payments_contract_id ON contract_payments(contract_id);
CREATE INDEX idx_contract_payments_user_id ON contract_payments(user_id);

-- Enable RLS
ALTER TABLE contract_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users dan Admins bisa manage payment records
CREATE POLICY "Users and Admins can view contract payments"
  ON contract_payments FOR SELECT
  USING (auth.uid() = user_id OR is_admin(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Users and Admins can insert contract payments"
  ON contract_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Users and Admins can update contract payments"
  ON contract_payments FOR UPDATE
  USING (auth.uid() = user_id OR is_admin(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Users and Admins can delete contract payments"
  ON contract_payments FOR DELETE
  USING (auth.uid() = user_id OR is_admin(auth.uid()) OR is_super_admin(auth.uid()));