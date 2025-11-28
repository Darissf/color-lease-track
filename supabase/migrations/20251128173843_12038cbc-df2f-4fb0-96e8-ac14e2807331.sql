-- Create inventory_items table
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  minimum_stock INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  unit_type TEXT NOT NULL DEFAULT 'unit',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_item_code_per_user UNIQUE (user_id, item_code)
);

-- Create inventory_movements table
CREATE TABLE public.inventory_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.rental_contracts(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL, -- 'in' (masuk), 'out' (keluar), 'adjustment' (penyesuaian), 'rental' (sewa), 'return' (kembali)
  quantity INTEGER NOT NULL,
  notes TEXT,
  movement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_items
CREATE POLICY "Users can manage their own inventory items"
  ON public.inventory_items
  FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for inventory_movements
CREATE POLICY "Users can manage their own inventory movements"
  ON public.inventory_movements
  FOR ALL
  USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_inventory_items_user_id ON public.inventory_items(user_id);
CREATE INDEX idx_inventory_items_category ON public.inventory_items(category);
CREATE INDEX idx_inventory_movements_user_id ON public.inventory_movements(user_id);
CREATE INDEX idx_inventory_movements_item_id ON public.inventory_movements(inventory_item_id);
CREATE INDEX idx_inventory_movements_contract_id ON public.inventory_movements(contract_id);

-- Trigger to update updated_at
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();