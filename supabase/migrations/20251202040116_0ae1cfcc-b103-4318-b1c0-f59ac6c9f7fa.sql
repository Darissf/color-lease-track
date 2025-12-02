-- Add mail_type column to mail_inbox for tracking inbound/outbound emails
ALTER TABLE mail_inbox 
ADD COLUMN IF NOT EXISTS mail_type TEXT DEFAULT 'inbound' CHECK (mail_type IN ('inbound', 'outbound'));

-- Add reply_to_id for tracking email threads
ALTER TABLE mail_inbox 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES mail_inbox(id) ON DELETE SET NULL;

-- Add can_send_from to monitored_email_addresses
ALTER TABLE monitored_email_addresses 
ADD COLUMN IF NOT EXISTS can_send_from BOOLEAN DEFAULT true;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_mail_inbox_mail_type ON mail_inbox(mail_type);
CREATE INDEX IF NOT EXISTS idx_mail_inbox_reply_to_id ON mail_inbox(reply_to_id);

-- Update RLS policy to allow admins to insert outbound emails
DROP POLICY IF EXISTS "Admins can insert outbound emails" ON mail_inbox;
CREATE POLICY "Admins can insert outbound emails" ON mail_inbox
  FOR INSERT
  WITH CHECK (
    mail_type = 'outbound' AND
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );