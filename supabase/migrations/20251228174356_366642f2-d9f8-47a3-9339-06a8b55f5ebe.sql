-- Add burst_ended_at column to track when burst mode ends
ALTER TABLE payment_provider_settings 
ADD COLUMN IF NOT EXISTS burst_ended_at timestamp with time zone;