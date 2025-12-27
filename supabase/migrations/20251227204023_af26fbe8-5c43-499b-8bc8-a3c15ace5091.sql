-- Create document_settings table for TTD digital and company info
CREATE TABLE public.document_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  signature_image_url TEXT,
  company_name VARCHAR(255),
  company_address TEXT,
  company_phone VARCHAR(50),
  owner_name VARCHAR(255),
  counter_invoice INTEGER DEFAULT 0,
  counter_receipt INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice_receipts table for storing generated documents
CREATE TABLE public.invoice_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contract_id UUID NOT NULL REFERENCES public.rental_contracts(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.contract_payments(id) ON DELETE SET NULL,
  document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('invoice', 'kwitansi')),
  document_number VARCHAR(20) NOT NULL,
  verification_code VARCHAR(10) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('LUNAS', 'BELUM_LUNAS')),
  amount NUMERIC NOT NULL,
  amount_text TEXT,
  client_name VARCHAR(255),
  client_address TEXT,
  description TEXT,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_count INTEGER DEFAULT 0,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on document_number
CREATE UNIQUE INDEX idx_invoice_receipts_document_number ON public.invoice_receipts(document_number);

-- Enable RLS on document_settings
ALTER TABLE public.document_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_settings (super_admin only)
CREATE POLICY "Super admins can manage document settings"
  ON public.document_settings
  FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Enable RLS on invoice_receipts
ALTER TABLE public.invoice_receipts ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoice_receipts
CREATE POLICY "Super admins can manage all documents"
  ON public.invoice_receipts
  FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Admins can view and create documents"
  ON public.invoice_receipts
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert documents"
  ON public.invoice_receipts
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Create storage bucket for signatures
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for signatures bucket
CREATE POLICY "Super admins can upload signatures"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'signatures' AND is_super_admin(auth.uid()));

CREATE POLICY "Anyone can view signatures"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'signatures');

CREATE POLICY "Super admins can delete signatures"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'signatures' AND is_super_admin(auth.uid()));

-- Create trigger for updated_at on document_settings
CREATE TRIGGER update_document_settings_updated_at
  BEFORE UPDATE ON public.document_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate verification code
CREATE OR REPLACE FUNCTION public.generate_verification_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM invoice_receipts WHERE verification_code = v_code) INTO v_exists;
    IF NOT v_exists THEN
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$;