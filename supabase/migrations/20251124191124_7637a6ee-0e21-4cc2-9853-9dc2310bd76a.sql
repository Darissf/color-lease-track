-- Add email verification columns to profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS temp_email BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;

-- Create email verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create two factor codes table
CREATE TABLE IF NOT EXISTS two_factor_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create temporary access codes table
CREATE TABLE IF NOT EXISTS temporary_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code VARCHAR(32) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  force_password_change BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create login sessions table
CREATE TABLE IF NOT EXISTS login_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_info JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  last_active TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  logged_out_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporary_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_verification_tokens
CREATE POLICY "Users can manage their own verification tokens"
  ON email_verification_tokens
  FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for two_factor_codes
CREATE POLICY "Users can manage their own 2FA codes"
  ON two_factor_codes
  FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for temporary_access_codes
CREATE POLICY "Super admins can manage temp codes"
  ON temporary_access_codes
  FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own temp codes"
  ON temporary_access_codes
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for login_sessions
CREATE POLICY "Users can view their own sessions"
  ON login_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON login_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert sessions"
  ON login_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_nomor_telepon ON profiles(nomor_telepon);
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified ON profiles(email_verified);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires ON email_verification_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_codes_expires ON two_factor_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_2fa_codes_user ON two_factor_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_temp_codes_expires ON temporary_access_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_temp_codes_code ON temporary_access_codes(code);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON login_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON login_sessions(last_active) WHERE logged_out_at IS NULL;