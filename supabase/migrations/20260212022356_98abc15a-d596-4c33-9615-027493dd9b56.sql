
CREATE OR REPLACE FUNCTION public.auto_return_stock_on_contract_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF LOWER(NEW.status) = 'selesai' AND (OLD.status IS NULL OR LOWER(OLD.status) != 'selesai') THEN
    -- Insert return movements for all unreturned stock items
    INSERT INTO inventory_movements (user_id, inventory_item_id, contract_id, movement_type, quantity, movement_date, notes)
    SELECT 
      csi.user_id,
      csi.inventory_item_id,
      csi.contract_id,
      'return',
      csi.quantity,
      COALESCE(NEW.tanggal_ambil::timestamptz, NOW()),
      'Auto return - Kontrak selesai'
    FROM contract_stock_items csi
    WHERE csi.contract_id = NEW.id
      AND csi.returned_at IS NULL;
    
    -- Mark all items as returned using tanggal_ambil
    UPDATE contract_stock_items
    SET returned_at = COALESCE(NEW.tanggal_ambil::timestamptz, NOW())
    WHERE contract_id = NEW.id
      AND returned_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;
