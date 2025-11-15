-- Update RLS policies untuk client_groups
-- Admin dan Super Admin bisa lihat semua, User hanya bisa lihat milik mereka
DROP POLICY IF EXISTS "Users can view their own client groups" ON client_groups;
CREATE POLICY "Users and Admins can view client groups" 
ON client_groups FOR SELECT 
USING (
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR 
  is_super_admin(auth.uid())
);

-- Admin dan Super Admin bisa insert semua, User hanya bisa insert milik mereka
DROP POLICY IF EXISTS "Users can insert their own client groups" ON client_groups;
CREATE POLICY "Users and Admins can insert client groups" 
ON client_groups FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR 
  is_super_admin(auth.uid())
);

-- Admin dan Super Admin bisa update semua, User hanya bisa update milik mereka
DROP POLICY IF EXISTS "Users can update their own client groups" ON client_groups;
CREATE POLICY "Users and Admins can update client groups" 
ON client_groups FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR 
  is_super_admin(auth.uid())
);

-- Admin dan Super Admin bisa delete semua, User hanya bisa delete milik mereka
DROP POLICY IF EXISTS "Users can delete their own client groups" ON client_groups;
CREATE POLICY "Users and Admins can delete client groups" 
ON client_groups FOR DELETE 
USING (
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR 
  is_super_admin(auth.uid())
);

-- Update RLS policies untuk rental_contracts
DROP POLICY IF EXISTS "Users can view their own rental contracts" ON rental_contracts;
CREATE POLICY "Users and Admins can view rental contracts" 
ON rental_contracts FOR SELECT 
USING (
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR 
  is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can insert their own rental contracts" ON rental_contracts;
CREATE POLICY "Users and Admins can insert rental contracts" 
ON rental_contracts FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR 
  is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can update their own rental contracts" ON rental_contracts;
CREATE POLICY "Users and Admins can update rental contracts" 
ON rental_contracts FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR 
  is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can delete their own rental contracts" ON rental_contracts;
CREATE POLICY "Users and Admins can delete rental contracts" 
ON rental_contracts FOR DELETE 
USING (
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR 
  is_super_admin(auth.uid())
);

-- Update RLS policies untuk income_sources
DROP POLICY IF EXISTS "Users can view their own income" ON income_sources;
CREATE POLICY "Users and Admins can view income" 
ON income_sources FOR SELECT 
USING (
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR 
  is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can insert their own income" ON income_sources;
CREATE POLICY "Users and Admins can insert income" 
ON income_sources FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR 
  is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can update their own income" ON income_sources;
CREATE POLICY "Users and Admins can update income" 
ON income_sources FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR 
  is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can delete their own income" ON income_sources;
CREATE POLICY "Users and Admins can delete income" 
ON income_sources FOR DELETE 
USING (
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR 
  is_super_admin(auth.uid())
);

-- Update RLS policies untuk expenses
DROP POLICY IF EXISTS "Users can view their own expenses" ON expenses;
CREATE POLICY "Users and Admins can view expenses" 
ON expenses FOR SELECT 
USING (
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR 
  is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can insert their own expenses" ON expenses;
CREATE POLICY "Users and Admins can insert expenses" 
ON expenses FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR 
  is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can update their own expenses" ON expenses;
CREATE POLICY "Users and Admins can update expenses" 
ON expenses FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR 
  is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can delete their own expenses" ON expenses;
CREATE POLICY "Users and Admins can delete expenses" 
ON expenses FOR DELETE 
USING (
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR 
  is_super_admin(auth.uid())
);