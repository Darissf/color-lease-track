
-- =====================================================
-- ADVANCED WHATSAPP PACKAGE - DATABASE SCHEMA
-- =====================================================

-- 1. whatsapp_numbers (Multi-Number Management)
CREATE TABLE IF NOT EXISTS public.whatsapp_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Identity
  name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('waha', 'meta_cloud')),
  
  -- WAHA Config
  waha_api_url TEXT,
  waha_api_key TEXT,
  waha_session_name VARCHAR(50) DEFAULT 'default',
  
  -- Meta Cloud API Config
  meta_phone_number_id TEXT,
  meta_access_token TEXT,
  meta_business_account_id TEXT,
  meta_webhook_verify_token TEXT,
  
  -- Smart Routing
  priority INTEGER DEFAULT 0,
  notification_types TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  
  -- Business Hours
  business_hours_enabled BOOLEAN DEFAULT false,
  business_hours_start TIME DEFAULT '08:00',
  business_hours_end TIME DEFAULT '17:00',
  business_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5],
  
  -- Rate Limiting
  daily_limit INTEGER DEFAULT 1000,
  messages_sent_today INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  
  -- Health & Status
  is_active BOOLEAN DEFAULT true,
  connection_status VARCHAR(20) DEFAULT 'unknown',
  last_connection_test TIMESTAMPTZ,
  consecutive_errors INTEGER DEFAULT 0,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_phone_per_user UNIQUE(user_id, phone_number)
);

-- 2. whatsapp_customer_tags (Customer Tags)
CREATE TABLE IF NOT EXISTS public.whatsapp_customer_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  name VARCHAR(50) NOT NULL,
  color VARCHAR(20) DEFAULT 'blue',
  description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_tag_per_user UNIQUE(user_id, name)
);

-- 3. whatsapp_conversations (Conversation History)
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  whatsapp_number_id UUID REFERENCES public.whatsapp_numbers(id) ON DELETE SET NULL,
  
  -- Customer Info
  customer_phone VARCHAR(20) NOT NULL,
  customer_name VARCHAR(255),
  customer_profile_pic TEXT,
  
  -- Tags
  tags TEXT[] DEFAULT '{}',
  engagement_score INTEGER DEFAULT 0,
  
  -- Conversation State
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  last_message_direction VARCHAR(10),
  unread_count INTEGER DEFAULT 0,
  is_starred BOOLEAN DEFAULT false,
  
  -- Linking
  client_group_id UUID REFERENCES public.client_groups(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_conversation UNIQUE(user_id, customer_phone)
);

-- 4. whatsapp_messages (All Messages In/Out)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  whatsapp_number_id UUID REFERENCES public.whatsapp_numbers(id) ON DELETE SET NULL,
  
  -- Message Identity
  external_message_id TEXT,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  
  -- Content
  message_type VARCHAR(20) DEFAULT 'text',
  message_content TEXT,
  media_url TEXT,
  media_mime_type VARCHAR(50),
  template_name VARCHAR(255),
  template_variables JSONB,
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  is_scheduled BOOLEAN DEFAULT false,
  
  -- Context
  notification_type VARCHAR(50),
  contract_id UUID,
  
  -- Link Tracking
  tracked_links JSONB DEFAULT '[]',
  
  -- Status (for outbound)
  status VARCHAR(20) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  -- Analytics
  response_time_seconds INTEGER,
  
  -- Provider
  provider VARCHAR(20),
  provider_response JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. whatsapp_scheduled_messages (Scheduled Messages)
CREATE TABLE IF NOT EXISTS public.whatsapp_scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  whatsapp_number_id UUID REFERENCES public.whatsapp_numbers(id) ON DELETE SET NULL,
  
  -- Recipient
  recipient_phone VARCHAR(20) NOT NULL,
  recipient_name VARCHAR(255),
  
  -- Content
  message_type VARCHAR(20) DEFAULT 'text',
  message_content TEXT,
  media_url TEXT,
  template_name VARCHAR(255),
  template_variables JSONB,
  notification_type VARCHAR(50),
  contract_id UUID,
  
  -- Schedule
  scheduled_at TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
  
  -- Status
  status VARCHAR(20) DEFAULT 'scheduled',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. whatsapp_tracked_links (Link Tracking)
CREATE TABLE IF NOT EXISTS public.whatsapp_tracked_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  message_id UUID REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE,
  
  original_url TEXT NOT NULL,
  short_code VARCHAR(20) UNIQUE NOT NULL,
  
  -- Analytics
  click_count INTEGER DEFAULT 0,
  first_click_at TIMESTAMPTZ,
  last_click_at TIMESTAMPTZ,
  clicks JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. whatsapp_analytics (Daily Aggregation)
