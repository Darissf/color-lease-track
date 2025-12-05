-- Add sidebar logo settings columns to vip_design_settings
ALTER TABLE vip_design_settings
ADD COLUMN IF NOT EXISTS sidebar_logo_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sidebar_logo_height INTEGER DEFAULT 32,
ADD COLUMN IF NOT EXISTS sidebar_logo_max_width INTEGER DEFAULT 150,
ADD COLUMN IF NOT EXISTS sidebar_text TEXT DEFAULT 'Admin Area',
ADD COLUMN IF NOT EXISTS sidebar_display_mode TEXT DEFAULT 'both';

-- Add check constraint for sidebar_display_mode
ALTER TABLE vip_design_settings
DROP CONSTRAINT IF EXISTS sidebar_display_mode_check;

ALTER TABLE vip_design_settings
ADD CONSTRAINT sidebar_display_mode_check 
CHECK (sidebar_display_mode IN ('logo', 'text', 'both'));