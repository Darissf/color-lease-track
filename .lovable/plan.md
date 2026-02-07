

## Masalah: Link Verifikasi Tidak Berfungsi

### Analisis Root Cause

Sistem auto-click saat ini menggunakan `fetch()` yang hanya melakukan HTTP request sederhana. Ini **TIDAK** menjalankan JavaScript di halaman target.

**Bukti dari data:**
- Link diklik ✅ (Status 200)
- Response yang didapat: HTML statis saja
- JavaScript di halaman Lovable.dev **TIDAK dieksekusi**
- Verifikasi email membutuhkan JavaScript untuk memanggil Firebase Auth API

### Mengapa Ini Terjadi?

```text
Cara kerja fetch():
fetch(url) → Server mengirim HTML → Selesai (JS tidak jalan)

Cara kerja browser sungguhan:
Browser → Server mengirim HTML → Browser parse HTML → 
Load JS → Execute JS → JS calls verify API → Email verified ✅
```

### Solusi yang Tersedia

#### Opsi 1: Gunakan Browserless.io (Recommended)

Browserless.io adalah layanan headless browser cloud yang bisa diintegrasikan dengan Edge Functions.

**Keuntungan:**
- JavaScript dieksekusi seperti browser sungguhan
- Tidak perlu install Chrome/Puppeteer
- Pay-per-use, ada free tier

**Perubahan:**

| File | Perubahan |
|------|-----------|
| `inbound-mail-webhook/index.ts` | Gunakan Browserless API untuk klik link |
| Secrets | Tambahkan `BROWSERLESS_API_KEY` |

**Kode implementasi:**

```typescript
async function clickLinkWithBrowser(url: string): Promise<{status: number, content: string}> {
  const browserlessKey = Deno.env.get('BROWSERLESS_API_KEY');
  
  if (!browserlessKey) {
    // Fallback ke fetch biasa jika tidak ada key
    const response = await fetch(url);
    return { status: response.status, content: await response.text() };
  }

  // Gunakan Browserless untuk execute JS
  const response = await fetch(
    `https://chrome.browserless.io/content?token=${browserlessKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url,
        waitFor: 5000, // Tunggu 5 detik untuk JS selesai
        gotoOptions: { waitUntil: 'networkidle2' }
      })
    }
  );

  return { 
    status: response.status, 
    content: await response.text() 
  };
}
```

#### Opsi 2: Langsung Panggil Firebase Auth API (Alternative)

Jika target hanya email Lovable.dev, kita bisa langsung memanggil Firebase Auth verify API tanpa browser.

**Limitasi:** Hanya bekerja untuk Firebase-based verification

**Kode:**

```typescript
// Extract oobCode dari URL
const oobCodeMatch = url.match(/oobCode=([^&]+)/);
if (oobCodeMatch) {
  const oobCode = oobCodeMatch[1];
  const apiKey = 'AIzaSyBQNjlw9Vp4tP4VVeANzyPJnqbG2wLbYPw';
  
  // Langsung panggil Firebase Auth REST API
  const verifyResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oobCode })
    }
  );
}
```

### Rekomendasi

**Opsi 1 (Browserless.io)** lebih universal dan akan bekerja untuk semua jenis link verifikasi, bukan hanya Firebase.

### Langkah Implementasi

1. **Daftar di browserless.io** dan dapatkan API key (ada free tier 1000 requests/bulan)
2. **Tambahkan secret** `BROWSERLESS_API_KEY` ke project
3. **Update edge function** untuk menggunakan Browserless API
4. **Testing** dengan email verifikasi baru

### File yang Akan Diubah

| File | Perubahan |
|------|-----------|
| `supabase/functions/inbound-mail-webhook/index.ts` | Tambahkan fungsi `clickLinkWithBrowser()` menggunakan Browserless API |
| Secrets | Tambahkan `BROWSERLESS_API_KEY` |

