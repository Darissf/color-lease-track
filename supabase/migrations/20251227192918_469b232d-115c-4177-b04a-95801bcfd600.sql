-- Add whatsapp_template_mode column to rental_contracts
ALTER TABLE rental_contracts 
ADD COLUMN IF NOT EXISTS whatsapp_template_mode BOOLEAN DEFAULT false;