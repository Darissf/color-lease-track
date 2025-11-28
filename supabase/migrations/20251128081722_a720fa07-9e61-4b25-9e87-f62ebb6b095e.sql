-- Create vps_agents table for tracking agent connections
CREATE TABLE vps_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vps_credential_id UUID REFERENCES vps_credentials(id) ON DELETE CASCADE,
  agent_token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'installing')),
  vps_host TEXT NOT NULL,
  vps_info JSONB DEFAULT '{}',
  last_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE vps_agents ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all agents
CREATE POLICY "Super admins can manage agents"
  ON vps_agents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

-- Create index for performance
CREATE INDEX idx_vps_agents_user_id ON vps_agents(user_id);
CREATE INDEX idx_vps_agents_status ON vps_agents(status);
CREATE INDEX idx_vps_agents_token ON vps_agents(agent_token);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE vps_agents;