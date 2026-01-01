-- Add Receipt-specific signature text styling columns
-- These duplicate the invoice settings for separate control

-- Receipt Signature Label Styling
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signature_label_position_x INTEGER DEFAULT 0;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signature_label_position_y INTEGER DEFAULT 0;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signature_label_font_size INTEGER DEFAULT 14;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signature_label_font_family VARCHAR DEFAULT 'inherit';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signature_label_color VARCHAR DEFAULT '#4b5563';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signature_label_font_weight VARCHAR DEFAULT 'normal';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signature_label_font_style VARCHAR DEFAULT 'normal';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signature_label_text_decoration VARCHAR DEFAULT 'none';

-- Receipt Signer Name Styling
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signer_name_position_x INTEGER DEFAULT 0;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signer_name_position_y INTEGER DEFAULT 0;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signer_name_font_size INTEGER DEFAULT 14;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signer_name_font_family VARCHAR DEFAULT 'inherit';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signer_name_color VARCHAR DEFAULT '#1f2937';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signer_name_font_weight VARCHAR DEFAULT 'bold';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signer_name_font_style VARCHAR DEFAULT 'normal';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signer_name_text_decoration VARCHAR DEFAULT 'none';

-- Receipt Signer Title Styling
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signer_title_position_x INTEGER DEFAULT 0;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signer_title_position_y INTEGER DEFAULT 0;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signer_title_font_size INTEGER DEFAULT 12;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signer_title_font_family VARCHAR DEFAULT 'inherit';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signer_title_color VARCHAR DEFAULT '#6b7280';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signer_title_font_weight VARCHAR DEFAULT 'normal';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signer_title_font_style VARCHAR DEFAULT 'normal';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_signer_title_text_decoration VARCHAR DEFAULT 'none';