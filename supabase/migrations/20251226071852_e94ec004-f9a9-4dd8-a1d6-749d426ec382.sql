-- =============================================
-- BCA AUTO-MUTATION SYSTEM WITH BURST MODE
-- =============================================

-- 1. BCA Credentials Table (encrypted storage for VPS & KlikBCA credentials)
CREATE TABLE public.bca_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- VPS Credentials
  vps_host VARCHAR(255) NOT NULL,
  vps_port INTEGER NOT NULL DEFAULT 22,
  vps_username VARCHAR(255) NOT NULL,
  vps_password_encrypted TEXT NOT NULL,
  
  -- KlikBCA Credentials (AES-256 encrypted)
  klikbca_user_id_encrypted TEXT NOT NULL,
  klikbca_pin_encrypted TEXT NOT NULL,
  
  -- Webhook Security
  webhook_secret UUID NOT NULL DEFAULT gen_random_uuid(),
  allowed_ip VARCHAR(45),
  
  -- Polling Configuration
  default_interval_minutes INTEGER NOT NULL DEFAULT 15,
  burst_interval_seconds INTEGER NOT NULL DEFAULT 60,
  burst_duration_seconds INTEGER NOT NULL DEFAULT 180,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  error_count INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Only one active credential per user
  CONSTRAINT bca_credentials_user_unique UNIQUE (user_id)
);

-- 2. Bank Mutations Table (log all BCA mutations)
CREATE TABLE public.bank_mutations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  
  -- Transaction Details
  transaction_date DATE NOT NULL,
  transaction_time TIME,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_type VARCHAR(10) NOT NULL,
  balance_after NUMERIC,
  reference_number VARCHAR(100),
  
  -- Matching
  matched_contract_id UUID REFERENCES public.rental_contracts(id) ON DELETE SET NULL,
  is_processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Source & Raw Data
  source VARCHAR(20) NOT NULL DEFAULT 'auto',
  raw_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent duplicates
  CONSTRAINT bank_mutations_unique UNIQUE (user_id, transaction_date, reference_number, amount, description)
);

-- 3. BCA Sync Logs Table
CREATE TABLE public.bca_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bca_credential_id UUID NOT NULL REFERENCES public.bca_credentials(id) ON DELETE CASCADE,
  
  status VARCHAR(20) NOT NULL,
  mode VARCHAR(20) NOT NULL DEFAULT 'normal',
  mutations_found INTEGER NOT NULL DEFAULT 0,
  mutations_new INTEGER NOT NULL DEFAULT 0,
  mutations_matched INTEGER NOT NULL DEFAULT 0,
  
  error_message TEXT,
  error_code VARCHAR(50),
  ip_address VARCHAR(45),
  
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER
);

-- 4. Payment Confirmation Requests Table (trigger burst mode)
CREATE TABLE public.payment_confirmation_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  contract_id UUID NOT NULL REFERENCES public.rental_contracts(id) ON DELETE CASCADE,
  
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  amount_expected NUMERIC NOT NULL,
  
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  burst_expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '3 minutes'),
  
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  matched_mutation_id UUID REFERENCES public.bank_mutations(id) ON DELETE SET NULL,
  matched_at TIMESTAMP WITH TIME ZONE,
  
  whatsapp_sent BOOLEAN NOT NULL DEFAULT false,
  whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_bank_mutations_user_date ON public.bank_mutations(user_id, transaction_date DESC);
CREATE INDEX idx_bank_mutations_unprocessed ON public.bank_mutations(user_id, is_processed) WHERE is_processed = false;
CREATE INDEX idx_bank_mutations_amount ON public.bank_mutations(amount, transaction_type) WHERE transaction_type = 'CR';
CREATE INDEX idx_bca_sync_logs_credential ON public.bca_sync_logs(bca_credential_id, started_at DESC);
CREATE INDEX idx_payment_confirmation_pending ON public.payment_confirmation_requests(status, burst_expires_at) WHERE status = 'pending';
CREATE INDEX idx_payment_confirmation_amount ON public.payment_confirmation_requests(amount_expected, status) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.bca_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bca_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_confirmation_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Super admins can manage BCA credentials"
  ON public.bca_credentials FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage bank mutations"
  ON public.bank_mutations FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Admins can view bank mutations"
  ON public.bank_mutations FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Super admins can manage sync logs"
  ON public.bca_sync_logs FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Admins can view sync logs"
  ON public.bca_sync_logs FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can create payment confirmation for their contracts"
  ON public.payment_confirmation_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rental_contracts rc
      JOIN client_groups cg ON rc.client_group_id = cg.id
      WHERE rc.id = contract_id AND cg.linked_user_id = auth.uid()
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Users can view their own payment confirmations"
  ON public.payment_confirmation_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rental_contracts rc
      JOIN client_groups cg ON rc.client_group_id = cg.id
      WHERE rc.id = contract_id AND cg.linked_user_id = auth.uid()
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Super admins can manage payment confirmations"
  ON public.payment_confirmation_requests FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Triggers
CREATE TRIGGER update_bca_credentials_updated_at
  BEFORE UPDATE ON public.bca_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_confirmation_updated_at
  BEFORE UPDATE ON public.payment_confirmation_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper Functions
CREATE OR REPLACE FUNCTION public.get_pending_burst_requests(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  contract_id UUID,
  customer_name VARCHAR,
  amount_expected NUMERIC,
  requested_at TIMESTAMPTZ,
  burst_expires_at TIMESTAMPTZ,
  seconds_remaining INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pcr.id, pcr.contract_id, pcr.customer_name, pcr.amount_expected,
    pcr.requested_at, pcr.burst_expires_at,
    EXTRACT(EPOCH FROM (pcr.burst_expires_at - now()))::INTEGER as seconds_remaining
  FROM payment_confirmation_requests pcr
  WHERE pcr.status = 'pending' AND pcr.burst_expires_at > now()
    AND (p_user_id IS NULL OR pcr.user_id = p_user_id)
  ORDER BY pcr.requested_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_burst_requests()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE expired_count INTEGER;
BEGIN
  UPDATE payment_confirmation_requests
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending' AND burst_expires_at < now();
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_mutation_with_request(p_mutation_id UUID, p_amount NUMERIC)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_request_id UUID; v_contract_id UUID;
BEGIN
  SELECT id, contract_id INTO v_request_id, v_contract_id
  FROM payment_confirmation_requests
  WHERE status = 'pending' AND burst_expires_at > now() AND amount_expected = p_amount
  ORDER BY requested_at ASC LIMIT 1;
  
  IF v_request_id IS NOT NULL THEN
    UPDATE payment_confirmation_requests
    SET status = 'matched', matched_mutation_id = p_mutation_id, matched_at = now(), updated_at = now()
    WHERE id = v_request_id;
    
    UPDATE bank_mutations
    SET is_processed = true, processed_at = now(), matched_contract_id = v_contract_id
    WHERE id = p_mutation_id;
  END IF;
  RETURN v_request_id;
END;
$$;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_confirmation_requests;