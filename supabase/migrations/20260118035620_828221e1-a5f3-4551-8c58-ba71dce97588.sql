-- Add columns to persist Quick Settings (Pengaturan Cepat) values
ALTER TABLE rental_contracts 
  ADD COLUMN IF NOT EXISTS default_price_per_day NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS default_duration_days INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS default_price_mode TEXT DEFAULT 'set';