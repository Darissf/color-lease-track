
## Rencana: Fix Error "Gagal menyimpan groups" - Invalid Integer Input

### Diagnosis

**Error:** `invalid input syntax for type integer: "14.5"` dan `"3.5"`

**Penyebab:** Input field untuk `billing_quantity` dan `billing_duration_days` memperbolehkan nilai desimal (3.5, 14.5), tapi kolom database bertipe INTEGER sehingga gagal saat insert.

### Perubahan yang Akan Dilakukan

#### 1. Update Input Fields di ContractLineItemsEditor.tsx

Menambahkan `step="1"` pada input quantity dan duration:

```tsx
// SEBELUM:
<Input type="number" value={group.billing_quantity} min={1} />

// SESUDAH:
<Input type="number" step="1" value={group.billing_quantity} min={1} />
```

#### 2. Validasi di useLineItemGroups.ts - saveGroups Function

Memastikan nilai dibulatkan sebelum insert ke database:

```tsx
// SEBELUM:
billing_quantity: group.billing_quantity,
billing_duration_days: group.billing_duration_days,

// SESUDAH:
billing_quantity: Math.round(group.billing_quantity),
billing_duration_days: Math.round(group.billing_duration_days),
```

#### 3. Validasi di updateGroupBilling Function

Membulatkan nilai saat user mengubah input:

```tsx
// SEBELUM:
updated[groupIndex] = { ...updated[groupIndex], [field]: Number(value) };

// SESUDAH:
if (field === 'billing_quantity' || field === 'billing_duration_days') {
  updated[groupIndex] = { ...updated[groupIndex], [field]: Math.round(Number(value)) };
} else {
  updated[groupIndex] = { ...updated[groupIndex], [field]: Number(value) };
}
```

### File yang Akan Diubah

| File | Perubahan |
|------|-----------|
| `src/components/contracts/ContractLineItemsEditor.tsx` | Tambah `step="1"` pada input billing_quantity dan billing_duration_days |
| `src/hooks/useLineItemGroups.ts` | Validasi dengan Math.round() di updateGroupBilling dan saveGroups |

### Hasil Setelah Fix

1. Input hanya menerima bilangan bulat (1, 2, 3, dst)
2. Nilai desimal otomatis dibulatkan
3. Tidak ada lagi error "invalid input syntax for type integer"
