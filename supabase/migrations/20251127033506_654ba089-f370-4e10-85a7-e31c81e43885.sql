-- Create table for VIP design settings
CREATE TABLE IF NOT EXISTS public.vip_design_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  brand_text TEXT NOT NULL DEFAULT 'SewaScaffoldingBali.com',
  font_family TEXT NOT NULL DEFAULT 'Playfair Display',
  font_weight TEXT NOT NULL DEFAULT '700',
  font_size INTEGER NOT NULL DEFAULT 24,
  letter_spacing NUMERIC NOT NULL DEFAULT 0,
  text_transform TEXT NOT NULL DEFAULT 'none',
  color_type TEXT NOT NULL DEFAULT 'solid',
  solid_color TEXT NOT NULL DEFAULT '#F5E6A8',
  gradient_type TEXT NOT NULL DEFAULT 'linear',
  gradient_colors JSONB NOT NULL DEFAULT '["#F5E6A8", "#D4AF37"]'::jsonb,
  gradient_angle INTEGER NOT NULL DEFAULT 90,
  shadow_enabled BOOLEAN NOT NULL DEFAULT true,
  shadow_color TEXT NOT NULL DEFAULT 'rgba(0,0,0,0.3)',
  shadow_x INTEGER NOT NULL DEFAULT 2,
  shadow_y INTEGER NOT NULL DEFAULT 2,
  shadow_blur INTEGER NOT NULL DEFAULT 8,
  glow_enabled BOOLEAN NOT NULL DEFAULT false,
  glow_color TEXT NOT NULL DEFAULT '#F5E6A8',
  glow_blur INTEGER NOT NULL DEFAULT 20,
  outline_enabled BOOLEAN NOT NULL DEFAULT false,
  outline_color TEXT NOT NULL DEFAULT '#000000',
  outline_width INTEGER NOT NULL DEFAULT 1,
  animation TEXT NOT NULL DEFAULT 'none',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.vip_design_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Super admins can manage settings
CREATE POLICY "Super admins can manage VIP design settings"
ON public.vip_design_settings
FOR ALL
USING (is_super_admin(auth.uid()));

-- Insert default settings for super admin
INSERT INTO public.vip_design_settings (
  user_id,
  brand_text,
  font_family,
  font_weight,
  font_size,
  solid_color,
  shadow_enabled
) 
SELECT 
  user_id,
  'SewaScaffoldingBali.com',
  'Playfair Display',
  '700',
  24,
  '#F5E6A8',
  true
FROM user_roles 
WHERE role = 'super_admin'
LIMIT 1
ON CONFLICT DO NOTHING;