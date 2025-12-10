-- Drop the old constraint that doesn't include 'user' role
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;