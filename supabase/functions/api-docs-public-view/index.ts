import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API Documentation data
const getApiDocsData = () => {
  const baseUrl = 'https://uqzzpxfmwhmhiqniiyjk.supabase.co/functions/v1/document-api';
  
  const requestSchema = {
    access_code: { type: 'string', required: true, description: 'Kode akses dari public link kontrak' },
    document_type: { type: 'string', required: false, description: 'Tipe dokumen: "invoice" atau "receipt"', default: 'invoice' }
  };

  const responseSchema = {
    success: { type: 'boolean', description: 'Status keberhasilan request' },
    data: {
      type: 'object',
      description: 'Data dokumen lengkap',
      properties: {
        contract: {
          type: 'object',
          description: 'Data kontrak',
          fields: [
            { name: 'id', type: 'string (UUID)', description: 'ID kontrak' },
            { name: 'nomor_invoice', type: 'string', description: 'Nomor invoice' },
            { name: 'tanggal', type: 'string (date)', description: 'Tanggal kontrak' },
            { name: 'total_harga', type: 'number', description: 'Total harga kontrak' },
            { name: 'jumlah_lunas', type: 'number', description: 'Jumlah yang sudah dibayar' },
            { name: 'tagihan_belum_bayar', type: 'number', description: 'Sisa tagihan' },
            { name: 'status', type: 'string', description: 'Status kontrak' },
            { name: 'lokasi', type: 'string', description: 'Lokasi proyek' },
            { name: 'tanggal_kirim', type: 'string (date)', description: 'Tanggal pengiriman' },
            { name: 'tanggal_ambil', type: 'string (date)', description: 'Tanggal pengambilan' },
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
        payments: {
          type: 'array',
          description: 'Riwayat pembayaran',
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
            { name: 'account_name', type: 'string', description: 'Nama pemilik rekening' },
          ]
        },
        settings: {
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
    }
  };

  const codeExamples = {
    javascript: `const response = await fetch('${baseUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY'
  },
  body: JSON.stringify({
    access_code: 'CTR-XXXXXXXX',
    document_type: 'invoice'
  })
});

const data = await response.json();
console.log(data);`,

    nodejs: `const axios = require('axios');

const response = await axios.post('${baseUrl}', {
  access_code: 'CTR-XXXXXXXX',
  document_type: 'invoice'
}, {
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY'
  }
});

console.log(response.data);`,

    python: `import requests

response = requests.post(
    '${baseUrl}',
    json={
        'access_code': 'CTR-XXXXXXXX',
        'document_type': 'invoice'
    },
    headers={
        'Content-Type': 'application/json',
        'x-api-key': 'YOUR_API_KEY'
    }
)

print(response.json())`,

    php: `<?php
$ch = curl_init('${baseUrl}');

curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-api-key: YOUR_API_KEY'
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'access_code' => 'CTR-XXXXXXXX',
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
    payload := map[string]string{
        "access_code":   "CTR-XXXXXXXX",
        "document_type": "invoice",
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

    curl: `curl -X POST '${baseUrl}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: YOUR_API_KEY' \\
  -d '{
    "access_code": "CTR-XXXXXXXX",
    "document_type": "invoice"
  }'`
  };

  const aiPrompts = {
    lengkap: `## INSTRUKSI UNTUK AI: DOCUMENT API INTEGRATION

Kamu adalah AI assistant yang akan membantu mengintegrasikan Document API untuk generate/render dokumen invoice dan receipt.

### INFORMASI API

**Base URL:** 
${baseUrl}

**Method:** POST

**Authentication:**
- Header: \`x-api-key\`
- Nilai: API Key yang diberikan oleh admin
- API Key hanya ditampilkan sekali saat generate, simpan dengan aman!

### REQUEST BODY

\`\`\`json
{
  "access_code": "CTR-XXXXXXXX",  // [REQUIRED] Kode akses dari public link kontrak
  "document_type": "invoice"      // [OPTIONAL] "invoice" atau "receipt", default: "invoice"
}
\`\`\`

### RESPONSE DATA

API akan mengembalikan data lengkap dalam format JSON:

1. **contract** - Data kontrak
   - \`id\` (UUID): ID kontrak
   - \`nomor_invoice\` (string): Nomor invoice
   - \`tanggal\` (date): Tanggal kontrak
   - \`total_harga\` (number): Total harga kontrak
   - \`jumlah_lunas\` (number): Jumlah yang sudah dibayar
   - \`tagihan_belum_bayar\` (number): Sisa tagihan
   - \`status\` (string): Status kontrak
   - \`lokasi\` (string): Lokasi proyek
   - \`tanggal_kirim\` (date): Tanggal pengiriman
   - \`tanggal_ambil\` (date): Tanggal pengambilan

2. **client** - Data klien
   - \`nama\` (string): Nama klien
   - \`nomor_telepon\` (string): Nomor telepon klien

3. **payments** - Riwayat pembayaran (array)
   - \`amount\` (number): Jumlah pembayaran
   - \`payment_date\` (date): Tanggal pembayaran
   - \`payment_number\` (number): Nomor urut pembayaran
   - \`notes\` (string): Catatan pembayaran

4. **bank_info** - Informasi bank
   - \`bank_name\` (string): Nama bank
   - \`account_number\` (string): Nomor rekening
   - \`account_name\` (string): Nama pemilik rekening

5. **settings** - Pengaturan template dokumen (150+ fields)
   Kategori:
   - Branding (15 fields): company_name, company_tagline, invoice_logo_url
   - Typography (12 fields): font_family, font_size_base, heading_font_family
   - Colors (20 fields): header_color_primary, accent_color, label_color
   - Layout (18 fields): paper_size, logo_position, header_style
   - Signature (25 fields): signature_url, signer_name, signature_position
   - Stamp (20 fields): stamp_type, stamp_color, stamp_position
   - Labels (10 fields): label_client, label_total, label_terbilang
   - Visibility (20 fields): show_header_stripe, show_qr_code, show_stamp
   - Payment (10 fields): payment_qr_enabled, payment_wa_number
   - Table (8 fields): table_header_bg, table_border_style
   - QR Code (6 fields): qr_size, qr_position, qr_include_amount
   - Watermark (6 fields): watermark_text, watermark_opacity

### CONTOH REQUEST (JavaScript)

\`\`\`javascript
const response = await fetch('${baseUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY'
  },
  body: JSON.stringify({
    access_code: 'CTR-XXXXXXXX',
    document_type: 'invoice'
  })
});

const data = await response.json();
\`\`\`

### TUGAS KAMU

Gunakan data dari API ini untuk membantu integrasi dengan sistem eksternal. Data settings berisi pengaturan lengkap untuk desain dokumen termasuk warna, font, posisi elemen, dll.`,

    ringkas: `## DOCUMENT API - Quick Reference

**URL:** ${baseUrl}
**Method:** POST
**Auth Header:** x-api-key: YOUR_API_KEY

### Request Body:
\`\`\`json
{
  "access_code": "CTR-XXXXXXXX",
  "document_type": "invoice"
}
\`\`\`

### Response Data:
- \`contract\`: Data kontrak (id, nomor_invoice, total_harga, status, dll)
- \`client\`: Data klien (nama, nomor_telepon)
- \`payments\`: Array riwayat pembayaran
- \`bank_info\`: Info rekening bank
- \`settings\`: 150+ pengaturan template (warna, font, posisi, dll)

### Contoh (JavaScript):
\`\`\`javascript
const res = await fetch('${baseUrl}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': 'KEY' },
  body: JSON.stringify({ access_code: 'CTR-XXXXXXXX' })
});
const data = await res.json();
\`\`\``,

    pdf_rendering: `## INSTRUKSI AI: PDF RENDERING DARI DOCUMENT API

Kamu akan membantu render dokumen PDF (invoice/receipt) menggunakan data dari Document API.

### API ENDPOINT
- **URL:** ${baseUrl}
- **Method:** POST
- **Auth:** Header \`x-api-key\` dengan API Key

### DATA YANG AKAN KAMU TERIMA

1. **contract** - Informasi utama dokumen:
   - nomor_invoice, tanggal, total_harga, jumlah_lunas, tagihan_belum_bayar
   - status pembayaran, lokasi, tanggal_kirim, tanggal_ambil

2. **client** - Penerima dokumen:
   - nama, nomor_telepon

3. **payments** - Untuk kwitansi:
   - Daftar pembayaran dengan amount, payment_date, notes

4. **bank_info** - Info transfer:
   - bank_name, account_number, account_name

5. **settings** - PENTING untuk desain PDF:
   
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
   - signer_title, signer_title_position_x/y
   
   **Stamp:**
   - stamp_type, stamp_color, stamp_opacity
   - stamp_position_x/y, stamp_rotation
   - stamp_text, custom_stamp_url
   
   **Visibility flags:**
   - show_header_stripe, show_qr_code, show_stamp
   - show_signature, show_bank_info, show_terbilang

### TUGAS KAMU

1. Panggil API dengan access_code yang diberikan
2. Gunakan data settings untuk menentukan styling PDF
3. Posisi elemen (signature, stamp) sudah dalam milimeter
4. Render sesuai dengan visibility flags (show_*)
5. Format angka sebagai Rupiah (Rp X.XXX.XXX)`
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
    ai_prompts: aiPrompts
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
