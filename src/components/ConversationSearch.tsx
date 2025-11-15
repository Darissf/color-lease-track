import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  conversation_id: string;
  conversation_title: string;
  message_content: string;
  created_at: string;
  tags: string[] | null;
}

interface ConversationSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectConversation: (conversationId: string) => void;
}

export const ConversationSearch: React.FC<ConversationSearchProps> = ({
  open,
  onOpenChange,
  onSelectConversation,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      await performSearch();
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const performSearch = async () => {
    setIsSearching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Search in messages
      const { data: messages } = await supabase
        .from('chat_messages')
        .select(`
          id,
          content,
          created_at,
          conversation_id,
          conversation:chat_conversations(id, title, tags)
        `)
        .textSearch('content', query)
        .limit(20);

      if (messages) {
        const searchResults: SearchResult[] = messages.map((m: any) => ({
          conversation_id: m.conversation?.id,
          conversation_title: m.conversation?.title,
          message_content: m.content,
          created_at: m.created_at,
          tags: m.conversation?.tags,
        }));
        setResults(searchResults);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (conversationId: string) => {
    onSelectConversation(conversationId);
    onOpenChange(false);
    setQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Search Conversations</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <ScrollArea className="h-[400px]">
            {isSearching && (
              <div className="text-center py-4 text-muted-foreground">
                Searching...
              </div>
            )}
            {!isSearching && results.length === 0 && query.length >= 2 && (
              <div className="text-center py-4 text-muted-foreground">
                No results found
              </div>
            )}
            {results.map((result, idx) => (
              <div
                key={idx}
                className="p-4 hover:bg-muted rounded-lg cursor-pointer mb-2"
                onClick={() => handleSelectResult(result.conversation_id)}
              >
                <div className="font-semibold mb-1">{result.conversation_title}</div>
                <div className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {result.message_content}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(result.created_at).toLocaleDateString()}</span>
                  {result.tags && result.tags.length > 0 && (
                    <>
                      <Tag className="h-3 w-3 ml-2" />
                      {result.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </>
                  )}
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
