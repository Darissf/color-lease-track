-- Add watermark position, size, and rotation columns to document_settings
ALTER TABLE public.document_settings 
ADD COLUMN IF NOT EXISTS watermark_size INTEGER DEFAULT 300,
ADD COLUMN IF NOT EXISTS watermark_rotation INTEGER DEFAULT -45,
ADD COLUMN IF NOT EXISTS watermark_position_x INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS watermark_position_y INTEGER DEFAULT 50;