-- Fix remaining functions with mutable search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_bank_balance_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.balance IS DISTINCT FROM NEW.balance THEN
    INSERT INTO public.bank_account_balance_history (
      user_id,
      bank_account_id,
      old_balance,
      new_balance,
      bank_name
    ) VALUES (
      NEW.user_id,
      NEW.id,
      COALESCE(OLD.balance, 0),
      NEW.balance,
      NEW.bank_name
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_conversations
  SET updated_at = now(),
      message_count = message_count + 1
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.whatsapp_conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.message_content, 100),
    last_message_direction = NEW.direction,
    unread_count = CASE WHEN NEW.direction = 'inbound' THEN unread_count + 1 ELSE unread_count END,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_delete_income_on_clear_tanggal_lunas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.tanggal_lunas IS NOT NULL AND NEW.tanggal_lunas IS NULL THEN
    DELETE FROM income_sources WHERE contract_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_agent_outputs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.agent_command_outputs
  WHERE created_at < NOW() - INTERVAL '2 hours';
  
  DELETE FROM public.agent_commands
  WHERE status IN ('completed', 'failed')
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_whatsapp_daily_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.whatsapp_numbers
  SET messages_sent_today = 0, last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE OR last_reset_date IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_default_category_budgets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO category_budgets (user_id, monthly_budget_id, category, allocated_amount)
  VALUES 
    (NEW.user_id, NEW.id, 'Belanja', COALESCE(NEW.target_belanja, 0) * 0.30),
    (NEW.user_id, NEW.id, 'Transportasi', COALESCE(NEW.target_belanja, 0) * 0.20),
    (NEW.user_id, NEW.id, 'Utilitas', COALESCE(NEW.target_belanja, 0) * 0.15),
    (NEW.user_id, NEW.id, 'Pemeliharaan Properti', COALESCE(NEW.target_belanja, 0) * 0.15),
    (NEW.user_id, NEW.id, 'Pajak', COALESCE(NEW.target_belanja, 0) * 0.10),
    (NEW.user_id, NEW.id, 'Lainnya', COALESCE(NEW.target_belanja, 0) * 0.10)
  ON CONFLICT (monthly_budget_id, category) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_budget_template(p_user_id uuid, p_budget_id uuid, p_template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template RECORD;
  v_budget RECORD;
  v_category TEXT;
  v_percentage NUMERIC;
  v_allocated NUMERIC;
BEGIN
  SELECT * INTO v_template FROM budget_templates WHERE id = p_template_id;
  SELECT * INTO v_budget FROM monthly_budgets WHERE id = p_budget_id;
  
  DELETE FROM category_budgets WHERE monthly_budget_id = p_budget_id;
  
  FOR v_category, v_percentage IN 
    SELECT key, (value::TEXT)::NUMERIC FROM jsonb_each_text(v_template.category_allocations)
  LOOP
    v_allocated := COALESCE(v_budget.target_belanja, 0) * (v_percentage / 100);
    
    INSERT INTO category_budgets (user_id, monthly_budget_id, category, allocated_amount)
    VALUES (p_user_id, p_budget_id, v_category, v_allocated);
  END LOOP;
  
  UPDATE budget_templates SET usage_count = usage_count + 1 WHERE id = p_template_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_whatsapp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_table_sizes()
RETURNS TABLE(table_name text, size_bytes bigint, row_count bigint, last_modified timestamp with time zone)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    schemaname || '.' || relname AS table_name,
    pg_total_relation_size(schemaname||'.'||relname) AS size_bytes,
    n_live_tup AS row_count,
    last_vacuum AS last_modified
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC;
$$;

CREATE OR REPLACE FUNCTION public.initialize_whatsapp_templates(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM whatsapp_message_templates WHERE user_id = p_user_id) THEN
    RETURN;
  END IF;

  INSERT INTO whatsapp_message_templates (user_id, template_type, template_name, template_content, variables, is_active)
  VALUES 
    (p_user_id, 'delivery', 'Notifikasi Pengiriman Scaffolding', E'🚚 *NOTIFIKASI PENGIRIMAN*\n\nHalo *{{nama}}*,\n\nScaffolding sudah dikirim!\n\n📋 Invoice: {{invoice}}\n📍 Lokasi: {{lokasi}}\n📅 Tanggal: {{tanggal_kirim}}\n📦 Unit: {{jumlah_unit}}\n👤 PIC: {{penanggung_jawab}}\n\nTerima kasih! 🙏', ARRAY['nama', 'invoice', 'lokasi', 'tanggal_kirim', 'jumlah_unit', 'penanggung_jawab'], true),
    (p_user_id, 'pickup', 'Notifikasi Pengambilan', E'📦 *PENGAMBILAN SCAFFOLDING*\n\nHalo *{{nama}}*,\n\nScaffolding sudah diambil! ✅\n\n📋 Invoice: {{invoice}}\n📍 Lokasi: {{lokasi}}\n📅 Tanggal: {{tanggal_ambil}}\n📦 Unit: {{jumlah_unit}}\n\nTerima kasih! 🙏', ARRAY['nama', 'invoice', 'lokasi', 'tanggal_ambil', 'jumlah_unit'], true),
    (p_user_id, 'invoice', 'Invoice Sewa', E'🧾 *INVOICE SEWA*\n\nHalo *{{nama}}*,\n\n📋 Invoice: {{invoice}}\n💰 Total: Rp {{jumlah_tagihan}}\n📅 Tanggal: {{tanggal}}\n\n💳 Transfer ke:\n*{{bank_name}}*\n\nTerima kasih! 🙏', ARRAY['nama', 'invoice', 'jumlah_tagihan', 'tanggal', 'bank_name'], true),
    (p_user_id, 'payment', 'Konfirmasi Pembayaran', E'✅ *PEMBAYARAN DITERIMA*\n\nHalo *{{nama}}*,\n\n📋 Invoice: {{invoice}}\n💰 Jumlah: Rp {{jumlah_lunas}}\n📅 Tanggal: {{tanggal_lunas}}\n\nTerima kasih! 🙏', ARRAY['nama', 'invoice', 'jumlah_lunas', 'tanggal_lunas'], true),
    (p_user_id, 'reminder', 'Reminder Pembayaran', E'🔔 *REMINDER PEMBAYARAN*\n\nHalo *{{nama}}*,\n\n📋 Invoice: {{invoice}}\n💰 Sisa: Rp {{tagihan_belum_bayar}}\n\nMohon segera dibayar.\n\nTerima kasih! 🙏', ARRAY['nama', 'invoice', 'tagihan_belum_bayar'], true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_email_usage_by_type(start_date timestamp with time zone)
RETURNS TABLE(template_type text, total bigint, sent bigint, failed bigint, pending bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(template_type, 'unknown') as template_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'sent') as sent,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) FILTER (WHERE status IN ('pending', 'scheduled')) as pending
  FROM email_logs 
  WHERE created_at >= start_date
  GROUP BY template_type
  ORDER BY total DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_email_daily_trends(days integer)
RETURNS TABLE(date date, template_type text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    DATE(created_at) as date,
    COALESCE(template_type, 'unknown') as template_type,
    COUNT(*) as count
  FROM email_logs
  WHERE created_at >= CURRENT_DATE - (days || ' days')::interval
  GROUP BY DATE(created_at), template_type
  ORDER BY date DESC, template_type;
$$;

CREATE OR REPLACE FUNCTION public.get_email_provider_distribution()
RETURNS TABLE(provider_name text, template_type text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(provider_name, 'unknown') as provider_name,
    COALESCE(template_type, 'unknown') as template_type,
    COUNT(*) as count
  FROM email_logs
  WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY provider_name, template_type
  ORDER BY provider_name, count DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_monthly_trend(p_user_id uuid, p_months integer DEFAULT 6)
RETURNS TABLE(month text, income numeric, expenses numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT 
      generate_series(
        date_trunc('month', CURRENT_DATE) - (p_months - 1 || ' months')::interval,
        date_trunc('month', CURRENT_DATE),
        '1 month'::interval
      ) AS month_date
  ),
  monthly_expenses AS (
    SELECT 
      date_trunc('month', date) AS month,
      SUM(amount) AS total_expenses
    FROM expenses
    WHERE user_id = p_user_id
      AND date >= date_trunc('month', CURRENT_DATE) - (p_months - 1 || ' months')::interval
    GROUP BY date_trunc('month', date)
  ),
  monthly_income AS (
    SELECT 
      date_trunc('month', tanggal_lunas) AS month,
      SUM(jumlah_lunas) AS total_income
    FROM rental_contracts
    WHERE user_id = p_user_id
      AND tanggal_lunas IS NOT NULL
      AND tanggal_lunas >= date_trunc('month', CURRENT_DATE) - (p_months - 1 || ' months')::interval
    GROUP BY date_trunc('month', tanggal_lunas)
  )
  SELECT 
    TO_CHAR(m.month_date, 'Mon') AS month,
    COALESCE(mi.total_income, 0) AS income,
    COALESCE(me.total_expenses, 0) AS expenses
  FROM months m
  LEFT JOIN monthly_income mi ON m.month_date = mi.month
  LEFT JOIN monthly_expenses me ON m.month_date = me.month
  ORDER BY m.month_date;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_daily_email_counter()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_providers
  SET emails_sent_today = 0,
      last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_template_usage(p_template_type character varying)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_templates
  SET usage_count = usage_count + 1
  WHERE template_type = p_template_type;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_send_whatsapp_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.reset_email_provider_daily_counters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_providers
  SET emails_sent_today = 0,
      last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_email_provider_monthly_counters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_providers
  SET emails_sent_month = 0,
      last_month_reset = date_trunc('month', CURRENT_DATE)
  WHERE last_month_reset < date_trunc('month', CURRENT_DATE);
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_provider_usage(p_provider_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_providers
  SET emails_sent_today = emails_sent_today + 1,
      emails_sent_month = emails_sent_month + 1,
      last_success_at = now(),
      health_status = 'healthy',
      last_error = NULL
  WHERE id = p_provider_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_provider_error(p_provider_id uuid, p_error_message text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_providers
  SET last_error = p_error_message,
      health_status = 'degraded'
  WHERE id = p_provider_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_whatsapp_notification_queue()
RETURNS TABLE(processed_count integer, error_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.update_savings_plan_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.transaction_type = 'deposit' THEN
      UPDATE savings_plans 
      SET current_amount = current_amount + NEW.amount
      WHERE id = NEW.savings_plan_id;
    ELSIF NEW.transaction_type = 'withdrawal' THEN
      UPDATE savings_plans 
      SET current_amount = current_amount - NEW.amount
      WHERE id = NEW.savings_plan_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.transaction_type = 'deposit' THEN
      UPDATE savings_plans 
      SET current_amount = current_amount - OLD.amount
      WHERE id = OLD.savings_plan_id;
    ELSIF OLD.transaction_type = 'withdrawal' THEN
      UPDATE savings_plans 
      SET current_amount = current_amount + OLD.amount
      WHERE id = OLD.savings_plan_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;