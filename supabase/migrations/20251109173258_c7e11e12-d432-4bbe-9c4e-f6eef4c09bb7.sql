-- Create content management table for live editable content
CREATE TABLE IF NOT EXISTS public.editable_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key text NOT NULL UNIQUE,
  content_value text NOT NULL,
  page text NOT NULL,
  category text DEFAULT 'general',
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.editable_content ENABLE ROW LEVEL SECURITY;

-- Anyone can view content
CREATE POLICY "Anyone can view content"
  ON public.editable_content
  FOR SELECT
  USING (true);

-- Only super admins can insert content
CREATE POLICY "Super admins can insert content"
  ON public.editable_content
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Only super admins can update content
CREATE POLICY "Super admins can update content"
  ON public.editable_content
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Only super admins can delete content
CREATE POLICY "Super admins can delete content"
  ON public.editable_content
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_editable_content_updated_at
  BEFORE UPDATE ON public.editable_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_editable_content_key ON public.editable_content(content_key);
CREATE INDEX idx_editable_content_page ON public.editable_content(page);