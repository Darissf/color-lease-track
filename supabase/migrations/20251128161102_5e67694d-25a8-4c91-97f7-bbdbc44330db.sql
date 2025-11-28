-- ============================================
-- FIX REMAINING SECURITY ISSUES
-- ============================================

-- 1. Fix auto_send_whatsapp_notification - add search_path
CREATE OR REPLACE FUNCTION public.auto_send_whatsapp_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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
    
    IF NEW.tanggal_lunas IS NOT NULL AND OLD.tanggal_lunas IS NULL THEN
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

-- 2. Fix process_whatsapp_notification_queue - add search_path
CREATE OR REPLACE FUNCTION public.process_whatsapp_notification_queue()
 RETURNS TABLE(processed_count integer, error_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_processed INTEGER := 0;
  v_errors INTEGER := 0;
  v_queue_item RECORD;
BEGIN
  FOR v_queue_item IN 
    SELECT * FROM whatsapp_notification_queue
    WHERE status = 'pending' 
      AND scheduled_at <= now()
    ORDER BY priority DESC, created_at ASC
    LIMIT 50
  LOOP
    BEGIN
      UPDATE whatsapp_notification_queue
      SET status = 'processing', processing_started_at = now()
      WHERE id = v_queue_item.id;
      
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE whatsapp_notification_queue
      SET status = 'failed', error_message = SQLERRM
      WHERE id = v_queue_item.id;
      
      v_errors := v_errors + 1;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_processed, v_errors;
END;
$function$;

-- ============================================
-- Summary:
-- ✅ Fixed auto_send_whatsapp_notification search_path
-- ✅ Fixed process_whatsapp_notification_queue search_path
-- 
-- Remaining issues (require manual action):
-- ⚠️ Extension in Public Schema - requires migration to extensions schema
-- ⚠️ Leaked Password Protection - enable in Lovable Cloud Auth Settings
-- ⚠️ Security Definer View - false positive (no views detected)
-- ============================================