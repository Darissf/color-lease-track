-- Create function to increment short link click count
CREATE OR REPLACE FUNCTION public.increment_short_link_clicks(link_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE short_links
  SET click_count = click_count + 1
  WHERE id = link_id;
END;
$$;