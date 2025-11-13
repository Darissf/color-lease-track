-- Drop the incorrect unique constraint on user_id only
ALTER TABLE public.user_ai_settings 
DROP CONSTRAINT IF EXISTS user_ai_settings_user_id_key;

-- Add correct unique constraint on (user_id, ai_provider)
-- This allows multiple providers per user, but prevents duplicate providers
ALTER TABLE public.user_ai_settings 
ADD CONSTRAINT user_ai_settings_user_provider_unique 
UNIQUE (user_id, ai_provider);