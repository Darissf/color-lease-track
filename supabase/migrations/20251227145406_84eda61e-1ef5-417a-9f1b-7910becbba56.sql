-- Tabel untuk menyimpan rincian per-item kontrak
CREATE TABLE public.contract_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contract_id UUID NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_per_day NUMERIC NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 1,
  subtotal NUMERIC GENERATED ALWAYS AS (quantity * unit_price_per_day * duration_days) STORED,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tambah kolom transport dan template di rental_contracts
ALTER TABLE public.rental_contracts 
ADD COLUMN IF NOT EXISTS transport_cost_delivery NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS transport_cost_pickup NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS rincian_template TEXT;

-- Enable RLS
ALTER TABLE public.contract_line_items ENABLE ROW LEVEL SECURITY;

-- RLS policies untuk contract_line_items
CREATE POLICY "Users and Admins can view line items"
ON public.contract_line_items FOR SELECT
USING (
  auth.uid() = user_id 
  OR is_admin(auth.uid()) 
  OR is_super_admin(auth.uid())
  OR contract_id IN (
    SELECT rc.id FROM rental_contracts rc
    JOIN client_groups cg ON rc.client_group_id = cg.id
    WHERE cg.linked_user_id = auth.uid()
  )
);

CREATE POLICY "Users and Admins can insert line items"
ON public.contract_line_items FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  OR is_admin(auth.uid()) 
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Users and Admins can update line items"
ON public.contract_line_items FOR UPDATE
USING (
  auth.uid() = user_id 
  OR is_admin(auth.uid()) 
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Users and Admins can delete line items"
ON public.contract_line_items FOR DELETE
USING (
  auth.uid() = user_id 
  OR is_admin(auth.uid()) 
  OR is_super_admin(auth.uid())
);

-- Trigger untuk update updated_at
CREATE TRIGGER update_contract_line_items_updated_at
BEFORE UPDATE ON public.contract_line_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index untuk performa
CREATE INDEX idx_contract_line_items_contract_id ON public.contract_line_items(contract_id);
CREATE INDEX idx_contract_line_items_user_id ON public.contract_line_items(user_id);