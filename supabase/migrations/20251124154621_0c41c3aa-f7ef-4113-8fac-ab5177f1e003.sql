-- =====================================================
-- SMTP Email System with Unified Notifications
-- =====================================================

-- 1. SMTP Settings (Resend Configuration)
CREATE TABLE smtp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider VARCHAR(50) DEFAULT 'resend',
  api_key_encrypted TEXT,
  sender_email VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255) DEFAULT 'Sewa Scaffolding Bali',
  reply_to_email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  daily_limit INTEGER DEFAULT 3000,
  emails_sent_today INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Email Templates (with variable support)
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_type VARCHAR(50) NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, template_type)
);

-- 3. Email Logs (tracking & analytics)
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  subject TEXT,
  template_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  resend_email_id VARCHAR(255),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  scheduled_for TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Email Signatures
CREATE TABLE email_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  signature_name VARCHAR(255) NOT NULL,
  signature_html TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Unified Notification Preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  whatsapp_enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 5,
  preferred_time_start TIME DEFAULT '09:00:00',
  preferred_time_end TIME DEFAULT '17:00:00',
  timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notification_type)
);

-- 6. Unified Notification Queue (combines email + whatsapp)
CREATE TABLE unified_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  recipient_identifier VARCHAR(255) NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'whatsapp', 'both')),
  subject TEXT,
  message_content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'pending',
  scheduled_for TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE smtp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_notification_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Super Admin Only for management, users can view their own)
CREATE POLICY "Super admins can manage SMTP settings"
  ON smtp_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can manage email templates"
  ON email_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can view email logs"
  ON email_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can manage email signatures"
  ON email_signatures FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
  );

CREATE POLICY "Users can manage their notification preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view notification queue"
  ON unified_notification_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_smtp_settings_updated_at
  BEFORE UPDATE ON smtp_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_signatures_updated_at
  BEFORE UPDATE ON email_signatures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to reset daily email counter
CREATE OR REPLACE FUNCTION reset_daily_email_counter()
RETURNS void AS $$
BEGIN
  UPDATE smtp_settings
  SET emails_sent_today = 0,
      last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment template usage
CREATE OR REPLACE FUNCTION increment_template_usage(p_template_type VARCHAR)
RETURNS void AS $$
BEGIN
  UPDATE email_templates
  SET usage_count = usage_count + 1
  WHERE template_type = p_template_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default email templates
INSERT INTO email_templates (user_id, template_type, template_name, subject_template, body_template, variables)
SELECT 
  u.user_id,
  'reset_password',
  'Reset Password Email',
  'Reset Your Password - {{app_name}}',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h1 style="color: #333;">Reset Your Password</h1>\n  <p>Hi {{name}},</p>\n  <p>We received a request to reset your password. Click the button below to create a new password:</p>\n  <div style="text-align: center; margin: 30px 0;">\n    <a href="{{reset_link}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>\n  </div>\n  <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>\n  <p style="color: #666; font-size: 14px;">If you didn\'\'t request this, please ignore this email.</p>\n</div>',
  '["name", "reset_link", "app_name"]'::jsonb
FROM (SELECT user_id FROM user_roles WHERE role = 'super_admin' LIMIT 1) u
ON CONFLICT (user_id, template_type) DO NOTHING;

INSERT INTO email_templates (user_id, template_type, template_name, subject_template, body_template, variables)
SELECT 
  u.user_id,
  'welcome',
  'Welcome Email',
  'Welcome to {{app_name}}!',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h1 style="color: #333;">Welcome to Sewa Scaffolding Bali!</h1>\n  <p>Hi {{name}},</p>\n  <p>Thank you for registering with us. Your account is now ready!</p>\n  <p>We\'\'re excited to have you on board.</p>\n  <div style="margin: 30px 0;">\n    <a href="{{dashboard_link}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Dashboard</a>\n  </div>\n  <p>If you have any questions, feel free to reach out to our support team.</p>\n</div>',
  '["name", "app_name", "dashboard_link"]'::jsonb
FROM (SELECT user_id FROM user_roles WHERE role = 'super_admin' LIMIT 1) u
ON CONFLICT (user_id, template_type) DO NOTHING;

INSERT INTO email_templates (user_id, template_type, template_name, subject_template, body_template, variables)
SELECT 
  u.user_id,
  'invoice',
  'Invoice Email',
  'Invoice #{{invoice_number}} - {{company_name}}',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h1 style="color: #333;">Invoice #{{invoice_number}}</h1>\n  <p>Dear {{customer_name}},</p>\n  <p>Thank you for your business. Please find your invoice details below:</p>\n  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">\n    <tr style="background-color: #f8f9fa;">\n      <td style="padding: 10px; border: 1px solid #ddd;"><strong>Invoice Number:</strong></td>\n      <td style="padding: 10px; border: 1px solid #ddd;">{{invoice_number}}</td>\n    </tr>\n    <tr>\n      <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount:</strong></td>\n      <td style="padding: 10px; border: 1px solid #ddd;">Rp {{amount}}</td>\n    </tr>\n    <tr style="background-color: #f8f9fa;">\n      <td style="padding: 10px; border: 1px solid #ddd;"><strong>Due Date:</strong></td>\n      <td style="padding: 10px; border: 1px solid #ddd;">{{due_date}}</td>\n    </tr>\n  </table>\n  <p>Please make payment by the due date to avoid late fees.</p>\n</div>',
  '["customer_name", "invoice_number", "amount", "due_date", "company_name"]'::jsonb
FROM (SELECT user_id FROM user_roles WHERE role = 'super_admin' LIMIT 1) u
ON CONFLICT (user_id, template_type) DO NOTHING;

-- Insert default email signature
INSERT INTO email_signatures (user_id, signature_name, signature_html, is_default)
SELECT 
  u.user_id,
  'Default Company Signature',
  E'<div style="font-family: Arial, sans-serif; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">\n  <p style="margin: 0;"><strong>Sewa Scaffolding Bali</strong></p>\n  <p style="margin: 5px 0; color: #666;">Professional Scaffolding Rental Services</p>\n  <p style="margin: 5px 0; color: #666;">📞 [NOMOR_TELEPON]</p>\n  <p style="margin: 5px 0; color: #666;">📧 info@sewascaffoldingbali.com</p>\n  <p style="margin: 5px 0; color: #666;">🌐 www.sewascaffoldingbali.com</p>\n</div>',
  true
FROM (SELECT user_id FROM user_roles WHERE role = 'super_admin' LIMIT 1) u;

-- Insert default notification preferences for common types
INSERT INTO notification_preferences (user_id, notification_type, email_enabled, whatsapp_enabled, priority)
SELECT 
  u.user_id,
  notification_type,
  CASE 
    WHEN notification_type IN ('reset_password', 'welcome') THEN true
    ELSE true
  END,
  CASE 
    WHEN notification_type IN ('delivery', 'pickup', 'payment') THEN true
    ELSE false
  END,
  CASE 
    WHEN notification_type = 'reset_password' THEN 10
    WHEN notification_type = 'payment' THEN 9
    WHEN notification_type = 'delivery' THEN 8
    WHEN notification_type = 'pickup' THEN 7
    ELSE 5
  END
FROM (SELECT user_id FROM user_roles WHERE role = 'super_admin' LIMIT 1) u
CROSS JOIN (
  VALUES 
    ('reset_password'),
    ('welcome'),
    ('invoice'),
    ('payment'),
    ('delivery'),
    ('pickup'),
    ('reminder')
) AS types(notification_type)
ON CONFLICT (user_id, notification_type) DO NOTHING;