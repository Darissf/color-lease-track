-- Add text_align column to vip_design_settings
ALTER TABLE vip_design_settings 
ADD COLUMN text_align text NOT NULL DEFAULT 'center' 
CHECK (text_align IN ('left', 'center', 'right'));