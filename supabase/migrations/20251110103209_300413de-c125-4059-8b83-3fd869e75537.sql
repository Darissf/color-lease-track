-- Create bank_accounts table for account management
CREATE TABLE public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'checking',
  balance NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bank accounts"
ON public.bank_accounts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank accounts"
ON public.bank_accounts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts"
ON public.bank_accounts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank accounts"
ON public.bank_accounts FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_bank_accounts_updated_at
BEFORE UPDATE ON public.bank_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create recurring_income table for income settings
CREATE TABLE public.recurring_income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recurring income"
ON public.recurring_income FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recurring income"
ON public.recurring_income FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring income"
ON public.recurring_income FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring income"
ON public.recurring_income FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_recurring_income_updated_at
BEFORE UPDATE ON public.recurring_income
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create savings_settings table
CREATE TABLE public.savings_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  default_allocation_percentage NUMERIC DEFAULT 10,
  auto_save_enabled BOOLEAN DEFAULT false,
  emergency_fund_target NUMERIC,
  emergency_fund_current NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.savings_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own savings settings"
ON public.savings_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own savings settings"
ON public.savings_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings settings"
ON public.savings_settings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings settings"
ON public.savings_settings FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_savings_settings_updated_at
BEFORE UPDATE ON public.savings_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();