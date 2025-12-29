-- Add burst_triggered_at column to track when user clicked "Saya Sudah Transfer"
-- This enables 2-minute cooldown that persists across page refreshes

ALTER TABLE payment_confirmation_requests 
ADD COLUMN IF NOT EXISTS burst_triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;