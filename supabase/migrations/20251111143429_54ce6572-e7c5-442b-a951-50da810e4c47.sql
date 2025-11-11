-- Change invoice column from numeric to text to preserve leading zeros
ALTER TABLE rental_contracts 
ALTER COLUMN invoice TYPE text USING invoice::text;

-- Update any existing null values to empty string if needed
UPDATE rental_contracts SET invoice = '' WHERE invoice IS NULL;