-- ============================================
-- PHASE 1: Portfolio Management System Tables
-- ============================================

-- Create portfolio_projects table
CREATE TABLE IF NOT EXISTS public.portfolio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('villa', 'hotel', 'komersial')),
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  description TEXT,
  project_date DATE,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_portfolio_category ON public.portfolio_projects(category);
CREATE INDEX IF NOT EXISTS idx_portfolio_featured ON public.portfolio_projects(is_featured);
CREATE INDEX IF NOT EXISTS idx_portfolio_display_order ON public.portfolio_projects(display_order);

-- Enable RLS
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portfolio_projects
CREATE POLICY "Anyone can view portfolio projects"
ON public.portfolio_projects FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage portfolio projects"
ON public.portfolio_projects FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_portfolio_projects_updated_at
BEFORE UPDATE ON public.portfolio_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- PHASE 2: Meta Ads Settings Table
-- ============================================

-- Create meta_ads_settings table
CREATE TABLE IF NOT EXISTS public.meta_ads_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pixel_id TEXT,
  access_token TEXT, -- Encrypted in practice
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.meta_ads_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Super admins can manage meta ads settings"
ON public.meta_ads_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_meta_ads_settings_updated_at
BEFORE UPDATE ON public.meta_ads_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- PHASE 3: Meta Events Tracking Table
-- ============================================

-- Create meta_events table for tracking
CREATE TABLE IF NOT EXISTS public.meta_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  event_data JSONB,
  user_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for analytics
CREATE INDEX IF NOT EXISTS idx_meta_events_name ON public.meta_events(event_name);
CREATE INDEX IF NOT EXISTS idx_meta_events_created_at ON public.meta_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.meta_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Super admins can view meta events"
ON public.meta_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  )
);

CREATE POLICY "Anyone can insert meta events"
ON public.meta_events FOR INSERT
WITH CHECK (true);

-- ============================================
-- PHASE 4: Storage Buckets
-- ============================================

-- Create portfolio-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio-images',
  'portfolio-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for portfolio-images bucket
CREATE POLICY "Anyone can view portfolio images"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolio-images');

CREATE POLICY "Super admins can upload portfolio images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'portfolio-images'
  AND auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'super_admin'
  )
);

CREATE POLICY "Super admins can update portfolio images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'portfolio-images'
  AND auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'super_admin'
  )
);

CREATE POLICY "Super admins can delete portfolio images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'portfolio-images'
  AND auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'super_admin'
  )
);