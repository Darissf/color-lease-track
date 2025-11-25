-- Create function to get accurate table sizes from PostgreSQL
CREATE OR REPLACE FUNCTION public.get_table_sizes()
RETURNS TABLE(
  table_name text,
  size_bytes bigint,
  row_count bigint,
  last_modified timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT 
    schemaname || '.' || relname AS table_name,
    pg_total_relation_size(schemaname||'.'||relname) AS size_bytes,
    n_live_tup AS row_count,
    last_vacuum AS last_modified
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_table_sizes() TO authenticated;