-- Database function already exists, ensure it's up to date
CREATE OR REPLACE FUNCTION public.reset_whatsapp_daily_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.whatsapp_numbers
  SET messages_sent_today = 0, last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE OR last_reset_date IS NULL;
END;
$$;