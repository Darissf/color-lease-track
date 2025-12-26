-- Create payment_provider_settings table for Mutasibank integration
CREATE TABLE public.payment_provider_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'mutasibank',
  api_key_encrypted TEXT,
  webhook_secret_encrypted TEXT,
  is_active BOOLEAN DEFAULT false,
  last_webhook_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.payment_provider_settings ENABLE ROW LEVEL SECURITY;

-- Super admins can manage payment provider settings
CREATE POLICY "Super admins can manage payment provider settings"
ON public.payment_provider_settings
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Create updated_at trigger
CREATE TRIGGER update_payment_provider_settings_updated_at
BEFORE UPDATE ON public.payment_provider_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();