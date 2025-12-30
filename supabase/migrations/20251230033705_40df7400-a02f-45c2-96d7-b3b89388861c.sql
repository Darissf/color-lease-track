-- Add stamp_source and stamp_scale columns to document_settings
ALTER TABLE document_settings 
ADD COLUMN IF NOT EXISTS stamp_source VARCHAR(20) DEFAULT 'built-in',
ADD COLUMN IF NOT EXISTS stamp_scale NUMERIC(3,2) DEFAULT 1.0;

-- Add comment for clarity
COMMENT ON COLUMN document_settings.stamp_source IS 'Source of stamp: built-in (DynamicStamp) or custom (from stamp_elements)';
COMMENT ON COLUMN document_settings.stamp_scale IS 'Scale factor for stamp size (0.5 to 2.0)';