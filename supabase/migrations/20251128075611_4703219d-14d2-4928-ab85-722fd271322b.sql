-- Add columns to vps_installation_sessions for full auto tracking
ALTER TABLE vps_installation_sessions ADD COLUMN IF NOT EXISTS 
  ssh_method TEXT DEFAULT 'direct';

ALTER TABLE vps_installation_sessions ADD COLUMN IF NOT EXISTS 
  command_log JSONB DEFAULT '[]'::jsonb;

ALTER TABLE vps_installation_sessions ADD COLUMN IF NOT EXISTS 
  last_output TEXT;

COMMENT ON COLUMN vps_installation_sessions.ssh_method IS 'Method used: direct, agent, or manual';
COMMENT ON COLUMN vps_installation_sessions.command_log IS 'Full log of SSH commands executed';
COMMENT ON COLUMN vps_installation_sessions.last_output IS 'Latest command output for real-time display';