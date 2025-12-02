-- Create monitored_email_addresses table
CREATE TABLE public.monitored_email_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_address TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  badge_color TEXT NOT NULL DEFAULT '#0ea5e9',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  display_order INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.monitored_email_addresses ENABLE ROW LEVEL SECURITY;

-- Super admins can manage monitored addresses
CREATE POLICY "Super admins can manage monitored addresses"
ON public.monitored_email_addresses
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Admins can view monitored addresses
CREATE POLICY "Admins can view monitored addresses"
ON public.monitored_email_addresses
FOR SELECT
USING (is_admin(auth.uid()));

-- Create index for performance
CREATE INDEX idx_monitored_email_addresses_active ON public.monitored_email_addresses(is_active, display_order);
CREATE INDEX idx_monitored_email_addresses_email ON public.monitored_email_addresses(email_address);