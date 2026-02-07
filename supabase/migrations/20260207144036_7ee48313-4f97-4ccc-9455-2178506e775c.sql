-- Add auto_click_keywords column to mail_settings
ALTER TABLE public.mail_settings
ADD COLUMN IF NOT EXISTS auto_click_keywords TEXT[] DEFAULT ARRAY['Follow this link to verify your email address.'];