-- Create fixed_expenses table
CREATE TABLE public.fixed_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  expense_name TEXT NOT NULL,
  category TEXT NOT NULL,
  expense_type TEXT NOT NULL CHECK (expense_type IN ('fixed', 'variable')),
  fixed_amount NUMERIC,
  estimated_amount NUMERIC,
  due_date_day INTEGER NOT NULL CHECK (due_date_day >= 1 AND due_date_day <= 31),
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  reminder_days_before INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  auto_create_expense BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fixed_expense_history table
CREATE TABLE public.fixed_expense_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fixed_expense_id UUID NOT NULL REFERENCES public.fixed_expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  paid_date DATE NOT NULL,
  paid_amount NUMERIC NOT NULL,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'overdue')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_expense_history ENABLE ROW LEVEL SECURITY;

-- Create policies for fixed_expenses
CREATE POLICY "Users can view their own fixed expenses"
ON public.fixed_expenses
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own fixed expenses"
ON public.fixed_expenses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fixed expenses"
ON public.fixed_expenses
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fixed expenses"
ON public.fixed_expenses
FOR DELETE
USING (auth.uid() = user_id);

-- Create policies for fixed_expense_history
CREATE POLICY "Users can view their own expense history"
ON public.fixed_expense_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own expense history"
ON public.fixed_expense_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expense history"
ON public.fixed_expense_history
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expense history"
ON public.fixed_expense_history
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_fixed_expenses_updated_at
BEFORE UPDATE ON public.fixed_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_fixed_expenses_user_id ON public.fixed_expenses(user_id);
CREATE INDEX idx_fixed_expenses_due_date_day ON public.fixed_expenses(due_date_day);
CREATE INDEX idx_fixed_expenses_is_active ON public.fixed_expenses(is_active);
CREATE INDEX idx_fixed_expense_history_user_id ON public.fixed_expense_history(user_id);
CREATE INDEX idx_fixed_expense_history_fixed_expense_id ON public.fixed_expense_history(fixed_expense_id);
CREATE INDEX idx_fixed_expense_history_paid_date ON public.fixed_expense_history(paid_date);