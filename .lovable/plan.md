

## Auto-Click Link dengan Delay 10 Detik untuk Email Unread

### Pemahaman

Saat ini fitur auto-click sudah berjalan di webhook saat email masuk. Email yang masuk memang selalu dalam status unread (is_read = false), jadi auto-click sudah berjalan untuk email unread.

Yang perlu ditambahkan:
1. **Delay 10 detik** setelah mengklik setiap link sebelum melanjutkan ke link berikutnya
2. Memastikan auto-click hanya memproses email yang masih unread

### Perubahan yang Akan Dilakukan

#### File: `supabase/functions/inbound-mail-webhook/index.ts`

**Lokasi:** Baris 60-109 (fungsi autoClickLinks - loop untuk klik link)

**Perubahan:**

1. Tambahkan delay 10 detik setelah setiap link diklik (simulasi "menunggu sebelum close browser")
2. Log informasi delay untuk tracking

**Sebelum:**
```typescript
for (const url of links) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, { ... });
    clearTimeout(timeoutId);
    
    // ... process response ...
    
    console.log(`Successfully clicked: ${url} (status: ${response.status})`);
  } catch (error) {
    // ... handle error ...
  }
}
```

**Sesudah:**
```typescript
for (const url of links) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, { ... });
    clearTimeout(timeoutId);
    
    // ... process response ...
    
    console.log(`Successfully clicked: ${url} (status: ${response.status})`);
    
    // Tunggu 10 detik sebelum menutup "session" dan lanjut ke link berikutnya
    console.log(`Waiting 10 seconds before closing link: ${url}`);
    await new Promise(resolve => setTimeout(resolve, 10000));
    console.log(`Closed link: ${url}`);
    
  } catch (error) {
    // ... handle error ...
    
    // Tetap tunggu 10 detik meskipun error
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}
```

### Catatan Penting

| Aspek | Penjelasan |
|-------|------------|
| Email Unread | Email baru dari webhook selalu unread (is_read = false), jadi sudah otomatis memproses email unread |
| Delay 10 Detik | Ditambahkan setelah setiap link diklik untuk simulasi "keep page open" |
| Max Links | Tetap dibatasi 10 link per email |
| Timeout Request | 10 detik untuk request + 10 detik delay = ~20 detik per link |
| Background Process | Webhook tidak menunggu proses selesai (fire and forget) |

### Flow Baru

```text
Email masuk (webhook)
    ↓
Cek auto_click_links = true?
    ↓ Ya
Extract links dari email
    ↓
Untuk setiap link:
    1. Klik link (HTTP GET)
    2. Tunggu response (max 10 detik)
    3. Simpan hasil ke mail_auto_clicked_links
    4. ⭐ BARU: Tunggu 10 detik (delay)
    5. Log "Closed link"
    6. Lanjut ke link berikutnya
```

### Ringkasan

| File | Perubahan |
|------|-----------|
| `supabase/functions/inbound-mail-webhook/index.ts` | Tambah delay 10 detik setelah setiap link diklik |

