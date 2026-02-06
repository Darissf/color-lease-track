

## Menambahkan Satuan (pcs/set) pada Kolom Qty di Rincian Tagihan/Sewa

### Tujuan

Mengubah tampilan kolom Qty di halaman 2 dokumen (Invoice & Kwitansi) dari menampilkan angka saja (misal: "2", "8") menjadi menampilkan angka + satuan (misal: "2 set", "8 pcs") berdasarkan `unit_mode` yang sudah di-setting di rincian stok barang.

### Ilustrasi

**Sebelum:**
| No | Nama Item | Qty |
|----|-----------|-----|
| 1 | Scaffolding 1.7M Galvanis | 2 |
| 2 | Cross Brace / Silang | 2 |
| 3 | Join Pin | 8 |

**Sesudah:**
| No | Nama Item | Qty |
|----|-----------|-----|
| 1 | Scaffolding 1.7M Galvanis | 2 set |
| 2 | Cross Brace / Silang | 2 set |
| 3 | Join Pin | 8 pcs |

### Perubahan Teknis

#### 1. Update Interface LineItem (6 file)

Tambahkan property `unit_mode` ke interface `LineItem`:

```typescript
interface LineItem {
  item_name: string;
  quantity: number;
  unit_price_per_day: number;
  duration_days: number;
  subtotal?: number;
  unit_mode?: string | null; // 'pcs' atau 'set'
}
```

File yang perlu diupdate:
- `src/components/documents/InvoiceRincianTemplate.tsx`
- `src/components/documents/ReceiptRincianTemplate.tsx`
- `src/components/documents/DocumentPreviewModal.tsx`
- `src/components/documents/pdf/InvoicePDFTemplate.tsx`
- `src/components/documents/pdf/ReceiptPDFTemplate.tsx`
- `src/hooks/usePDFGenerator.ts`

#### 2. Update Query Fetch Line Items di ContractDetail.tsx

**File:** `src/pages/ContractDetail.tsx`  
**Lokasi:** Baris ~924-928 (handleGenerateInvoice)

Tambahkan `unit_mode` ke query select:

```typescript
// Sebelum
.select('item_name, quantity, unit_price_per_day, duration_days, subtotal')

// Sesudah
.select('item_name, quantity, unit_price_per_day, duration_days, subtotal, unit_mode')
```

#### 3. Update Rendering Qty di HTML Templates

**File:** `src/components/documents/InvoiceRincianTemplate.tsx`  
**Lokasi:** Baris ~390

```tsx
// Sebelum
{item.quantity}

// Sesudah
{item.quantity} {item.unit_mode || 'pcs'}
```

**File:** `src/components/documents/ReceiptRincianTemplate.tsx`  
**Lokasi:** Baris ~390

```tsx
// Sebelum
{item.quantity}

// Sesudah
{item.quantity} {item.unit_mode || 'pcs'}
```

#### 4. Update Rendering Qty di PDF Templates

**File:** `src/components/documents/pdf/InvoicePDFTemplate.tsx`  
**Lokasi:** Baris ~1026

```tsx
// Sebelum
<Text ...>{item.quantity}</Text>

// Sesudah
<Text ...>{item.quantity} {item.unit_mode || 'pcs'}</Text>
```

**File:** `src/components/documents/pdf/ReceiptPDFTemplate.tsx`  
**Lokasi:** Baris ~964

```tsx
// Sebelum
<Text ...>{item.quantity}</Text>

// Sesudah
<Text ...>{item.quantity} {item.unit_mode || 'pcs'}</Text>
```

### Ringkasan File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/pages/ContractDetail.tsx` | Tambah `unit_mode` ke query select |
| `src/components/documents/InvoiceRincianTemplate.tsx` | Update interface + render Qty |
| `src/components/documents/ReceiptRincianTemplate.tsx` | Update interface + render Qty |
| `src/components/documents/DocumentPreviewModal.tsx` | Update interface |
| `src/components/documents/pdf/InvoicePDFTemplate.tsx` | Update interface + render Qty |
| `src/components/documents/pdf/ReceiptPDFTemplate.tsx` | Update interface + render Qty |
| `src/hooks/usePDFGenerator.ts` | Update interface |

### Catatan Penting

- Data `unit_mode` sudah tersedia di tabel `contract_line_items` (kolom sudah ada)
- Default akan menggunakan "pcs" jika `unit_mode` tidak ada atau null
- Perubahan ini akan berlaku untuk semua dokumen Invoice dan Kwitansi baru
- Dokumen yang sudah di-generate sebelumnya tetap menggunakan tampilan lama

