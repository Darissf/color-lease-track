-- Add protection and tracking columns to editable_content
ALTER TABLE editable_content 
ADD COLUMN IF NOT EXISTS is_protected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS protection_reason TEXT,
ADD COLUMN IF NOT EXISTS last_applied_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_content_protected ON editable_content(is_protected) WHERE is_protected = TRUE;
CREATE INDEX IF NOT EXISTS idx_content_last_applied ON editable_content(last_applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_updated_at ON editable_content(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_page_category ON editable_content(page, category);

-- Add comment for documentation
COMMENT ON COLUMN editable_content.is_protected IS 'Marks content as protected from auto-apply system';
COMMENT ON COLUMN editable_content.protection_reason IS 'Reason why content is protected (e.g., navigation, critical system text)';
COMMENT ON COLUMN editable_content.last_applied_at IS 'Timestamp when content was last applied via auto-apply system';