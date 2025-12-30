ALTER TABLE public.document_settings
ADD COLUMN IF NOT EXISTS signature_scale INTEGER DEFAULT 100;