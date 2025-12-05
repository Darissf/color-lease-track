-- Add tagihan column to rental_contracts table
ALTER TABLE rental_contracts 
ADD COLUMN IF NOT EXISTS tagihan NUMERIC DEFAULT 0;