import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Image, File, Check, CheckCheck, Clock, XCircle, Loader2 } from 'lucide-react';
import { useWhatsAppConversations } from '@/hooks/useWhatsAppConversations';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface WhatsAppChatPanelProps {
  conversationId: string;
}

export const WhatsAppChatPanel = ({ conversationId }: WhatsAppChatPanelProps) => {
  const { conversations, getMessages, sendMessage, markAsRead } = useWhatsAppConversations();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversation = conversations.find(c => c.id === conversationId);

  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      const msgs = await getMessages(conversationId);
      setMessages(msgs);
      setLoading(false);
      markAsRead(conversationId);
    };
    
    if (conversationId) {
      loadMessages();
    }
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    
    setSending(true);
    try {
      await sendMessage(conversationId, newMessage);
      setNewMessage('');
      const msgs = await getMessages(conversationId);
      setMessages(msgs);
    } catch (error) {
      console.error('Error sending message:', error);
    }
    setSending(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Check className="h-3 w-3" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'failed':
        return <XCircle className="h-3 w-3 text-destructive" />;
      default:
        return null;
    }
  };

  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Pilih percakapan untuk melihat pesan
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">
              {conversation?.customer_name || conversation?.customer_phone}
            </h3>
            <p className="text-sm text-muted-foreground">
              {conversation?.customer_phone}
            </p>
          </div>
          {conversation?.tags && conversation.tags.length > 0 && (
            <div className="flex gap-1">
              {conversation.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Belum ada pesan
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.direction === 'outbound'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {msg.message_type === 'image' && msg.media_url && (
                    <img
                      src={msg.media_url}
                      alt="Image"
                      className="rounded-md mb-2 max-w-full"
                    />
                  )}
                  {msg.message_type === 'document' && msg.media_url && (
                    <a
                      href={msg.media_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm underline mb-2"
                    >
                      <File className="h-4 w-4" />
                      {msg.media_filename || 'Document'}
                    </a>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.message_content}</p>
                  <div className={`flex items-center justify-end gap-1 mt-1 ${
                    msg.direction === 'outbound' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    <span className="text-xs">
                      {format(new Date(msg.created_at), 'HH:mm', { locale: id })}
                    </span>
                    {msg.direction === 'outbound' && getStatusIcon(msg.delivery_status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Button variant="outline" size="icon" disabled>
            <Image className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" disabled>
            <File className="h-4 w-4" />
          </Button>
          <Input
            placeholder="Ketik pesan..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={sending}
          />
          <Button onClick={handleSend} disabled={sending || !newMessage.trim()}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
