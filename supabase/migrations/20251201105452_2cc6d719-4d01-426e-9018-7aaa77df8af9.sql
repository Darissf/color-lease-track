-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage their own inventory items" ON inventory_items;

-- Create SELECT policy (users view own, admins view all)
CREATE POLICY "Users can view own, admins view all inventory"
ON inventory_items FOR SELECT
USING (
  auth.uid() = user_id 
  OR is_admin(auth.uid())
);

-- Create INSERT policy (super admins only)
CREATE POLICY "Only super admins can insert inventory"
ON inventory_items FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

-- Create UPDATE policy (super admins only)
CREATE POLICY "Only super admins can update inventory"
ON inventory_items FOR UPDATE
USING (is_super_admin(auth.uid()));

-- Create DELETE policy (super admins only)
CREATE POLICY "Only super admins can delete inventory"
ON inventory_items FOR DELETE
USING (is_super_admin(auth.uid()));