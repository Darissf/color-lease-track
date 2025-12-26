-- Add column to track who created the payment request
ALTER TABLE payment_confirmation_requests ADD COLUMN IF NOT EXISTS created_by_role TEXT DEFAULT 'user';
COMMENT ON COLUMN payment_confirmation_requests.created_by_role IS 'Who created the request: user, admin, or super_admin';