-- Drop existing constraint
ALTER TABLE email_providers DROP CONSTRAINT IF EXISTS email_providers_purpose_check;

-- Add new constraint with 'inbox' option
ALTER TABLE email_providers ADD CONSTRAINT email_providers_purpose_check 
CHECK (purpose = ANY (ARRAY['automated'::text, 'compose'::text, 'inbox'::text, 'all'::text]));