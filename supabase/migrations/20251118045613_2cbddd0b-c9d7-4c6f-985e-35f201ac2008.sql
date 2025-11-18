-- Create table to track what content value is actually rendered per page
CREATE TABLE IF NOT EXISTS public.content_render_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content_key text NOT NULL,
  page text NOT NULL,
  rendered_value text NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint so each user records one row per key/page and we can upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_render_stats_unique ON public.content_render_stats(user_id, content_key, page);

-- Enable RLS
ALTER TABLE public.content_render_stats ENABLE ROW LEVEL SECURITY;

-- Recreate policies idempotently
DROP POLICY IF EXISTS "Users can insert own render stats" ON public.content_render_stats;
CREATE POLICY "Users can insert own render stats"
ON public.content_render_stats
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own render stats" ON public.content_render_stats;
CREATE POLICY "Users can update own render stats"
ON public.content_render_stats
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can view render stats" ON public.content_render_stats;
CREATE POLICY "Super admins can view render stats"
ON public.content_render_stats
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'super_admin'
));

DROP POLICY IF EXISTS "Users can view own render stats" ON public.content_render_stats;
CREATE POLICY "Users can view own render stats"
ON public.content_render_stats
FOR SELECT
USING (auth.uid() = user_id);

-- Better replication payloads for realtime
ALTER TABLE public.content_render_stats REPLICA IDENTITY FULL;

-- Helper view for latest render per key
CREATE OR REPLACE VIEW public.content_render_latest AS
SELECT DISTINCT ON (content_key)
  content_key,
  page,
  rendered_value,
  last_seen_at
FROM public.content_render_stats
ORDER BY content_key, last_seen_at DESC;