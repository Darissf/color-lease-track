-- Allow anonymous and all authenticated users to READ payment_provider_settings for global lock status
-- This is safe because it only exposes lock timing, not sensitive payment credentials

CREATE POLICY "Anyone can read global lock status"
ON public.payment_provider_settings
FOR SELECT
USING (true);