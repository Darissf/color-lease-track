

## Plan: Stock Transfer pada Perpanjangan + Log Lengkap Lifecycle Barang

### Pemahaman Kebutuhan

Anda menginginkan sistem di mana:

1. **Stok Aktif Selalu di Invoice Terakhir**
   - Saat perpanjangan dari 000284 → 000301, stok barang **berpindah** ke 000301
   - Invoice 000284 menjadi **read-only** dengan status "Diperpanjang ke 000301"
   - Edit stok hanya bisa dilakukan di invoice 000301 (yang aktif)

2. **Log Lifecycle Barang Lengkap**
   - Setiap barang harus punya riwayat lengkap: kapan mulai, di invoice mana, sampai kapan
   - Contoh format:
     ```
     📦 Scaffolding 1.7M Galvanis (2 pcs)
     
     ├─ 26 Jan 2026 - 01 Feb 2026
     │  Invoice: 000284 (7 hari)
     │  
     ├─ 02 Feb 2026 - 08 Feb 2026  
     │  Invoice: 000301 (7 hari) ← PERPANJANGAN
     │  
     └─ 09 Feb 2026
        Dikembalikan ke gudang
     ```

---

### Perubahan yang Akan Dilakukan

#### 1. Skema Database: Tambah Kolom untuk Stock Transfer

**Tabel: `contract_stock_items`**

| Kolom Baru | Tipe | Keterangan |
|------------|------|------------|
| `extended_to_contract_id` | UUID | Referensi ke kontrak perpanjangan (jika ada) |
| `source_stock_item_id` | UUID | Referensi ke stock item di kontrak sebelumnya |

Ini memungkinkan tracking chain stok: mana yang parent, mana yang perpanjangan.

#### 2. Skema Database: Tambah Kolom untuk Period Tracking di Movements

**Tabel: `inventory_movements`**

| Kolom Baru | Tipe | Keterangan |
|------------|------|------------|
| `period_start` | DATE | Tanggal mulai periode (untuk tracking) |
| `period_end` | DATE | Tanggal akhir periode (untuk tracking) |

#### 3. Update Proses Perpanjangan (`ExtendContractDialog.tsx`)

**Langkah Saat Perpanjangan:**

```text
SEBELUM:
┌─────────────────────────────────────────────┐
│ Invoice 000284                              │
│ Stok: 7 items (aktif, bisa diedit)          │
│ Status: masa sewa                           │
└─────────────────────────────────────────────┘

SETELAH PERPANJANGAN:
┌─────────────────────────────────────────────┐
│ Invoice 000284                              │
│ Stok: 7 items (READONLY)                    │
│ Status: selesai                             │
│ Label: "📦 Diperpanjang ke 000301"          │
└─────────────────────────────────────────────┘
            │
            ▼ (Transfer)
┌─────────────────────────────────────────────┐
│ Invoice 000301                              │
│ Stok: 7 items (AKTIF, bisa diedit)          │
│ Status: masa sewa                           │
│ Label: "Lanjutan dari 000284"               │
└─────────────────────────────────────────────┘
```

**Perubahan Kode:**
1. Update `extended_to_contract_id` di parent stock items → pointing ke new contract
2. Insert stock items baru di extension dengan `source_stock_item_id` → pointing ke parent stock
3. Insert `inventory_movement` dengan type `extension` untuk tracking periode

#### 4. Update UI Kontrak (`ContractDetail.tsx`)

**Invoice Lama (000284) - Setelah Diperpanjang:**

```
┌─────────────────────────────────────────────┐
│ 📦 Rincian Stok Barang                      │
│ ─────────────────────────────────────────── │
│ ⚠️ Stok telah dipindahkan ke Invoice 000301 │
│ [Lihat di Invoice Terbaru]                  │
│ ─────────────────────────────────────────── │
│ • Scaffolding 1.7M (2 pcs)   → 000301       │
│ • Cross Brace 1.7m (4 pcs)   → 000301       │
│ • ... (readonly, no edit button)            │
└─────────────────────────────────────────────┘
```

**Invoice Baru (000301) - Yang Aktif:**

