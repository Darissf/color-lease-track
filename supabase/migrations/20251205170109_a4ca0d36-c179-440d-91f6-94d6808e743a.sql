-- Update auto_send_whatsapp_notification function to use tanggal_bayar_terakhir
CREATE OR REPLACE FUNCTION public.auto_send_whatsapp_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_notification_type TEXT;
  v_should_send BOOLEAN := false;
BEGIN
  v_user_id := NEW.user_id;
  
  IF NOT EXISTS (
    SELECT 1 FROM whatsapp_settings 
    WHERE user_id = v_user_id AND is_active = true
  ) THEN
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    v_notification_type := 'invoice';
    v_should_send := true;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status_pengiriman = 'sudah_kirim' AND 
       (OLD.status_pengiriman IS NULL OR OLD.status_pengiriman != 'sudah_kirim') THEN
      v_notification_type := 'delivery';
      v_should_send := true;
    END IF;
    
    IF NEW.status_pengambilan = 'sudah_diambil' AND 
       (OLD.status_pengambilan IS NULL OR OLD.status_pengambilan != 'sudah_diambil') THEN
      v_notification_type := 'pickup';
      v_should_send := true;
    END IF;
    
    -- UPDATED: Use tanggal_bayar_terakhir instead of tanggal_lunas for payment detection
    IF NEW.tanggal_bayar_terakhir IS NOT NULL AND 
       (OLD.tanggal_bayar_terakhir IS NULL OR NEW.tanggal_bayar_terakhir != OLD.tanggal_bayar_terakhir) THEN
      v_notification_type := 'payment';
      v_should_send := true;
    END IF;
  END IF;
  
  IF v_should_send THEN
    INSERT INTO whatsapp_notification_queue (
      user_id,
      contract_id,
      notification_type,
      priority,
      scheduled_at
    ) VALUES (
      v_user_id,
      NEW.id,
      v_notification_type,
      CASE 
        WHEN v_notification_type = 'payment' THEN 10
        WHEN v_notification_type = 'delivery' THEN 8
        WHEN v_notification_type = 'pickup' THEN 7
        ELSE 5
      END,
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Drop old trigger that monitors tanggal_lunas
DROP TRIGGER IF EXISTS trigger_delete_income_on_clear_tanggal_lunas ON rental_contracts;

-- Drop old function that is no longer used
DROP FUNCTION IF EXISTS public.auto_delete_income_on_clear_tanggal_lunas();