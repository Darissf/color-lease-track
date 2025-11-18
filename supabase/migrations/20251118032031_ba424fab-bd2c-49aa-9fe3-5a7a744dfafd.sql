-- Create content analysis table
CREATE TABLE IF NOT EXISTS public.content_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key TEXT NOT NULL,
  readability_score INTEGER,
  seo_score INTEGER,
  tone TEXT,
  duplicates JSONB DEFAULT '[]'::jsonb,
  suggestions JSONB DEFAULT '[]'::jsonb,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed_by UUID REFERENCES auth.users(id),
  CONSTRAINT fk_analyzed_by FOREIGN KEY (analyzed_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create AI suggestions table
CREATE TABLE IF NOT EXISTS public.ai_content_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key TEXT NOT NULL,
  original_content TEXT NOT NULL,
  suggested_content TEXT NOT NULL,
  suggestion_type TEXT NOT NULL,
  confidence_score DECIMAL(3,2),
  applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create collaboration comments table
CREATE TABLE IF NOT EXISTS public.content_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  comment TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create file location mapping table
CREATE TABLE IF NOT EXISTS public.content_file_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key TEXT UNIQUE NOT NULL,
  file_path TEXT NOT NULL,
  line_number INTEGER,
  component_name TEXT,
  last_scanned TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.content_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_content_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_file_mapping ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Super admin only
CREATE POLICY "Super admins can manage content analysis"
  ON public.content_analysis
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can manage AI suggestions"
  ON public.ai_content_suggestions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can manage comments"
  ON public.content_comments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can manage file mappings"
  ON public.content_file_mapping
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_analysis_content_key ON public.content_analysis(content_key);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_content_key ON public.ai_content_suggestions(content_key);
CREATE INDEX IF NOT EXISTS idx_comments_content_key ON public.content_comments(content_key);
CREATE INDEX IF NOT EXISTS idx_file_mapping_content_key ON public.content_file_mapping(content_key);