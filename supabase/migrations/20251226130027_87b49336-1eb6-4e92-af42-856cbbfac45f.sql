-- Create table for public contract links with expiration
CREATE TABLE public.contract_public_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contract_id UUID NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
  access_code VARCHAR(20) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  view_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Create indexes for fast lookup
CREATE INDEX idx_contract_public_links_access_code ON contract_public_links(access_code);
CREATE INDEX idx_contract_public_links_contract_id ON contract_public_links(contract_id);
CREATE INDEX idx_contract_public_links_expires_at ON contract_public_links(expires_at);

-- Enable RLS
ALTER TABLE contract_public_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins and super admins can manage public links
CREATE POLICY "Admins can view all public links"
ON contract_public_links FOR SELECT
USING (is_admin(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Admins can create public links"
ON contract_public_links FOR INSERT
WITH CHECK (is_admin(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Admins can update public links"
ON contract_public_links FOR UPDATE
USING (is_admin(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Admins can delete public links"
ON contract_public_links FOR DELETE
USING (is_admin(auth.uid()) OR is_super_admin(auth.uid()));

-- Function to generate unique access code
CREATE OR REPLACE FUNCTION public.generate_contract_access_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := 'CTR-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM contract_public_links WHERE access_code = v_code) INTO v_exists;
    IF NOT v_exists THEN
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$;

-- Function to increment view count (called from edge function)
CREATE OR REPLACE FUNCTION public.increment_contract_link_views(p_access_code VARCHAR)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE contract_public_links
  SET view_count = view_count + 1
  WHERE access_code = p_access_code AND is_active = true AND expires_at > NOW();
END;
$$;