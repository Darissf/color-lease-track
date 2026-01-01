-- Add text styling columns for signature elements

-- Label Tanda Tangan Text Styling
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signature_label_font_weight VARCHAR DEFAULT 'normal';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signature_label_font_style VARCHAR DEFAULT 'normal';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signature_label_text_decoration VARCHAR DEFAULT 'none';

-- Nama Penanda Tangan Text Styling
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signer_name_font_weight VARCHAR DEFAULT 'bold';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signer_name_font_style VARCHAR DEFAULT 'normal';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signer_name_text_decoration VARCHAR DEFAULT 'none';

-- Jabatan Text Styling
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signer_title_font_weight VARCHAR DEFAULT 'normal';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signer_title_font_style VARCHAR DEFAULT 'normal';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signer_title_text_decoration VARCHAR DEFAULT 'none';