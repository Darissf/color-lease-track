-- Add cloud scraper settings columns to payment_provider_settings
ALTER TABLE payment_provider_settings 
ADD COLUMN IF NOT EXISTS bank_credentials JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS scrape_interval_minutes INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS last_scrape_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scrape_status TEXT DEFAULT 'idle',
ADD COLUMN IF NOT EXISTS total_scrapes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_mutations_found INTEGER DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN payment_provider_settings.bank_credentials IS 'Encrypted BCA credentials: {user_id, pin, account_number}';