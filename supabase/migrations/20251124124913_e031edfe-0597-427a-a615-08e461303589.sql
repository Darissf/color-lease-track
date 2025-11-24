-- WhatsApp Integration Tables and Auto-Notification System

-- 1. WhatsApp Settings Table
CREATE TABLE IF NOT EXISTS whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  waha_api_url TEXT NOT NULL,
  waha_api_key TEXT NOT NULL,
  waha_session_name TEXT NOT NULL DEFAULT 'default',
  is_active BOOLEAN DEFAULT false,
  last_connection_test TIMESTAMP WITH TIME ZONE,
  connection_status TEXT CHECK (connection_status IN ('connected', 'disconnected', 'error', 'unknown')) DEFAULT 'unknown',
  error_message TEXT,
  auto_retry_enabled BOOLEAN DEFAULT true,
  max_retry_attempts INTEGER DEFAULT 3,
  retry_delay_minutes INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage WhatsApp settings"
  ON whatsapp_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
  );

-- 2. Message Templates Table
CREATE TABLE IF NOT EXISTS whatsapp_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('delivery', 'pickup', 'invoice', 'payment', 'reminder', 'custom')),
  template_name TEXT NOT NULL,
  template_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, template_type)
);

ALTER TABLE whatsapp_message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage message templates"
  ON whatsapp_message_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
  );

-- 3. Notifications Log Table
CREATE TABLE IF NOT EXISTS whatsapp_notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contract_id UUID REFERENCES rental_contracts(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('delivery', 'pickup', 'invoice', 'payment', 'reminder', 'manual', 'test')),
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  message_content TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'queued', 'retrying')) DEFAULT 'pending',
  error_message TEXT,
  waha_response JSONB,
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_notifications_log_user_id ON whatsapp_notifications_log(user_id);
CREATE INDEX idx_notifications_log_contract_id ON whatsapp_notifications_log(contract_id);
CREATE INDEX idx_notifications_log_status ON whatsapp_notifications_log(status);
CREATE INDEX idx_notifications_log_created_at ON whatsapp_notifications_log(created_at DESC);
CREATE INDEX idx_notifications_log_next_retry ON whatsapp_notifications_log(next_retry_at) WHERE status = 'retrying';

ALTER TABLE whatsapp_notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all notification logs"
  ON whatsapp_notifications_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
  );

CREATE POLICY "System can insert notification logs"
  ON whatsapp_notifications_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update notification logs"
  ON whatsapp_notifications_log FOR UPDATE
  USING (true);

-- 4. Health Check Logs Table
CREATE TABLE IF NOT EXISTS whatsapp_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  check_type TEXT NOT NULL CHECK (check_type IN ('manual', 'scheduled', 'auto')),
  status TEXT NOT NULL CHECK (status IN ('healthy', 'unhealthy', 'error')),
  response_time_ms INTEGER,
  waha_version TEXT,
  session_status TEXT,
  error_message TEXT,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_health_checks_user_id ON whatsapp_health_checks(user_id);
CREATE INDEX idx_health_checks_checked_at ON whatsapp_health_checks(checked_at DESC);

ALTER TABLE whatsapp_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view health checks"
  ON whatsapp_health_checks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
  );

CREATE POLICY "System can insert health checks"
  ON whatsapp_health_checks FOR INSERT
  WITH CHECK (true);

