-- Step 1: Update function to be case insensitive
CREATE OR REPLACE FUNCTION public.auto_return_stock_on_contract_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Case insensitive check: 'selesai', 'Selesai', 'SELESAI'
  IF LOWER(NEW.status) = 'selesai' AND (OLD.status IS NULL OR LOWER(OLD.status) != 'selesai') THEN
    -- Insert return movements for all unreturned stock items
    INSERT INTO inventory_movements (user_id, inventory_item_id, contract_id, movement_type, quantity, notes)
    SELECT 
      csi.user_id,
      csi.inventory_item_id,
      csi.contract_id,
      'return',
      csi.quantity,
      'Auto return - Kontrak selesai'
    FROM contract_stock_items csi
    WHERE csi.contract_id = NEW.id
      AND csi.returned_at IS NULL;
    
    -- Mark all items as returned
    UPDATE contract_stock_items
    SET returned_at = NOW()
    WHERE contract_id = NEW.id
      AND returned_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Step 2: Create missing trigger (drop first if exists to avoid error)
DROP TRIGGER IF EXISTS trigger_auto_return_stock ON rental_contracts;

CREATE TRIGGER trigger_auto_return_stock
  AFTER UPDATE ON rental_contracts
  FOR EACH ROW
  EXECUTE FUNCTION auto_return_stock_on_contract_complete();

-- Step 3: Fix existing completed contracts that haven't had stock returned
-- Insert return movements for all unreturned items on completed contracts
INSERT INTO inventory_movements (user_id, inventory_item_id, contract_id, movement_type, quantity, notes)
SELECT 
  csi.user_id,
  csi.inventory_item_id,
  csi.contract_id,
  'return',
  csi.quantity,
  'Auto return - Fix kontrak selesai yang belum return'
FROM contract_stock_items csi
JOIN rental_contracts rc ON csi.contract_id = rc.id
WHERE LOWER(rc.status) = 'selesai'
  AND csi.returned_at IS NULL;

-- Mark all items as returned for completed contracts
UPDATE contract_stock_items csi
SET returned_at = NOW()
FROM rental_contracts rc
WHERE csi.contract_id = rc.id
  AND LOWER(rc.status) = 'selesai'
  AND csi.returned_at IS NULL;