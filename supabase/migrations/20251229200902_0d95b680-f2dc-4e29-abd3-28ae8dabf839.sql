-- Add global lock column for 6-minute rate limiting on VPS Scraper burst mode
ALTER TABLE payment_provider_settings 
ADD COLUMN IF NOT EXISTS burst_global_locked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;