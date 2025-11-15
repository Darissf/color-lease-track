-- Add icon column to client_groups table
ALTER TABLE public.client_groups 
ADD COLUMN icon TEXT DEFAULT '👤';

-- Update existing records to have default icon
UPDATE public.client_groups 
SET icon = '👤' 
WHERE icon IS NULL;