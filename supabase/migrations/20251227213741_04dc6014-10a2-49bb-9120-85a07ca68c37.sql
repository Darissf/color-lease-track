-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can insert documents" ON invoice_receipts;
DROP POLICY IF EXISTS "Admins can view and create documents" ON invoice_receipts;
DROP POLICY IF EXISTS "Super admins can manage all documents" ON invoice_receipts;

-- Super admins can manage all documents
CREATE POLICY "Super admins can manage all documents" 
ON invoice_receipts FOR ALL 
USING (is_super_admin(auth.uid())) 
WITH CHECK (is_super_admin(auth.uid()));

-- Admins can manage all documents
CREATE POLICY "Admins can manage all documents" 
ON invoice_receipts FOR ALL 
USING (is_admin(auth.uid())) 
WITH CHECK (is_admin(auth.uid()));

-- Users can insert documents for contracts they own
CREATE POLICY "Users can insert their documents" 
ON invoice_receipts FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND contract_id IN (
    SELECT id FROM rental_contracts WHERE user_id = auth.uid()
  )
);

-- Users can view their own documents
CREATE POLICY "Users can view their documents" 
ON invoice_receipts FOR SELECT 
USING (auth.uid() = user_id);

-- Anyone can view documents for verification (public verification via QR code)
CREATE POLICY "Anyone can verify documents" 
ON invoice_receipts FOR SELECT 
USING (true);