-- Drop overly permissive "System" RLS policies that grant access to all authenticated users
-- Edge functions using service_role_key already bypass RLS, so these policies are unnecessary

DROP POLICY IF EXISTS "System can manage analytics" ON whatsapp_analytics;
DROP POLICY IF EXISTS "System can update messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "System can update notification logs" ON whatsapp_notifications_log;
DROP POLICY IF EXISTS "System can manage tracked links" ON whatsapp_tracked_links;

-- Add proper super_admin-only policies for UI access if needed
CREATE POLICY "Super admins can manage analytics" ON whatsapp_analytics
  FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage tracked links" ON whatsapp_tracked_links
  FOR ALL USING (is_super_admin(auth.uid()));