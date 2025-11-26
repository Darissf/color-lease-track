-- Create function to get email usage by type
CREATE OR REPLACE FUNCTION get_email_usage_by_type(start_date timestamptz)
RETURNS TABLE (
  template_type text,
  total bigint,
  sent bigint,
  failed bigint,
  pending bigint
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(template_type, 'unknown') as template_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'sent') as sent,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) FILTER (WHERE status IN ('pending', 'scheduled')) as pending
  FROM email_logs 
  WHERE created_at >= start_date
  GROUP BY template_type
  ORDER BY total DESC;
$$;

-- Create function to get daily email trends
CREATE OR REPLACE FUNCTION get_email_daily_trends(days integer)
RETURNS TABLE (
  date date,
  template_type text,
  count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    DATE(created_at) as date,
    COALESCE(template_type, 'unknown') as template_type,
    COUNT(*) as count
  FROM email_logs
  WHERE created_at >= CURRENT_DATE - (days || ' days')::interval
  GROUP BY DATE(created_at), template_type
  ORDER BY date DESC, template_type;
$$;

-- Create function to get email provider distribution
CREATE OR REPLACE FUNCTION get_email_provider_distribution()
RETURNS TABLE (
  provider_name text,
  template_type text,
  count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(provider_name, 'unknown') as provider_name,
    COALESCE(template_type, 'unknown') as template_type,
    COUNT(*) as count
  FROM email_logs
  WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY provider_name, template_type
  ORDER BY provider_name, count DESC;
$$;