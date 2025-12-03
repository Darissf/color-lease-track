-- Fix RLS policies for agent_commands table
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Service role can manage agent commands" ON public.agent_commands;
DROP POLICY IF EXISTS "Users can view their agent commands" ON public.agent_commands;
DROP POLICY IF EXISTS "Agents can view their commands" ON public.agent_commands;
DROP POLICY IF EXISTS "Agents can update their commands" ON public.agent_commands;

-- Create restrictive policies - only super_admin can access
CREATE POLICY "Super admin can manage agent commands"
ON public.agent_commands
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'super_admin'
  )
);

-- Fix RLS policies for agent_command_outputs table
DROP POLICY IF EXISTS "Service role can manage agent outputs" ON public.agent_command_outputs;
DROP POLICY IF EXISTS "Users can view their agent outputs" ON public.agent_command_outputs;
DROP POLICY IF EXISTS "Agents can insert their outputs" ON public.agent_command_outputs;

CREATE POLICY "Super admin can manage agent outputs"
ON public.agent_command_outputs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'super_admin'
  )
);

-- Add attempts_count column to two_factor_codes if not exists
ALTER TABLE public.two_factor_codes 
ADD COLUMN IF NOT EXISTS attempts_count INTEGER DEFAULT 0;

-- Add attempts tracking to temporary_access_codes if not exists
ALTER TABLE public.temporary_access_codes 
ADD COLUMN IF NOT EXISTS attempts_count INTEGER DEFAULT 0;

ALTER TABLE public.temporary_access_codes 
ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMP WITH TIME ZONE;

-- Update database functions with SET search_path = public to prevent SQL injection
CREATE OR REPLACE FUNCTION public.check_user_role(user_id uuid, role_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = $1
      AND user_roles.role = $2
  )
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT check_user_role(user_id, 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT check_user_role(user_id, 'admin') OR check_user_role(user_id, 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.is_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = $1
  )
$$;

-- Create index for faster rate limit queries
CREATE INDEX IF NOT EXISTS idx_two_factor_codes_user_created 
ON public.two_factor_codes(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_temp_access_codes_code_attempts 
ON public.temporary_access_codes(code, attempts_count);