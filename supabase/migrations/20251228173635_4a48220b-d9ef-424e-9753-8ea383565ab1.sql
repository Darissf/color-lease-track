-- Change burst_request_id column type from UUID to TEXT
-- This allows flexible request ID formats (manual triggers, payment request IDs, etc.)

ALTER TABLE payment_provider_settings 
ALTER COLUMN burst_request_id TYPE text;