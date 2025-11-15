-- Add constraint to ensure only valid roles
DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS valid_roles;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add new constraint with 3 roles
ALTER TABLE user_roles 
ADD CONSTRAINT valid_roles 
CHECK (role IN ('super_admin', 'admin', 'user'));

-- Update the check_user_role function to support all 3 roles
CREATE OR REPLACE FUNCTION public.check_user_role(user_id uuid, role_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = $1
      AND user_roles.role = $2
  )
$$;

-- Create helper functions for each role check
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT check_user_role(user_id, 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT check_user_role(user_id, 'admin') OR check_user_role(user_id, 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.is_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = $1
  )
$$;

-- Update RLS policies for user_roles table
DROP POLICY IF EXISTS "Anyone can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Super admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Super admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Super admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Super admins can delete roles" ON user_roles;

-- Users can view their own role
CREATE POLICY "Users can view their own role"
ON user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Super admins can view all roles
CREATE POLICY "Super admins can view all roles"
ON user_roles
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Super admins can insert roles
CREATE POLICY "Super admins can insert roles"
ON user_roles
FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

-- Super admins can update roles (but not their own super_admin role)
CREATE POLICY "Super admins can update roles"
ON user_roles
FOR UPDATE
USING (
  is_super_admin(auth.uid()) 
  AND NOT (user_id = auth.uid() AND role = 'super_admin')
);

-- Super admins can delete roles (but not their own)
CREATE POLICY "Super admins can delete roles"
ON user_roles
FOR DELETE
USING (
  is_super_admin(auth.uid()) 
  AND user_id != auth.uid()
);

-- Add comment explaining the role hierarchy
COMMENT ON TABLE user_roles IS 'User roles with hierarchy: super_admin > admin > user. Super admins have full access, admins have management access, users have basic access.';