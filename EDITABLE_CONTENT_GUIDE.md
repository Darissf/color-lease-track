# Live Editable Content System - Guide

## Overview
Sistem live editable content memungkinkan Super Admin untuk mengedit semua teks di aplikasi secara langsung tanpa perlu mengubah kode.

## Fitur Utama

### 1. **EditableText Component**
Component wrapper yang membuat text editable untuk super admin.

### 2. **Edit Mode Toggle**
Tombol floating di kanan bawah untuk mengaktifkan/nonaktifkan mode edit.

### 3. **Content Management Dashboard**
Halaman admin untuk melihat dan mengelola semua konten yang telah diedit.

### 4. **Real-time Sync**
Perubahan tersimpan otomatis dan langsung terlihat di semua user.

## Cara Menggunakan

### Untuk Super Admin:

1. **Login sebagai Super Admin**
   - Email: admin@admin.com
   - Password: admin

2. **Aktifkan Edit Mode**
   - Klik tombol "Mode Edit: OFF" di kanan bawah
   - Tombol akan berubah menjadi kuning "Mode Edit: ON"

3. **Edit Text**
   - Double-click pada text yang ingin diedit
   - Text akan berubah menjadi input field
   - Ketik perubahan yang diinginkan
   - Tekan Enter atau click di luar untuk save
   - Tekan Escape untuk cancel

4. **Manage Content**
   - Buka menu "Content Management" di sidebar
   - Lihat semua konten yang telah diedit
   - Hapus konten untuk kembali ke default
   - Search konten berdasarkan key, value, atau page

## Cara Implementasi di Kode

### Basic Usage:

```tsx
import { EditableText } from "@/components/EditableText";

// Contoh sederhana
<EditableText
  contentKey="page.section.element"
  defaultValue="Text yang akan ditampilkan"
/>

// Dengan custom element dan styling
<EditableText
  contentKey="home.title"
  defaultValue="Welcome to My App"
  as="h1"
  category="heading"
  className="text-4xl font-bold"
/>

// Nested dalam element lain
<div className="card">
  <EditableText
    contentKey="card.title"
    defaultValue="Card Title"
    as="h3"
    className="font-semibold"
  />
</div>
```

### Props:

- **contentKey** (required): Unique identifier untuk konten (gunakan format: page.section.element)
- **defaultValue** (required): Text default yang ditampilkan
- **as** (optional): HTML element yang digunakan (default: "span")
- **category** (optional): Kategori konten untuk filtering (default: "general")
- **className** (optional): CSS classes tambahan

### Naming Convention untuk contentKey:

Gunakan format hierarkis yang jelas:
- `page.section.element`
- `home.header.title`
- `dashboard.card.income.label`
- `settings.form.email.placeholder`

## Best Practices

### 1. **Konsisten dengan Naming**
```tsx
// ✅ GOOD
contentKey="home.hero.title"
contentKey="home.hero.subtitle"
contentKey="home.features.card1.title"

// ❌ BAD
contentKey="title1"
contentKey="homeSubtitle"
contentKey="card_title_feature_1"
```

### 2. **Gunakan Categories**
```tsx
// Kategorikan untuk filtering yang lebih mudah
category="heading"      // untuk judul halaman
category="card-title"   // untuk judul card
category="button"       // untuk text button
category="description"  // untuk deskripsi
category="label"        // untuk form labels
```

### 3. **Set Default Value yang Bermakna**
```tsx
// ✅ GOOD
defaultValue="Selamat Datang di Aplikasi Kami"

// ❌ BAD
defaultValue="Title Here"
defaultValue="Lorem ipsum"
```

### 4. **Gunakan EditableText untuk Semua Static Text**
Wrap semua text yang mungkin perlu diubah:
- Judul halaman
- Deskripsi
- Label
- Button text
- Placeholder text
- Error messages
- Success messages

### 5. **Jangan Gunakan untuk Dynamic Content**
```tsx
// ❌ JANGAN digunakan untuk data dari database
<EditableText 
  contentKey="user.name" 
  defaultValue={user.name} 
/>

// ✅ Gunakan untuk static UI text saja
<EditableText 
  contentKey="profile.label.username" 
  defaultValue="Username:" 
/>
<span>{user.name}</span>
```

