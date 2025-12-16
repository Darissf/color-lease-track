-- Add admin notes columns to rental_contracts
ALTER TABLE rental_contracts 
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS admin_notes_edited_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS admin_notes_edited_at TIMESTAMP WITH TIME ZONE;