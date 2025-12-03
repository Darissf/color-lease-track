-- Drop and recreate the view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.content_render_latest;

CREATE VIEW public.content_render_latest
WITH (security_invoker = true)
AS
SELECT DISTINCT ON (content_key) 
    content_key,
    page,
    rendered_value,
    last_seen_at
FROM content_render_stats
ORDER BY content_key, last_seen_at DESC;