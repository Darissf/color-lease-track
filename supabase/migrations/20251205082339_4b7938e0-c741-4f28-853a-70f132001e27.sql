-- Add favicon columns to vip_design_settings
ALTER TABLE public.vip_design_settings 
ADD COLUMN IF NOT EXISTS favicon_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS favicon_type TEXT DEFAULT 'svg';