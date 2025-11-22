-- Add scaffolding-specific columns to rental_contracts table
ALTER TABLE public.rental_contracts 
ADD COLUMN IF NOT EXISTS jenis_scaffolding TEXT,
ADD COLUMN IF NOT EXISTS jumlah_unit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lokasi_detail TEXT,
ADD COLUMN IF NOT EXISTS tanggal_kirim DATE,
ADD COLUMN IF NOT EXISTS tanggal_ambil DATE,
ADD COLUMN IF NOT EXISTS status_pengiriman TEXT DEFAULT 'belum_kirim' CHECK (status_pengiriman IN ('belum_kirim', 'dalam_perjalanan', 'terkirim')),
ADD COLUMN IF NOT EXISTS status_pengambilan TEXT DEFAULT 'belum_diambil' CHECK (status_pengambilan IN ('belum_diambil', 'dijadwalkan', 'diambil')),
ADD COLUMN IF NOT EXISTS biaya_kirim NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS penanggung_jawab TEXT;

-- Add index for faster queries on status fields
CREATE INDEX IF NOT EXISTS idx_rental_contracts_status_pengiriman ON public.rental_contracts(status_pengiriman);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_status_pengambilan ON public.rental_contracts(status_pengambilan);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_jenis_scaffolding ON public.rental_contracts(jenis_scaffolding);

-- Add comment to explain the new columns
COMMENT ON COLUMN public.rental_contracts.jenis_scaffolding IS 'Jenis scaffolding: Ring Lock, Cup Lock, Frame, dll';
COMMENT ON COLUMN public.rental_contracts.jumlah_unit IS 'Jumlah unit scaffolding yang disewa';
COMMENT ON COLUMN public.rental_contracts.lokasi_detail IS 'Alamat detail proyek untuk pengiriman';
COMMENT ON COLUMN public.rental_contracts.tanggal_kirim IS 'Tanggal pengiriman scaffolding';
COMMENT ON COLUMN public.rental_contracts.tanggal_ambil IS 'Tanggal pengambilan scaffolding';
COMMENT ON COLUMN public.rental_contracts.status_pengiriman IS 'Status pengiriman: belum_kirim, dalam_perjalanan, terkirim';
COMMENT ON COLUMN public.rental_contracts.status_pengambilan IS 'Status pengambilan: belum_diambil, dijadwalkan, diambil';
COMMENT ON COLUMN public.rental_contracts.biaya_kirim IS 'Biaya pengiriman scaffolding';
COMMENT ON COLUMN public.rental_contracts.penanggung_jawab IS 'Nama driver/teknisi yang bertanggung jawab';