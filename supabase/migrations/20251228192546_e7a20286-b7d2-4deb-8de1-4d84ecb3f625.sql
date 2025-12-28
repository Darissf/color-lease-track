-- Create storage bucket for scraper files
INSERT INTO storage.buckets (id, name, public)
VALUES ('scraper-files', 'scraper-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to scraper files
CREATE POLICY "Public read access for scraper files"
ON storage.objects FOR SELECT
USING (bucket_id = 'scraper-files');

-- Allow authenticated admin users to upload/manage files
CREATE POLICY "Admin upload access for scraper files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'scraper-files' 
  AND auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admin update access for scraper files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'scraper-files' 
  AND auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admin delete access for scraper files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'scraper-files' 
  AND auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role IN ('admin', 'super_admin')
  )
);