-- Create public bucket for client icons
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-icons',
  'client-icons',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Create RLS policies for client-icons bucket
CREATE POLICY "Anyone can view client icons"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-icons');

CREATE POLICY "Authenticated users can upload client icons"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'client-icons' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own client icons"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'client-icons' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own client icons"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'client-icons' 
  AND auth.role() = 'authenticated'
);