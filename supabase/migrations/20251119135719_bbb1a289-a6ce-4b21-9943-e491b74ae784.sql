-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for avatars bucket
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Add notification preference columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_push BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_due_date BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_payment BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_budget_alert BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_monthly_report BOOLEAN DEFAULT false;

-- Update existing users to have default preferences
UPDATE profiles 
SET 
  notification_email = COALESCE(notification_email, true),
  notification_push = COALESCE(notification_push, true),
  notification_due_date = COALESCE(notification_due_date, true),
  notification_payment = COALESCE(notification_payment, true),
  notification_budget_alert = COALESCE(notification_budget_alert, true),
  notification_monthly_report = COALESCE(notification_monthly_report, false)
WHERE notification_email IS NULL;