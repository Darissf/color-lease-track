-- Add last_burst_check_at column for VPS scraper config polling tracking
ALTER TABLE payment_provider_settings 
ADD COLUMN IF NOT EXISTS last_burst_check_at timestamp with time zone;