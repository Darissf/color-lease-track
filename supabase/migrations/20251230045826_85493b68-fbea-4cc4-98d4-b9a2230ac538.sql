-- Table for Manual Invoice Content
CREATE TABLE public.manual_invoice_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Header Section
  company_name TEXT DEFAULT 'Nama Perusahaan',
  company_tagline TEXT DEFAULT '',
  company_address TEXT DEFAULT 'Alamat Perusahaan',
  company_phone TEXT DEFAULT '08123456789',
  company_email TEXT DEFAULT 'email@company.com',
  company_website TEXT DEFAULT 'www.company.com',
  company_npwp TEXT DEFAULT '',
  
  -- Document Info
  document_title TEXT DEFAULT 'INVOICE',
  document_number TEXT DEFAULT 'INV-2025-0001',
  document_date TEXT DEFAULT '',
  due_date TEXT DEFAULT '',
  
  -- Client Section
  client_label TEXT DEFAULT 'Kepada Yth:',
  client_name TEXT DEFAULT 'Nama Klien',
  client_address TEXT DEFAULT 'Alamat Klien',
  client_phone TEXT DEFAULT '',
  
  -- Table Section
  table_header_description TEXT DEFAULT 'Keterangan',
  table_header_amount TEXT DEFAULT 'Jumlah',
  description_text TEXT DEFAULT 'Deskripsi layanan/produk',
  description_details TEXT DEFAULT '',
  amount_value NUMERIC DEFAULT 0,
  total_label TEXT DEFAULT 'Total',
  terbilang_label TEXT DEFAULT 'Terbilang:',
  
  -- Payment Section
  show_payment_section BOOLEAN DEFAULT true,
  payment_section_title TEXT DEFAULT 'Pembayaran Transfer',
  payment_instruction TEXT DEFAULT 'Silahkan scan barcode atau transfer ke rekening berikut:',
  bank_name TEXT DEFAULT 'Bank BCA',
  bank_account_number TEXT DEFAULT '7445130885',
  bank_account_name TEXT DEFAULT 'Daris Farostian',
  wa_confirmation_text TEXT DEFAULT 'Konfirmasi WA:',
  wa_number TEXT DEFAULT '+6289666666632',
  payment_qr_link TEXT DEFAULT '',
  show_payment_qr BOOLEAN DEFAULT true,
  
  -- Signature Section
  show_signature BOOLEAN DEFAULT true,
  signature_label TEXT DEFAULT 'Hormat Kami,',
  signer_name TEXT DEFAULT 'Nama Penandatangan',
  signer_title TEXT DEFAULT 'Jabatan',
  signature_image_url TEXT DEFAULT '',
  
  -- Stamp Section
  show_stamp BOOLEAN DEFAULT false,
  stamp_text TEXT DEFAULT 'LUNAS',
  stamp_color TEXT DEFAULT '#22c55e',
  
  -- Footer
  show_footer BOOLEAN DEFAULT true,
  footer_text TEXT DEFAULT 'Terima kasih atas kepercayaan Anda',
  terms_text TEXT DEFAULT '',
  custom_note TEXT DEFAULT '',
  
  -- Logo
  logo_url TEXT DEFAULT '',
  
  -- Custom QR Codes (multiple)
  custom_qr_codes JSONB DEFAULT '[]'::jsonb,
  
  -- Styling
  primary_color TEXT DEFAULT '#0369a1',
  secondary_color TEXT DEFAULT '#f0f9ff',
  border_color TEXT DEFAULT '#e2e8f0',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Table for Manual Receipt Content
CREATE TABLE public.manual_receipt_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Header Section
  company_name TEXT DEFAULT 'Nama Perusahaan',
  company_tagline TEXT DEFAULT '',
  company_address TEXT DEFAULT 'Alamat Perusahaan',
  company_phone TEXT DEFAULT '08123456789',
  company_email TEXT DEFAULT 'email@company.com',
  company_website TEXT DEFAULT 'www.company.com',
  
  -- Document Info
  document_title TEXT DEFAULT 'KWITANSI',
  document_number TEXT DEFAULT 'KWT-2025-0001',
  document_date TEXT DEFAULT '',
  
  -- Client Section
  client_label TEXT DEFAULT 'Telah diterima dari:',
  client_name TEXT DEFAULT 'Nama Klien',
  client_address TEXT DEFAULT 'Alamat Klien',
  
  -- Table Section
  table_header_description TEXT DEFAULT 'Keterangan',
  table_header_amount TEXT DEFAULT 'Jumlah',
  description_text TEXT DEFAULT 'Pembayaran untuk layanan/produk',
  description_details TEXT DEFAULT '',
  amount_value NUMERIC DEFAULT 0,
  total_label TEXT DEFAULT 'Total Diterima',
  terbilang_label TEXT DEFAULT 'Terbilang:',
  
  -- Signature Section
  show_signature BOOLEAN DEFAULT true,
  signature_label TEXT DEFAULT 'Penerima,',
  signer_name TEXT DEFAULT 'Nama Penerima',
  signer_title TEXT DEFAULT 'Jabatan',
  signature_image_url TEXT DEFAULT '',
  
  -- Stamp Section
  show_stamp BOOLEAN DEFAULT true,
  stamp_text TEXT DEFAULT 'LUNAS',
  stamp_color TEXT DEFAULT '#22c55e',
  stamp_date TEXT DEFAULT '',
  
  -- Footer
  show_footer BOOLEAN DEFAULT true,
  footer_text TEXT DEFAULT 'Terima kasih',
  custom_note TEXT DEFAULT '',
  
  -- Logo
  logo_url TEXT DEFAULT '',
  
  -- Custom QR Codes
  custom_qr_codes JSONB DEFAULT '[]'::jsonb,
  
  -- Styling
  primary_color TEXT DEFAULT '#0369a1',
  secondary_color TEXT DEFAULT '#f0f9ff',
  border_color TEXT DEFAULT '#e2e8f0',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.manual_invoice_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_receipt_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies for manual_invoice_content
CREATE POLICY "Users can view own manual invoice content"
  ON public.manual_invoice_content FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own manual invoice content"
  ON public.manual_invoice_content FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own manual invoice content"
  ON public.manual_invoice_content FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own manual invoice content"
  ON public.manual_invoice_content FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for manual_receipt_content
CREATE POLICY "Users can view own manual receipt content"
  ON public.manual_receipt_content FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own manual receipt content"
  ON public.manual_receipt_content FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own manual receipt content"
  ON public.manual_receipt_content FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own manual receipt content"
  ON public.manual_receipt_content FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_manual_invoice_content_updated_at
  BEFORE UPDATE ON public.manual_invoice_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_manual_receipt_content_updated_at
  BEFORE UPDATE ON public.manual_receipt_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();