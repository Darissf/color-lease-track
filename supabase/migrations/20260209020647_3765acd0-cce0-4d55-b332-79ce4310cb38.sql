-- Ubah billing_quantity dari INTEGER ke NUMERIC(10,2) untuk mendukung nilai desimal
ALTER TABLE contract_line_item_groups 
ALTER COLUMN billing_quantity TYPE NUMERIC(10,2);