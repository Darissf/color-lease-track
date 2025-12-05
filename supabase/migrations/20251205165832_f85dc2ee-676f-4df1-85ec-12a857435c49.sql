-- Tambah kolom tanggal_bayar_terakhir untuk menyimpan tanggal pembayaran terakhir
ALTER TABLE public.rental_contracts
ADD COLUMN tanggal_bayar_terakhir DATE;

-- Komentar untuk dokumentasi
COMMENT ON COLUMN public.rental_contracts.tanggal_bayar_terakhir IS 'Tanggal pembayaran terakhir yang dilakukan untuk kontrak ini';