-- 5. Notification Queue Table (for background processing)
CREATE TABLE IF NOT EXISTS whatsapp_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contract_id UUID REFERENCES rental_contracts(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  priority INTEGER DEFAULT 5,
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processing_started_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_queue_status_scheduled ON whatsapp_notification_queue(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_queue_priority ON whatsapp_notification_queue(priority DESC);

ALTER TABLE whatsapp_notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage queue"
  ON whatsapp_notification_queue FOR ALL
  USING (true);

-- Insert Default Templates
INSERT INTO whatsapp_message_templates (user_id, template_type, template_name, template_content, variables)
SELECT 
  ur.user_id,
  'delivery',
  'Notifikasi Pengiriman Scaffolding',
  E'🚚 *Notifikasi Pengiriman Scaffolding*\n\nHalo {{nama}},\n\nScaffolding Anda sedang dalam perjalanan!\n\n📋 Invoice: {{invoice}}\n📍 Lokasi: {{lokasi}}\n📅 Tanggal Kirim: {{tanggal_kirim}}\n📦 Jumlah: {{jumlah_unit}} unit\n👤 PIC: {{penanggung_jawab}}\n\nTerima kasih telah menggunakan layanan kami!\n\n- *Sewa Scaffolding Bali*',
  '["nama", "invoice", "lokasi", "tanggal_kirim", "jumlah_unit", "penanggung_jawab"]'::jsonb
FROM user_roles ur
WHERE ur.role = 'super_admin'
ON CONFLICT (user_id, template_type) DO NOTHING;

INSERT INTO whatsapp_message_templates (user_id, template_type, template_name, template_content, variables)
SELECT 
  ur.user_id,
  'pickup',
  'Notifikasi Pengambilan Scaffolding',
  E'📦 *Notifikasi Pengambilan Scaffolding*\n\nHalo {{nama}},\n\nScaffolding Anda telah dijadwalkan untuk diambil.\n\n📋 Invoice: {{invoice}}\n📍 Lokasi: {{lokasi}}\n📅 Tanggal Ambil: {{tanggal_ambil}}\n\nTeam kami akan segera menuju lokasi.\n\n- *Sewa Scaffolding Bali*',
  '["nama", "invoice", "lokasi", "tanggal_ambil"]'::jsonb
FROM user_roles ur
WHERE ur.role = 'super_admin'
ON CONFLICT (user_id, template_type) DO NOTHING;

INSERT INTO whatsapp_message_templates (user_id, template_type, template_name, template_content, variables)
SELECT 
  ur.user_id,
  'invoice',
  'Invoice Sewa Scaffolding',
  E'🧾 *Invoice Sewa Scaffolding*\n\nHalo {{nama}},\n\nBerikut detail invoice sewa scaffolding Anda:\n\n📋 No. Invoice: {{invoice}}\n💰 Total Tagihan: Rp {{jumlah_tagihan}}\n📅 Periode: {{tanggal_mulai}} - {{tanggal_selesai}}\n📍 Lokasi: {{lokasi}}\n📦 Jumlah: {{jumlah_unit}} unit\n\nMohon lakukan pembayaran sesuai invoice.\n\nTerima kasih!\n- *Sewa Scaffolding Bali*',
  '["nama", "invoice", "jumlah_tagihan", "tanggal_mulai", "tanggal_selesai", "lokasi", "jumlah_unit"]'::jsonb
FROM user_roles ur
WHERE ur.role = 'super_admin'
ON CONFLICT (user_id, template_type) DO NOTHING;

INSERT INTO whatsapp_message_templates (user_id, template_type, template_name, template_content, variables)
SELECT 
  ur.user_id,
  'payment',
  'Konfirmasi Pembayaran',
  E'✅ *Konfirmasi Pembayaran*\n\nHalo {{nama}},\n\nPembayaran Anda telah kami terima!\n\n📋 Invoice: {{invoice}}\n💰 Jumlah: Rp {{jumlah_lunas}}\n📅 Tanggal Bayar: {{tanggal_lunas}}\n🏦 Bank: {{bank_name}}\n\nTerima kasih atas pembayarannya!\n\n- *Sewa Scaffolding Bali*',
  '["nama", "invoice", "jumlah_lunas", "tanggal_lunas", "bank_name"]'::jsonb
FROM user_roles ur
WHERE ur.role = 'super_admin'
ON CONFLICT (user_id, template_type) DO NOTHING;

INSERT INTO whatsapp_message_templates (user_id, template_type, template_name, template_content, variables)
SELECT 
  ur.user_id,
  'reminder',
  'Reminder Pembayaran',
  E'⏰ *Reminder Pembayaran*\n\nHalo {{nama}},\n\nIni adalah pengingat untuk pembayaran invoice:\n\n📋 Invoice: {{invoice}}\n💰 Sisa Tagihan: Rp {{sisa_tagihan}}\n📅 Jatuh Tempo: {{jatuh_tempo}}\n\nMohon segera lakukan pembayaran untuk menghindari denda.\n\nTerima kasih!\n- *Sewa Scaffolding Bali*',
  '["nama", "invoice", "sisa_tagihan", "jatuh_tempo"]'::jsonb
FROM user_roles ur
WHERE ur.role = 'super_admin'
ON CONFLICT (user_id, template_type) DO NOTHING;

-- Database Function: Auto-send notification on contract changes
CREATE OR REPLACE FUNCTION auto_send_whatsapp_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_notification_type TEXT;
  v_should_send BOOLEAN := false;
BEGIN
  -- Get user_id from contract
  v_user_id := NEW.user_id;
  
  -- Check if WhatsApp is active for this user
  IF NOT EXISTS (
    SELECT 1 FROM whatsapp_settings 
    WHERE user_id = v_user_id AND is_active = true
  ) THEN
    RETURN NEW;
  END IF;
  
  -- Determine notification type based on what changed
  IF TG_OP = 'INSERT' THEN
    -- New contract created - send invoice
    v_notification_type := 'invoice';
    v_should_send := true;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check for delivery status change
    IF NEW.status_pengiriman = 'sudah_kirim' AND 
       (OLD.status_pengiriman IS NULL OR OLD.status_pengiriman != 'sudah_kirim') THEN
      v_notification_type := 'delivery';
      v_should_send := true;
    END IF;
    
    -- Check for pickup status change
    IF NEW.status_pengambilan = 'sudah_diambil' AND 
       (OLD.status_pengambilan IS NULL OR OLD.status_pengambilan != 'sudah_diambil') THEN
      v_notification_type := 'pickup';
      v_should_send := true;
    END IF;
    
    -- Check for payment received
    IF NEW.tanggal_lunas IS NOT NULL AND OLD.tanggal_lunas IS NULL THEN
      v_notification_type := 'payment';
      v_should_send := true;
    END IF;
  END IF;
  
  -- Queue notification if conditions met
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on rental_contracts
DROP TRIGGER IF EXISTS trigger_auto_whatsapp_notification ON rental_contracts;
CREATE TRIGGER trigger_auto_whatsapp_notification
  AFTER INSERT OR UPDATE ON rental_contracts
  FOR EACH ROW
  EXECUTE FUNCTION auto_send_whatsapp_notification();

-- Function to process notification queue
CREATE OR REPLACE FUNCTION process_whatsapp_notification_queue()
RETURNS TABLE(processed_count INTEGER, error_count INTEGER) AS $$
DECLARE
  v_processed INTEGER := 0;
  v_errors INTEGER := 0;
  v_queue_item RECORD;
BEGIN
  -- Process pending queue items (limit 50 per run)
  FOR v_queue_item IN 
    SELECT * FROM whatsapp_notification_queue
    WHERE status = 'pending' 
      AND scheduled_at <= now()
    ORDER BY priority DESC, created_at ASC
    LIMIT 50
  LOOP
    BEGIN
      -- Mark as processing
      UPDATE whatsapp_notification_queue
      SET status = 'processing', processing_started_at = now()
      WHERE id = v_queue_item.id;
      
      -- Note: Actual sending will be done by edge function
      -- This function just marks items as ready to process
      
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_whatsapp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_settings_updated_at
  BEFORE UPDATE ON whatsapp_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_updated_at();

CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON whatsapp_message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_updated_at();