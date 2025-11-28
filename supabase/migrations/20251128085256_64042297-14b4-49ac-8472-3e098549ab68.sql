-- Create table for tracking VPS installation progress
CREATE TABLE IF NOT EXISTS vps_installation_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  vps_host TEXT NOT NULL,
  current_step INT DEFAULT 0,
  total_steps INT DEFAULT 6,
  step_outputs JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE vps_installation_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can manage installation progress
CREATE POLICY "Super admins can manage installation progress"
ON vps_installation_progress
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  )
);

-- Create index for faster queries
CREATE INDEX idx_vps_installation_progress_user_id ON vps_installation_progress(user_id);
CREATE INDEX idx_vps_installation_progress_status ON vps_installation_progress(status);