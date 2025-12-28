-- Add template style columns to document_settings
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS template_style VARCHAR DEFAULT 'modern';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS header_color_primary VARCHAR DEFAULT '#06b6d4';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS header_color_secondary VARCHAR DEFAULT '#2563eb';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS border_color VARCHAR DEFAULT '#bfdbfe';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS accent_color VARCHAR DEFAULT '#f97316';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_qr_code BOOLEAN DEFAULT true;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_terbilang BOOLEAN DEFAULT true;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS footer_text TEXT;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS terms_conditions TEXT;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS paper_size VARCHAR DEFAULT 'A4';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS logo_position VARCHAR DEFAULT 'left';