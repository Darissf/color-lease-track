-- Create table for storing scraper versions with history
CREATE TABLE public.scraper_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  version_number VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  changelog TEXT,
  is_current BOOLEAN DEFAULT false,
  line_count INTEGER,
  file_size_bytes INTEGER,
  deployed_to_vps BOOLEAN DEFAULT false,
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(100)
);

-- Create unique constraint for current version per user
CREATE UNIQUE INDEX idx_scraper_versions_current 
ON public.scraper_versions (user_id) 
WHERE is_current = true;

-- Create index for faster lookups
CREATE INDEX idx_scraper_versions_user_created 
ON public.scraper_versions (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.scraper_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies - only super admins can manage
CREATE POLICY "Super admins can manage scraper versions"
ON public.scraper_versions
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Function to set only one version as current
CREATE OR REPLACE FUNCTION public.set_current_scraper_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE public.scraper_versions 
    SET is_current = false 
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to ensure only one current version
CREATE TRIGGER ensure_single_current_version
BEFORE INSERT OR UPDATE ON public.scraper_versions
FOR EACH ROW
WHEN (NEW.is_current = true)
EXECUTE FUNCTION public.set_current_scraper_version();

-- Function to generate next version number
CREATE OR REPLACE FUNCTION public.get_next_scraper_version(p_user_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
  v_latest VARCHAR(20);
  v_major INT;
  v_minor INT;
  v_patch INT;
BEGIN
  SELECT version_number INTO v_latest
  FROM public.scraper_versions
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_latest IS NULL THEN
    RETURN '1.0.0';
  END IF;
  
  -- Parse version (e.g., "1.2.3" -> major=1, minor=2, patch=3)
  v_major := SPLIT_PART(v_latest, '.', 1)::INT;
  v_minor := SPLIT_PART(v_latest, '.', 2)::INT;
  v_patch := SPLIT_PART(v_latest, '.', 3)::INT;
  
  -- Increment patch version
  v_patch := v_patch + 1;
  
  -- Roll over if patch > 99
  IF v_patch > 99 THEN
    v_patch := 0;
    v_minor := v_minor + 1;
  END IF;
  
  IF v_minor > 99 THEN
    v_minor := 0;
    v_major := v_major + 1;
  END IF;
  
  RETURN v_major || '.' || v_minor || '.' || v_patch;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;