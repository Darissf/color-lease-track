-- Add columns for advanced email rotation and health tracking
ALTER TABLE email_providers 
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS consecutive_errors INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_disabled_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_email_providers_last_used ON email_providers(last_used_at);
CREATE INDEX IF NOT EXISTS idx_email_providers_health ON email_providers(is_active, health_status);

-- Add comment explaining the new columns
COMMENT ON COLUMN email_providers.last_used_at IS 'Last time this provider was used for sending email (for round-robin rotation)';
COMMENT ON COLUMN email_providers.consecutive_errors IS 'Number of consecutive errors (for auto-healing system)';
COMMENT ON COLUMN email_providers.auto_disabled_at IS 'Timestamp when provider was auto-disabled due to errors';