
## Rencana: Update Data Kontrak 000284 → 000301 untuk Stock Transfer

### Kondisi Saat Ini

Data kontrak 000284 dan 000301 dibuat **sebelum** implementasi Stock Transfer, sehingga:

1. **Stock items 000284** → `extended_to_contract_id = NULL` (seharusnya menunjuk ke 000301)
2. **Stock items 000301** → `source_stock_item_id = NULL` (seharusnya menunjuk ke stock 000284)
3. **Inventory movements** → Tidak ada entry `extension` dan tidak ada `period_start`/`period_end`

### Data yang Akan Di-Update

#### 1. Update Stock Items 000284 (Parent)

Menambahkan referensi bahwa stok telah dipindahkan ke 000301:

| Stock ID (000284) | Inventory Item | → extended_to_contract_id |
|-------------------|----------------|---------------------------|
| b37271a0-... | Scaffolding 1.7M Las | → 000301 |
| 5ae26a77-... | Scaffolding 1.7M | → 000301 |
| 86538b92-... | Cross Brace 1.7m | → 000301 |
| 3e55c43a-... | Scaffolding 0.9M | → 000301 |
| cc5ab9a8-... | Cross Brace 0.9m | → 000301 |
| 83526dab-... | Catwalk | → 000301 |
| 7ed84413-... | Join Pin | → 000301 |

#### 2. Update Stock Items 000301 (Extension)

Menambahkan referensi ke stock item asal:

| Stock ID (000301) | Inventory Item | → source_stock_item_id |
|-------------------|----------------|------------------------|
| ff57ca0d-... | Scaffolding 1.7M Las | → b37271a0-... |
| 54cdc72a-... | Scaffolding 1.7M | → 5ae26a77-... |
| d77604cc-... | Cross Brace 1.7m | → 86538b92-... |
| a94118e3-... | Scaffolding 0.9M | → 3e55c43a-... |
| a49a1a37-... | Cross Brace 0.9m | → cc5ab9a8-... |
| b2b15fcf-... | Catwalk | → 83526dab-... |
| 234206e3-... | Join Pin | → 7ed84413-... |

#### 3. Insert Inventory Movements (Extension)

Menambahkan 7 entry movement dengan type `extension`:

```
Untuk setiap item:
- movement_type: 'extension'
- contract_id: 000301 (8bb50a21-bd5e-40c9-9c77-cd038616ca91)
- period_start: 2026-02-02
- period_end: 2026-02-08
- notes: "Diperpanjang: 000284 (26 Jan-01 Feb) → 000301 (02 Feb-08 Feb)"
```

#### 4. Hapus Return Movements yang Salah

Kontrak 000284 memiliki 7 entry `return` dengan notes "Auto return - Kontrak selesai", padahal stok seharusnya **diperpanjang**, bukan dikembalikan. Entry ini perlu dihapus.

### SQL Queries yang Akan Dijalankan

**Query 1: Update parent stock items**
```sql
UPDATE contract_stock_items 
SET extended_to_contract_id = '8bb50a21-bd5e-40c9-9c77-cd038616ca91'
WHERE contract_id = 'b6728b9d-9f2b-4cb6-8022-87b5834967a2';
```

**Query 2: Link child stock items ke parent (by inventory_item_id match)**
```sql
UPDATE contract_stock_items child
SET source_stock_item_id = parent.id
FROM contract_stock_items parent
WHERE child.contract_id = '8bb50a21-bd5e-40c9-9c77-cd038616ca91'
  AND parent.contract_id = 'b6728b9d-9f2b-4cb6-8022-87b5834967a2'
  AND child.inventory_item_id = parent.inventory_item_id;
```

**Query 3: Hapus auto-return movements yang salah**
```sql
DELETE FROM inventory_movements
WHERE contract_id = 'b6728b9d-9f2b-4cb6-8022-87b5834967a2'
  AND movement_type = 'return'
  AND notes = 'Auto return - Kontrak selesai';
```

**Query 4: Insert extension movements (7 items)**
```sql
INSERT INTO inventory_movements 
(user_id, inventory_item_id, contract_id, movement_type, quantity, notes, period_start, period_end)
SELECT 
  csi.user_id,
  csi.inventory_item_id,
  '8bb50a21-bd5e-40c9-9c77-cd038616ca91',
  'extension',
  csi.quantity,
  'Diperpanjang: 000284 (26 Jan-01 Feb) → 000301 (02 Feb-08 Feb)',
  '2026-02-02',
  '2026-02-08'
FROM contract_stock_items csi
WHERE csi.contract_id = 'b6728b9d-9f2b-4cb6-8022-87b5834967a2';
```

### Hasil Setelah Update

**Invoice 000284:**
- Status: selesai ✅
- Stok: 7 items dengan badge "→ Diperpanjang ke 000301"
- Tombol Edit: Tersembunyi

**Invoice 000301:**
- Status: masa sewa ✅  
- Stok: 7 items dengan badge "Lanjutan dari 000284"
- Tombol Edit: Aktif (karena ini invoice terakhir)

**Log Gudang (untuk setiap barang):**
```
📅 26 Jan - 01 Feb 2026 (7 hari)
   Disewa via 000284

🔄 02 Feb 2026
   Diperpanjang: 000284 → 000301
   📅 02 Feb - 08 Feb 2026 (7 hari)
```

### File yang Akan Diubah

Tidak ada perubahan file kode - hanya update data menggunakan SQL queries.
