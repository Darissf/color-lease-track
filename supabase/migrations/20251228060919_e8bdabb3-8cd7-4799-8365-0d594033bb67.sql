-- Add burst mode columns to payment_provider_settings
ALTER TABLE payment_provider_settings 
ADD COLUMN IF NOT EXISTS burst_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS burst_interval_seconds INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS burst_duration_seconds INTEGER DEFAULT 120,
ADD COLUMN IF NOT EXISTS burst_in_progress BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS burst_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS burst_request_id UUID,
ADD COLUMN IF NOT EXISTS burst_check_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS burst_last_match_found BOOLEAN DEFAULT false;