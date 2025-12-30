-- Add QR verification custom text columns to document_settings
ALTER TABLE public.document_settings 
ADD COLUMN IF NOT EXISTS qr_verification_title VARCHAR(255) DEFAULT 'Scan untuk verifikasi dokumen';

ALTER TABLE public.document_settings 
ADD COLUMN IF NOT EXISTS qr_verification_label VARCHAR(100) DEFAULT 'Kode:';

ALTER TABLE public.document_settings 
ADD COLUMN IF NOT EXISTS show_qr_verification_url BOOLEAN DEFAULT true;