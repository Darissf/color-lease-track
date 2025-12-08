-- Add phone_numbers JSONB column for multiple phone numbers
ALTER TABLE public.client_groups ADD COLUMN IF NOT EXISTS phone_numbers JSONB DEFAULT '[]'::jsonb;

-- Migrate existing data from nomor_telepon to phone_numbers array
UPDATE public.client_groups 
SET phone_numbers = jsonb_build_array(
  jsonb_build_object(
    'nomor', nomor_telepon,
    'label', 'Utama',
    'has_whatsapp', COALESCE(has_whatsapp, false)
  )
)
WHERE nomor_telepon IS NOT NULL 
  AND nomor_telepon != '' 
  AND (phone_numbers IS NULL OR phone_numbers = '[]'::jsonb);

-- Add comment for documentation
COMMENT ON COLUMN public.client_groups.phone_numbers IS 'Array of phone numbers with format: [{nomor, label, has_whatsapp}]';