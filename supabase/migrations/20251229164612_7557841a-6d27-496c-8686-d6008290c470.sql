-- Tabel untuk tracking Windows RDP Balance Check sessions
CREATE TABLE public.windows_balance_check_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  payment_request_id UUID REFERENCES public.payment_confirmation_requests(id) ON DELETE SET NULL,
  initial_balance DECIMAL(20,2),
  current_balance DECIMAL(20,2),
  expected_amount DECIMAL(20,2),
  check_count INTEGER DEFAULT 0,
  max_checks INTEGER DEFAULT 30,
  status VARCHAR(50) DEFAULT 'idle',
  last_command VARCHAR(50),
  command_data JSONB,
  matched_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.windows_balance_check_sessions ENABLE ROW LEVEL SECURITY;

-- Policy for super_admin only
CREATE POLICY "Super admin manages balance sessions"
ON public.windows_balance_check_sessions
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.windows_balance_check_sessions;

-- Create updated_at trigger
CREATE TRIGGER update_windows_balance_check_sessions_updated_at
BEFORE UPDATE ON public.windows_balance_check_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();