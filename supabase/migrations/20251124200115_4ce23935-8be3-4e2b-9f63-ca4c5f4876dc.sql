-- Create email_providers table for multi-provider email rotation
CREATE TABLE IF NOT EXISTS public.email_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider_name VARCHAR(50) NOT NULL CHECK (provider_name IN ('resend', 'brevo', 'mailgun')),
  display_name VARCHAR(100),
  api_key_encrypted TEXT NOT NULL,
  api_endpoint TEXT,
  sender_email VARCHAR(255) NOT NULL,
  sender_name VARCHAR(100),
  priority INTEGER DEFAULT 1,
  daily_limit INTEGER DEFAULT 100,
  emails_sent_today INTEGER DEFAULT 0,
  monthly_limit INTEGER DEFAULT 3000,
  emails_sent_month INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  last_month_reset DATE DEFAULT date_trunc('month', CURRENT_DATE),
  is_active BOOLEAN DEFAULT true,
  health_status VARCHAR(20) DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'degraded', 'down')),
  last_error TEXT,
  last_success_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider_name, sender_email)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_providers_active ON public.email_providers(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_email_providers_priority ON public.email_providers(priority);
CREATE INDEX IF NOT EXISTS idx_email_providers_health ON public.email_providers(health_status);

-- Enable RLS
ALTER TABLE public.email_providers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Super admins can manage providers
CREATE POLICY "Super admins can manage providers" ON public.email_providers
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- Enhance email_logs table to track provider usage
ALTER TABLE public.email_logs 
  ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.email_providers(id),
  ADD COLUMN IF NOT EXISTS provider_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS fallback_attempts INTEGER DEFAULT 0;

-- Function to reset daily email counters
CREATE OR REPLACE FUNCTION public.reset_email_provider_daily_counters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_providers
  SET emails_sent_today = 0,
      last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE;
END;
$$;

-- Function to reset monthly email counters
CREATE OR REPLACE FUNCTION public.reset_email_provider_monthly_counters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_providers
  SET emails_sent_month = 0,
      last_month_reset = date_trunc('month', CURRENT_DATE)
  WHERE last_month_reset < date_trunc('month', CURRENT_DATE);
END;
$$;

-- Function to increment provider usage
CREATE OR REPLACE FUNCTION public.increment_provider_usage(p_provider_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_providers
  SET emails_sent_today = emails_sent_today + 1,
      emails_sent_month = emails_sent_month + 1,
      last_success_at = now(),
      health_status = 'healthy',
      last_error = NULL
  WHERE id = p_provider_id;
END;
$$;

-- Function to update provider error
CREATE OR REPLACE FUNCTION public.update_provider_error(p_provider_id UUID, p_error_message TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_providers
  SET last_error = p_error_message,
      health_status = 'degraded'
  WHERE id = p_provider_id;
END;
$$;