```
┌─────────────────────────────────────────────┐
│ 📦 Rincian Stok Barang          [Edit]      │
│ ─────────────────────────────────────────── │
│ • Scaffolding 1.7M (2 pcs)                  │
│   └─ Lanjutan dari 000284                   │
│ • Cross Brace 1.7m (4 pcs)                  │
│   └─ Lanjutan dari 000284                   │
└─────────────────────────────────────────────┘
```

#### 5. Update Timeline Barang di Inventory (`ItemMovementTimeline.tsx`)

**Tampilan Baru dengan Period Tracking:**

```
┌─────────────────────────────────────────────┐
│ 🟠 Disewa                    -2 pcs         │
│ Senin, 26 Januari 2026                      │
│ 📋 Invoice: 000284                          │
│ 📅 Periode: 26 Jan - 01 Feb (7 hari)        │
└─────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────┐
│ 🔄 Diperpanjang              (transfer)     │
│ Minggu, 02 Februari 2026                    │
│ 📋 000284 → 000301                          │
│ 📅 Periode baru: 02 Feb - 08 Feb (7 hari)   │
└─────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────┐
│ 🟢 Dikembalikan              +2 pcs         │
│ Senin, 09 Februari 2026                     │
│ 📋 Invoice: 000301                          │
│ Total disewa: 14 hari                       │
└─────────────────────────────────────────────┘
```

#### 6. Tipe Movement Baru

| Type | Label | Icon | Color | Keterangan |
|------|-------|------|-------|------------|
| `rental` | Disewa | ↑ | Amber | Barang keluar dari gudang |
| `return` | Dikembalikan | ↓ | Green | Barang kembali ke gudang |
| `extension` | Diperpanjang | 🔄 | Purple | Transfer antar invoice |
| `adjustment` | Penyesuaian | ⚙️ | Blue | Perubahan qty |

---

### File yang Akan Diubah

| File | Perubahan |
|------|-----------|
| **Database Migration** | Tambah kolom `extended_to_contract_id`, `source_stock_item_id` di `contract_stock_items`. Tambah `period_start`, `period_end` di `inventory_movements` |
| `ExtendContractDialog.tsx` | Update logic untuk transfer stok, create extension movement |
| `ContractDetail.tsx` | Cek apakah stok sudah ditransfer, tampilkan read-only view |
| `ContractStockItemsEditor.tsx` | Disable editing jika kontrak sudah diperpanjang |
| `ItemMovementTimeline.tsx` | Tambah support untuk movement type `extension` dengan period display |
| `InventoryItemHistory.tsx` | Update query untuk include period tracking |

---

### Flow Lengkap Setelah Implementasi

```text
PERPANJANGAN KONTRAK:

1. User klik "Perpanjang" di Invoice 000284
   
2. Dialog muncul, user pilih tanggal baru
   
3. Saat submit:
   a. Create kontrak baru 000301
   b. Copy line items + groups
   c. Copy financial fields + generate template
   d. TRANSFER STOK:
      - Update 000284 stock items → set extended_to_contract_id = 000301
      - Insert 000301 stock items → set source_stock_item_id = 000284 items
      - Insert inventory_movement type='extension' untuk setiap item
        dengan notes: "Diperpanjang: 000284 (26 Jan-01 Feb) → 000301 (02 Feb-08 Feb)"
   e. Close kontrak 000284 → status = selesai

4. Hasil:
   - 000284: Stok read-only, label "Diperpanjang ke 000301"
   - 000301: Stok aktif, bisa diedit
   - Log gudang: Lengkap dengan periode setiap invoice
```

---

### Expected Result

**Di Invoice 000284 (Parent):**
- Section "Rincian Stok Barang" menampilkan notice bahwa stok sudah dipindahkan
- Tombol "Edit" tidak muncul
- Ada link ke invoice terbaru (000301)

**Di Invoice 000301 (Extension):**
- Section "Rincian Stok Barang" normal, bisa diedit
- Setiap item menampilkan label "Lanjutan dari 000284"

**Di Log Gudang (Inventory History):**
- Tampilan timeline lengkap dengan periode per invoice
- Entry "Diperpanjang" menunjukkan transfer dari invoice A ke B
- Total durasi sewa bisa dihitung dari chain

