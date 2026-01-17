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
    integration_guide: `## PANDUAN INTEGRASI: PDF GENERATOR SERVICE

### PERAN ANDA
Anda adalah **PDF Generator Service** yang akan menerima request dari Web Lovable, mengambil data dari Document API, men-design & merender PDF (invoice atau kwitansi), lalu mengembalikan file PDF **langsung ke browser user**.

### ARSITEKTUR INTEGRASI

\`\`\`
┌─────────────────┐                     ┌──────────────────────────┐
│   Web Lovable   │  1. Request PDF     │   SERVER ANDA           │
│   (Frontend)    │ ─────────────────►  │   (PDF Generator)       │
│                 │                     │                          │
│                 │                     │  2. Call Document API ──►│
│                 │                     │  3. Receive Data     ◄── │
│                 │                     │  4. Render PDF           │
│                 │  5. Return PDF file │                          │
│                 │ ◄───────────────────│                          │
└────────┬────────┘                     └──────────────────────────┘
         │
         ▼
┌─────────────────┐
│   User Browser  │   ← File PDF langsung ter-download
│   (Download)    │
└─────────────────┘
\`\`\`

### WORKFLOW DETAIL

1. **User klik "Download Invoice/Kwitansi"** di Web Lovable
2. **Web request ke server Anda** dengan: \`{ invoice_number, document_type }\`
3. **Server Anda call Document API** untuk dapat data lengkap
4. **Server Anda render PDF** menggunakan design Anda sendiri
5. **Server Anda return PDF binary** langsung ke browser user

---

## DOCUMENT API - UNTUK MENGAMBIL DATA

### Endpoint
- **URL:** ${baseUrl}
- **Method:** POST
- **Content-Type:** application/json

### Authentication
- **Header:** \`x-api-key: YOUR_API_KEY\`
- **Rate Limits:** 
  - 500 requests/menit per API key
  - 100 requests/menit per invoice_number

### Request Body
\`\`\`json
{
  "invoice_number": "000254",
  "document_type": "invoice"  // atau "kwitansi"
}
\`\`\`

---

## ⚠️ CONTOH RESPONSE API (LENGKAP)

Berikut adalah contoh **actual response** dari API yang harus Anda gunakan sebagai referensi:

\`\`\`json
{
  "success": true,
  "api_version": "1.6",
  "access_method": "invoice_number",
  "identifier": "000254",
  "document_type": "invoice",
  
  "contract": {
    "id": "b49c0c6c-52f2-41d3-b015-8063a013bafe",
    "invoice": "000254",
    "keterangan": "Proyek Umalas",
    "jenis_scaffolding": "Galvanis Las 1.7M",
    "lokasi_detail": "Jl. Raya Umalas No. 10",
    "start_date": "2025-12-07",
    "end_date": "2026-01-07",
    "tanggal": "2025-12-07",
    "tanggal_kirim": "2025-12-07",
    "tanggal_ambil": null,
    "jumlah_unit": 10,
    "tagihan": 840000,
    "jumlah_lunas": 840000,
    "tanggal_lunas": "2026-01-06",
    "tanggal_bayar_terakhir": "2026-01-06",
    "tagihan_belum_bayar": 0,
    "status": "lunas",
    "status_pengiriman": "sudah_kirim",
    "status_pengambilan": null,
    "penanggung_jawab": "Pak Wayan",
    "biaya_kirim": 50000,
    "transport_cost_delivery": 50000,
    "transport_cost_pickup": 50000
  },
  
  "client": {
    "nama": "PT Contoh Indonesia",
    "nomor_telepon": "+6281234567890",
    "icon": null
  },
  
  "payment": null,
  
  "bank_info": {
    "bank_name": "BCA",
    "account_number": "1234567890",
    "account_holder_name": "PT Company Name"
  },
  
  "line_items": [
    {
      "id": "uuid-1",
      "item_name": "Scaffolding 1.7M Galvanis Las",
      "quantity": 10,
      "unit_price_per_day": 1000,
      "duration_days": 30,
      "subtotal": 300000,
      "sort_order": 0
    },
    {
      "id": "uuid-2",
      "item_name": "Papan Cor 200x30cm",
      "quantity": 20,
      "unit_price_per_day": 500,
      "duration_days": 30,
      "subtotal": 300000,
      "sort_order": 1
    }
  ],
  
  "page_2_settings": {
    "transport_delivery": 50000,
    "transport_pickup": 50000,
    "discount": 0,
    "full_rincian": true
  },
  
  "template_settings": {
    "company_name": "LARISSO SCAFFOLDING",
    "company_address": "Jl. Kebudayaan No.2B, Padang Sambian Kaja",
    "company_phone": "+6281234567890",
    "header_color_primary": "#06b6d4",
    "font_family": "Segoe UI",
    "show_stamp": true,
    "stamp_color_lunas": "#22c55e",
    "stamp_color_belum_lunas": "#ef4444"
  },
  
  "generated_at": "2026-01-17T10:42:22.423Z",
  "rate_limits": {
    "per_api_key": "500 requests/minute",
    "per_invoice": "100 requests/minute"
  }
}
\`\`\`

---

## ⚠️ CATATAN PENTING - FIELD NAMES YANG BENAR

Banyak developer menggunakan nama field yang **SALAH**. Berikut mapping yang benar:

| ❌ SALAH (Jangan Gunakan) | ✅ BENAR (Gunakan Ini) | Lokasi di Response |
|---------------------------|------------------------|-------------------|
| \`invoice_number\` | \`invoice\` | \`contract.invoice\` |
| \`total\`, \`amount\`, \`grand_total\` | \`tagihan\` | \`contract.tagihan\` |
| \`remaining\`, \`balance\`, \`outstanding\` | \`tagihan_belum_bayar\` | \`contract.tagihan_belum_bayar\` |
| \`paid\`, \`total_paid\`, \`amount_paid\` | \`jumlah_lunas\` | \`contract.jumlah_lunas\` |
| \`name\`, \`client_name\`, \`customer_name\` | \`nama\` | \`client.nama\` |
| \`phone\`, \`phone_number\`, \`mobile\` | \`nomor_telepon\` | \`client.nomor_telepon\` |
| \`date\`, \`contract_date\` | \`tanggal\` | \`contract.tanggal\` |
| \`delivery_date\` | \`tanggal_kirim\` | \`contract.tanggal_kirim\` |
| \`pickup_date\` | \`tanggal_ambil\` | \`contract.tanggal_ambil\` |
| \`units\`, \`qty\` | \`jumlah_unit\` | \`contract.jumlah_unit\` |
| \`description\`, \`notes\` | \`keterangan\` | \`contract.keterangan\` |

### Contoh Akses Field yang Benar (JavaScript):
\`\`\`javascript
const response = await fetch(API_URL, { ... });
const data = await response.json();

// ✅ BENAR
const invoiceNumber = data.contract.invoice;           // "000254"
const totalTagihan = data.contract.tagihan;            // 840000
const sisaTagihan = data.contract.tagihan_belum_bayar; // 0
const namaClient = data.client.nama;                   // "PT Contoh Indonesia"

// ❌ SALAH - field ini TIDAK ADA
const wrong1 = data.contract.invoice_number;  // undefined
const wrong2 = data.contract.total;           // undefined
const wrong3 = data.client.name;              // undefined
\`\`\`

---

### Document Types
| Type | Halaman | Description |
|------|---------|-------------|
| \`invoice\` | 2 | Page 1: Invoice utama, Page 2: Lampiran Rincian Tagihan |
| \`receipt\` | 2 | Page 1: Kwitansi, Page 2: Custom (bebas Anda desain) |

---

## STRUKTUR DOKUMEN

### INVOICE = 2 Halaman
| Halaman | Konten | Data yang Digunakan |
|---------|--------|---------------------|
| **Page 1** | Invoice utama (header, client, total, bank info, signature) | \`contract\`, \`client\`, \`bank_info\`, \`template_settings\` |
| **Page 2** | Lampiran Rincian Tagihan (tabel item, transport, diskon) | \`line_items\`, \`page_2_settings\`, \`template_settings\` |

**Catatan Page 2 Invoice:**
- Jika \`page_2_settings.full_rincian = true\`: Tampilkan kolom lengkap (No, Nama, Qty, Harga, Durasi, Subtotal)
- Jika \`page_2_settings.full_rincian = false\`: Tampilkan kolom minimal (No, Nama, Qty)

### KWITANSI = 2 Halaman
| Halaman | Konten | Data yang Digunakan |
|---------|--------|---------------------|
| **Page 1** | Kwitansi pembayaran (header, client, amount paid, bank, signature) | \`contract\`, \`client\`, \`payment\`, \`bank_info\`, \`template_settings\` |
| **Page 2** | **Custom** - Anda bebas mendesain sesuai kebutuhan | \`line_items\`, \`page_2_settings\`, \`payment\`, \`contract\`, \`template_settings\` |

**Catatan Page 2 Kwitansi:**
- Page 2 kwitansi **SELALU MUNCUL** (tidak kondisional)
- Anda bebas menentukan isi Page 2: rincian item, riwayat pembayaran, atau custom lainnya
- Data yang tersedia: \`line_items[]\`, \`page_2_settings\`, \`payment\`, \`contract\`

---

## DATA YANG TERSEDIA DARI API

### 1. contract (Data Kontrak)
| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID kontrak |
| invoice | string | Nomor invoice |
| tanggal | date | Tanggal kontrak |
| tagihan | number | Total tagihan (Rp) |
| jumlah_lunas | number | Total yang sudah dibayar |
| tanggal_lunas | date | Tanggal lunas terakhir |
| tagihan_belum_bayar | number | Sisa tagihan |
| status | string | Status kontrak |
| start_date | date | Tanggal mulai |
| end_date | date | Tanggal selesai |

### 2. client (Data Klien)
| Field | Type | Description |
|-------|------|-------------|
| nama | string | Nama klien/penerima |
| nomor_telepon | string | Nomor telepon klien |

### 3. payment (Data Pembayaran - untuk kwitansi)
| Field | Type | Description |
|-------|------|-------------|
| amount | number | Jumlah pembayaran |
| payment_date | date | Tanggal pembayaran |
| payment_number | number | Nomor urut pembayaran |
| notes | string | Catatan pembayaran |

### 4. bank_info (Info Transfer Bank)
| Field | Type | Description |
|-------|------|-------------|
| bank_name | string | Nama bank |
| account_number | string | Nomor rekening |
| account_holder_name | string | Nama pemilik rekening |

### 5. line_items[] (Rincian Item - Page 2)
| Field | Type | Description |
|-------|------|-------------|
| item_name | string | Nama item |
| quantity | number | Jumlah unit |
| unit_price_per_day | number | Harga per hari |
| duration_days | number | Durasi sewa (hari) |
| subtotal | number | qty × price × days |
| sort_order | number | Urutan tampilan |

### 6. page_2_settings (Pengaturan Page 2)
| Field | Type | Description |
|-------|------|-------------|
| transport_delivery | number | Biaya antar |
| transport_pickup | number | Biaya jemput |
| discount | number | Potongan harga |
| full_rincian | boolean | Mode tampilan tabel |

### 7. template_settings (170+ Pengaturan Design)

**Branding:**
- company_name, company_tagline, company_address
- company_phone, company_email, company_website
- invoice_logo_url, bank_logo_url

**Typography:**
- font_family, heading_font_family, font_size_base

**Warna:**
- header_color_primary, header_color_secondary, accent_color
- table_header_bg, table_header_text_color
- stamp_color_lunas, stamp_color_belum_lunas

**Element Positioning (v1.4 - 24 fields):**
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

**Aturan Y:** 0 = flow-based, > 0 = absolute (mm dari top)

**Signature:**
- signature_url, signer_name, signer_title
- signature_label_position_x/y, signer_name_position_x/y

**Stamp:**
- stamp_type, stamp_color, stamp_opacity
- stamp_position_x/y, stamp_rotation

**Visibility Flags:**
- show_header_stripe, show_qr_code, show_stamp
- show_signature, show_bank_info, show_terbilang

---

## KALKULASI PAGE 2 (LAMPIRAN RINCIAN)

\`\`\`javascript
// Subtotal dari line items
const subtotalItems = line_items.reduce((sum, item) => sum + item.subtotal, 0);

// Total transport
const totalTransport = page_2_settings.transport_delivery + page_2_settings.transport_pickup;

// Grand total (harus sama dengan contract.tagihan)
const grandTotal = subtotalItems + totalTransport - page_2_settings.discount;

// Terbilang
const terbilang = angkaTerbilang(grandTotal); // "Satu Juta Lima Ratus Ribu Rupiah"
\`\`\`

---

## CONTOH IMPLEMENTASI SERVER ANDA

### Node.js (Express) - Multi-Page PDF

\`\`\`javascript
const express = require('express');
const PDFDocument = require('pdfkit');
const app = express();

// Endpoint untuk generate PDF
app.post('/generate-pdf', async (req, res) => {
  const { invoice_number, document_type } = req.body;
  
  try {
    // 1. Ambil data dari Document API
    const response = await fetch('${baseUrl}', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.DOCUMENT_API_KEY
      },
      body: JSON.stringify({ invoice_number, document_type })
    });
    
    const { data } = await response.json();
    const { contract, client, payment, bank_info, line_items, page_2_settings, template_settings } = data;
    
    // 2. Render PDF dengan design Anda (2 HALAMAN)
    const pdfBuffer = await renderMultiPagePDF({
      document_type,
      contract,
      client,
      payment,
      bank_info,
      line_items,
      page_2_settings,
      template_settings
    });
    
    // 3. Return PDF ke browser
    const filename = document_type === 'invoice' 
      ? \\\`Invoice-\\\${invoice_number}.pdf\\\`
      : \\\`Kwitansi-\\\${invoice_number}.pdf\\\`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', \\\`attachment; filename="\\\${filename}"\\\`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Fungsi render multi-page PDF
async function renderMultiPagePDF(data) {
  const { document_type, contract, client, payment, bank_info, line_items, page_2_settings, template_settings } = data;
  
  const doc = new PDFDocument({ size: 'A4' });
  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));
  
  // ============ PAGE 1 ============
  if (document_type === 'invoice') {
    // Invoice Page 1: Header, Client, Total Tagihan, Bank Info, Signature
    renderInvoicePage1(doc, { contract, client, bank_info, template_settings });
  } else {
    // Kwitansi Page 1: Header, Client, Amount Paid, Bank Info, Signature
    renderReceiptPage1(doc, { contract, client, payment, bank_info, template_settings });
  }
  
  // ============ PAGE 2 (SELALU ADA) ============
  doc.addPage();
  
  if (document_type === 'invoice') {
    // Invoice Page 2: Lampiran Rincian Tagihan (standar)
    renderInvoicePage2(doc, { line_items, page_2_settings, template_settings });
  } else {
    // Kwitansi Page 2: CUSTOM - Anda bebas mendesain!
    // Contoh: tampilkan rincian item + info pembayaran
    renderReceiptPage2Custom(doc, { 
      payment,           // Data pembayaran ini (amount, payment_date, payment_number)
      contract,          // Data kontrak (tagihan, jumlah_lunas, sisa)
      line_items,        // Rincian item (opsional, jika ingin ditampilkan)
      page_2_settings,   // Transport & diskon (opsional)
      template_settings 
    });
  }
  
  doc.end();
  return new Promise(resolve => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
}

app.listen(3000, () => console.log('PDF Generator running on port 3000'));
\`\`\`

### Python (Flask)

\`\`\`python
from flask import Flask, request, Response
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
import requests
import io
import os

app = Flask(__name__)

@app.route('/generate-pdf', methods=['POST'])
def generate_pdf():
    data = request.json
    invoice_number = data.get('invoice_number')
    document_type = data.get('document_type', 'invoice')
    
    # 1. Ambil data dari Document API
    api_response = requests.post(
        '${baseUrl}',
        headers={
            'Content-Type': 'application/json',
            'x-api-key': os.environ.get('DOCUMENT_API_KEY')
        },
        json={'invoice_number': invoice_number, 'document_type': document_type}
    )
    
    doc_data = api_response.json()['data']
    
    # 2. Render PDF
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    
    # Gunakan doc_data['template_settings'] untuk styling
    # Gunakan doc_data['contract'], doc_data['client'], dll untuk content
    
    pdf.save()
    buffer.seek(0)
    
    # 3. Return PDF
    filename = f"Invoice-{invoice_number}.pdf" if document_type == 'invoice' else f"Kwitansi-{invoice_number}.pdf"
    
    return Response(
        buffer.getvalue(),
        mimetype='application/pdf',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )

if __name__ == '__main__':
    app.run(port=3000)
\`\`\`

---

## CARA WEB LOVABLE MEMANGGIL SERVER ANDA

\`\`\`javascript
// Di sisi Web Lovable
const handleDownload = async (invoiceNumber, documentType) => {
  try {
    const response = await fetch('https://your-server.com/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        invoice_number: invoiceNumber, 
        document_type: documentType 
      })
    });
    
    if (!response.ok) throw new Error('Failed to generate PDF');
    
    // Download file
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = documentType === 'invoice' 
      ? \\\`Invoice-\\\${invoiceNumber}.pdf\\\` 
      : \\\`Kwitansi-\\\${invoiceNumber}.pdf\\\`;
    a.click();
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Download failed:', error);
  }
};
\`\`\`

---

## RESPONSE FORMAT (WAJIB DARI SERVER ANDA)

### Success Response
\`\`\`
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="Invoice-000254.pdf"

[PDF Binary Data]
\`\`\`

### Error Response
\`\`\`json
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "error": "Failed to generate PDF",
  "message": "Could not retrieve document data"
}
\`\`\`

---

## CHECKLIST IMPLEMENTASI

- [ ] Server endpoint POST /generate-pdf sudah dibuat
- [ ] API Key Document API sudah di-set di environment
- [ ] Library PDF rendering sudah diinstall (pdfkit, puppeteer, reportlab, dll)
- [ ] Response mengirim Content-Type: application/pdf
- [ ] Response mengirim Content-Disposition dengan filename yang benar
- [ ] Error handling sudah diimplementasi
- [ ] Support untuk invoice dan kwitansi sudah ada
- [ ] Kalkulasi Page 2 (line_items + transport - discount) sudah benar
- [ ] Design mengikuti template_settings dari API

---

## KONTAK & SUPPORT

Jika ada pertanyaan tentang integrasi, hubungi tim Web Lovable melalui channel yang sudah disediakan.`
  };

  const updateInfo = {
    version: '1.6.1',
    changes: [
      {
        version: '1.6.1',
        date: '2026-01-17',
        title: 'Dokumentasi Response Diperjelas',
        items: [
          'Ditambahkan contoh JSON response lengkap di dokumentasi',
          'Tabel perbandingan field names yang benar vs salah',
          'Catatan khusus: contract.invoice (bukan invoice_number)',
          'Catatan khusus: contract.tagihan (bukan total/amount)',
          'Contoh kode JavaScript untuk akses field yang benar'
        ]
      },
      {
        version: '1.6',
        date: '2026-01-17',
        title: 'Kwitansi 2 Halaman Support',
        items: [
          'Kwitansi sekarang 2 halaman: Page 1 (Kwitansi) + Page 2 (Custom)',
          'Page 2 kwitansi SELALU MUNCUL (tidak kondisional)',
          'Page 2 kwitansi bebas didesain: rincian item, riwayat bayar, atau custom',
          'Data line_items & page_2_settings tersedia untuk kwitansi',
          'Tambah section STRUKTUR DOKUMEN di AI Prompt',
          'Update contoh kode Node.js untuk multi-page rendering'
        ]
      },
      {
        version: '1.5',
        date: '2026-01-17',
        title: 'AI Prompt & Rate Limit Update',
        items: [
          'AI Prompt baru: Panduan Integrasi PDF Generator Service',
          'Workflow jelas: Web → Server Anda → Document API → Render → Return PDF',
          'Contoh implementasi Node.js & Python lengkap',
          'Rate limit per API key: 100 → 500 req/min (5x increase)',
          'Rate limit per invoice: 10 → 100 req/min (10x increase)',
          'Hapus 3 prompt lama (lengkap, ringkas, pdf_rendering) → 1 prompt comprehensive'
        ]
      },
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
      from: 'v1.6',
      to: 'v1.6.1',
      backward_compatible: true,
      notes: 'Perbaikan dokumentasi: ditambahkan contoh JSON response lengkap dan tabel field names yang benar untuk membantu integrasi third-party.'
    }
  };

  const authentication = {
    method: 'API Key',
    header: 'x-api-key',
    description: 'API Key dikirim melalui header x-api-key. Key bisa di-generate dari halaman API Documentation.',
    note: 'API Key hanya ditampilkan sekali saat generate. Simpan dengan aman!'
  };

  return {
    version: '1.6.1',
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
