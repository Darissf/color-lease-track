-- Drop existing constraint that only allowed resend, brevo, mailgun
ALTER TABLE email_providers 
DROP CONSTRAINT email_providers_provider_name_check;

-- Add new constraint with all five providers including mailjet and sendgrid
ALTER TABLE email_providers 
ADD CONSTRAINT email_providers_provider_name_check 
CHECK (provider_name IN ('resend', 'brevo', 'mailgun', 'mailjet', 'sendgrid'));