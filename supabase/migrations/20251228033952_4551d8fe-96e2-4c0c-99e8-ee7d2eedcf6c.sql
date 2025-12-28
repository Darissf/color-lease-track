-- Typography Settings
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS font_family VARCHAR DEFAULT 'Segoe UI';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS font_size_base INTEGER DEFAULT 12;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS heading_font_family VARCHAR DEFAULT 'inherit';

-- Header Layout
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS header_style VARCHAR DEFAULT 'modern';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_company_tagline BOOLEAN DEFAULT false;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS company_tagline TEXT;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS header_stripe_height INTEGER DEFAULT 3;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS header_stripe_style VARCHAR DEFAULT 'gradient';

-- Company Info Extended
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS company_email VARCHAR;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS company_website VARCHAR;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS company_npwp VARCHAR;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS icon_email_url TEXT;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS icon_website_url TEXT;

-- Bank Account Info
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_bank_info BOOLEAN DEFAULT true;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS bank_name VARCHAR;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS bank_logo_url TEXT;

-- Table Styling
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS table_header_bg VARCHAR DEFAULT '#f3f4f6';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS table_header_text_color VARCHAR DEFAULT '#111827';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS table_border_style VARCHAR DEFAULT 'solid';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS table_alternating_rows BOOLEAN DEFAULT false;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS table_alternating_color VARCHAR DEFAULT '#f9fafb';

-- Signature & Stamp
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signer_name VARCHAR;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS signer_title VARCHAR;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_stamp BOOLEAN DEFAULT true;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS custom_stamp_url TEXT;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS stamp_color_lunas VARCHAR DEFAULT '#047857';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS stamp_color_belum_lunas VARCHAR DEFAULT '#b91c1c';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS stamp_opacity INTEGER DEFAULT 90;

-- Watermark
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_watermark BOOLEAN DEFAULT false;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS watermark_type VARCHAR DEFAULT 'logo';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS watermark_text VARCHAR;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS watermark_opacity INTEGER DEFAULT 5;

-- QR Code Settings
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS qr_size INTEGER DEFAULT 80;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS qr_position VARCHAR DEFAULT 'bottom-left';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS qr_include_amount BOOLEAN DEFAULT false;

-- Document Numbering
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS invoice_prefix VARCHAR DEFAULT 'INV';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_prefix VARCHAR DEFAULT 'KWT';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS number_format VARCHAR DEFAULT 'PREFIX-YYYY-NNNN';

-- Additional Info
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_due_date BOOLEAN DEFAULT true;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS default_due_days INTEGER DEFAULT 7;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS late_fee_text TEXT;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS custom_note TEXT;

-- Color Presets
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS color_preset VARCHAR DEFAULT 'cyan-blue';