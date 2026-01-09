-- Create table for API docs public links
CREATE TABLE public.api_docs_public_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  access_code VARCHAR(20) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  view_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.api_docs_public_links ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their own links
CREATE POLICY "Users can manage own api docs links" 
  ON public.api_docs_public_links 
  FOR ALL 
  USING (user_id = auth.uid());

-- Function to generate unique access code
CREATE OR REPLACE FUNCTION public.generate_api_docs_access_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := 'API-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM api_docs_public_links WHERE access_code = v_code) INTO v_exists;
    IF NOT v_exists THEN
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$;

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_api_docs_link_views(p_access_code VARCHAR)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE api_docs_public_links
  SET view_count = view_count + 1
  WHERE access_code = p_access_code AND is_active = true AND expires_at > NOW();
END;
$$;