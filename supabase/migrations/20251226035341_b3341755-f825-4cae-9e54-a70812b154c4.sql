-- Fix WhatsApp Notification Queue RLS Policy
-- Drop the overly permissive policy that allows public access
DROP POLICY IF EXISTS "System can manage queue" ON public.whatsapp_notification_queue;

-- Create proper restricted policies
-- Only super admins and the queue owner can view their queue items
CREATE POLICY "Super admins can manage queue" 
ON public.whatsapp_notification_queue 
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Users can view their own queue items
CREATE POLICY "Users can view their own queue items" 
ON public.whatsapp_notification_queue 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert to their own queue
CREATE POLICY "Users can insert their own queue items" 
ON public.whatsapp_notification_queue 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);