-- Create ai_feature_config table for storing feature-specific AI configurations
CREATE TABLE IF NOT EXISTS public.ai_feature_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feature_name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT ai_feature_config_feature_name_check CHECK (feature_name IN ('chatbot_ai', 'ai_chat'))
);

-- Enable RLS
ALTER TABLE public.ai_feature_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Super admins and admins can manage feature configs"
ON public.ai_feature_config
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  )
);

-- Create index for faster lookups
CREATE INDEX idx_ai_feature_config_user_feature ON public.ai_feature_config(user_id, feature_name);

-- Create trigger for updated_at
CREATE TRIGGER update_ai_feature_config_updated_at
  BEFORE UPDATE ON public.ai_feature_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.ai_feature_config IS 'Stores feature-specific AI configurations for ChatBot AI and AI Chat';