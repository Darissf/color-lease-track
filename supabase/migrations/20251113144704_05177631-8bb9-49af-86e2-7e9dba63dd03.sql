-- Create trigger function to auto-delete income when tanggal_lunas is cleared
CREATE OR REPLACE FUNCTION public.auto_delete_income_on_clear_tanggal_lunas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If tanggal_lunas is being cleared (set to NULL), delete the associated income
  IF OLD.tanggal_lunas IS NOT NULL AND NEW.tanggal_lunas IS NULL THEN
    DELETE FROM income_sources WHERE contract_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on rental_contracts
DROP TRIGGER IF EXISTS trigger_delete_income_on_clear_tanggal_lunas ON rental_contracts;
CREATE TRIGGER trigger_delete_income_on_clear_tanggal_lunas
  AFTER UPDATE OF tanggal_lunas ON rental_contracts
  FOR EACH ROW
  EXECUTE FUNCTION auto_delete_income_on_clear_tanggal_lunas();