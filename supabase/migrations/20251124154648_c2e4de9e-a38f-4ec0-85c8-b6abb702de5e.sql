-- Fix search_path for functions without dropping

-- Update existing update_updated_at_column function with search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix reset_daily_email_counter with search_path
CREATE OR REPLACE FUNCTION reset_daily_email_counter()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE smtp_settings
  SET emails_sent_today = 0,
      last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE;
END;
$$;

-- Fix increment_template_usage with search_path
CREATE OR REPLACE FUNCTION increment_template_usage(p_template_type VARCHAR)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_templates
  SET usage_count = usage_count + 1
  WHERE template_type = p_template_type;
END;
$$;