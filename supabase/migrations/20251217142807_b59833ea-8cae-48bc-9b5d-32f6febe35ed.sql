-- Create recurring_income_payments table for payment history
CREATE TABLE IF NOT EXISTS public.recurring_income_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recurring_income_id UUID NOT NULL REFERENCES public.fixed_monthly_income(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  payment_number INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  income_source_id UUID REFERENCES public.income_sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_recurring_income_payments_recurring_income_id 
ON public.recurring_income_payments(recurring_income_id);

CREATE INDEX IF NOT EXISTS idx_recurring_income_payments_user_id 
ON public.recurring_income_payments(user_id);

-- Add columns to fixed_monthly_income for admin notes and better tracking
ALTER TABLE public.fixed_monthly_income 
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS admin_notes_edited_by UUID,
ADD COLUMN IF NOT EXISTS admin_notes_edited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tagihan NUMERIC DEFAULT 0;

-- Update tagihan = nominal for existing data
UPDATE public.fixed_monthly_income 
SET tagihan = nominal 
WHERE tagihan IS NULL OR tagihan = 0;

-- Enable RLS
ALTER TABLE public.recurring_income_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recurring_income_payments
CREATE POLICY "Users can view own recurring payments" 
ON public.recurring_income_payments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring payments" 
ON public.recurring_income_payments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring payments" 
ON public.recurring_income_payments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring payments" 
ON public.recurring_income_payments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_recurring_income_payments_updated_at
BEFORE UPDATE ON public.recurring_income_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();