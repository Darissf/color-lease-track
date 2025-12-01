-- Create mail_inbox table for storing incoming emails
CREATE TABLE public.mail_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id TEXT NOT NULL UNIQUE,
  from_address TEXT NOT NULL,
  from_name TEXT,
  to_address TEXT NOT NULL,
  cc TEXT[] DEFAULT '{}',
  bcc TEXT[] DEFAULT '{}',
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  attachments JSONB DEFAULT '[]',
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  deleted_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mail_inbox ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Super Admin + Admin can view all emails
CREATE POLICY "Super admins and admins can view emails"
ON public.mail_inbox
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  )
);

-- RLS Policies: Super Admin + Admin can update read/starred status
CREATE POLICY "Super admins and admins can update read status"
ON public.mail_inbox
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  )
);

-- RLS Policies: Only Super Admin can soft delete
CREATE POLICY "Only super admins can delete emails"
ON public.mail_inbox
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  )
  AND (is_deleted IS NOT NULL OR deleted_by IS NOT NULL OR deleted_at IS NOT NULL)
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  )
);

-- Service role can insert emails (from webhook)
CREATE POLICY "Service role can insert emails"
ON public.mail_inbox
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_mail_inbox_received_at ON public.mail_inbox(received_at DESC);
CREATE INDEX idx_mail_inbox_is_read ON public.mail_inbox(is_read) WHERE is_deleted = false;
CREATE INDEX idx_mail_inbox_is_starred ON public.mail_inbox(is_starred) WHERE is_deleted = false;
CREATE INDEX idx_mail_inbox_is_deleted ON public.mail_inbox(is_deleted);
CREATE INDEX idx_mail_inbox_from_address ON public.mail_inbox(from_address);
CREATE INDEX idx_mail_inbox_subject ON public.mail_inbox USING gin(to_tsvector('english', subject));