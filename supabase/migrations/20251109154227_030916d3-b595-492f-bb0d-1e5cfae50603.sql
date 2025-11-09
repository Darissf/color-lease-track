-- Create savings_transactions table for tracking all savings deposits and withdrawals
CREATE TABLE public.savings_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  savings_plan_id UUID NOT NULL REFERENCES public.savings_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  notes TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.savings_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own transactions"
ON public.savings_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
ON public.savings_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
ON public.savings_transactions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
ON public.savings_transactions
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_savings_transactions_updated_at
BEFORE UPDATE ON public.savings_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update savings plan current_amount when transaction is added
CREATE OR REPLACE FUNCTION public.update_savings_plan_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.transaction_type = 'deposit' THEN
      UPDATE savings_plans 
      SET current_amount = current_amount + NEW.amount
      WHERE id = NEW.savings_plan_id;
    ELSIF NEW.transaction_type = 'withdrawal' THEN
      UPDATE savings_plans 
      SET current_amount = current_amount - NEW.amount
      WHERE id = NEW.savings_plan_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.transaction_type = 'deposit' THEN
      UPDATE savings_plans 
      SET current_amount = current_amount - OLD.amount
      WHERE id = OLD.savings_plan_id;
    ELSIF OLD.transaction_type = 'withdrawal' THEN
      UPDATE savings_plans 
      SET current_amount = current_amount + OLD.amount
      WHERE id = OLD.savings_plan_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically update savings plan amount
CREATE TRIGGER update_savings_plan_on_transaction
AFTER INSERT OR DELETE ON public.savings_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_savings_plan_amount();