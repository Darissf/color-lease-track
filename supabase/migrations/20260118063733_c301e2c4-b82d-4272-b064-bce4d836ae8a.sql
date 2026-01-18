-- Create table for contract line item groups (for combining items)
CREATE TABLE public.contract_line_item_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  group_name TEXT,
  billing_quantity INTEGER NOT NULL DEFAULT 1,
  billing_unit_price_per_day DECIMAL(15,2) NOT NULL DEFAULT 0,
  billing_duration_days INTEGER NOT NULL DEFAULT 30,
  billing_unit_mode TEXT DEFAULT 'set',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add group_id column to contract_line_items
ALTER TABLE public.contract_line_items
ADD COLUMN group_id UUID REFERENCES contract_line_item_groups(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.contract_line_item_groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own line item groups"
ON public.contract_line_item_groups
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own line item groups"
ON public.contract_line_item_groups
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own line item groups"
ON public.contract_line_item_groups
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own line item groups"
ON public.contract_line_item_groups
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_contract_line_item_groups_contract_id ON public.contract_line_item_groups(contract_id);
CREATE INDEX idx_contract_line_items_group_id ON public.contract_line_items(group_id);