-- Add unique amount columns to payment_confirmation_requests
ALTER TABLE public.payment_confirmation_requests
ADD COLUMN IF NOT EXISTS unique_code VARCHAR(3),
ADD COLUMN IF NOT EXISTS unique_amount NUMERIC,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Drop old burst_expires_at column if exists
ALTER TABLE public.payment_confirmation_requests
DROP COLUMN IF EXISTS burst_expires_at;

-- Update the match_mutation_with_request function to use unique_amount
CREATE OR REPLACE FUNCTION public.match_mutation_with_request(p_mutation_id uuid, p_amount numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE 
  v_request_id UUID; 
  v_contract_id UUID;
BEGIN
  -- Match based on unique_amount (exact match), status pending, and not expired
  SELECT id, contract_id INTO v_request_id, v_contract_id
  FROM payment_confirmation_requests
  WHERE status = 'pending' 
    AND expires_at > now() 
    AND unique_amount = p_amount
  ORDER BY created_at ASC 
  LIMIT 1;
  
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
$function$;

-- Update expire function to use expires_at instead of burst_expires_at
CREATE OR REPLACE FUNCTION public.expire_burst_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE expired_count INTEGER;
BEGIN
  UPDATE payment_confirmation_requests
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending' AND expires_at < now();
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$function$;