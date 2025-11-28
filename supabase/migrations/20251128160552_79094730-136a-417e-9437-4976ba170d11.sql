-- ===========================
-- Priority 1: Fix Security Vulnerabilities
-- ===========================

-- A. Fix Function Search Path Mutable
-- Add SET search_path = public to functions that don't have it

-- Fix cleanup_old_agent_outputs function
CREATE OR REPLACE FUNCTION public.cleanup_old_agent_outputs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.agent_command_outputs
  WHERE created_at < NOW() - INTERVAL '2 hours';
  
  DELETE FROM public.agent_commands
  WHERE status IN ('completed', 'failed')
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$function$;

-- Fix reset_daily_email_counter function
CREATE OR REPLACE FUNCTION public.reset_daily_email_counter()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE email_providers
  SET emails_sent_today = 0,
      last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE;
END;
$function$;

-- Fix reset_email_provider_daily_counters function
CREATE OR REPLACE FUNCTION public.reset_email_provider_daily_counters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE email_providers
  SET emails_sent_today = 0,
      last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE;
END;
$function$;

-- Fix reset_email_provider_monthly_counters function
CREATE OR REPLACE FUNCTION public.reset_email_provider_monthly_counters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE email_providers
  SET emails_sent_month = 0,
      last_month_reset = date_trunc('month', CURRENT_DATE)
  WHERE last_month_reset < date_trunc('month', CURRENT_DATE);
END;
$function$;

-- ===========================
-- Priority 3: Optimize Dashboard Queries
-- Create database function for monthly trend
-- ===========================

CREATE OR REPLACE FUNCTION public.get_monthly_trend(
  p_user_id UUID,
  p_months INTEGER DEFAULT 6
)
RETURNS TABLE (
  month TEXT,
  income NUMERIC,
  expenses NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT 
      generate_series(
        date_trunc('month', CURRENT_DATE) - (p_months - 1 || ' months')::interval,
        date_trunc('month', CURRENT_DATE),
        '1 month'::interval
      ) AS month_date
  ),
  monthly_expenses AS (
    SELECT 
      date_trunc('month', date) AS month,
      SUM(amount) AS total_expenses
    FROM expenses
    WHERE user_id = p_user_id
      AND date >= date_trunc('month', CURRENT_DATE) - (p_months - 1 || ' months')::interval
    GROUP BY date_trunc('month', date)
  ),
  monthly_income AS (
    SELECT 
      date_trunc('month', tanggal_lunas) AS month,
      SUM(jumlah_lunas) AS total_income
    FROM rental_contracts
    WHERE user_id = p_user_id
      AND tanggal_lunas IS NOT NULL
      AND tanggal_lunas >= date_trunc('month', CURRENT_DATE) - (p_months - 1 || ' months')::interval
    GROUP BY date_trunc('month', tanggal_lunas)
  )
  SELECT 
    TO_CHAR(m.month_date, 'Mon') AS month,
    COALESCE(mi.total_income, 0) AS income,
    COALESCE(me.total_expenses, 0) AS expenses
  FROM months m
  LEFT JOIN monthly_income mi ON m.month_date = mi.month
  LEFT JOIN monthly_expenses me ON m.month_date = me.month
  ORDER BY m.month_date;
END;
$function$;