## Database Structure

### Table: editable_content

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| content_key | text | Unique identifier |
| content_value | text | Nilai konten yang disimpan |
| page | text | Halaman dimana konten berada |
| category | text | Kategori konten |
| created_by | uuid | User yang membuat |
| updated_by | uuid | User yang terakhir update |
| created_at | timestamp | Waktu dibuat |
| updated_at | timestamp | Waktu diupdate |

## Security

### Row Level Security (RLS):
- ✅ Semua user dapat **melihat** konten (SELECT)
- ✅ Hanya Super Admin dapat **membuat** konten (INSERT)
- ✅ Hanya Super Admin dapat **mengupdate** konten (UPDATE)
- ✅ Hanya Super Admin dapat **menghapus** konten (DELETE)

### Access Control:
- Edit mode hanya tersedia untuk Super Admin
- Button edit mode tidak muncul untuk user biasa
- Content Management page protected dengan role check

## Troubleshooting

### Text tidak editable
- Pastikan Anda login sebagai Super Admin
- Pastikan Edit Mode sudah diaktifkan (tombol kuning)
- Pastikan component menggunakan EditableText wrapper

### Perubahan tidak tersimpan
- Check console untuk error messages
- Pastikan database connection aktif
- Pastikan RLS policies sudah benar

### Content tidak sync
- Check realtime subscription di context
- Refresh browser untuk force reload
- Check network tab untuk websocket connection

## Automatic Application to New Features

Sistem ini **otomatis berlaku** untuk fitur baru dengan cara:

1. **Selalu gunakan EditableText component** untuk semua static text
2. **Context Provider sudah di App level** - semua component otomatis punya akses
3. **Edit Mode Toggle ada di Layout** - tersedia di semua halaman
4. **Realtime sync aktif** - perubahan langsung terlihat

### Template untuk Halaman Baru:

```tsx
import { EditableText } from "@/components/EditableText";

export default function NewPage() {
  return (
    <div>
      <EditableText
        contentKey="newpage.title"
        defaultValue="New Page Title"
        as="h1"
        className="text-3xl font-bold"
      />
      
      <EditableText
        contentKey="newpage.description"
        defaultValue="This is a new page"
        as="p"
      />
      
      {/* Rest of your content */}
    </div>
  );
}
```

## API Reference

### useEditableContent Hook

```tsx
import { useEditableContent } from "@/contexts/EditableContentContext";

const {
  isEditMode,        // boolean: mode edit aktif/tidak
  isSuperAdmin,      // boolean: user adalah super admin
  content,           // object: semua konten yang tersimpan
  getContent,        // function: ambil konten by key
  updateContent,     // function: update konten
  toggleEditMode     // function: toggle edit mode
} = useEditableContent();
```

## Examples

### Complete Page Example:

```tsx
import { EditableText } from "@/components/EditableText";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="container mx-auto py-8">
      <EditableText
        contentKey="about.hero.title"
        defaultValue="About Our Company"
        as="h1"
        category="heading"
        className="text-4xl font-bold mb-4"
      />
      
      <EditableText
        contentKey="about.hero.subtitle"
        defaultValue="Learn more about who we are"
        as="p"
        category="heading"
        className="text-xl text-muted-foreground mb-8"
      />
      
      <Card className="p-6">
        <EditableText
          contentKey="about.mission.title"
          defaultValue="Our Mission"
          as="h2"
          category="section-title"
          className="text-2xl font-semibold mb-3"
        />
        
        <EditableText
          contentKey="about.mission.description"
          defaultValue="We strive to make financial management accessible to everyone."
          as="p"
          category="section-description"
          className="text-muted-foreground"
        />
      </Card>
      
      <Button className="mt-6">
        <EditableText
          contentKey="about.cta.button"
          defaultValue="Contact Us"
          category="button"
        />
      </Button>
    </div>
  );
}
```

## Support

Untuk pertanyaan atau masalah, hubungi tim development atau buat issue di repository project.
