-- Create table for agent commands queue
CREATE TABLE IF NOT EXISTS public.agent_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_token TEXT NOT NULL,
  commands TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  executed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Create table for agent command outputs
CREATE TABLE IF NOT EXISTS public.agent_command_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_token TEXT NOT NULL,
  output TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_agent_commands_token_status ON public.agent_commands(agent_token, status);
CREATE INDEX IF NOT EXISTS idx_agent_commands_created_at ON public.agent_commands(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_command_outputs_token ON public.agent_command_outputs(agent_token);
CREATE INDEX IF NOT EXISTS idx_agent_command_outputs_created_at ON public.agent_command_outputs(created_at);

-- Enable RLS
ALTER TABLE public.agent_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_command_outputs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - service role can manage all
CREATE POLICY "Service role can manage agent commands" ON public.agent_commands
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage agent outputs" ON public.agent_command_outputs
  FOR ALL USING (true) WITH CHECK (true);

-- Super admins can view for debugging
CREATE POLICY "Super admins can view agent commands" ON public.agent_commands
  FOR SELECT USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view agent outputs" ON public.agent_command_outputs
  FOR SELECT USING (is_super_admin(auth.uid()));

-- Function to auto-cleanup old outputs (older than 2 hours)
CREATE OR REPLACE FUNCTION cleanup_old_agent_outputs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.agent_command_outputs
  WHERE created_at < NOW() - INTERVAL '2 hours';
  
  DELETE FROM public.agent_commands
  WHERE status IN ('completed', 'failed')
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;