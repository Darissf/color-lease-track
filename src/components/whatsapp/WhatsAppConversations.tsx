import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Star, StarOff, MessageCircle, Loader2 } from 'lucide-react';
import { useWhatsAppConversations } from '@/hooks/useWhatsAppConversations';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

interface WhatsAppConversationsProps {
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId?: string;
}

export const WhatsAppConversations = ({ onSelectConversation, selectedConversationId }: WhatsAppConversationsProps) => {
  const { conversations, loading, toggleStar, fetchConversations } = useWhatsAppConversations();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'starred' | 'unread'>('all');

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = 
      conv.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.customer_phone?.includes(searchQuery);
    
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'starred' && conv.is_starred) ||
      (filter === 'unread' && conv.unread_count > 0);

    return matchesSearch && matchesFilter;
  });

  const handleSearch = () => {
    fetchConversations({ search: searchQuery });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau nomor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Semua
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            Belum Dibaca
          </Button>
          <Button
            variant={filter === 'starred' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('starred')}
          >
            Berbintang
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mb-4" />
            <p>Tidak ada percakapan</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedConversationId === conv.id ? 'bg-muted' : ''
                }`}
                onClick={() => onSelectConversation(conv.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {conv.customer_name || conv.customer_phone}
                      </p>
                      {conv.unread_count > 0 && (
                        <Badge variant="default" className="text-xs">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.customer_phone}
                    </p>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {conv.last_message_direction === 'inbound' ? '← ' : '→ '}
                      {conv.last_message_preview}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-muted-foreground">
                      {conv.last_message_at && formatDistanceToNow(new Date(conv.last_message_at), {
                        addSuffix: true,
                        locale: id
                      })}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(conv.id);
                      }}
                    >
                      {conv.is_starred ? (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                {conv.tags && conv.tags.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {conv.tags.slice(0, 3).map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {conv.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{conv.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
