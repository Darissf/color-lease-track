-- Add columns for custom canvas dimensions and border color
ALTER TABLE public.document_settings 
ADD COLUMN IF NOT EXISTS stamp_canvas_width INTEGER DEFAULT 220,
ADD COLUMN IF NOT EXISTS stamp_canvas_height INTEGER DEFAULT 120,
ADD COLUMN IF NOT EXISTS stamp_border_color VARCHAR(20) DEFAULT '#047857';