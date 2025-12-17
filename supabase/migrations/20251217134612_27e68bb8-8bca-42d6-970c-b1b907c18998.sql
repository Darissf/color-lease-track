-- Add new columns to fixed_monthly_income to match rental_contracts structure
ALTER TABLE public.fixed_monthly_income 
ADD COLUMN IF NOT EXISTS tagihan_belum_bayar NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aktif',
ADD COLUMN IF NOT EXISTS tanggal DATE,
ADD COLUMN IF NOT EXISTS tanggal_bayar_terakhir DATE;

-- Update tagihan_belum_bayar = nominal for existing unpaid entries
UPDATE public.fixed_monthly_income 
SET tagihan_belum_bayar = nominal 
WHERE (tagihan_belum_bayar = 0 OR tagihan_belum_bayar IS NULL) AND is_paid = false;

-- Set tagihan_belum_bayar = 0 for already paid entries
UPDATE public.fixed_monthly_income 
SET tagihan_belum_bayar = 0 
WHERE is_paid = true;

-- Set tanggal to period_start_month for existing data if null
UPDATE public.fixed_monthly_income 
SET tanggal = period_start_month::date 
WHERE tanggal IS NULL AND period_start_month IS NOT NULL;