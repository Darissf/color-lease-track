-- Create table for tracking VPS installation sessions
CREATE TABLE IF NOT EXISTS public.vps_installation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  vps_credential_id UUID REFERENCES public.vps_credentials(id) ON DELETE CASCADE,
  install_token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  current_step TEXT,
  steps_completed JSONB DEFAULT '[]'::jsonb,
  total_steps INTEGER DEFAULT 6,
  vps_host TEXT NOT NULL,
  waha_port INTEGER DEFAULT 3000,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vps_installation_sessions_token ON public.vps_installation_sessions(install_token);
CREATE INDEX IF NOT EXISTS idx_vps_installation_sessions_user ON public.vps_installation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_vps_installation_sessions_status ON public.vps_installation_sessions(status);

-- Enable RLS
ALTER TABLE public.vps_installation_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Super admins can manage installation sessions"
  ON public.vps_installation_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

-- Enable realtime for progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.vps_installation_sessions;