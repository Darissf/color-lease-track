-- Drop the old constraint that limits AI providers
ALTER TABLE public.user_ai_settings 
DROP CONSTRAINT IF EXISTS user_ai_settings_ai_provider_check;

-- Add new constraint with all supported providers
ALTER TABLE public.user_ai_settings 
ADD CONSTRAINT user_ai_settings_ai_provider_check 
CHECK (ai_provider IN ('lovable', 'gemini', 'openai', 'claude', 'deepseek', 'groq'));