-- Add display mode and image settings to vip_design_settings
ALTER TABLE vip_design_settings
ADD COLUMN IF NOT EXISTS display_mode text DEFAULT 'text' CHECK (display_mode IN ('text', 'image')),
ADD COLUMN IF NOT EXISTS brand_image_url text,
ADD COLUMN IF NOT EXISTS image_height integer DEFAULT 40,
ADD COLUMN IF NOT EXISTS image_max_width integer DEFAULT 200;

-- Create storage bucket for brand images
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-images', 'brand-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for brand-images bucket
CREATE POLICY "Super admins can upload brand images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-images' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Super admins can update brand images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'brand-images' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Super admins can delete brand images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'brand-images' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Anyone can view brand images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'brand-images');