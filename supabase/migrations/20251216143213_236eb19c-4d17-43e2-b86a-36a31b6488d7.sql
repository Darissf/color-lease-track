-- Create table for payment edit requests (admin approval workflow)
CREATE TABLE public.payment_edit_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  payment_id UUID NOT NULL REFERENCES public.contract_payments(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.rental_contracts(id) ON DELETE CASCADE,
  
  -- Current values for comparison
  current_amount NUMERIC NOT NULL,
  current_payment_date DATE NOT NULL,
  current_notes TEXT,
  
  -- New proposed values
  new_amount NUMERIC NOT NULL,
  new_payment_date DATE NOT NULL,
  new_notes TEXT,
  
  -- Request metadata
  request_reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_edit_requests ENABLE ROW LEVEL SECURITY;

-- Admins can insert edit requests
CREATE POLICY "Admins can insert edit requests"
ON public.payment_edit_requests
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Admins can view their own requests
CREATE POLICY "Admins can view their own requests"
ON public.payment_edit_requests
FOR SELECT
USING (auth.uid() = user_id OR is_super_admin(auth.uid()));

-- Super admins can view all requests
CREATE POLICY "Super admins can view all requests"
ON public.payment_edit_requests
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Super admins can update requests (approve/reject)
CREATE POLICY "Super admins can update requests"
ON public.payment_edit_requests
FOR UPDATE
USING (is_super_admin(auth.uid()));

-- Super admins can delete requests
CREATE POLICY "Super admins can delete requests"
ON public.payment_edit_requests
FOR DELETE
USING (is_super_admin(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_payment_edit_requests_contract_id ON public.payment_edit_requests(contract_id);
CREATE INDEX idx_payment_edit_requests_status ON public.payment_edit_requests(status);
CREATE INDEX idx_payment_edit_requests_user_id ON public.payment_edit_requests(user_id);