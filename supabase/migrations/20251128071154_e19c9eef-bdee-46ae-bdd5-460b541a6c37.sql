-- Create vps_credentials table for storing VPS connection info
CREATE TABLE vps_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'VPS Default',
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 22,
  username TEXT NOT NULL DEFAULT 'root',
  password_encrypted TEXT NOT NULL,
  waha_port INTEGER NOT NULL DEFAULT 3000,
  waha_session_name TEXT NOT NULL DEFAULT 'default',
  waha_api_key TEXT,
  is_default BOOLEAN DEFAULT false,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE vps_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can manage VPS credentials
CREATE POLICY "Super admins can manage VPS credentials" 
ON vps_credentials FOR ALL 
USING (is_super_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_vps_credentials_user_id ON vps_credentials(user_id);
CREATE INDEX idx_vps_credentials_is_default ON vps_credentials(is_default) WHERE is_default = true;