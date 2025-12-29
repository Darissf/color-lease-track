-- Enable REPLICA IDENTITY FULL for payment_confirmation_requests table
-- This ensures full row data is sent on realtime UPDATE events
ALTER TABLE public.payment_confirmation_requests REPLICA IDENTITY FULL;