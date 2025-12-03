import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WhatsAppConversation {
  id: string;
  user_id: string;
  whatsapp_number_id?: string;
  customer_phone: string;
  customer_name?: string;
  customer_profile_pic?: string;
  tags: string[];
  engagement_score: number;
  last_message_at?: string;
  last_message_preview?: string;
  last_message_direction?: 'inbound' | 'outbound';
  unread_count: number;
  is_starred: boolean;
  client_group_id?: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessage {
  id: string;
  user_id: string;
  conversation_id: string;
  whatsapp_number_id?: string;
  external_message_id?: string;
  direction: 'inbound' | 'outbound';
  message_type: string;
  message_content?: string;
  media_url?: string;
  media_mime_type?: string;
  template_name?: string;
  notification_type?: string;
  contract_id?: string;
  tracked_links?: any[];
  status: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  response_time_seconds?: number;
  provider?: string;
  error_message?: string;
  created_at: string;
}

export const useWhatsAppConversations = () => {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchConversations = async (filters?: { starred?: boolean; tag?: string; search?: string }) => {
    try {
      setLoading(true);
      let query = supabase
        .from('whatsapp_conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (filters?.starred) {
        query = query.eq('is_starred', true);
      }
      if (filters?.tag) {
        query = query.contains('tags', [filters.tag]);
      }
      if (filters?.search) {
        query = query.or(`customer_name.ilike.%${filters.search}%,customer_phone.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setConversations((data || []) as WhatsAppConversation[]);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat percakapan',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getMessages = async (conversationId: string): Promise<WhatsAppMessage[]> => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as WhatsAppMessage[];
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat pesan',
        variant: 'destructive',
      });
      return [];
    }
  };

  const markAsRead = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);

      if (error) throw error;
      
      setConversations(prev => 
        prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c)
      );
    } catch (error: any) {
      console.error('Error marking as read:', error);
    }
  };

  const toggleStar = async (conversationId: string) => {
    try {
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) return;

      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ is_starred: !conversation.is_starred })
        .eq('id', conversationId);

      if (error) throw error;
      
      setConversations(prev => 
        prev.map(c => c.id === conversationId ? { ...c, is_starred: !c.is_starred } : c)
      );
    } catch (error: any) {
      console.error('Error toggling star:', error);
    }
  };

  const addTag = async (conversationId: string, tag: string) => {
    try {
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) return;

      const newTags = [...new Set([...conversation.tags, tag])];
      
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ tags: newTags })
        .eq('id', conversationId);

      if (error) throw error;
      
      setConversations(prev => 
        prev.map(c => c.id === conversationId ? { ...c, tags: newTags } : c)
      );

      toast({
        title: 'Berhasil',
        description: 'Tag berhasil ditambahkan',
      });
    } catch (error: any) {
      console.error('Error adding tag:', error);
      toast({
        title: 'Error',
        description: 'Gagal menambahkan tag',
        variant: 'destructive',
      });
    }
  };

  const removeTag = async (conversationId: string, tag: string) => {
    try {
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) return;

      const newTags = conversation.tags.filter(t => t !== tag);
      
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ tags: newTags })
        .eq('id', conversationId);

      if (error) throw error;
      
      setConversations(prev => 
        prev.map(c => c.id === conversationId ? { ...c, tags: newTags } : c)
      );
    } catch (error: any) {
      console.error('Error removing tag:', error);
    }
  };

  const sendMessage = async (conversationId: string, message: string, mediaUrl?: string) => {
    try {
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) throw new Error('Conversation not found');

      const { data, error } = await supabase.functions.invoke('send-whatsapp-unified', {
        body: {
          recipientPhone: conversation.customer_phone,
          recipientName: conversation.customer_name,
          message,
          notificationType: 'manual',
          mediaUrl
        }
      });

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Pesan berhasil dikirim',
      });

      return data;
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengirim pesan',
        variant: 'destructive',
      });
      return null;
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Setup realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp_conversations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations'
        },
        (payload) => {
          console.log('[WhatsApp Realtime] Conversation change:', payload);
          
          if (payload.eventType === 'INSERT') {
            setConversations(prev => [payload.new as WhatsAppConversation, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setConversations(prev => 
              prev.map(c => c.id === payload.new.id ? payload.new as WhatsAppConversation : c)
            );
          } else if (payload.eventType === 'DELETE') {
            setConversations(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    conversations,
    loading,
    fetchConversations,
    getMessages,
    markAsRead,
    toggleStar,
    addTag,
    removeTag,
    sendMessage,
  };
};
