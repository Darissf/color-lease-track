-- Create bank_account_balance_history table
CREATE TABLE IF NOT EXISTS public.bank_account_balance_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  old_balance NUMERIC(15,2) NOT NULL,
  new_balance NUMERIC(15,2) NOT NULL,
  change_amount NUMERIC(15,2) GENERATED ALWAYS AS (new_balance - old_balance) STORED,
  change_type TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN new_balance > old_balance THEN 'increase'
      WHEN new_balance < old_balance THEN 'decrease'
      ELSE 'no_change'
    END
  ) STORED,
  bank_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add indexes for faster queries
CREATE INDEX idx_balance_history_user_id ON public.bank_account_balance_history(user_id);
CREATE INDEX idx_balance_history_bank_account_id ON public.bank_account_balance_history(bank_account_id);
CREATE INDEX idx_balance_history_created_at ON public.bank_account_balance_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.bank_account_balance_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own balance history"
  ON public.bank_account_balance_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert balance history"
  ON public.bank_account_balance_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create trigger function to auto-log balance changes
CREATE OR REPLACE FUNCTION log_bank_balance_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if balance actually changed
  IF OLD.balance IS DISTINCT FROM NEW.balance THEN
    INSERT INTO public.bank_account_balance_history (
      user_id,
      bank_account_id,
      old_balance,
      new_balance,
      bank_name
    ) VALUES (
      NEW.user_id,
      NEW.id,
      COALESCE(OLD.balance, 0),
      NEW.balance,
      NEW.bank_name
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to bank_accounts table
CREATE TRIGGER track_bank_balance_changes
  AFTER UPDATE OF balance ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION log_bank_balance_change();

COMMENT ON TABLE public.bank_account_balance_history IS 'Tracks all balance changes for bank accounts with automatic logging via trigger';