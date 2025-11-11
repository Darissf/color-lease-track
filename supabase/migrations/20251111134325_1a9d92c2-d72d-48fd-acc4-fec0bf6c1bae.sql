-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('ktp-documents', 'ktp-documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false);

-- Create client_groups table (Kelompok)
CREATE TABLE public.client_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nama TEXT NOT NULL,
  nomor_telepon TEXT NOT NULL,
  ktp_files JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for client_groups
ALTER TABLE public.client_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own client groups"
ON public.client_groups FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own client groups"
ON public.client_groups FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own client groups"
ON public.client_groups FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own client groups"
ON public.client_groups FOR DELETE
USING (auth.uid() = user_id);

-- Create rental_contracts table (Masa Sewa)
CREATE TABLE public.rental_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_group_id UUID NOT NULL REFERENCES public.client_groups(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'masa sewa',
  tagihan_belum_bayar NUMERIC DEFAULT 0,
  jumlah_lunas NUMERIC DEFAULT 0,
  bukti_pembayaran_files JSONB DEFAULT '[]'::jsonb,
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  google_maps_link TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for rental_contracts
ALTER TABLE public.rental_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rental contracts"
ON public.rental_contracts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rental contracts"
ON public.rental_contracts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rental contracts"
ON public.rental_contracts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rental contracts"
ON public.rental_contracts FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at on client_groups
CREATE TRIGGER update_client_groups_updated_at
BEFORE UPDATE ON public.client_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on rental_contracts
CREATE TRIGGER update_rental_contracts_updated_at
BEFORE UPDATE ON public.rental_contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for KTP documents
CREATE POLICY "Users can view their own KTP documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'ktp-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own KTP documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ktp-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own KTP documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ktp-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own KTP documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'ktp-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for payment proofs
CREATE POLICY "Users can view their own payment proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own payment proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own payment proofs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own payment proofs"
ON storage.objects FOR DELETE
USING (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);