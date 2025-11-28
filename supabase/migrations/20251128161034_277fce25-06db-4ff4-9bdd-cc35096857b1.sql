-- ============================================
-- SECURITY FIXES - Comprehensive Migration (Fixed)
-- ============================================

-- 1. FIX RLS POLICIES untuk agent_commands (CRITICAL)
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.agent_commands;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.agent_commands;

CREATE POLICY "Super admins can manage agent commands"
  ON public.agent_commands
  FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- 2. FIX RLS POLICIES untuk agent_command_outputs (CRITICAL)
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.agent_command_outputs;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.agent_command_outputs;

CREATE POLICY "Super admins can manage agent command outputs"
  ON public.agent_command_outputs
  FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- 3. FIX REMAINING FUNCTION SEARCH PATH MUTABLE ISSUES
CREATE OR REPLACE FUNCTION public.increment_provider_usage(p_provider_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE email_providers
  SET emails_sent_today = emails_sent_today + 1,
      emails_sent_month = emails_sent_month + 1,
      last_success_at = now(),
      health_status = 'healthy',
      last_error = NULL
  WHERE id = p_provider_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_provider_error(p_provider_id uuid, p_error_message text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE email_providers
  SET last_error = p_error_message,
      health_status = 'degraded'
  WHERE id = p_provider_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_template_usage(p_template_type character varying)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE email_templates
  SET usage_count = usage_count + 1
  WHERE template_type = p_template_type;
END;
$function$;

-- 4. FIX blog_posts RLS to prevent author_id exposure
DROP POLICY IF EXISTS "Blog posts are viewable by everyone" ON public.blog_posts;

CREATE POLICY "Public can view published blog posts"
  ON public.blog_posts
  FOR SELECT
  USING (status = 'published' OR auth.uid() = author_id OR public.is_admin(auth.uid()));

-- 5. FIX editable_content RLS
DROP POLICY IF EXISTS "Content is viewable by everyone" ON public.editable_content;
DROP POLICY IF EXISTS "Anyone can view editable content" ON public.editable_content;

CREATE POLICY "Public can view content values"
  ON public.editable_content
  FOR SELECT
  USING (true);

-- 6. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_agent_commands_status ON public.agent_commands(status);
CREATE INDEX IF NOT EXISTS idx_agent_command_outputs_agent_token ON public.agent_command_outputs(agent_token);
CREATE INDEX IF NOT EXISTS idx_email_providers_is_active ON public.email_providers(is_active);

-- ============================================
-- Summary:
-- ✅ Fixed agent_commands RLS (super_admin only)
-- ✅ Fixed agent_command_outputs RLS (super_admin only)  
-- ✅ Fixed 3 functions with mutable search_path
-- ✅ Fixed blog_posts author exposure
-- ✅ Fixed editable_content exposure
-- ✅ Added performance indexes
-- ============================================