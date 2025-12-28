-- Add columns for custom logo and icons
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS invoice_logo_url TEXT;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS icon_maps_url TEXT;
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS icon_whatsapp_url TEXT;