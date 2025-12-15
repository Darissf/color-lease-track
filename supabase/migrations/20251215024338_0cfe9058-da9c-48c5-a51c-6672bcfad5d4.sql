-- Create short_links table for custom URL shortener
CREATE TABLE public.short_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  slug VARCHAR(100) NOT NULL,
  destination_url TEXT NOT NULL,
  title VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT short_links_slug_unique UNIQUE (slug)
);

-- Enable RLS
ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all short links
CREATE POLICY "Super admins can manage short links"
ON public.short_links
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Create index for fast slug lookup
CREATE INDEX idx_short_links_slug ON public.short_links(slug);
CREATE INDEX idx_short_links_is_active ON public.short_links(is_active);

-- Trigger to update updated_at
CREATE TRIGGER update_short_links_updated_at
BEFORE UPDATE ON public.short_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();