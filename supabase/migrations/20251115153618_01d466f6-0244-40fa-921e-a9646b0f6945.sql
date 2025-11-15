-- AI Memory System for long-term context
CREATE TABLE IF NOT EXISTS public.ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL, -- 'preference', 'fact', 'context'
  content TEXT NOT NULL,
  importance INTEGER DEFAULT 1, -- 1-10 scale
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own memories"
ON public.ai_memory FOR ALL
USING (auth.uid() = user_id);

CREATE INDEX idx_ai_memory_user_id ON public.ai_memory(user_id);
CREATE INDEX idx_ai_memory_conversation_id ON public.ai_memory(conversation_id);

-- AI Personas for different personalities
CREATE TABLE IF NOT EXISTS public.ai_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  avatar_emoji TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.ai_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own personas"
ON public.ai_personas FOR ALL
USING (auth.uid() = user_id);

CREATE INDEX idx_ai_personas_user_id ON public.ai_personas(user_id);

-- Chat Documents for uploaded files
CREATE TABLE IF NOT EXISTS public.chat_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  extracted_text TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.chat_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own documents"
ON public.chat_documents FOR ALL
USING (auth.uid() = user_id);

CREATE INDEX idx_chat_documents_user_id ON public.chat_documents(user_id);
CREATE INDEX idx_chat_documents_conversation_id ON public.chat_documents(conversation_id);

-- Message Reactions
CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction TEXT NOT NULL, -- 'like', 'dislike'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own reactions"
ON public.chat_message_reactions FOR ALL
USING (auth.uid() = user_id);

CREATE INDEX idx_chat_message_reactions_message_id ON public.chat_message_reactions(message_id);

-- Chat Bookmarks
CREATE TABLE IF NOT EXISTS public.chat_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.chat_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bookmarks"
ON public.chat_bookmarks FOR ALL
USING (auth.uid() = user_id);

CREATE INDEX idx_chat_bookmarks_user_id ON public.chat_bookmarks(user_id);

-- Conversation Sharing
CREATE TABLE IF NOT EXISTS public.conversation_sharing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  share_token TEXT UNIQUE NOT NULL,
  is_public BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.conversation_sharing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own shares"
ON public.conversation_sharing FOR ALL
USING (auth.uid() = user_id);

CREATE INDEX idx_conversation_sharing_token ON public.conversation_sharing(share_token);

-- Custom AI Tools
CREATE TABLE IF NOT EXISTS public.ai_custom_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  function_definition JSONB NOT NULL,
  endpoint_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.ai_custom_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tools"
ON public.ai_custom_tools FOR ALL
USING (auth.uid() = user_id);

CREATE INDEX idx_ai_custom_tools_user_id ON public.ai_custom_tools(user_id);

-- Add tags column to conversations
ALTER TABLE public.chat_conversations 
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS folder TEXT,
ADD COLUMN IF NOT EXISTS persona_id UUID REFERENCES public.ai_personas(id) ON DELETE SET NULL;

-- Add search index
CREATE INDEX IF NOT EXISTS idx_chat_conversations_tags ON public.chat_conversations USING GIN(tags);

-- Insert default personas
INSERT INTO public.ai_personas (user_id, name, description, system_prompt, avatar_emoji, is_default)
SELECT 
  auth.uid(),
  'Default Assistant',
  'A helpful and friendly AI assistant',
  'You are a helpful, friendly AI assistant. Provide clear and concise answers.',
  '🤖',
  true
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;