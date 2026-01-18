-- Tambah kolom pcs_per_set di inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS pcs_per_set INTEGER DEFAULT 1;

COMMENT ON COLUMN public.inventory_items.pcs_per_set IS 'Jumlah pcs dalam 1 set, contoh: 2 berarti 2 pcs = 1 set';

-- Tambah kolom unit_mode di contract_stock_items untuk menyimpan pilihan user
ALTER TABLE public.contract_stock_items
ADD COLUMN IF NOT EXISTS unit_mode TEXT DEFAULT 'pcs';

COMMENT ON COLUMN public.contract_stock_items.unit_mode IS 'Mode satuan yang dipilih: pcs atau set';