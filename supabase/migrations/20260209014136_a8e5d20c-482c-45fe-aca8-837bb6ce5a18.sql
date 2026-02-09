-- Add columns to contract_stock_items for stock transfer tracking
ALTER TABLE public.contract_stock_items 
ADD COLUMN IF NOT EXISTS extended_to_contract_id UUID REFERENCES public.rental_contracts(id),
ADD COLUMN IF NOT EXISTS source_stock_item_id UUID REFERENCES public.contract_stock_items(id);

-- Add columns to inventory_movements for period tracking
ALTER TABLE public.inventory_movements
ADD COLUMN IF NOT EXISTS period_start DATE,
ADD COLUMN IF NOT EXISTS period_end DATE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contract_stock_items_extended_to ON public.contract_stock_items(extended_to_contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_stock_items_source ON public.contract_stock_items(source_stock_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_period ON public.inventory_movements(period_start, period_end);

-- Add comment for documentation
COMMENT ON COLUMN public.contract_stock_items.extended_to_contract_id IS 'Reference to the contract this stock was transferred to during extension';
COMMENT ON COLUMN public.contract_stock_items.source_stock_item_id IS 'Reference to the original stock item from parent contract';
COMMENT ON COLUMN public.inventory_movements.period_start IS 'Start date of the rental period for this movement';
COMMENT ON COLUMN public.inventory_movements.period_end IS 'End date of the rental period for this movement';