-- Add custom stamp text and free positioning columns
ALTER TABLE document_settings
ADD COLUMN IF NOT EXISTS stamp_custom_text VARCHAR(50) DEFAULT 'LUNAS',
ADD COLUMN IF NOT EXISTS stamp_use_custom_text BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stamp_position_x INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS stamp_position_y INTEGER DEFAULT 70;