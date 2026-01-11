-- Add api_access_enabled column to rental_contracts
ALTER TABLE public.rental_contracts 
ADD COLUMN IF NOT EXISTS api_access_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.rental_contracts.api_access_enabled IS 
'Flag untuk enable/disable akses API untuk kontrak ini';

-- Create api_access_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.api_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  invoice_number TEXT,
  access_method TEXT NOT NULL CHECK (access_method IN ('invoice_number', 'access_code')),
  document_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_access_logs_invoice ON public.api_access_logs(invoice_number);
CREATE INDEX IF NOT EXISTS idx_api_access_logs_api_key ON public.api_access_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_access_logs_created ON public.api_access_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.api_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only see logs for their own API keys
CREATE POLICY "Users can view their own API access logs"
ON public.api_access_logs
FOR SELECT
USING (
  api_key_id IN (
    SELECT id FROM public.api_keys WHERE user_id = auth.uid()
  )
);

-- Create api_rate_limits table for rate limiting
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE CASCADE,
  invoice_number TEXT,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(api_key_id, invoice_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_api_key ON public.api_rate_limits(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window ON public.api_rate_limits(window_start);

-- Enable RLS
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can view their own rate limits
CREATE POLICY "Users can view their own rate limits"
ON public.api_rate_limits
FOR SELECT
USING (
  api_key_id IN (
    SELECT id FROM public.api_keys WHERE user_id = auth.uid()
  )
);