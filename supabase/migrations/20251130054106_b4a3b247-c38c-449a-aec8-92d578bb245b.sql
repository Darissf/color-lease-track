-- Add scaffolding-related columns to fixed_monthly_income table
ALTER TABLE fixed_monthly_income
ADD COLUMN IF NOT EXISTS jenis_scaffolding TEXT,
ADD COLUMN IF NOT EXISTS jumlah_unit INTEGER,
ADD COLUMN IF NOT EXISTS lokasi_proyek TEXT,
ADD COLUMN IF NOT EXISTS tanggal_pengiriman DATE,
ADD COLUMN IF NOT EXISTS tanggal_pengambilan DATE,
ADD COLUMN IF NOT EXISTS status_pengiriman TEXT CHECK (status_pengiriman IN ('belum_kirim', 'sudah_kirim')),
ADD COLUMN IF NOT EXISTS status_pengambilan TEXT CHECK (status_pengambilan IN ('belum_diambil', 'sudah_diambil')),
ADD COLUMN IF NOT EXISTS ongkos_transport NUMERIC,
ADD COLUMN IF NOT EXISTS penanggung_jawab TEXT;

COMMENT ON COLUMN fixed_monthly_income.jenis_scaffolding IS 'Type/kind of scaffolding rented';
COMMENT ON COLUMN fixed_monthly_income.jumlah_unit IS 'Number of scaffolding units';
COMMENT ON COLUMN fixed_monthly_income.lokasi_proyek IS 'Project location address';
COMMENT ON COLUMN fixed_monthly_income.tanggal_pengiriman IS 'Delivery date';
COMMENT ON COLUMN fixed_monthly_income.tanggal_pengambilan IS 'Pickup/collection date';
COMMENT ON COLUMN fixed_monthly_income.status_pengiriman IS 'Delivery status';
COMMENT ON COLUMN fixed_monthly_income.status_pengambilan IS 'Pickup status';
COMMENT ON COLUMN fixed_monthly_income.ongkos_transport IS 'Transport/delivery cost';
COMMENT ON COLUMN fixed_monthly_income.penanggung_jawab IS 'Person in charge';