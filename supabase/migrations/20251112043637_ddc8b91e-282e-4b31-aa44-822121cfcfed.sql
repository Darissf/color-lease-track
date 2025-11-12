-- Add WhatsApp validation columns to client_groups
ALTER TABLE client_groups 
ADD COLUMN IF NOT EXISTS has_whatsapp boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS whatsapp_checked_at timestamp with time zone DEFAULT null;

-- Create table for AI settings per user
CREATE TABLE IF NOT EXISTS user_ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_provider text NOT NULL CHECK (ai_provider IN ('gemini', 'openai', 'claude')),
  api_key text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_ai_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_ai_settings
CREATE POLICY "Users can view their own AI settings"
  ON user_ai_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI settings"
  ON user_ai_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI settings"
  ON user_ai_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI settings"
  ON user_ai_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_ai_settings_updated_at
  BEFORE UPDATE ON user_ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();