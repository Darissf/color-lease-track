-- Create agent_logs table for debugging
CREATE TABLE IF NOT EXISTS public.agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.vps_agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  log_type TEXT NOT NULL, -- 'heartbeat', 'command', 'error', 'connection'
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_agent_logs_agent_id ON public.agent_logs(agent_id);
CREATE INDEX idx_agent_logs_created_at ON public.agent_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can view all logs
CREATE POLICY "Super admins can view all agent logs"
  ON public.agent_logs
  FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- System can insert logs (service role)
CREATE POLICY "Service role can insert agent logs"
  ON public.agent_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);