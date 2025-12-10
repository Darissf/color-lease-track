-- 1. Add linked_user_id column to client_groups
ALTER TABLE client_groups 
ADD COLUMN linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Create index for performance
CREATE INDEX idx_client_groups_linked_user_id ON client_groups(linked_user_id);

-- 3. RLS Policy for users to view their own client group
CREATE POLICY "Users can view their linked client group"
ON client_groups FOR SELECT TO authenticated
USING (
  linked_user_id = auth.uid() OR 
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR 
  is_super_admin(auth.uid())
);

-- 4. RLS Policy for users to view contracts linked to their client group
CREATE POLICY "Users can view contracts via linked client group"
ON rental_contracts FOR SELECT TO authenticated
USING (
  client_group_id IN (
    SELECT id FROM client_groups WHERE linked_user_id = auth.uid()
  ) OR
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR 
  is_super_admin(auth.uid())
);

-- 5. RLS Policy for users to view their payment history
CREATE POLICY "Users can view payments via linked client group"
ON contract_payments FOR SELECT TO authenticated
USING (
  contract_id IN (
    SELECT rc.id FROM rental_contracts rc
    JOIN client_groups cg ON rc.client_group_id = cg.id
    WHERE cg.linked_user_id = auth.uid()
  ) OR
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR 
  is_super_admin(auth.uid())
);