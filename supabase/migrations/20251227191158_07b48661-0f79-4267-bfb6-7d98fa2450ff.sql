-- Create table for tracking physical stock items assigned to contracts
CREATE TABLE public.contract_stock_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contract_id UUID NOT NULL REFERENCES public.rental_contracts(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  added_at TIMESTAMPTZ DEFAULT now(),
  returned_at TIMESTAMPTZ, -- null = belum dikembalikan
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_stock_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users and Admins can view contract stock items"
ON public.contract_stock_items
FOR SELECT
USING (auth.uid() = user_id OR is_admin(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Users and Admins can insert contract stock items"
ON public.contract_stock_items
FOR INSERT
WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Users and Admins can update contract stock items"
ON public.contract_stock_items
FOR UPDATE
USING (auth.uid() = user_id OR is_admin(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Users and Admins can delete contract stock items"
ON public.contract_stock_items
FOR DELETE
USING (auth.uid() = user_id OR is_admin(auth.uid()) OR is_super_admin(auth.uid()));

-- Create function to auto-return stock when contract status changes to "Selesai"
CREATE OR REPLACE FUNCTION public.auto_return_stock_on_contract_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger when status changes to 'Selesai'
  IF NEW.status = 'Selesai' AND (OLD.status IS NULL OR OLD.status != 'Selesai') THEN
    -- Insert return movements for all unreturned stock items
    INSERT INTO inventory_movements (user_id, inventory_item_id, contract_id, movement_type, quantity, notes)
    SELECT 
      csi.user_id,
      csi.inventory_item_id,
      csi.contract_id,
      'return',
      csi.quantity,
      'Auto return - Kontrak selesai'
    FROM contract_stock_items csi
    WHERE csi.contract_id = NEW.id
      AND csi.returned_at IS NULL;
    
    -- Mark all items as returned
    UPDATE contract_stock_items
    SET returned_at = now()
    WHERE contract_id = NEW.id
      AND returned_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_auto_return_stock
AFTER UPDATE ON public.rental_contracts
FOR EACH ROW
EXECUTE FUNCTION public.auto_return_stock_on_contract_complete();

-- Create index for better performance
CREATE INDEX idx_contract_stock_items_contract_id ON public.contract_stock_items(contract_id);
CREATE INDEX idx_contract_stock_items_inventory_item_id ON public.contract_stock_items(inventory_item_id);