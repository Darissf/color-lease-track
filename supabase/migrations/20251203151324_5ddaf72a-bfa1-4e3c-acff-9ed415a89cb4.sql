-- Create security rate limits table for tracking request rates
CREATE TABLE IF NOT EXISTS public.security_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint 
ON public.security_rate_limits (identifier, endpoint);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start 
ON public.security_rate_limits (window_start);

-- Enable RLS
ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access (edge functions use service role)
CREATE POLICY "Service role only" ON public.security_rate_limits
  FOR ALL USING (false);

-- Create cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.security_rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$;