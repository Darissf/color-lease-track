-- Add provider tracking and performance metrics to email_logs
ALTER TABLE email_logs 
ADD COLUMN IF NOT EXISTS response_time_ms integer,
ADD COLUMN IF NOT EXISTS external_message_id text;

-- Add index for faster provider filtering
CREATE INDEX IF NOT EXISTS idx_email_logs_provider ON email_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);