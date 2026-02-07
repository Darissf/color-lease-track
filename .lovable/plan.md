

## Auto-Click dengan Filter Keyword

### Pemahaman Kebutuhan

Anda ingin auto-click hanya mengklik link yang **terkait dengan teks tertentu** di email:
- Contoh: Hanya klik link yang ada di dekat teks "Follow this link to verify your email address."
- Keyword harus **exact match** (sama persis)
- Saat toggle ON, muncul **popup konfigurasi** untuk mengatur keyword/phrase

### Perubahan yang Diperlukan

#### 1. Database: Tambah Kolom di `mail_settings`

Tambahkan kolom baru untuk menyimpan daftar keyword:

```sql
ALTER TABLE mail_settings
ADD COLUMN auto_click_keywords TEXT[] DEFAULT ARRAY['Follow this link to verify your email address.'];
```

#### 2. Komponen Baru: `AutoClickSettingsDialog.tsx`

Buat dialog popup untuk mengatur keyword:

| Fitur | Deskripsi |
|-------|-----------|
| Input keyword baru | Text field untuk menambah phrase baru |
| Daftar keyword | Menampilkan semua keyword yang aktif |
| Hapus keyword | Tombol untuk menghapus keyword tertentu |
| Simpan | Menyimpan perubahan ke database |

**Preview UI:**
```text
┌─────────────────────────────────────────────────┐
│  ⚙️ Pengaturan Auto-Click                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  Hanya klik link yang terkait dengan teks:     │
│                                                 │
│  ┌────────────────────────────────┬──────────┐ │
│  │ Masukkan keyword/phrase...     │ + Tambah │ │
│  └────────────────────────────────┴──────────┘ │
│                                                 │
│  Keywords aktif:                               │
│  ┌─────────────────────────────────────────┐   │
│  │ Follow this link to verify your email   [×]│ │
│  │ Click here to confirm                   [×]│ │
│  │ Verify your account                     [×]│ │
│  └─────────────────────────────────────────┘   │
│                                                 │
│                            [Batal] [Simpan]    │
└─────────────────────────────────────────────────┘
```

#### 3. Modifikasi `Mail.tsx`

**Perubahan flow toggle:**

| Langkah | Aksi |
|---------|------|
| 1 | User klik toggle Auto-Click ON |
| 2 | Buka dialog `AutoClickSettingsDialog` |
| 3 | User mengatur keyword |
| 4 | Klik Simpan → Aktifkan auto-click + simpan keyword |
| 5 | Jika Batal → Toggle kembali ke OFF |

**State baru:**
```typescript
const [autoClickDialogOpen, setAutoClickDialogOpen] = useState(false);
const [autoClickKeywords, setAutoClickKeywords] = useState<string[]>([]);
```

**Handler baru:**
```typescript
const handleToggleAutoClick = async (enabled: boolean) => {
  if (enabled) {
    // Buka dialog dulu, jangan langsung aktifkan
    setAutoClickDialogOpen(true);
  } else {
    // Langsung nonaktifkan
    await updateAutoClickSetting(false);
  }
};

const handleSaveAutoClickSettings = async (keywords: string[]) => {
  // Simpan keywords dan aktifkan auto-click
  await supabase.from("mail_settings").update({
    auto_click_links: true,
    auto_click_keywords: keywords,
    updated_at: new Date().toISOString(),
    updated_by: user?.id
  }).eq("id", settingsId);
  
  setAutoClickEnabled(true);
  setAutoClickKeywords(keywords);
  setAutoClickDialogOpen(false);
};
```

#### 4. Modifikasi Edge Function `inbound-mail-webhook`

**Logika filter baru:**

```typescript
// Fetch settings dengan keywords
const { data: settings } = await supabase
  .from('mail_settings')
  .select('auto_click_links, auto_click_keywords')
  .single();

if (!settings?.auto_click_links) return;

const keywords = settings.auto_click_keywords || [];

// Fungsi untuk menemukan link yang terkait dengan keyword
function findLinksNearKeywords(html: string, keywords: string[]): string[] {
  const matchedLinks: string[] = [];
  
  for (const keyword of keywords) {
    // Cari keyword dalam HTML (exact match)
    if (html.includes(keyword)) {
      // Cari link terdekat (dalam radius ~200 karakter)
      const keywordIndex = html.indexOf(keyword);
      const searchStart = Math.max(0, keywordIndex - 200);
      const searchEnd = Math.min(html.length, keywordIndex + keyword.length + 200);
      const nearbyHtml = html.substring(searchStart, searchEnd);
      
      // Extract links dari area sekitar keyword
      const linkRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
      const matches = [...nearbyHtml.matchAll(linkRegex)];
      matchedLinks.push(...matches.map(m => m[1]));
    }
  }
  
  return [...new Set(matchedLinks)];
}

// Gunakan filter baru
const linksToClick = findLinksNearKeywords(bodyHtml, keywords);
```

### Flow Lengkap

```text
Email masuk (webhook)
    ↓
Cek auto_click_links = true?
    ↓ Ya
Ambil auto_click_keywords dari settings
    ↓
Cari keyword di body email
    ↓ Ditemukan
Cari link terdekat dari keyword
    ↓
Klik hanya link yang dekat keyword
    ↓
Delay 10 detik per link
    ↓
Mark email as read
```

### File yang Akan Diubah

| File | Perubahan |
|------|-----------|
| Database | Tambah kolom `auto_click_keywords` di `mail_settings` |
| `src/components/mail/AutoClickSettingsDialog.tsx` | Komponen baru untuk popup settings |
| `src/pages/Mail.tsx` | Integrasi dialog + state management |
| `supabase/functions/inbound-mail-webhook/index.ts` | Filter link berdasarkan keyword |

### Catatan Teknis

| Aspek | Detail |
|-------|--------|
| Exact match | Keyword harus sama persis (case-sensitive) |
| Radius pencarian | 200 karakter sebelum/sesudah keyword |
| Default keyword | "Follow this link to verify your email address." |
| Multiple keywords | Bisa menambah banyak keyword |

