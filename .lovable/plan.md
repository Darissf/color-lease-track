

## Fix: Tanggal Dikembalikan & Generate dari Stok

### Masalah 1: `returned_at` menggunakan `NOW()` bukan `tanggal_ambil`

**Penyebab:** Ada database trigger `auto_return_stock_on_contract_complete()` yang otomatis mengisi `returned_at = NOW()` saat status kontrak berubah ke `selesai`. Seharusnya menggunakan `NEW.tanggal_ambil` (tanggal pengambilan yang diset user).

Contoh: Invoice 000303 tanggal pengambilan = 10 Feb 2026, tapi `returned_at` di stok = 12 Feb 2026 (saat trigger dijalankan).

**Solusi:** Update trigger SQL agar menggunakan `COALESCE(NEW.tanggal_ambil, NOW())`:

```text
-- Sebelum:
SET returned_at = NOW()

-- Sesudah:
SET returned_at = COALESCE(NEW.tanggal_ambil::timestamptz, NOW())
```

Juga update movement date agar konsisten (gunakan `tanggal_ambil` sebagai tanggal movement return).

**Fix data lama:** Update `returned_at` untuk invoice 000303 agar sesuai `tanggal_ambil`:

```sql
UPDATE contract_stock_items 
SET returned_at = '2026-02-10'::timestamptz
WHERE contract_id = 'd69560b7-981c-4e15-bbe6-23d80baba6f7';
```

---

### Masalah 2: "Generate dari Stok" error di Rincian Tagihan

**Penyebab:** Query di `ContractLineItemsEditor.tsx` (baris 202) memfilter `.is('returned_at', null)` - hanya mengambil item yang belum dikembalikan. Untuk kontrak berstatus `selesai`, semua item sudah memiliki `returned_at`, sehingga query mengembalikan 0 item.

**Solusi:** Hapus filter `returned_at IS NULL` pada query generate dari stok. Rincian tagihan harus bisa generate dari semua item stok kontrak, terlepas dari status pengembalian.

**File: `src/components/contracts/ContractLineItemsEditor.tsx`** (baris 202)

```text
-- Sebelum:
.is('returned_at', null)

-- Sesudah:
(hapus baris ini)
```

---

### Ringkasan Perubahan

| File/Komponen | Perubahan |
|---|---|
| Database trigger `auto_return_stock_on_contract_complete` | `NOW()` diganti `COALESCE(tanggal_ambil, NOW())` |
| Data invoice 000303 | Fix `returned_at` ke 10 Feb 2026 |
| `ContractLineItemsEditor.tsx` baris 202 | Hapus filter `.is('returned_at', null)` |

