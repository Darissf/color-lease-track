-- Add scrape_interval_minutes column to payment_provider_settings
ALTER TABLE public.payment_provider_settings 
ADD COLUMN IF NOT EXISTS scrape_interval_minutes INTEGER DEFAULT 10;