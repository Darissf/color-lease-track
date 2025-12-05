-- Drop the trigger that depends on tanggal_lunas column
DROP TRIGGER IF EXISTS trigger_delete_income_on_clear_tanggal_lunas ON public.rental_contracts;

-- Drop the function if not used elsewhere
DROP FUNCTION IF EXISTS public.auto_delete_income_on_clear_tanggal_lunas();

-- Now drop unused columns from rental_contracts
ALTER TABLE public.rental_contracts DROP COLUMN IF EXISTS jumlah_lunas;
ALTER TABLE public.rental_contracts DROP COLUMN IF EXISTS tanggal_lunas;