CREATE TABLE IF NOT EXISTS public.whatsapp_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  whatsapp_number_id UUID REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
  
  date DATE NOT NULL,
  
  -- Volume
  messages_sent INTEGER DEFAULT 0,
  messages_delivered INTEGER DEFAULT 0,
  messages_read INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  
  -- Rates
  delivery_rate NUMERIC(5,2),
  read_rate NUMERIC(5,2),
  response_rate NUMERIC(5,2),
  
  -- Response Time
  avg_response_time_seconds INTEGER,
  
  -- By Type Breakdown
  breakdown_by_type JSONB DEFAULT '{}',
  
  -- Link Tracking
  total_link_clicks INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_analytics_per_day UNIQUE(user_id, whatsapp_number_id, date)
);

-- 8. meta_whatsapp_templates (Meta Template Mapping)
CREATE TABLE IF NOT EXISTS public.meta_whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  whatsapp_number_id UUID REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
  
  local_template_type VARCHAR(50) NOT NULL,
  meta_template_name VARCHAR(255) NOT NULL,
  meta_template_language VARCHAR(10) DEFAULT 'id',
  meta_template_status VARCHAR(20) DEFAULT 'PENDING',
  meta_template_category VARCHAR(50),
  
  variables_mapping JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update existing whatsapp_notifications_log table
ALTER TABLE public.whatsapp_notifications_log
  ADD COLUMN IF NOT EXISTS whatsapp_number_id UUID REFERENCES public.whatsapp_numbers(id),
  ADD COLUMN IF NOT EXISTS message_id UUID,
  ADD COLUMN IF NOT EXISTS provider VARCHAR(20),
  ADD COLUMN IF NOT EXISTS sender_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Enable RLS on all new tables
ALTER TABLE public.whatsapp_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_tracked_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_numbers
CREATE POLICY "Super admins can manage WhatsApp numbers" ON public.whatsapp_numbers
  FOR ALL USING (is_super_admin(auth.uid()));

-- RLS Policies for whatsapp_customer_tags
CREATE POLICY "Super admins can manage customer tags" ON public.whatsapp_customer_tags
  FOR ALL USING (is_super_admin(auth.uid()));

-- RLS Policies for whatsapp_conversations
CREATE POLICY "Super admins can manage conversations" ON public.whatsapp_conversations
  FOR ALL USING (is_super_admin(auth.uid()));

-- RLS Policies for whatsapp_messages
CREATE POLICY "Super admins can view messages" ON public.whatsapp_messages
  FOR SELECT USING (is_super_admin(auth.uid()));

CREATE POLICY "System can insert messages" ON public.whatsapp_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update messages" ON public.whatsapp_messages
  FOR UPDATE USING (true);

-- RLS Policies for whatsapp_scheduled_messages
CREATE POLICY "Super admins can manage scheduled messages" ON public.whatsapp_scheduled_messages
  FOR ALL USING (is_super_admin(auth.uid()));

-- RLS Policies for whatsapp_tracked_links
CREATE POLICY "Super admins can view tracked links" ON public.whatsapp_tracked_links
  FOR SELECT USING (is_super_admin(auth.uid()));

CREATE POLICY "System can manage tracked links" ON public.whatsapp_tracked_links
  FOR ALL USING (true);

-- RLS Policies for whatsapp_analytics
CREATE POLICY "Super admins can view analytics" ON public.whatsapp_analytics
  FOR SELECT USING (is_super_admin(auth.uid()));

CREATE POLICY "System can manage analytics" ON public.whatsapp_analytics
  FOR ALL USING (true);

-- RLS Policies for meta_whatsapp_templates
CREATE POLICY "Super admins can manage meta templates" ON public.meta_whatsapp_templates
  FOR ALL USING (is_super_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_user ON public.whatsapp_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_provider ON public.whatsapp_numbers(provider);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_user ON public.whatsapp_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON public.whatsapp_conversations(customer_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation ON public.whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON public.whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_scheduled_status ON public.whatsapp_scheduled_messages(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_tracked_links_code ON public.whatsapp_tracked_links(short_code);
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_date ON public.whatsapp_analytics(user_id, date);

-- Enable realtime for conversations and messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;

-- Function to reset daily message counts
CREATE OR REPLACE FUNCTION reset_whatsapp_daily_counts()
RETURNS void AS $$
BEGIN
  UPDATE public.whatsapp_numbers
  SET messages_sent_today = 0, last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update conversation on new message
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.whatsapp_conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.message_content, 100),
    last_message_direction = NEW.direction,
    unread_count = CASE WHEN NEW.direction = 'inbound' THEN unread_count + 1 ELSE unread_count END,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_conversation_on_message
AFTER INSERT ON public.whatsapp_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_on_message();
