-- Add column to store invoice rincian display mode (full or simple)
ALTER TABLE public.rental_contracts 
ADD COLUMN IF NOT EXISTS invoice_full_rincian BOOLEAN DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.rental_contracts.invoice_full_rincian IS 'When false, page 2 of invoice only shows No, Nama Item, Qty columns';