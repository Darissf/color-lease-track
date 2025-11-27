-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access (for edge functions)
CREATE POLICY "Service role only" ON password_reset_tokens
  FOR ALL USING (false);

-- Insert default email templates (get first super admin user)
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get first super admin user
  SELECT ur.user_id INTO admin_user_id
  FROM user_roles ur
  WHERE ur.role = 'super_admin'
  LIMIT 1;

  -- If no super admin found, use first user
  IF admin_user_id IS NULL THEN
    SELECT id INTO admin_user_id FROM auth.users LIMIT 1;
  END IF;

  -- Insert templates
  INSERT INTO email_templates (user_id, template_type, template_name, subject_template, body_template, variables, is_active)
  VALUES 
  -- Password Reset OTP Template
  (
    admin_user_id,
    'password_reset_otp',
    'Reset Password - OTP',
    'Kode Reset Password - {{app_name}}',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Arial, sans-serif;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #4F46E5; margin: 0; font-size: 28px; font-weight: bold;">🔐 Reset Password</h1>
      </div>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">Halo <strong>{{name}}</strong>,</p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">Kami menerima permintaan untuk mereset password akun Anda. Gunakan kode OTP berikut untuk melanjutkan:</p>
      <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); border-radius: 12px; padding: 25px; text-align: center; margin: 30px 0;">
        <span style="font-size: 42px; font-weight: bold; color: white; letter-spacing: 10px; display: block;">{{otp}}</span>
      </div>
      <p style="color: #6B7280; font-size: 14px; text-align: center; margin: 20px 0;">⏱️ Kode ini berlaku selama <strong>{{valid_minutes}} menit</strong></p>
      <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; border-radius: 8px; margin: 25px 0;">
        <p style="color: #92400E; font-size: 14px; margin: 0; line-height: 1.5;">⚠️ <strong>Perhatian:</strong> Jangan bagikan kode ini kepada siapapun. Tim kami tidak akan pernah meminta kode OTP Anda.</p>
      </div>
      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
      <p style="color: #9CA3AF; font-size: 13px; text-align: center; margin: 0;">Jika Anda tidak meminta reset password, abaikan email ini.<br>Password Anda tetap aman dan tidak akan berubah.<br><br>© {{app_name}} - SewaScaffoldingBali.com</p>
    </div>
  </div>
</body>
</html>',
    '["name", "otp", "valid_minutes", "app_name"]'::jsonb,
    true
  ),
  -- Email Verification Template
  (
    admin_user_id,
    'email_verification',
    'Verifikasi Email',
    'Verifikasi Email Anda - {{app_name}}',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Arial, sans-serif;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #4F46E5; margin: 0; font-size: 28px; font-weight: bold;">✉️ Verifikasi Email</h1>
      </div>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">Halo <strong>{{name}}</strong>,</p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">Terima kasih telah mendaftar! Gunakan kode OTP berikut untuk memverifikasi email Anda:</p>
      <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); border-radius: 12px; padding: 25px; text-align: center; margin: 30px 0;">
        <span style="font-size: 42px; font-weight: bold; color: white; letter-spacing: 10px; display: block;">{{otp}}</span>
      </div>
      <p style="color: #6B7280; font-size: 14px; text-align: center; margin: 20px 0;">⏱️ Kode ini berlaku selama <strong>{{valid_minutes}} menit</strong></p>
      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
      <p style="color: #9CA3AF; font-size: 13px; text-align: center; margin: 0;">Jika Anda tidak mendaftar, abaikan email ini.<br><br>© {{app_name}} - SewaScaffoldingBali.com</p>
    </div>
  </div>
</body>
</html>',
    '["name", "otp", "valid_minutes", "app_name"]'::jsonb,
    true
  ),
  -- Email Change OTP Template
  (
    admin_user_id,
    'email_change_otp',
    'Ganti Email - OTP',
    'Konfirmasi Perubahan Email - {{app_name}}',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Arial, sans-serif;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #4F46E5; margin: 0; font-size: 28px; font-weight: bold;">📧 Konfirmasi Email Baru</h1>
      </div>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">Halo <strong>{{name}}</strong>,</p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">Kami menerima permintaan untuk mengubah email Anda ke: <strong>{{new_email}}</strong></p>
      <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); border-radius: 12px; padding: 25px; text-align: center; margin: 30px 0;">
        <span style="font-size: 42px; font-weight: bold; color: white; letter-spacing: 10px; display: block;">{{otp}}</span>
      </div>
      <p style="color: #6B7280; font-size: 14px; text-align: center; margin: 20px 0;">⏱️ Berlaku hingga: <strong>{{valid_until}}</strong></p>
      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
      <p style="color: #9CA3AF; font-size: 13px; text-align: center; margin: 0;">Jika Anda tidak meminta perubahan email, abaikan pesan ini.<br><br>© {{app_name}} - SewaScaffoldingBali.com</p>
    </div>
  </div>
</body>
</html>',
    '["name", "otp", "new_email", "valid_until", "app_name"]'::jsonb,
    true
  ),
  -- Admin Password Reset Template
  (
    admin_user_id,
    'admin_password_reset',
    'Password Reset oleh Admin',
    'Password Baru dari Admin - {{app_name}}',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Arial, sans-serif;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #4F46E5; margin: 0; font-size: 28px; font-weight: bold;">🔑 Password Baru</h1>
      </div>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">Halo <strong>{{name}}</strong>,</p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">Administrator telah mereset password akun Anda. Berikut adalah password baru Anda:</p>
      <div style="background: #F3F4F6; border: 2px dashed #4F46E5; border-radius: 12px; padding: 20px; text-align: center; margin: 30px 0;">
        <span style="font-size: 24px; font-weight: bold; color: #4F46E5; display: block; font-family: monospace;">{{new_password}}</span>
      </div>
      <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; border-radius: 8px; margin: 25px 0;">
        <p style="color: #92400E; font-size: 14px; margin: 0; line-height: 1.5;">⚠️ <strong>Penting:</strong> Segera ubah password Anda setelah login untuk keamanan akun.</p>
      </div>
      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
      <p style="color: #9CA3AF; font-size: 13px; text-align: center; margin: 0;">© {{app_name}} - SewaScaffoldingBali.com</p>
    </div>
  </div>
</body>
</html>',
    '["name", "new_password", "app_name"]'::jsonb,
    true
  ),
  -- Welcome Email Template
  (
    admin_user_id,
    'welcome',
    'Welcome Email',
    'Selamat Datang di {{app_name}}!',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Arial, sans-serif;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #4F46E5; margin: 0; font-size: 28px; font-weight: bold;">🎉 Selamat Datang!</h1>
      </div>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">Halo <strong>{{name}}</strong>,</p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">Terima kasih telah bergabung dengan <strong>{{app_name}}</strong>! Kami senang Anda menjadi bagian dari kami.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{dashboard_link}}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Mulai Sekarang</a>
      </div>
      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
      <p style="color: #9CA3AF; font-size: 13px; text-align: center; margin: 0;">© {{app_name}} - SewaScaffoldingBali.com</p>
    </div>
  </div>
</body>
</html>',
    '["name", "app_name", "dashboard_link"]'::jsonb,
    true
  )
  ON CONFLICT (user_id, template_type) DO NOTHING;
END $$;