-- Create cloud usage snapshots table for historical tracking
CREATE TABLE IF NOT EXISTS public.cloud_usage_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  database_size_bytes BIGINT DEFAULT 0,
  storage_size_bytes BIGINT DEFAULT 0,
  edge_function_calls INTEGER DEFAULT 0,
  ai_calls INTEGER DEFAULT 0,
  ai_cost_usd NUMERIC(10,6) DEFAULT 0,
  email_sent INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_date ON public.cloud_usage_snapshots(user_id, snapshot_date DESC);

-- Enable RLS
ALTER TABLE public.cloud_usage_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own snapshots"
  ON public.cloud_usage_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshots"
  ON public.cloud_usage_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all snapshots"
  ON public.cloud_usage_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );