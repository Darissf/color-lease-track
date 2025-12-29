-- Add new stamp customization columns
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS stamp_type TEXT DEFAULT 'rectangle';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS stamp_font_family TEXT DEFAULT 'Courier New';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS stamp_font_size INTEGER DEFAULT 24;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS stamp_rotation INTEGER DEFAULT -8;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS stamp_border_width INTEGER DEFAULT 4;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS stamp_border_style TEXT DEFAULT 'solid';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS stamp_show_date BOOLEAN DEFAULT true;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS stamp_show_document_number BOOLEAN DEFAULT true;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS stamp_show_company_name BOOLEAN DEFAULT true;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS stamp_position TEXT DEFAULT 'left';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS stamp_size TEXT DEFAULT 'md';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_stamp_on_invoice BOOLEAN DEFAULT false;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_stamp_on_receipt BOOLEAN DEFAULT true;

-- Add signature position column
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signature_position TEXT DEFAULT 'right';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signature_label TEXT DEFAULT 'Hormat Kami,';