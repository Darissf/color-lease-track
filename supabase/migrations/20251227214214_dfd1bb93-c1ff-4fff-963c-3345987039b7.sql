-- Perbesar kolom verification_code dari varchar(10) ke varchar(50)
ALTER TABLE invoice_receipts 
ALTER COLUMN verification_code TYPE character varying(50);