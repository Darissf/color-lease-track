-- Recreate recurring_income table for IncomeSettings feature
CREATE TABLE IF NOT EXISTS public.recurring_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recurring_income ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can manage their own recurring income"
  ON public.recurring_income
  FOR ALL
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_recurring_income_user_id ON public.recurring_income(user_id);

-- Trigger
CREATE TRIGGER update_recurring_income_updated_at
  BEFORE UPDATE ON public.recurring_income
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();