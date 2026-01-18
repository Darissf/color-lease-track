ALTER TABLE contract_line_items 
  ADD COLUMN IF NOT EXISTS unit_mode text DEFAULT 'pcs',
  ADD COLUMN IF NOT EXISTS pcs_per_set integer DEFAULT 1;