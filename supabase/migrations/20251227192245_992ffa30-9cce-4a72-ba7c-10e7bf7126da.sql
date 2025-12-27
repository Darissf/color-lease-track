-- Add discount column to rental_contracts
ALTER TABLE rental_contracts ADD COLUMN IF NOT EXISTS discount DECIMAL(15,2) DEFAULT 0;