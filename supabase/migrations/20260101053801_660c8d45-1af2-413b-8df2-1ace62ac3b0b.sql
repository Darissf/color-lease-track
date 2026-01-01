-- Signature Label Styling
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signature_label_position_x INTEGER DEFAULT 0;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signature_label_position_y INTEGER DEFAULT 0;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signature_label_font_size INTEGER DEFAULT 14;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signature_label_font_family VARCHAR DEFAULT 'inherit';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signature_label_color VARCHAR DEFAULT '#4b5563';

-- Signer Name Styling
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signer_name_position_x INTEGER DEFAULT 0;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signer_name_position_y INTEGER DEFAULT 0;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signer_name_font_size INTEGER DEFAULT 14;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signer_name_font_family VARCHAR DEFAULT 'inherit';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signer_name_color VARCHAR DEFAULT '#1f2937';

-- Signer Title Styling
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signer_title_position_x INTEGER DEFAULT 0;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signer_title_position_y INTEGER DEFAULT 0;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signer_title_font_size INTEGER DEFAULT 12;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signer_title_font_family VARCHAR DEFAULT 'inherit';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signer_title_color VARCHAR DEFAULT '#6b7280';