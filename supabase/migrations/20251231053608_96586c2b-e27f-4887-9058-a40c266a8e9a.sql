-- Set default value for invoice_full_rincian to true
ALTER TABLE rental_contracts 
ALTER COLUMN invoice_full_rincian SET DEFAULT true;

-- Update all existing contracts to have invoice_full_rincian = true
UPDATE rental_contracts 
SET invoice_full_rincian = true 
WHERE invoice_full_rincian IS NULL OR invoice_full_rincian = false;