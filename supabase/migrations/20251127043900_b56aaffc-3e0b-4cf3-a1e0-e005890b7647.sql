-- Add columns for email change tracking to email_verification_tokens
ALTER TABLE email_verification_tokens 
ADD COLUMN IF NOT EXISTS change_type VARCHAR(50) DEFAULT 'verification',
ADD COLUMN IF NOT EXISTS new_email VARCHAR(255);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_change_type 
ON email_verification_tokens(change_type);

COMMENT ON COLUMN email_verification_tokens.change_type IS 'Type of email operation: verification or email_change';
COMMENT ON COLUMN email_verification_tokens.new_email IS 'New email address for email change requests';