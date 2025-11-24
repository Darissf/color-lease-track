-- Update RLS policies untuk whatsapp_message_templates
-- Membuat super admin bisa melihat dan mengelola semua templates (tidak hanya milik user sendiri)

DROP POLICY IF EXISTS "Super admins can manage message templates" ON whatsapp_message_templates;

CREATE POLICY "Super admins can manage all message templates"
  ON whatsapp_message_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
  );

-- Create function to initialize default templates for first-time users
CREATE OR REPLACE FUNCTION initialize_whatsapp_templates(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user already has templates
  IF EXISTS (SELECT 1 FROM whatsapp_message_templates WHERE user_id = p_user_id) THEN
    RETURN;
  END IF;

  -- Insert default templates
  INSERT INTO whatsapp_message_templates (user_id, template_type, template_name, template_content, variables, is_active)
  VALUES 
    (
      p_user_id,
      'delivery',
      'Notifikasi Pengiriman Scaffolding',
      E'🚚 *NOTIFIKASI PENGIRIMAN SCAFFOLDING* 🚚\n\nHalo *{{nama}}*,\n\nScaffolding Anda sudah dalam proses pengiriman! 📦\n\n📋 *Detail Pengiriman:*\n• Invoice: {{invoice}}\n• Lokasi: {{lokasi}}\n• Tanggal Kirim: {{tanggal_kirim}}\n• Jumlah Unit: {{jumlah_unit}} unit\n• PIC: {{penanggung_jawab}}\n\n✅ Tim kami akan segera tiba di lokasi.\n\n📞 Hubungi kami jika ada pertanyaan.\n\nTerima kasih! 🙏',
      ARRAY['nama', 'invoice', 'lokasi', 'tanggal_kirim', 'jumlah_unit', 'penanggung_jawab'],
      true
    ),
    (
      p_user_id,
      'pickup',
      'Notifikasi Pengambilan Scaffolding',
      E'📦 *NOTIFIKASI PENGAMBILAN SCAFFOLDING* 📦\n\nHalo *{{nama}}*,\n\nScaffolding sudah diambil dari lokasi! ✅\n\n📋 *Detail:*\n• Invoice: {{invoice}}\n• Lokasi: {{lokasi}}\n• Tanggal Ambil: {{tanggal_ambil}}\n• Jumlah Unit: {{jumlah_unit}} unit\n\nTerima kasih atas kepercayaan Anda! 🙏',
      ARRAY['nama', 'invoice', 'lokasi', 'tanggal_ambil', 'jumlah_unit'],
      true
    ),
    (
      p_user_id,
      'invoice',
      'Invoice Sewa Scaffolding',
      E'🧾 *INVOICE SEWA SCAFFOLDING* 🧾\n\nHalo *{{nama}}*,\n\nBerikut detail invoice Anda:\n\n📋 *Detail:*\n• Invoice: {{invoice}}\n• Jumlah Tagihan: Rp {{jumlah_tagihan}}\n• Tanggal: {{tanggal}}\n\n💳 Transfer ke:\n*{{bank_name}}*\n\nKonfirmasi pembayaran dengan kirim bukti transfer.\n\nTerima kasih! 🙏',
      ARRAY['nama', 'invoice', 'jumlah_tagihan', 'tanggal', 'bank_name'],
      true
    ),
    (
      p_user_id,
      'payment',
      'Konfirmasi Pembayaran',
      E'✅ *PEMBAYARAN DITERIMA* ✅\n\nHalo *{{nama}}*,\n\nPembayaran Anda telah kami terima! 🎉\n\n📋 *Detail:*\n• Invoice: {{invoice}}\n• Jumlah: Rp {{jumlah_lunas}}\n• Tanggal Lunas: {{tanggal_lunas}}\n\nTerima kasih atas pembayarannya! 🙏',
      ARRAY['nama', 'invoice', 'jumlah_lunas', 'tanggal_lunas'],
      true
    ),
    (
      p_user_id,
      'reminder',
      'Reminder Pembayaran',
      E'🔔 *REMINDER PEMBAYARAN* 🔔\n\nHalo *{{nama}}*,\n\nIni pengingat untuk pembayaran:\n\n📋 *Detail:*\n• Invoice: {{invoice}}\n• Sisa Tagihan: Rp {{tagihan_belum_bayar}}\n\nMohon segera dilakukan pembayaran.\n\nTerima kasih! 🙏',
      ARRAY['nama', 'invoice', 'tagihan_belum_bayar'],
      true
    );
END;
$$;