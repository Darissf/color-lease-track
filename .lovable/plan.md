# Stock Transfer pada Perpanjangan + Log Lengkap Lifecycle Barang

## ✅ Status: IMPLEMENTED

### Fitur yang Sudah Diimplementasikan

#### 1. Database Schema (Migration Complete)
- ✅ `contract_stock_items.extended_to_contract_id` - Reference ke kontrak perpanjangan
- ✅ `contract_stock_items.source_stock_item_id` - Reference ke stock item parent
- ✅ `inventory_movements.period_start` - Tanggal mulai periode
- ✅ `inventory_movements.period_end` - Tanggal akhir periode

#### 2. Stock Transfer Logic (ExtendContractDialog.tsx)
- ✅ Update parent stock items dengan `extended_to_contract_id`
- ✅ Insert new stock items dengan `source_stock_item_id`  
- ✅ Create `inventory_movement` type='extension' dengan period tracking
- ✅ Notes format: "Diperpanjang: 000284 (26 Jan-01 Feb) → 000301 (02 Feb-08 Feb)"

#### 3. UI Parent Contract (ContractDetail.tsx)
- ✅ Notice box: "📦 Stok telah dipindahkan ke Invoice [X]"
- ✅ Tombol "Lihat di Invoice Terbaru" untuk navigasi
- ✅ Tombol "Edit" disembunyikan jika kontrak sudah diperpanjang
- ✅ Badge "→ Diperpanjang ke [X]" di setiap item stok
- ✅ Styling purple untuk transferred items

#### 4. UI Extension Contract (ContractDetail.tsx)
- ✅ Badge "Lanjutan dari [X]" di setiap item stok yang berasal dari parent
- ✅ Edit tetap tersedia karena ini adalah invoice aktif

#### 5. Timeline Movements (ItemMovementTimeline.tsx)
- ✅ Support movement type 'extension' dengan icon Repeat (purple)
- ✅ Display period: "📅 02 Feb - 08 Feb 2026 (7 hari)"
- ✅ Notes perpanjangan dengan format lengkap

#### 6. Movement History Table (InventoryMovementHistory.tsx)
- ✅ Support movement type 'extension' dengan label "Perpanjangan"
- ✅ Icon RefreshCw dengan warna purple

### Expected Flow

```
PERPANJANGAN KONTRAK:

1. User klik "Perpanjang" di Invoice 000284
   
2. Dialog muncul, user pilih tanggal baru
   
3. Saat submit:
   a. Create kontrak baru 000301
   b. Copy line items + groups  
   c. TRANSFER STOK:
      - Update 000284 stock items → set extended_to_contract_id = 000301
      - Insert 000301 stock items → set source_stock_item_id = parent
      - Insert inventory_movement type='extension' dengan periode
   d. Close kontrak 000284 → status = selesai

4. Hasil:
   - 000284: Stok read-only dengan notice "Diperpanjang ke 000301"
   - 000301: Stok aktif, bisa diedit
   - Log gudang: Lengkap dengan periode setiap invoice
```

