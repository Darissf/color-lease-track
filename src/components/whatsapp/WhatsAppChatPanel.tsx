import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, Image, File, Check, CheckCheck, Clock, XCircle, Loader2, 
  Search, X 
} from 'lucide-react';
import { useWhatsAppConversations } from '@/hooks/useWhatsAppConversations';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { QuickReplyTemplates } from './QuickReplyTemplates';
import { compressImage } from '@/utils/imageCompressor';

interface WhatsAppChatPanelProps {
  conversationId: string;
}

export const WhatsAppChatPanel = ({ conversationId }: WhatsAppChatPanelProps) => {
  const { conversations, getMessages, sendMessage, markAsRead } = useWhatsAppConversations();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const conversation = conversations.find(c => c.id === conversationId);

  // Load messages
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

  // Realtime subscription for new messages in this conversation
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat_messages_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('[Chat Realtime] New message:', payload);
          const newMsg = payload.new as any;
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          
          // Mark as read if inbound
          if (newMsg.direction === 'inbound') {
            markAsRead(conversationId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    
    setSending(true);
    try {
      await sendMessage(conversationId, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
    setSending(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMedia(true);
    try {
      // Compress image if needed
      let fileToUpload: File | Blob = file;
      if (file.size > 5 * 1024 * 1024) {
        fileToUpload = await compressImage(file, { maxSizeKB: 4 * 1024 });
        toast({
          title: 'Gambar dikompres',
          description: 'Ukuran gambar telah dikurangi untuk pengiriman.',
        });
      }

      // Upload to storage
      const fileName = `whatsapp-media/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, fileToUpload);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Send message with media
      await sendMessage(conversationId, newMessage || '📷 Gambar', urlData.publicUrl);
      setNewMessage('');
      
      toast({
        title: 'Berhasil',
        description: 'Gambar berhasil dikirim',
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengirim gambar',
        variant: 'destructive',
      });
    } finally {
      setUploadingMedia(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File terlalu besar',
        description: 'Maksimal ukuran file adalah 10MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingMedia(true);
    try {
      // Upload to storage
      const fileName = `whatsapp-media/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Send message with media
      await sendMessage(conversationId, `📎 ${file.name}`, urlData.publicUrl);
      
      toast({
        title: 'Berhasil',
        description: 'File berhasil dikirim',
      });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengirim file',
        variant: 'destructive',
      });
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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

  // Filter messages by search
  const filteredMessages = searchQuery
    ? messages.filter(m => 
        m.message_content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  // Highlight search matches
  const highlightText = (text: string, query: string) => {
    if (!query || !text) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className="bg-yellow-300 text-black px-0.5 rounded">{part}</mark>
        : part
    );
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
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-semibold">
                {conversation?.customer_name || conversation?.customer_phone}
              </h3>
              <p className="text-sm text-muted-foreground">
                {conversation?.customer_phone}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Search bar */}
        {showSearch && (
          <div className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari dalam percakapan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                setSearchQuery('');
                setShowSearch(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Tags */}
        {conversation?.tags && conversation.tags.length > 0 && (
          <div className="flex gap-1 mt-2">
            {conversation.tags.map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        
        {/* Search results count */}
        {searchQuery && (
          <p className="text-xs text-muted-foreground mt-2">
            Ditemukan {filteredMessages.length} pesan
          </p>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            {searchQuery ? 'Tidak ada pesan yang cocok' : 'Belum ada pesan'}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMessages.map((msg) => (
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
                      className="rounded-md mb-2 max-w-full cursor-pointer hover:opacity-90"
                      onClick={() => window.open(msg.media_url, '_blank')}
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
                  <p className="text-sm whitespace-pre-wrap">
                    {searchQuery ? highlightText(msg.message_content || '', searchQuery) : msg.message_content}
                  </p>
                  <div className={`flex items-center justify-end gap-1 mt-1 ${
                    msg.direction === 'outbound' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    <span className="text-xs">
                      {format(new Date(msg.created_at), 'HH:mm', { locale: id })}
                    </span>
                    {msg.direction === 'outbound' && getStatusIcon(msg.delivery_status || msg.status)}
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
          <Button 
            variant="outline" 
            size="icon" 
            disabled={uploadingMedia || sending}
            onClick={() => imageInputRef.current?.click()}
          >
            {uploadingMedia ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Image className="h-4 w-4" />
            )}
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            disabled={uploadingMedia || sending}
            onClick={() => fileInputRef.current?.click()}
          >
            <File className="h-4 w-4" />
          </Button>
          <QuickReplyTemplates
            onSelectTemplate={(content) => setNewMessage(content)}
            customerName={conversation?.customer_name}
            disabled={sending}
          />
          <Input
            placeholder="Ketik pesan..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={sending || uploadingMedia}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={sending || !newMessage.trim() || uploadingMedia}>
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
