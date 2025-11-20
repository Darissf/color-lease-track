-- Create database_backups table for tracking backup history
CREATE TABLE IF NOT EXISTS public.database_backups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'in_progress')),
  file_path TEXT,
  commit_url TEXT,
  error_message TEXT,
  backup_size_kb INTEGER,
  tables_backed_up TEXT[]
);

-- Enable RLS
ALTER TABLE public.database_backups ENABLE ROW LEVEL SECURITY;

-- Only admins can view backup history
CREATE POLICY "Admins can view backup history"
ON public.database_backups
FOR SELECT
USING (is_admin(auth.uid()));

-- Only admins can insert backup records
CREATE POLICY "Admins can create backup records"
ON public.database_backups
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_database_backups_created_at ON public.database_backups(created_at DESC);
CREATE INDEX idx_database_backups_user_id ON public.database_backups(user_id);
CREATE INDEX idx_database_backups_status ON public.database_backups(status);