-- Add bank_account_id column to income_sources
ALTER TABLE public.income_sources 
ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES public.bank_accounts(id);

-- Create function to calculate bank balance dynamically
CREATE OR REPLACE FUNCTION public.calculate_bank_balance(p_bank_account_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_income NUMERIC;
  v_expense NUMERIC;
BEGIN
  -- Sum all income for this bank account
  SELECT COALESCE(SUM(amount), 0) INTO v_income
  FROM income_sources
  WHERE bank_account_id = p_bank_account_id;
  
  -- Sum all expenses for this bank account
  SELECT COALESCE(SUM(amount), 0) INTO v_expense
  FROM expenses
  WHERE bank_account_id = p_bank_account_id;
  
  RETURN v_income - v_expense;
END;
$$;

-- Create function to get all bank balances for a user
CREATE OR REPLACE FUNCTION public.get_user_bank_balances(p_user_id UUID)
RETURNS TABLE(
  bank_account_id UUID,
  bank_name TEXT,
  account_number TEXT,
  calculated_balance NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ba.id as bank_account_id,
    ba.bank_name,
    ba.account_number,
    calculate_bank_balance(ba.id) as calculated_balance
  FROM bank_accounts ba
  WHERE ba.user_id = p_user_id AND ba.is_active = true;
END;
$$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_income_sources_bank_account_id ON public.income_sources(bank_account_id);

-- Update balance column in bank_accounts to use trigger for real-time updates
CREATE OR REPLACE FUNCTION public.update_bank_balance_on_income_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.bank_account_id IS NOT NULL THEN
      UPDATE bank_accounts 
      SET balance = calculate_bank_balance(NEW.bank_account_id),
          updated_at = NOW()
      WHERE id = NEW.bank_account_id;
    END IF;
    -- Also update old bank account if changed
    IF TG_OP = 'UPDATE' AND OLD.bank_account_id IS NOT NULL AND OLD.bank_account_id != NEW.bank_account_id THEN
      UPDATE bank_accounts 
      SET balance = calculate_bank_balance(OLD.bank_account_id),
          updated_at = NOW()
      WHERE id = OLD.bank_account_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.bank_account_id IS NOT NULL THEN
      UPDATE bank_accounts 
      SET balance = calculate_bank_balance(OLD.bank_account_id),
          updated_at = NOW()
      WHERE id = OLD.bank_account_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$;

-- Create trigger for income_sources
DROP TRIGGER IF EXISTS trigger_update_balance_on_income ON public.income_sources;
CREATE TRIGGER trigger_update_balance_on_income
AFTER INSERT OR UPDATE OR DELETE ON public.income_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_bank_balance_on_income_change();

-- Create similar trigger for expenses
CREATE OR REPLACE FUNCTION public.update_bank_balance_on_expense_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.bank_account_id IS NOT NULL THEN
      UPDATE bank_accounts 
      SET balance = calculate_bank_balance(NEW.bank_account_id),
          updated_at = NOW()
      WHERE id = NEW.bank_account_id;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.bank_account_id IS NOT NULL AND OLD.bank_account_id != NEW.bank_account_id THEN
      UPDATE bank_accounts 
      SET balance = calculate_bank_balance(OLD.bank_account_id),
          updated_at = NOW()
      WHERE id = OLD.bank_account_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.bank_account_id IS NOT NULL THEN
      UPDATE bank_accounts 
      SET balance = calculate_bank_balance(OLD.bank_account_id),
          updated_at = NOW()
      WHERE id = OLD.bank_account_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_balance_on_expense ON public.expenses;
CREATE TRIGGER trigger_update_balance_on_expense
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_bank_balance_on_expense_change();