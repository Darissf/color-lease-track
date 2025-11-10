-- Create content_history table to track all content changes
CREATE TABLE IF NOT EXISTS public.content_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_key TEXT NOT NULL,
  content_value TEXT NOT NULL,
  page TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  version_number INTEGER NOT NULL DEFAULT 1
);

-- Enable RLS
ALTER TABLE public.content_history ENABLE ROW LEVEL SECURITY;

-- Create policies for content_history
CREATE POLICY "Users can view their own content history"
ON public.content_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own content history"
ON public.content_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_content_history_key ON public.content_history(content_key);
CREATE INDEX idx_content_history_user ON public.content_history(user_id);
CREATE INDEX idx_content_history_created ON public.content_history(created_at DESC);