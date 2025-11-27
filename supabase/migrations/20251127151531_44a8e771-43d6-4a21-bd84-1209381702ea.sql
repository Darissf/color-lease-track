-- Drop the old recurring_income table if it exists
DROP TABLE IF EXISTS public.recurring_income CASCADE;

-- Create new recurring_income table for fixed monthly income tracking
CREATE TABLE public.recurring_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_group_id UUID REFERENCES public.client_groups(id) ON DELETE SET NULL,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  invoice TEXT NOT NULL,
  keterangan TEXT,
  catatan TEXT,
  rental_date_start DATE NOT NULL,
  rental_date_end DATE NOT NULL,
  period_start_month DATE NOT NULL,
  period_end_month DATE NOT NULL,
  nominal NUMERIC NOT NULL DEFAULT 0,
  paid_date DATE,
  is_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recurring_income ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their own recurring income
CREATE POLICY "Users can manage their own recurring income"
  ON public.recurring_income
  FOR ALL
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_recurring_income_user_id ON public.recurring_income(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_recurring_income_updated_at
  BEFORE UPDATE ON public.recurring_income
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();