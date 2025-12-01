-- Add inventory_item_id column to rental_contracts table
-- This creates a proper foreign key relation to inventory_items for accurate stock tracking

ALTER TABLE rental_contracts
ADD COLUMN inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL;

-- Create index for better query performance on inventory_item_id
CREATE INDEX idx_rental_contracts_inventory_item ON rental_contracts(inventory_item_id);

-- Add helpful comment
COMMENT ON COLUMN rental_contracts.inventory_item_id IS 'Foreign key reference to inventory_items for accurate stock calculation and contract-inventory relation';