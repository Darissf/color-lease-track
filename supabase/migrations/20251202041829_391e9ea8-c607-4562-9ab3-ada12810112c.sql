-- Add purpose column to email_providers table for separating automated vs compose emails
ALTER TABLE email_providers 
ADD COLUMN purpose text DEFAULT 'all' CHECK (purpose IN ('automated', 'compose', 'all'));

-- Update existing providers to 'all' for backward compatibility
UPDATE email_providers SET purpose = 'all' WHERE purpose IS NULL;

COMMENT ON COLUMN email_providers.purpose IS 'Purpose of email provider: automated (verification, notifications), compose (manual emails), or all (both)';