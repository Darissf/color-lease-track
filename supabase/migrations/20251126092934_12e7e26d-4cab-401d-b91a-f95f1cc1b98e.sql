-- Delete Mailjet provider record
DELETE FROM email_providers WHERE provider_name = 'mailjet';

-- Update constraint to remove mailjet
ALTER TABLE email_providers 
DROP CONSTRAINT email_providers_provider_name_check;

ALTER TABLE email_providers 
ADD CONSTRAINT email_providers_provider_name_check 
CHECK (provider_name IN ('resend', 'brevo', 'mailgun', 'sendgrid'));