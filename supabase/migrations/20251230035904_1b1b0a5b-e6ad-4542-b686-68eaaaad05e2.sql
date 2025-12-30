-- Add separate layout settings for Invoice and Receipt
ALTER TABLE document_settings 
ADD COLUMN IF NOT EXISTS invoice_layout_settings JSONB DEFAULT '{
  "stamp_position_x": 10,
  "stamp_position_y": 70,
  "stamp_rotation": -8,
  "stamp_scale": 1.0,
  "qr_position": "bottom-right",
  "qr_size": 80,
  "watermark_position_x": 50,
  "watermark_position_y": 50,
  "watermark_size": 300,
  "watermark_rotation": -45,
  "watermark_opacity": 10
}'::jsonb;

ALTER TABLE document_settings 
ADD COLUMN IF NOT EXISTS receipt_layout_settings JSONB DEFAULT '{
  "stamp_position_x": 10,
  "stamp_position_y": 70,
  "stamp_rotation": -8,
  "stamp_scale": 1.0,
  "qr_position": "bottom-right",
  "qr_size": 80,
  "watermark_position_x": 50,
  "watermark_position_y": 50,
  "watermark_size": 300,
  "watermark_rotation": -45,
  "watermark_opacity": 10
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN document_settings.invoice_layout_settings IS 'Layout-specific settings for Invoice documents (stamp, QR, watermark positions)';
COMMENT ON COLUMN document_settings.receipt_layout_settings IS 'Layout-specific settings for Receipt documents (stamp, QR, watermark positions)';