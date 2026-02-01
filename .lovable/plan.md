

## Fitur Auto-Click Link pada Email Masuk

### Ringkasan Fitur
Menambahkan toggle button ON/OFF di Mail Inbox. Ketika ON, setiap email baru masuk yang memiliki link akan otomatis "diklik" (di-fetch) oleh sistem secara real-time saat webhook menerima email.

---

## Arsitektur Solusi

```text
┌─────────────────────────────────────────────────────────────────┐
│ 1. Email Masuk → Resend Webhook                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. inbound-mail-webhook Edge Function                           │
│    ├── Cek setting: auto_click_links = true?                    │
│    ├── Ekstrak semua link dari body_html/body_text              │
│    ├── Untuk setiap link: fetch(url) di background              │
│    └── Simpan hasil ke tabel mail_auto_clicked_links            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Database Tables                                              │
│    ├── app_settings: auto_click_links boolean                   │
│    └── mail_auto_clicked_links: log setiap link yang diklik     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Perubahan Database

### 1. Tambah Tabel: `mail_auto_clicked_links`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| mail_inbox_id | uuid | FK ke mail_inbox |
| url | text | URL yang diklik |
| clicked_at | timestamptz | Waktu diklik |
| status_code | integer | HTTP status code dari response |
| response_preview | text | Preview 500 char pertama dari response |
| error_message | text | Jika gagal, pesan error |
| created_at | timestamptz | Default now() |

### 2. Tambah Kolom di `app_settings` (jika ada) atau buat tabel baru `mail_settings`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| auto_click_links | boolean | Default false |
| updated_at | timestamptz | Last update |
| updated_by | uuid | User yang terakhir update |

---

## Perubahan UI

### File: `src/pages/Mail.tsx`

Tambahkan toggle button di header (dekat tombol Refresh):

```text
┌───────────────────────────────────────────────────────────────────┐
│ 📬 Mail Inbox                                                      │
│                                                                   │
│  [Compose] [Manage] [Refresh] [🔗 Auto-Click: ON/OFF]             │
└───────────────────────────────────────────────────────────────────┘
```

**Komponen yang ditambahkan:**
- Import `Switch` dari `@/components/ui/switch`
- State `autoClickEnabled` dan `loadingAutoClick`
- Fetch setting dari database saat load
- Update setting ke database saat toggle

**Tooltip/Info:**
- Saat ON: "Link di email baru akan otomatis diklik di background"
- Saat OFF: "Link tidak akan diklik otomatis"

---

## Perubahan Edge Function

### File: `supabase/functions/inbound-mail-webhook/index.ts`

Tambahkan logic setelah email disimpan ke database:

```typescript
// 1. Cek apakah auto-click diaktifkan
const { data: settings } = await supabase
  .from('mail_settings')
  .select('auto_click_links')
  .single();

if (settings?.auto_click_links) {
  // 2. Ekstrak semua link dari email
  const links = extractLinksFromHtml(bodyHtml) || extractLinksFromText(bodyText);
  
  // 3. Untuk setiap link, fetch di background
  for (const url of links) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 ...' },
        redirect: 'follow',
      });
      
      const preview = await response.text();
      
      // 4. Simpan hasil ke database
      await supabase.from('mail_auto_clicked_links').insert({
        mail_inbox_id: insertedEmailId,
        url: url,
        status_code: response.status,
        response_preview: preview.substring(0, 500),
        clicked_at: new Date().toISOString(),
      });
    } catch (error) {
      await supabase.from('mail_auto_clicked_links').insert({
        mail_inbox_id: insertedEmailId,
        url: url,
        error_message: error.message,
        clicked_at: new Date().toISOString(),
      });
    }
  }
}
```

**Fungsi Helper:**
```typescript
// Ekstrak link dari HTML menggunakan regex
function extractLinksFromHtml(html: string): string[] {
  const linkRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
  const matches = [...html.matchAll(linkRegex)];
  return [...new Set(matches.map(m => m[1]))]; // Unique links only
}

// Ekstrak link dari text
function extractLinksFromText(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
  const matches = text.match(urlRegex) || [];
  return [...new Set(matches)];
}
```

---

## Keamanan dan Pertimbangan

1. **Timeout**: Set timeout 10 detik per link untuk mencegah webhook timeout
2. **Limit**: Maksimal 10 link per email untuk mencegah abuse
3. **Blacklist**: Skip link dari domain yang diketahui berbahaya
4. **RLS**: Tabel `mail_auto_clicked_links` hanya bisa diakses super_admin

---

## File yang Akan Diubah/Dibuat

| File | Aksi | Deskripsi |
|------|------|-----------|
| Database Migration | CREATE | Tabel `mail_settings` dan `mail_auto_clicked_links` |
| `supabase/functions/inbound-mail-webhook/index.ts` | MODIFY | Tambah logic auto-click links |
| `src/pages/Mail.tsx` | MODIFY | Tambah toggle button dan fetch/update setting |

---

## Hasil yang Diharapkan

1. Toggle button muncul di header Mail Inbox
2. Saat toggle ON:
   - Setiap email baru yang masuk akan dipindai untuk link
   - Setiap link akan di-fetch/diklik secara otomatis di background
   - Hasil klik disimpan ke database untuk tracking
3. Saat toggle OFF:
   - Email diproses seperti biasa tanpa auto-click

