

## Perbaikan Error Auto-Click Toggle

### Masalah

Error `invalid input syntax for type uuid: "default"` terjadi karena:
- Kolom `id` di tabel `mail_settings` bertipe **UUID**
- Kode menggunakan `id: "default"` (string biasa) saat upsert
- Supabase menolak karena "default" bukan format UUID yang valid

### Data Saat Ini

Tabel `mail_settings` sudah memiliki 1 row:
| id | auto_click_links | updated_at | updated_by |
|----|------------------|------------|------------|
| 916f854b-9f2b-4db4-9912-5b663b0a6b70 | false | 2026-02-01 | null |

### Solusi

Ubah logika di `Mail.tsx` untuk menggunakan **UUID yang sudah ada** atau membuat UUID baru jika belum ada data, bukan menggunakan string "default".

### Perubahan Kode

**File:** `src/pages/Mail.tsx`

**Lokasi:** Baris 256-287 (fungsi `handleToggleAutoClick`)

**Strategi:**
1. Cek apakah sudah ada row di `mail_settings`
2. Jika ada, gunakan `update` dengan ID yang sudah ada
3. Jika belum ada, gunakan `insert` tanpa specify ID (biarkan database generate UUID)

**Sebelum:**
```typescript
const handleToggleAutoClick = async (enabled: boolean) => {
  setLoadingAutoClick(true);
  try {
    const { error } = await supabase
      .from("mail_settings")
      .upsert({ 
        id: "default",  // ❌ String biasa, bukan UUID
        auto_click_links: enabled, 
        updated_at: new Date().toISOString(),
        updated_by: user?.id 
      }, { onConflict: "id" });
    // ...
  }
}
```

**Sesudah:**
```typescript
const handleToggleAutoClick = async (enabled: boolean) => {
  setLoadingAutoClick(true);
  try {
    // Cek apakah sudah ada settings
    const { data: existing } = await supabase
      .from("mail_settings")
      .select("id")
      .limit(1)
      .single();

    let error;
    
    if (existing?.id) {
      // Update existing row
      const result = await supabase
        .from("mail_settings")
        .update({ 
          auto_click_links: enabled, 
          updated_at: new Date().toISOString(),
          updated_by: user?.id 
        })
        .eq("id", existing.id);
      error = result.error;
    } else {
      // Insert new row (database akan generate UUID)
      const result = await supabase
        .from("mail_settings")
        .insert({ 
          auto_click_links: enabled, 
          updated_at: new Date().toISOString(),
          updated_by: user?.id 
        });
      error = result.error;
    }

    if (error) throw error;
    // ... rest of code
  }
}
```

### Ringkasan

| Aspek | Sebelum | Sesudah |
|-------|---------|---------|
| ID yang digunakan | `"default"` (string) | UUID dari database |
| Metode | Upsert dengan ID statis | Select → Update/Insert |
| Error handling | Gagal karena tipe tidak cocok | Berhasil dengan UUID valid |

