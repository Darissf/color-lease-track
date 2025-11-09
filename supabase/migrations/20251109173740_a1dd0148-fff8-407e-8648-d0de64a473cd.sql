-- Drop existing problematic policies
DROP POLICY IF EXISTS "Super admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Super admins can manage roles" ON user_roles;

-- Create security definer function to check if user has specific role
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

-- Recreate policies using the security definer function
CREATE POLICY "Super admins can view all roles"
  ON user_roles
  FOR SELECT
  USING (public.check_user_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert roles"
  ON user_roles
  FOR INSERT
  WITH CHECK (public.check_user_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update roles"
  ON user_roles
  FOR UPDATE
  USING (public.check_user_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete roles"
  ON user_roles
  FOR DELETE
  USING (public.check_user_role(auth.uid(), 'super_admin'));