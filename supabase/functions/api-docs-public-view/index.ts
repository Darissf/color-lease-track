import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API Documentation data
const getApiDocsData = () => {
  const baseUrl = 'https://uqzzpxfmwhmhiqniiyjk.supabase.co/functions/v1/document-api';
  
  const requestSchema = {
    access_code: { type: 'string', required: false, description: 'Kode akses temporary dari public link kontrak (ATAU invoice_number)' },
    invoice_number: { type: 'string', required: false, description: 'Nomor invoice permanen (RECOMMENDED untuk integrasi)' },
    document_type: { type: 'string', required: true, description: 'Tipe dokumen: "invoice" atau "kwitansi"' },
    payment_id: { type: 'string', required: false, description: 'UUID payment untuk kwitansi spesifik (optional)' }
  };

  const responseSchema = {
    success: { type: 'boolean', description: 'Status keberhasilan request' },
    access_method: { type: 'string', description: 'Metode akses yang digunakan: "invoice_number" atau "access_code"' },
    api_version: { type: 'string', description: 'Versi API (current: 1.1)' },
    data: {
      type: 'object',
      description: 'Data dokumen lengkap',
      properties: {
        contract: {
          type: 'object',
          description: 'Data kontrak',
          fields: [
            { name: 'id', type: 'string (UUID)', description: 'ID kontrak' },
            { name: 'invoice', type: 'string', description: 'Nomor invoice' },
            { name: 'tanggal', type: 'string (date)', description: 'Tanggal kontrak' },
            { name: 'tagihan', type: 'number', description: 'Total tagihan' },
            { name: 'jumlah_lunas', type: 'number', description: 'Jumlah yang sudah dibayar' },
            { name: 'tagihan_belum_bayar', type: 'number', description: 'Sisa tagihan' },
            { name: 'status', type: 'string', description: 'Status kontrak' },
            { name: 'start_date', type: 'string (date)', description: 'Tanggal mulai' },
            { name: 'end_date', type: 'string (date)', description: 'Tanggal selesai' },
          ]
        },
        client: {
          type: 'object',
          description: 'Data klien',
          fields: [
            { name: 'nama', type: 'string', description: 'Nama klien' },
            { name: 'nomor_telepon', type: 'string', description: 'Nomor telepon klien' },
          ]
        },
        payment: {
          type: 'object',
          description: 'Data pembayaran (untuk kwitansi)',
          fields: [
            { name: 'amount', type: 'number', description: 'Jumlah pembayaran' },
            { name: 'payment_date', type: 'string (date)', description: 'Tanggal pembayaran' },
            { name: 'payment_number', type: 'number', description: 'Nomor urut pembayaran' },
            { name: 'notes', type: 'string', description: 'Catatan pembayaran' },
          ]
        },
        bank_info: {
          type: 'object',
          description: 'Informasi bank untuk transfer',
          fields: [
            { name: 'bank_name', type: 'string', description: 'Nama bank' },
            { name: 'account_number', type: 'string', description: 'Nomor rekening' },
            { name: 'account_holder_name', type: 'string', description: 'Nama pemilik rekening' },
          ]
        },
        template_settings: {
          type: 'object',
          description: 'Pengaturan template dokumen (150+ fields)',
          categories: [
            { name: 'Branding', count: 15, examples: ['company_name', 'company_tagline', 'invoice_logo_url'] },
            { name: 'Typography', count: 12, examples: ['font_family', 'font_size_base', 'heading_font_family'] },
            { name: 'Colors', count: 20, examples: ['header_color_primary', 'accent_color', 'label_color'] },
            { name: 'Layout', count: 18, examples: ['paper_size', 'logo_position', 'header_style'] },
            { name: 'Signature', count: 25, examples: ['signature_url', 'signer_name', 'signature_position'] },
            { name: 'Stamp', count: 20, examples: ['stamp_type', 'stamp_color', 'stamp_position'] },
            { name: 'Labels', count: 10, examples: ['label_client', 'label_total', 'label_terbilang'] },
            { name: 'Visibility', count: 20, examples: ['show_header_stripe', 'show_qr_code', 'show_stamp'] },
            { name: 'Payment', count: 10, examples: ['payment_qr_enabled', 'payment_wa_number'] },
            { name: 'Table', count: 8, examples: ['table_header_bg', 'table_border_style'] },
            { name: 'QR Code', count: 6, examples: ['qr_size', 'qr_position', 'qr_include_amount'] },
            { name: 'Watermark', count: 6, examples: ['watermark_text', 'watermark_opacity'] },
          ]
        }
      }
    },
    rate_limits: {
      type: 'object',
      description: 'Informasi rate limit',
      fields: [
        { name: 'per_api_key', type: 'string', description: '100 requests/minute per API key' },
        { name: 'per_invoice', type: 'string', description: '10 requests/minute per invoice' },
      ]
    }
  };

  const codeExamples = {
    javascript: `// RECOMMENDED: Menggunakan invoice_number (permanen)
const response = await fetch('${baseUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY'
  },
  body: JSON.stringify({
    invoice_number: '000254',  // Nomor invoice (RECOMMENDED)
    document_type: 'invoice'
  })
});

const data = await response.json();
console.log(data);

// ALTERNATIVE: Menggunakan access_code (temporary)
const response2 = await fetch('${baseUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY'
  },
  body: JSON.stringify({
    access_code: 'CTR-XXXXXXXX',  // Kode akses temporary
    document_type: 'invoice'
  })
});`,

    nodejs: `const axios = require('axios');

// RECOMMENDED: Menggunakan invoice_number
const response = await axios.post('${baseUrl}', {
  invoice_number: '000254',
  document_type: 'invoice'
}, {
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY'
  }
});

console.log(response.data);`,

    python: `import requests

# RECOMMENDED: Menggunakan invoice_number
response = requests.post(
    '${baseUrl}',
    json={
        'invoice_number': '000254',  # Nomor invoice (RECOMMENDED)
        'document_type': 'invoice'
    },
    headers={
        'Content-Type': 'application/json',
        'x-api-key': 'YOUR_API_KEY'
    }
)

print(response.json())`,

    php: `<?php
// RECOMMENDED: Menggunakan invoice_number
$ch = curl_init('${baseUrl}');

curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-api-key: YOUR_API_KEY'
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'invoice_number' => '000254',  // Nomor invoice (RECOMMENDED)
        'document_type' => 'invoice'
    ])
]);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
print_r($data);`,

    go: `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

func main() {
    // RECOMMENDED: Menggunakan invoice_number
    payload := map[string]string{
        "invoice_number": "000254",  // Nomor invoice (RECOMMENDED)
        "document_type":  "invoice",
    }
    jsonPayload, _ := json.Marshal(payload)

    req, _ := http.NewRequest("POST", "${baseUrl}", bytes.NewBuffer(jsonPayload))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("x-api-key", "YOUR_API_KEY")

    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    fmt.Println(string(body))
}`,

    curl: `# RECOMMENDED: Menggunakan invoice_number (permanen)
curl -X POST '${baseUrl}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: YOUR_API_KEY' \\
  -d '{
    "invoice_number": "000254",
    "document_type": "invoice"
  }'

# ALTERNATIVE: Menggunakan access_code (temporary)
curl -X POST '${baseUrl}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: YOUR_API_KEY' \\
  -d '{
    "access_code": "CTR-XXXXXXXX",
    "document_type": "invoice"
  }'`
  };

  const aiPrompts = {
    lengkap: `## INSTRUKSI UNTUK AI: DOCUMENT API INTEGRATION v1.1

Kamu adalah AI assistant yang akan membantu mengintegrasikan Document API untuk generate/render dokumen invoice dan kwitansi.

### INFORMASI API

**Base URL:** 
${baseUrl}

**Method:** POST

**Authentication:**
- Header: \`x-api-key\`
- Nilai: API Key yang diberikan oleh admin
- API Key hanya ditampilkan sekali saat generate, simpan dengan aman!

### DUA METODE AKSES (BARU di v1.1!)

**1. invoice_number (RECOMMENDED - Permanen)**
Gunakan nomor invoice langsung. Tidak expired, cocok untuk integrasi jangka panjang.

\`\`\`json
{
  "invoice_number": "000254",
  "document_type": "invoice"
}
\`\`\`

**2. access_code (Alternative - Temporary)**
Gunakan kode akses dari public link. Ada masa expired.

\`\`\`json
{
  "access_code": "CTR-XXXXXXXX",
  "document_type": "invoice"
}
\`\`\`

### RATE LIMITS

- **Per API Key:** 100 requests/menit
- **Per Invoice:** 10 requests/menit
- **Lockout:** 5x gagal berturut-turut = lockout 15 menit

### RESPONSE DATA

API akan mengembalikan data lengkap dalam format JSON:

1. **contract** - Data kontrak
   - \`id\` (UUID): ID kontrak
   - \`invoice\` (string): Nomor invoice
   - \`tanggal\` (date): Tanggal kontrak
   - \`tagihan\` (number): Total tagihan
   - \`jumlah_lunas\` (number): Jumlah yang sudah dibayar
   - \`tagihan_belum_bayar\` (number): Sisa tagihan
   - \`status\` (string): Status kontrak (lunas/belum_lunas)

2. **client** - Data klien
   - \`nama\` (string): Nama klien
   - \`nomor_telepon\` (string): Nomor telepon klien

3. **payment** - Data pembayaran (untuk kwitansi)
   - \`amount\` (number): Jumlah pembayaran
   - \`payment_date\` (date): Tanggal pembayaran
   - \`payment_number\` (number): Nomor urut pembayaran

4. **bank_info** - Informasi bank
   - \`bank_name\` (string): Nama bank
   - \`account_number\` (string): Nomor rekening
   - \`account_holder_name\` (string): Nama pemilik rekening

5. **template_settings** - Pengaturan template dokumen (150+ fields)
   Kategori: Branding, Typography, Colors, Layout, Signature, Stamp, Labels, Visibility, Payment, Table, QR Code, Watermark

### CONTOH REQUEST (JavaScript)

\`\`\`javascript
// RECOMMENDED: Gunakan invoice_number
const response = await fetch('${baseUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY'
  },
  body: JSON.stringify({
    invoice_number: '000254',
    document_type: 'invoice'
  })
});

const data = await response.json();
console.log(data);
\`\`\`

### ERROR RESPONSES

| Code | Error | Penjelasan |
|------|-------|------------|
| 400 | Missing required fields | access_code atau invoice_number harus ada |
| 401 | Invalid API key | API key tidak valid atau tidak aktif |
| 403 | Access disabled | Akses API dinonaktifkan untuk kontrak ini |
| 404 | Not found | Invoice atau access_code tidak ditemukan |
| 429 | Rate limit exceeded | Terlalu banyak request, coba lagi nanti |

### TUGAS KAMU

Gunakan data dari API ini untuk membantu integrasi dengan sistem eksternal. Data template_settings berisi pengaturan lengkap untuk desain dokumen termasuk warna, font, posisi elemen, dll.`,

    ringkas: `## DOCUMENT API v1.1 - Quick Reference

**URL:** ${baseUrl}
**Method:** POST
**Auth Header:** x-api-key: YOUR_API_KEY

### Dua Metode Akses:

**1. invoice_number (RECOMMENDED):**
\`\`\`json
{ "invoice_number": "000254", "document_type": "invoice" }
\`\`\`

**2. access_code (temporary):**
\`\`\`json
{ "access_code": "CTR-XXX", "document_type": "invoice" }
\`\`\`

### Rate Limits:
- 100 req/min per API key
- 10 req/min per invoice

### Response Data:
- \`contract\`: Data kontrak (invoice, tanggal, tagihan, status)
- \`client\`: Data klien (nama, nomor_telepon)
- \`payment\`: Data pembayaran (untuk kwitansi)
- \`bank_info\`: Info rekening bank
- \`template_settings\`: 150+ pengaturan template

### Contoh (JavaScript):
\`\`\`javascript
const res = await fetch('${baseUrl}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': 'KEY' },
  body: JSON.stringify({ invoice_number: '000254', document_type: 'invoice' })
});
const data = await res.json();
\`\`\``,

    pdf_rendering: `## INSTRUKSI AI: PDF RENDERING DARI DOCUMENT API v1.1

Kamu akan membantu render dokumen PDF (invoice/kwitansi) menggunakan data dari Document API.

### API ENDPOINT
- **URL:** ${baseUrl}
- **Method:** POST
- **Auth:** Header \`x-api-key\` dengan API Key

### AKSES DATA (Pilih Salah Satu)

**RECOMMENDED - via invoice_number:**
\`\`\`json
{ "invoice_number": "000254", "document_type": "invoice" }
\`\`\`

**Alternative - via access_code:**
\`\`\`json
{ "access_code": "CTR-XXX", "document_type": "invoice" }
\`\`\`

### DATA YANG AKAN KAMU TERIMA

1. **contract** - Informasi utama dokumen:
   - invoice, tanggal, tagihan, jumlah_lunas, tagihan_belum_bayar
   - status pembayaran, start_date, end_date

2. **client** - Penerima dokumen:
   - nama, nomor_telepon

3. **payment** - Untuk kwitansi:
   - amount, payment_date, payment_number, notes

4. **bank_info** - Info transfer:
   - bank_name, account_number, account_holder_name

5. **template_settings** - PENTING untuk desain PDF:
   
   **Branding:**
   - company_name, company_tagline, invoice_logo_url
   - company_address, company_phone, company_email
   
   **Typography:**
   - font_family, font_size_base, heading_font_family
   
   **Warna (gunakan untuk styling):**
   - header_color_primary, header_color_secondary
   - accent_color, label_color, value_color
   - table_header_bg, table_header_text_color
   
   **Layout:**
   - paper_size (A4), logo_position
   - header_style, header_stripe_height
   
   **Signature (posisi dalam mm dari top-left):**
   - signature_url, signature_scale
   - signature_label_position_x/y
   - signer_name, signer_name_position_x/y
   
   **Stamp:**
   - stamp_type, stamp_color, stamp_opacity
   - stamp_position_x/y, stamp_rotation
   
   **Visibility flags:**
   - show_header_stripe, show_qr_code, show_stamp
   - show_signature, show_bank_info, show_terbilang

### WORKFLOW RENDERING

1. Panggil API dengan invoice_number atau access_code
2. Gunakan data template_settings untuk styling PDF
3. Posisi elemen (signature, stamp) sudah dalam milimeter
4. Render sesuai dengan visibility flags (show_*)
5. Format angka sebagai Rupiah (Rp X.XXX.XXX)`
  };

  const updateInfo = {
    version: '1.1',
    changes: [
      {
        title: 'Dual Access Method',
        description: 'Sekarang bisa akses via invoice_number (permanen) atau access_code (temporary)'
      },
      {
        title: 'Rate Limiting',
        description: '100 req/min per API key, 10 req/min per invoice, lockout setelah 5x gagal'
      },
      {
        title: 'Access Logging',
        description: 'Semua akses API tercatat untuk audit trail'
      },
      {
        title: 'Revocation Support',
        description: 'Admin bisa menonaktifkan akses API per kontrak'
      }
    ],
    migration: {
      from: 'access_code only',
      to: 'invoice_number (recommended) atau access_code',
      backward_compatible: true
    }
  };

  const authentication = {
    method: 'API Key',
    header: 'x-api-key',
    description: 'API Key dikirim melalui header x-api-key. Key bisa di-generate dari halaman API Documentation.',
    note: 'API Key hanya ditampilkan sekali saat generate. Simpan dengan aman!'
  };

  return {
    version: '1.1.0',
    base_url: baseUrl,
    authentication,
    request_schema: requestSchema,
    response_schema: responseSchema,
    code_examples: codeExamples,
    ai_prompts: aiPrompts,
    update_info: updateInfo
  };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const accessCode = url.searchParams.get('access_code');

    if (!accessCode) {
      return new Response(
        JSON.stringify({ error: 'access_code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate access code and check expiration
    const { data: linkData, error: linkError } = await supabase
      .from('api_docs_public_links')
      .select('*')
      .eq('access_code', accessCode)
      .eq('is_active', true)
      .single();

    if (linkError || !linkData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive access code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (new Date(linkData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          error: 'Link has expired',
          expired_at: linkData.expires_at 
        }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment view count
    await supabase.rpc('increment_api_docs_link_views', { p_access_code: accessCode });

    // Return API documentation data
    const apiDocsData = getApiDocsData();

    return new Response(
      JSON.stringify({
        success: true,
        access_code: accessCode,
        expires_at: linkData.expires_at,
        view_count: linkData.view_count + 1,
        data: apiDocsData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
