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
    api_version: { type: 'string', description: 'Versi API (current: 1.4)' },
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
            { name: 'jumlah_lunas', type: 'number', description: 'Jumlah yang sudah dibayar (NEW v1.2)' },
            { name: 'tanggal_lunas', type: 'string (date) | null', description: 'Tanggal lunas terakhir (NEW v1.2)' },
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
        line_items: {
          type: 'array',
          description: 'Data rincian item tagihan untuk halaman 2 (NEW v1.2)',
          fields: [
            { name: 'item_name', type: 'string', description: 'Nama item' },
            { name: 'quantity', type: 'number', description: 'Jumlah unit' },
            { name: 'unit_price_per_day', type: 'number', description: 'Harga per unit per hari' },
            { name: 'duration_days', type: 'number', description: 'Durasi sewa (hari)' },
            { name: 'subtotal', type: 'number', description: 'Subtotal item (qty × price × days)' },
            { name: 'sort_order', type: 'number', description: 'Urutan tampilan' }
          ]
        },
        page_2_settings: {
          type: 'object',
          description: 'Pengaturan khusus halaman 2 invoice (NEW v1.2)',
          fields: [
            { name: 'transport_delivery', type: 'number', description: 'Biaya antar' },
            { name: 'transport_pickup', type: 'number', description: 'Biaya jemput' },
            { name: 'discount', type: 'number', description: 'Diskon' },
            { name: 'full_rincian', type: 'boolean', description: 'Mode tampilan (true=full table, false=simplified)' }
          ]
        },
        template_settings: {
          type: 'object',
          description: 'Pengaturan template dokumen (150+ fields)',
          categories: [
            { 
              name: 'Branding', 
              count: 15, 
              examples: ['company_name', 'company_tagline', 'invoice_logo_url'],
              fields: [
                { name: 'company_name', type: 'string', description: 'Nama perusahaan' },
                { name: 'company_tagline', type: 'string', description: 'Tagline perusahaan' },
                { name: 'company_address', type: 'string', description: 'Alamat perusahaan' },
                { name: 'company_phone', type: 'string', description: 'Nomor telepon perusahaan' },
                { name: 'company_email', type: 'string', description: 'Email perusahaan' },
                { name: 'company_website', type: 'string', description: 'Website perusahaan' },
                { name: 'company_npwp', type: 'string', description: 'NPWP perusahaan' },
                { name: 'owner_name', type: 'string', description: 'Nama pemilik' },
                { name: 'invoice_logo_url', type: 'string', description: 'URL logo invoice' },
                { name: 'bank_logo_url', type: 'string', description: 'URL logo bank' },
                { name: 'bank_name', type: 'string', description: 'Nama bank' },
                { name: 'bank_account_number', type: 'string', description: 'Nomor rekening' },
                { name: 'bank_account_name', type: 'string', description: 'Nama pemilik rekening' },
                { name: 'document_title', type: 'string', description: 'Judul dokumen (INVOICE/KWITANSI)' },
                { name: 'receipt_title', type: 'string', description: 'Judul kwitansi' }
              ]
            },
            { 
              name: 'Typography', 
              count: 12, 
              examples: ['font_family', 'font_size_base', 'heading_font_family'],
              fields: [
                { name: 'font_family', type: 'string', description: 'Font utama dokumen' },
                { name: 'heading_font_family', type: 'string', description: 'Font untuk heading' },
                { name: 'font_size_base', type: 'number', description: 'Ukuran font dasar (px)' },
                { name: 'signature_label_font_family', type: 'string', description: 'Font label tanda tangan' },
                { name: 'signature_label_font_size', type: 'number', description: 'Ukuran font label tanda tangan' },
                { name: 'signature_label_font_weight', type: 'string', description: 'Ketebalan font label tanda tangan' },
                { name: 'signature_label_font_style', type: 'string', description: 'Style font label tanda tangan' },
                { name: 'signer_name_font_family', type: 'string', description: 'Font nama penandatangan' },
                { name: 'signer_name_font_size', type: 'number', description: 'Ukuran font nama penandatangan' },
                { name: 'signer_title_font_family', type: 'string', description: 'Font jabatan penandatangan' },
                { name: 'signer_title_font_size', type: 'number', description: 'Ukuran font jabatan' },
                { name: 'stamp_font_family', type: 'string', description: 'Font untuk stamp' }
              ]
            },
            { 
              name: 'Colors', 
              count: 20, 
              examples: ['header_color_primary', 'accent_color', 'label_color'],
              fields: [
                { name: 'header_color_primary', type: 'string', description: 'Warna utama header' },
                { name: 'header_color_secondary', type: 'string', description: 'Warna sekunder header' },
                { name: 'accent_color', type: 'string', description: 'Warna aksen' },
                { name: 'border_color', type: 'string', description: 'Warna border' },
                { name: 'label_color', type: 'string', description: 'Warna label' },
                { name: 'value_color', type: 'string', description: 'Warna nilai/value' },
                { name: 'company_name_color', type: 'string', description: 'Warna nama perusahaan' },
                { name: 'company_info_color', type: 'string', description: 'Warna info perusahaan' },
                { name: 'tagline_color', type: 'string', description: 'Warna tagline' },
                { name: 'document_title_color', type: 'string', description: 'Warna judul dokumen' },
                { name: 'table_header_bg', type: 'string', description: 'Warna background header tabel' },
                { name: 'table_header_text_color', type: 'string', description: 'Warna teks header tabel' },
                { name: 'table_alternating_color', type: 'string', description: 'Warna baris alternating' },
                { name: 'signature_label_color', type: 'string', description: 'Warna label tanda tangan' },
                { name: 'signer_name_color', type: 'string', description: 'Warna nama penandatangan' },
                { name: 'signer_title_color', type: 'string', description: 'Warna jabatan penandatangan' },
                { name: 'stamp_color', type: 'string', description: 'Warna stamp (default)' },
                { name: 'stamp_color_lunas', type: 'string', description: 'Warna stamp LUNAS' },
                { name: 'stamp_color_belum_lunas', type: 'string', description: 'Warna stamp BELUM LUNAS' },
                { name: 'stamp_border_color', type: 'string', description: 'Warna border stamp' }
              ]
            },
            { 
              name: 'Layout', 
              count: 18, 
              examples: ['paper_size', 'logo_position', 'header_style'],
              fields: [
                { name: 'paper_size', type: 'string', description: 'Ukuran kertas (A4/Letter)' },
                { name: 'logo_position', type: 'string', description: 'Posisi logo (left/center/right)' },
                { name: 'header_style', type: 'string', description: 'Style header (modern/classic/minimal)' },
                { name: 'header_stripe_style', type: 'string', description: 'Style stripe header' },
                { name: 'header_stripe_height', type: 'number', description: 'Tinggi stripe header (px)' },
                { name: 'template_style', type: 'string', description: 'Style template keseluruhan' },
                { name: 'color_preset', type: 'string', description: 'Preset warna yang digunakan' },
                { name: 'signature_position', type: 'string', description: 'Posisi tanda tangan' },
                { name: 'signature_scale', type: 'number', description: 'Skala tanda tangan (0.1-2)' },
                { name: 'stamp_position', type: 'string', description: 'Posisi stamp' },
                { name: 'stamp_scale', type: 'number', description: 'Skala stamp (0.1-2)' },
                { name: 'stamp_rotation', type: 'number', description: 'Rotasi stamp (derajat)' },
                { name: 'stamp_opacity', type: 'number', description: 'Opacity stamp (0-1)' },
                { name: 'stamp_size', type: 'string', description: 'Ukuran stamp (small/medium/large)' },
                { name: 'qr_position', type: 'string', description: 'Posisi QR code' },
                { name: 'qr_size', type: 'number', description: 'Ukuran QR code (px)' },
                { name: 'watermark_rotation', type: 'number', description: 'Rotasi watermark (derajat)' },
                { name: 'watermark_size', type: 'number', description: 'Ukuran watermark' }
              ]
            },
            { 
              name: 'Signature', 
              count: 25, 
              examples: ['signature_url', 'signer_name', 'signature_position'],
              fields: [
                { name: 'signature_url', type: 'string', description: 'URL gambar tanda tangan' },
                { name: 'signature_image_url', type: 'string', description: 'URL gambar tanda tangan (alias)' },
                { name: 'signer_name', type: 'string', description: 'Nama penandatangan' },
                { name: 'signer_title', type: 'string', description: 'Jabatan penandatangan' },
                { name: 'signature_label', type: 'string', description: 'Label tanda tangan (Hormat kami)' },
                { name: 'signature_position', type: 'string', description: 'Posisi tanda tangan' },
                { name: 'signature_scale', type: 'number', description: 'Skala tanda tangan' },
                { name: 'signature_label_position_x', type: 'number', description: 'Posisi X label (%)' },
                { name: 'signature_label_position_y', type: 'number', description: 'Posisi Y label (mm)' },
                { name: 'signer_name_position_x', type: 'number', description: 'Posisi X nama (%)' },
                { name: 'signer_name_position_y', type: 'number', description: 'Posisi Y nama (mm)' },
                { name: 'signer_title_position_x', type: 'number', description: 'Posisi X jabatan (%)' },
                { name: 'signer_title_position_y', type: 'number', description: 'Posisi Y jabatan (mm)' },
                { name: 'signature_label_font_family', type: 'string', description: 'Font label' },
                { name: 'signature_label_font_size', type: 'number', description: 'Ukuran font label' },
                { name: 'signature_label_font_weight', type: 'string', description: 'Ketebalan font label' },
                { name: 'signature_label_font_style', type: 'string', description: 'Style font label' },
                { name: 'signature_label_color', type: 'string', description: 'Warna label' },
                { name: 'signer_name_font_family', type: 'string', description: 'Font nama' },
                { name: 'signer_name_font_size', type: 'number', description: 'Ukuran font nama' },
                { name: 'signer_name_font_weight', type: 'string', description: 'Ketebalan font nama' },
                { name: 'signer_name_color', type: 'string', description: 'Warna nama' },
                { name: 'signer_title_font_family', type: 'string', description: 'Font jabatan' },
                { name: 'signer_title_font_size', type: 'number', description: 'Ukuran font jabatan' },
                { name: 'signer_title_color', type: 'string', description: 'Warna jabatan' }
              ]
            },
            { 
              name: 'Stamp', 
              count: 20, 
              examples: ['stamp_type', 'stamp_color', 'stamp_position'],
              fields: [
                { name: 'stamp_type', type: 'string', description: 'Tipe stamp (status/custom/image)' },
                { name: 'stamp_source', type: 'string', description: 'Sumber stamp (generated/uploaded)' },
                { name: 'stamp_text', type: 'string', description: 'Teks stamp' },
                { name: 'stamp_custom_text', type: 'string', description: 'Teks custom stamp' },
                { name: 'stamp_use_custom_text', type: 'boolean', description: 'Gunakan teks custom' },
                { name: 'custom_stamp_url', type: 'string', description: 'URL gambar stamp custom' },
                { name: 'stamp_color', type: 'string', description: 'Warna stamp default' },
                { name: 'stamp_color_lunas', type: 'string', description: 'Warna stamp LUNAS' },
                { name: 'stamp_color_belum_lunas', type: 'string', description: 'Warna stamp BELUM LUNAS' },
                { name: 'stamp_position', type: 'string', description: 'Posisi stamp' },
                { name: 'stamp_position_x', type: 'number', description: 'Posisi X stamp (%)' },
                { name: 'stamp_position_y', type: 'number', description: 'Posisi Y stamp (mm)' },
                { name: 'stamp_scale', type: 'number', description: 'Skala stamp' },
                { name: 'stamp_rotation', type: 'number', description: 'Rotasi stamp (derajat)' },
                { name: 'stamp_opacity', type: 'number', description: 'Opacity stamp (0-1)' },
                { name: 'stamp_size', type: 'string', description: 'Ukuran stamp' },
                { name: 'stamp_font_family', type: 'string', description: 'Font stamp' },
                { name: 'stamp_font_size', type: 'number', description: 'Ukuran font stamp' },
                { name: 'stamp_border_style', type: 'string', description: 'Style border stamp' },
                { name: 'stamp_border_width', type: 'number', description: 'Lebar border stamp' }
              ]
            },
            { 
              name: 'Labels', 
              count: 10, 
              examples: ['label_client', 'label_total', 'label_terbilang'],
              fields: [
                { name: 'label_client', type: 'string', description: 'Label untuk klien' },
                { name: 'label_total', type: 'string', description: 'Label untuk total' },
                { name: 'label_terbilang', type: 'string', description: 'Label untuk terbilang' },
                { name: 'label_description', type: 'string', description: 'Label untuk deskripsi' },
                { name: 'label_amount', type: 'string', description: 'Label untuk jumlah' },
                { name: 'label_bank_transfer', type: 'string', description: 'Label transfer bank' },
                { name: 'qr_verification_title', type: 'string', description: 'Judul verifikasi QR' },
                { name: 'qr_verification_label', type: 'string', description: 'Label verifikasi QR' },
                { name: 'late_fee_text', type: 'string', description: 'Teks denda keterlambatan' },
                { name: 'payment_instruction_text', type: 'string', description: 'Teks instruksi pembayaran' }
              ]
            },
            { 
              name: 'Visibility', 
              count: 20, 
              examples: ['show_header_stripe', 'show_qr_code', 'show_stamp'],
              fields: [
                { name: 'show_header_stripe', type: 'boolean', description: 'Tampilkan stripe header' },
                { name: 'show_company_name', type: 'boolean', description: 'Tampilkan nama perusahaan' },
                { name: 'show_company_tagline', type: 'boolean', description: 'Tampilkan tagline' },
                { name: 'show_company_address', type: 'boolean', description: 'Tampilkan alamat' },
                { name: 'show_company_phone', type: 'boolean', description: 'Tampilkan telepon' },
                { name: 'show_company_email', type: 'boolean', description: 'Tampilkan email' },
                { name: 'show_company_website', type: 'boolean', description: 'Tampilkan website' },
                { name: 'show_npwp', type: 'boolean', description: 'Tampilkan NPWP' },
                { name: 'show_document_number', type: 'boolean', description: 'Tampilkan nomor dokumen' },
                { name: 'show_document_date', type: 'boolean', description: 'Tampilkan tanggal dokumen' },
                { name: 'show_due_date', type: 'boolean', description: 'Tampilkan jatuh tempo' },
                { name: 'show_client_info', type: 'boolean', description: 'Tampilkan info klien' },
                { name: 'show_table_header', type: 'boolean', description: 'Tampilkan header tabel' },
                { name: 'show_terbilang', type: 'boolean', description: 'Tampilkan terbilang' },
                { name: 'show_bank_info', type: 'boolean', description: 'Tampilkan info bank' },
                { name: 'show_payment_section', type: 'boolean', description: 'Tampilkan seksi pembayaran' },
                { name: 'show_qr_code', type: 'boolean', description: 'Tampilkan QR code' },
                { name: 'show_signature', type: 'boolean', description: 'Tampilkan tanda tangan' },
                { name: 'show_stamp', type: 'boolean', description: 'Tampilkan stamp' },
                { name: 'show_watermark', type: 'boolean', description: 'Tampilkan watermark' }
              ]
            },
            { 
              name: 'Payment', 
              count: 10, 
              examples: ['payment_qr_enabled', 'payment_wa_number'],
              fields: [
                { name: 'payment_qr_enabled', type: 'boolean', description: 'Aktifkan QR pembayaran' },
                { name: 'payment_wa_hyperlink_enabled', type: 'boolean', description: 'Aktifkan hyperlink WhatsApp' },
                { name: 'payment_wa_number', type: 'string', description: 'Nomor WhatsApp pembayaran' },
                { name: 'payment_link_text', type: 'string', description: 'Teks link pembayaran' },
                { name: 'payment_instruction_text', type: 'string', description: 'Instruksi pembayaran' },
                { name: 'use_payment_link', type: 'boolean', description: 'Gunakan link pembayaran' },
                { name: 'default_due_days', type: 'number', description: 'Default hari jatuh tempo' },
                { name: 'invoice_prefix', type: 'string', description: 'Prefix nomor invoice' },
                { name: 'receipt_prefix', type: 'string', description: 'Prefix nomor kwitansi' },
                { name: 'number_format', type: 'string', description: 'Format penomoran' }
              ]
            },
            { 
              name: 'Table', 
              count: 8, 
              examples: ['table_header_bg', 'table_border_style'],
              fields: [
                { name: 'table_header_bg', type: 'string', description: 'Warna background header' },
                { name: 'table_header_text_color', type: 'string', description: 'Warna teks header' },
                { name: 'table_border_style', type: 'string', description: 'Style border tabel' },
                { name: 'table_alternating_rows', type: 'boolean', description: 'Baris alternating' },
                { name: 'table_alternating_color', type: 'string', description: 'Warna baris alternating' },
                { name: 'table_position_x', type: 'number', description: 'Posisi X tabel (%)' },
                { name: 'table_position_y', type: 'number', description: 'Posisi Y tabel (mm)' },
                { name: 'table_width', type: 'number', description: 'Lebar tabel (%)' }
              ]
            },
            { 
              name: 'QR Code', 
              count: 6, 
              examples: ['qr_size', 'qr_position', 'qr_include_amount'],
              fields: [
                { name: 'qr_size', type: 'number', description: 'Ukuran QR code (px)' },
                { name: 'qr_position', type: 'string', description: 'Posisi QR code' },
                { name: 'qr_include_amount', type: 'boolean', description: 'Sertakan jumlah di QR' },
                { name: 'show_qr_code', type: 'boolean', description: 'Tampilkan QR code' },
                { name: 'show_qr_verification_url', type: 'boolean', description: 'Tampilkan URL verifikasi' },
                { name: 'qr_verification_title', type: 'string', description: 'Judul verifikasi QR' }
              ]
            },
            { 
              name: 'Watermark', 
              count: 6, 
              examples: ['watermark_text', 'watermark_opacity'],
              fields: [
                { name: 'watermark_text', type: 'string', description: 'Teks watermark' },
                { name: 'watermark_type', type: 'string', description: 'Tipe watermark (text/image)' },
                { name: 'watermark_opacity', type: 'number', description: 'Opacity watermark (0-1)' },
                { name: 'watermark_rotation', type: 'number', description: 'Rotasi watermark (derajat)' },
                { name: 'watermark_size', type: 'number', description: 'Ukuran watermark' },
                { name: 'show_watermark', type: 'boolean', description: 'Tampilkan watermark' }
              ]
            },
            { 
              name: 'Element Positioning (v1.4)', 
              count: 24, 
              examples: ['header_block_position_x', 'table_position_y', 'footer_width'],
              fields: [
                { name: 'header_block_position_x', type: 'number', description: 'Posisi X header block (%)' },
                { name: 'header_block_position_y', type: 'number', description: 'Posisi Y header block (mm, 0=flow)' },
                { name: 'header_block_width', type: 'number', description: 'Lebar header block (%)' },
                { name: 'company_info_position_x', type: 'number', description: 'Posisi X info perusahaan (%)' },
                { name: 'company_info_position_y', type: 'number', description: 'Posisi Y info perusahaan (mm)' },
                { name: 'company_info_width', type: 'number', description: 'Lebar info perusahaan (%)' },
                { name: 'doc_number_position_x', type: 'number', description: 'Posisi X nomor dokumen (%)' },
                { name: 'doc_number_position_y', type: 'number', description: 'Posisi Y nomor dokumen (mm)' },
                { name: 'doc_number_width', type: 'number', description: 'Lebar nomor dokumen (%)' },
                { name: 'client_block_position_x', type: 'number', description: 'Posisi X blok klien (%)' },
                { name: 'client_block_position_y', type: 'number', description: 'Posisi Y blok klien (mm)' },
                { name: 'client_block_width', type: 'number', description: 'Lebar blok klien (%)' },
                { name: 'table_position_x', type: 'number', description: 'Posisi X tabel (%)' },
                { name: 'table_position_y', type: 'number', description: 'Posisi Y tabel (mm)' },
                { name: 'table_width', type: 'number', description: 'Lebar tabel (%)' },
                { name: 'terbilang_position_x', type: 'number', description: 'Posisi X terbilang (%)' },
                { name: 'terbilang_position_y', type: 'number', description: 'Posisi Y terbilang (mm)' },
                { name: 'payment_section_position_x', type: 'number', description: 'Posisi X seksi pembayaran (%)' },
                { name: 'payment_section_position_y', type: 'number', description: 'Posisi Y seksi pembayaran (mm)' },
                { name: 'payment_section_width', type: 'number', description: 'Lebar seksi pembayaran (%)' },
                { name: 'bank_info_position_x', type: 'number', description: 'Posisi X info bank (%)' },
                { name: 'bank_info_position_y', type: 'number', description: 'Posisi Y info bank (mm)' },
                { name: 'bank_info_width', type: 'number', description: 'Lebar info bank (%)' },
                { name: 'footer_position_x', type: 'number', description: 'Posisi X footer (%)' },
                { name: 'footer_position_y', type: 'number', description: 'Posisi Y footer (mm, default 270)' },
                { name: 'footer_width', type: 'number', description: 'Lebar footer (%)' },
                { name: 'terms_position_x', type: 'number', description: 'Posisi X syarat & ketentuan (%)' },
                { name: 'terms_position_y', type: 'number', description: 'Posisi Y syarat & ketentuan (mm)' },
                { name: 'terms_width', type: 'number', description: 'Lebar syarat & ketentuan (%)' }
              ]
            }
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

// v1.2: Akses data baru
console.log(data.data.line_items);       // Rincian item untuk Page 2
console.log(data.data.page_2_settings);  // Pengaturan Page 2

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

// v1.2: Akses data baru
const { line_items, page_2_settings } = response.data.data;
console.log('Line items:', line_items);
console.log('Page 2 settings:', page_2_settings);`,

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

data = response.json()

# v1.2: Akses data baru
line_items = data['data']['line_items']
page_2_settings = data['data']['page_2_settings']
print(f"Line items: {line_items}")
print(f"Page 2 settings: {page_2_settings}")`,

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

// v1.2: Akses data baru
$line_items = $data['data']['line_items'];
$page_2_settings = $data['data']['page_2_settings'];
print_r($line_items);`,

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
    
    // v1.2: Response sekarang include line_items dan page_2_settings
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

# Response v1.2 include:
# - data.line_items[] (rincian item untuk Page 2)
# - data.page_2_settings (pengaturan khusus Page 2)
# - data.contract.jumlah_lunas (total yang sudah dibayar)
# - data.contract.tanggal_lunas (tanggal lunas terakhir)

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
    lengkap: `## INSTRUKSI UNTUK AI: DOCUMENT API INTEGRATION v1.4

Kamu adalah AI assistant yang akan membantu mengintegrasikan Document API untuk generate/render dokumen invoice dan kwitansi.

### INFORMASI API

**Base URL:** 
${baseUrl}

**Method:** POST

**Authentication:**
- Header: \`x-api-key\`
- Nilai: API Key yang diberikan oleh admin
- API Key hanya ditampilkan sekali saat generate, simpan dengan aman!

### DUA METODE AKSES

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
   - \`tanggal_lunas\` (date | null): Tanggal lunas terakhir
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

5. **line_items[]** - Rincian item untuk Page 2
   - \`item_name\` (string): Nama item
   - \`quantity\` (number): Jumlah unit
   - \`unit_price_per_day\` (number): Harga per unit per hari
   - \`duration_days\` (number): Durasi sewa (hari)
   - \`subtotal\` (number): Subtotal item (qty × price × days)
   - \`sort_order\` (number): Urutan tampilan

6. **page_2_settings** - Pengaturan khusus Page 2
   - \`transport_delivery\` (number): Biaya antar
   - \`transport_pickup\` (number): Biaya jemput
   - \`discount\` (number): Diskon
   - \`full_rincian\` (boolean): Mode tampilan (true=full table, false=simplified)

7. **template_settings** - Pengaturan template dokumen (170+ fields)
   Kategori: Branding, Typography, Colors, Layout, Signature, Stamp, Labels, Visibility, Payment, Table, QR Code, Watermark, **Element Positioning (v1.4)**

### ELEMENT POSITIONING (v1.4 - FULL DRAG-DROP)

Semua elemen utama sekarang bisa diposisikan bebas:

| Elemen | Fields | Unit | Default |
|--------|--------|------|---------|
| Header Block | header_block_position_x/y, width | x,w=%, y=mm | 0, 0, 100 |
| Company Info | company_info_position_x/y, width | x,w=%, y=mm | 0, 0, 60 |
| Doc Number | doc_number_position_x/y, width | x,w=%, y=mm | 75, 0, 25 |
| Client Block | client_block_position_x/y, width | x,w=%, y=mm | 0, 0, 100 |
| Table | table_position_x/y, width | x,w=%, y=mm | 0, 0, 100 |
| Terbilang | terbilang_position_x/y | x=%, y=mm | 0, 0 |
| Payment Section | payment_section_position_x/y, width | x,w=%, y=mm | 0, 0, 100 |
| Bank Info | bank_info_position_x/y, width | x,w=%, y=mm | 60, 0, 40 |
| Terms | terms_position_x/y, width | x,w=%, y=mm | 0, 0, 100 |
| Footer | footer_position_x/y, width | x,w=%, y=mm | 0, 270, 100 |

**Aturan Positioning:**
- \`position_x\` & \`width\`: Persentase (0-100%)
- \`position_y\`: Milimeter dari top page (0-297mm)
- \`position_y = 0\`: Flow-based (ikuti elemen sebelumnya)
- \`position_y > 0\`: Absolute positioning dari top

**CSS Implementation:**
\`\`\`css
.element {
  position: positionY > 0 ? 'absolute' : 'relative';
  left: \${positionX}%;
  top: positionY > 0 ? \${positionY}mm : 'auto';
  width: \${width}%;
}
\`\`\`

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

// v1.4: Akses positioning data
const { template_settings } = data;
console.log('Header position:', template_settings.header_block_position_x, template_settings.header_block_position_y);
console.log('Table position:', template_settings.table_position_x, template_settings.table_position_y);
\`\`\`

### TUGAS KAMU

Gunakan data dari API ini untuk membantu integrasi dengan sistem eksternal. Data template_settings berisi pengaturan lengkap untuk desain dokumen termasuk warna, font, dan **posisi semua elemen** (v1.4).`,

    ringkas: `## DOCUMENT API v1.4 - Quick Reference

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
- \`contract\`: Data kontrak (invoice, tanggal, tagihan, status, jumlah_lunas, tanggal_lunas)
- \`client\`: Data klien (nama, nomor_telepon)
- \`payment\`: Data pembayaran (untuk kwitansi)
- \`bank_info\`: Info rekening bank
- \`line_items[]\`: Rincian item untuk Page 2
- \`page_2_settings\`: Pengaturan Page 2
- \`template_settings\`: 170+ pengaturan template

### v1.4 Element Positioning Fields:
| Elemen | Fields |
|--------|--------|
| Header Block | header_block_position_x/y, width |
| Company Info | company_info_position_x/y, width |
| Doc Number | doc_number_position_x/y, width |
| Client Block | client_block_position_x/y, width |
| Table | table_position_x/y, width |
| Terbilang | terbilang_position_x/y |
| Payment Section | payment_section_position_x/y, width |
| Bank Info | bank_info_position_x/y, width |
| Terms | terms_position_x/y, width |
| Footer | footer_position_x/y, width |

**Unit:** x,width=% (0-100), y=mm (0-297, 0=flow)

### Contoh (JavaScript):
\`\`\`javascript
const res = await fetch('${baseUrl}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': 'KEY' },
  body: JSON.stringify({ invoice_number: '000254', document_type: 'invoice' })
});
const { template_settings } = (await res.json());
\`\`\``,

    pdf_rendering: `## INSTRUKSI AI: PDF RENDERING DARI DOCUMENT API v1.4

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
   - invoice, tanggal, tagihan, tagihan_belum_bayar
   - \`jumlah_lunas\` (number): Total yang sudah dibayar
   - \`tanggal_lunas\` (date | null): Tanggal lunas terakhir
   - status pembayaran, start_date, end_date

2. **client** - Penerima dokumen:
   - nama, nomor_telepon

3. **payment** - Untuk kwitansi:
   - amount, payment_date, payment_number, notes

4. **bank_info** - Info transfer:
   - bank_name, account_number, account_holder_name

5. **line_items[]** - Rincian item untuk Page 2:
   - \`item_name\` (string): Nama item
   - \`quantity\` (number): Jumlah unit
   - \`unit_price_per_day\` (number): Harga per unit per hari
   - \`duration_days\` (number): Durasi sewa (hari)
   - \`subtotal\` (number): Subtotal item (qty × price × days)
   - \`sort_order\` (number): Urutan tampilan

6. **page_2_settings** - Pengaturan Page 2:
   - \`transport_delivery\` (number): Biaya antar
   - \`transport_pickup\` (number): Biaya jemput
   - \`discount\` (number): Diskon
   - \`full_rincian\` (boolean): Mode tampilan (true=full table, false=simplified)

7. **template_settings** - PENTING untuk desain PDF:
   
   **Branding:**
   - company_name, company_tagline, invoice_logo_url
   - company_address, company_phone, company_email
   
   **Typography:**
   - font_family, font_size_base, heading_font_family
   
   **Warna (gunakan untuk styling):**
   - header_color_primary, header_color_secondary
   - accent_color, label_color, value_color
   - table_header_bg, table_header_text_color
   
   **ELEMENT POSITIONING (v1.4 - FULL DRAG-DROP):**
   
   | Elemen | X (%) | Y (mm) | Width (%) |
   |--------|-------|--------|-----------|
   | header_block | position_x | position_y | width |
   | company_info | position_x | position_y | width |
   | doc_number | position_x | position_y | width |
   | client_block | position_x | position_y | width |
   | table | position_x | position_y | width |
   | terbilang | position_x | position_y | - |
   | payment_section | position_x | position_y | width |
   | bank_info | position_x | position_y | width |
   | terms | position_x | position_y | width |
   | footer | position_x | position_y | width |
   
   **Aturan Y (position_y):**
   - Y = 0: Flow-based (ikuti elemen sebelumnya)
   - Y > 0: Absolute positioning dari top page (dalam mm)
   
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

### CSS IMPLEMENTATION UNTUK POSITIONING

\`\`\`css
.element {
  position: positionY > 0 ? 'absolute' : 'relative';
  left: \${positionX}%;
  top: positionY > 0 ? \${positionY}mm : 'auto';
  width: \${width}%;
}
\`\`\`

### KALKULASI PAGE 2 (LAMPIRAN RINCIAN)

\`\`\`javascript
// Hitung subtotal dari line_items
const subtotalItems = line_items.reduce((sum, item) => sum + item.subtotal, 0);

// Hitung total transport
const totalTransport = page_2_settings.transport_delivery + page_2_settings.transport_pickup;

// Hitung subtotal sebelum diskon
const subtotalBeforeDiscount = subtotalItems + totalTransport;

// Grand total (harus sama dengan contract.tagihan)
const grandTotal = subtotalBeforeDiscount - page_2_settings.discount;
\`\`\`

### WORKFLOW RENDERING

1. Panggil API dengan invoice_number atau access_code
2. **Page 1:** Gunakan contract, client, bank_info, template_settings untuk styling
3. **Posisikan elemen** sesuai positioning fields (v1.4):
   - Jika position_y = 0 → flow-based
   - Jika position_y > 0 → absolute dari top
4. **Page 2:** Gunakan line_items untuk tabel rincian, page_2_settings untuk transport/discount
5. Posisi elemen (signature, stamp) sudah dalam milimeter
6. Render sesuai dengan visibility flags (show_*)
7. Format angka sebagai Rupiah (Rp X.XXX.XXX)`
  };

  const updateInfo = {
    version: '1.4',
    changes: [
      {
        version: '1.4',
        date: '2026-01-12',
        title: 'Full Element Positioning (Drag-Drop Support)',
        items: [
          'Tambah 24 positioning fields untuk semua elemen dokumen',
          'Header, Company Info, Doc Number block sekarang bisa diposisikan',
          'Client block, Table, Terbilang bisa diposisikan',
          'Payment section, Bank info, Terms, Footer bisa diposisikan',
          'Unit: X & Width dalam %, Y dalam mm (0=flow, >0=absolute)',
          'Full drag-drop support untuk third-party integrators'
        ]
      },
      {
        version: '1.3',
        date: '2026-01-12',
        title: 'Database Preparation for Element Positioning',
        items: [
          'Database schema updated dengan 24 kolom positioning',
          'TypeScript types updated untuk positioning fields',
          'Default values maintain backward compatibility'
        ]
      },
      {
        version: '1.2',
        date: '2026-01-12',
        title: 'Line Items & Page 2 Support',
        items: [
          'Tambah line_items[] array dengan rincian item tagihan',
          'Tambah page_2_settings object (transport, discount, full_rincian)',
          'Tambah contract.jumlah_lunas - total yang sudah dibayar',
          'Tambah contract.tanggal_lunas - tanggal lunas terakhir'
        ]
      },
      {
        version: '1.1.1',
        date: '2026-01-11',
        title: 'Security & Stability',
        items: [
          'Rate limiting per API key dan per invoice',
          'Lockout protection setelah 5x gagal',
          'Access logging untuk audit trail'
        ]
      },
      {
        version: '1.1',
        date: '2026-01-10',
        title: 'Dual Access Method',
        items: [
          'Akses via invoice_number (permanent, recommended)',
          'Akses via access_code (temporary)',
          'Admin dapat menonaktifkan akses per kontrak'
        ]
      },
      {
        version: '1.0',
        date: '2026-01-08',
        title: 'Initial Release',
        items: [
          'Contract, client, payment, bank_info data',
          '150+ template settings untuk styling PDF',
          'Code examples dalam berbagai bahasa'
        ]
      }
    ],
    migration: {
      from: 'v1.3',
      to: 'v1.4',
      backward_compatible: true,
      notes: 'Semua response v1.3 tetap ada, v1.4 menambahkan 24 positioning fields untuk full drag-drop support'
    }
  };

  const authentication = {
    method: 'API Key',
    header: 'x-api-key',
    description: 'API Key dikirim melalui header x-api-key. Key bisa di-generate dari halaman API Documentation.',
    note: 'API Key hanya ditampilkan sekali saat generate. Simpan dengan aman!'
  };

  return {
    version: '1.4.0',
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
