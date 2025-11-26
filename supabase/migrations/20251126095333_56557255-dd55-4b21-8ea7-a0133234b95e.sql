-- Remove old constraint
ALTER TABLE email_providers 
DROP CONSTRAINT IF EXISTS email_providers_provider_name_check;

-- Add new constraint allowing only resend and brevo
ALTER TABLE email_providers 
ADD CONSTRAINT email_providers_provider_name_check 
CHECK (provider_name IN ('resend', 'brevo'));