-- Add foreign key constraint from rental_contracts to inventory_items
ALTER TABLE public.rental_contracts
ADD CONSTRAINT fk_rental_contracts_inventory_item
FOREIGN KEY (inventory_item_id)
REFERENCES public.inventory_items(id)
ON DELETE SET NULL;