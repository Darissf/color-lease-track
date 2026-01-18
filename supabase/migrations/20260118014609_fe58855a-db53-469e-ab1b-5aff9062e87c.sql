-- Tambah kolom untuk fitur Auto Invoice di document_settings
ALTER TABLE public.document_settings 
ADD COLUMN IF NOT EXISTS auto_invoice_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_invoice_prefix TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS auto_invoice_start INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS auto_invoice_current INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_invoice_padding INTEGER DEFAULT 6;

COMMENT ON COLUMN public.document_settings.auto_invoice_enabled IS 'Toggle ON/OFF untuk auto generate invoice';
COMMENT ON COLUMN public.document_settings.auto_invoice_prefix IS 'Prefix invoice, misal: INV-';
COMMENT ON COLUMN public.document_settings.auto_invoice_start IS 'Nomor awal invoice';
COMMENT ON COLUMN public.document_settings.auto_invoice_current IS 'Nomor invoice terakhir yang digunakan';
COMMENT ON COLUMN public.document_settings.auto_invoice_padding IS 'Jumlah digit padding, default 6 = 000001';