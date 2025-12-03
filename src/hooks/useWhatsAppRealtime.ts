import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RealtimeNotification {
  id: string;
  type: 'new_message' | 'status_update' | 'new_conversation';
  conversationId: string;
  customerName?: string;
  customerPhone: string;
  messagePreview?: string;
  timestamp: string;
}

export const useWhatsAppRealtime = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { toast } = useToast();

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Could not play notification sound');
    }
  }, [soundEnabled]);

  const addNotification = useCallback((notification: RealtimeNotification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
    playNotificationSound();
    
    toast({
      title: notification.customerName || notification.customerPhone,
      description: notification.messagePreview || 'Pesan baru',
    });
  }, [playNotificationSound, toast]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('unread_count')
        .gt('unread_count', 0);

      if (error) throw error;

      const totalUnread = (data || []).reduce((sum, c) => sum + (c.unread_count || 0), 0);
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  useEffect(() => {
    fetchUnreadCount();

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('whatsapp_messages_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: 'direction=eq.inbound'
        },
        async (payload) => {
          console.log('[WhatsApp Realtime] New inbound message:', payload);
          
          const message = payload.new as any;
          
          // Get conversation details
          const { data: conversation } = await supabase
            .from('whatsapp_conversations')
            .select('*')
            .eq('id', message.conversation_id)
            .single();

          if (conversation) {
            addNotification({
              id: message.id,
              type: 'new_message',
              conversationId: message.conversation_id,
              customerName: conversation.customer_name,
              customerPhone: conversation.customer_phone,
              messagePreview: message.message_content?.substring(0, 100),
              timestamp: message.created_at
            });
          }

          // Refresh unread count
          fetchUnreadCount();
        }
      )
      .subscribe();

    // Subscribe to conversation updates (for unread count changes)
    const conversationsChannel = supabase
      .channel('whatsapp_conversations_realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_conversations'
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(conversationsChannel);
    };
  }, [fetchUnreadCount, addNotification]);

  return {
    unreadCount,
    notifications,
    soundEnabled,
    toggleSound,
    clearNotification,
    clearAllNotifications,
    fetchUnreadCount
  };
};
