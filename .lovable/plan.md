

## Kapitalisasi Satuan pada Kolom Qty (Pcs/Set)

### Perubahan yang Diminta

Mengubah tampilan satuan dari huruf kecil menjadi huruf kapital di awal:
- "8 pcs" → "8 Pcs"
- "2 set" → "2 Set"

### File yang Perlu Diubah

| File | Lokasi | Perubahan |
|------|--------|-----------|
| `src/components/documents/InvoiceRincianTemplate.tsx` | Baris ~304 | Kapitalisasi unit_mode |
| `src/components/documents/ReceiptRincianTemplate.tsx` | Baris ~304 | Kapitalisasi unit_mode |
| `src/components/documents/pdf/InvoicePDFTemplate.tsx` | Baris ~1026 | Kapitalisasi unit_mode |
| `src/components/documents/pdf/ReceiptPDFTemplate.tsx` | Baris ~964 | Kapitalisasi unit_mode |

### Perubahan Kode

**Sebelum:**
```tsx
{item.quantity} {item.unit_mode || 'pcs'}
```

**Sesudah:**
```tsx
{item.quantity} {(item.unit_mode || 'pcs').charAt(0).toUpperCase() + (item.unit_mode || 'pcs').slice(1)}
```

Atau lebih ringkas dengan helper function:
```tsx
// Helper untuk kapitalisasi
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

// Penggunaan
{item.quantity} {capitalize(item.unit_mode || 'pcs')}
```

### Hasil

| Sebelum | Sesudah |
|---------|---------|
| 2 pcs | 2 Pcs |
| 8 pcs | 8 Pcs |
| 2 set | 2 Set |
| 4 set | 4 Set |

