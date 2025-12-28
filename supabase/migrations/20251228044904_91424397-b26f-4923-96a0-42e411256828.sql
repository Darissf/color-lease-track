-- Add missing columns that exist in TypeScript but not in database
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_header_stripe BOOLEAN DEFAULT true;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS stamp_text VARCHAR DEFAULT 'LUNAS';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS stamp_color VARCHAR DEFAULT '#22c55e';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS header_stripe_height INTEGER DEFAULT 12;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS header_stripe_style VARCHAR DEFAULT 'gradient';

-- Visibility toggles for every element
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_company_name BOOLEAN DEFAULT true;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_company_address BOOLEAN DEFAULT true;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_company_phone BOOLEAN DEFAULT true;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_company_email BOOLEAN DEFAULT true;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_company_website BOOLEAN DEFAULT true;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_npwp BOOLEAN DEFAULT false;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_client_info BOOLEAN DEFAULT true;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_signature BOOLEAN DEFAULT true;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_terms BOOLEAN DEFAULT true;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_footer BOOLEAN DEFAULT true;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_custom_note BOOLEAN DEFAULT false;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_document_number BOOLEAN DEFAULT true;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_document_date BOOLEAN DEFAULT true;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS show_table_header BOOLEAN DEFAULT true;

-- Text colors for elements
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS company_name_color VARCHAR DEFAULT '#1f2937';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS company_info_color VARCHAR DEFAULT '#4b5563';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS tagline_color VARCHAR DEFAULT '#6b7280';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS document_title_color VARCHAR DEFAULT '#1f2937';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS label_color VARCHAR DEFAULT '#6b7280';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS value_color VARCHAR DEFAULT '#1f2937';

-- Custom labels
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS document_title VARCHAR DEFAULT 'INVOICE';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS label_client VARCHAR DEFAULT 'Kepada Yth:';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS label_description VARCHAR DEFAULT 'Keterangan';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS label_amount VARCHAR DEFAULT 'Jumlah';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS label_total VARCHAR DEFAULT 'Total';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS label_terbilang VARCHAR DEFAULT 'Terbilang:';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS label_bank_transfer VARCHAR DEFAULT 'Transfer ke:';
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS receipt_title VARCHAR DEFAULT 'KWITANSI';

-- Payment link option
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS use_payment_link BOOLEAN DEFAULT false;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS payment_link_text VARCHAR DEFAULT 'Generate Pembayaran';