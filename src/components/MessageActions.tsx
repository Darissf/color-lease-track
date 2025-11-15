import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Copy, Bookmark, Volume2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MessageActionsProps {
  messageId: string;
  content: string;
  onRegenerate?: () => void;
}

export const MessageActions: React.FC<MessageActionsProps> = ({ 
  messageId, 
  content,
  onRegenerate 
}) => {
  const [reaction, setReaction] = useState<'like' | 'dislike' | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { toast } = useToast();

  const handleReaction = async (newReaction: 'like' | 'dislike') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (reaction === newReaction) {
      // Remove reaction
      await supabase
        .from('chat_message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id);
      setReaction(null);
    } else {
      // Add or update reaction
      await supabase
        .from('chat_message_reactions')
        .upsert({
          message_id: messageId,
          user_id: user.id,
          reaction: newReaction,
        });
      setReaction(newReaction);
    }
  };

  const handleBookmark = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isBookmarked) {
      await supabase
        .from('chat_bookmarks')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id);
      setIsBookmarked(false);
      toast({ title: "Bookmark removed" });
    } else {
      await supabase
        .from('chat_bookmarks')
        .insert({
          message_id: messageId,
          user_id: user.id,
        });
      setIsBookmarked(true);
      toast({ title: "Message bookmarked" });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard" });
  };

  const handleSpeak = async () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('ai-text-to-speech', {
        body: { text: content, voice: 'alloy' }
      });

      if (error) throw error;

      if (data?.audio) {
        const audio = new Audio(data.audio);
        audio.onended = () => setIsSpeaking(false);
        audio.play();
        setIsSpeaking(true);
      }
    } catch (error) {
      console.error('Failed to speak:', error);
      toast({
        title: "Error",
        description: "Failed to convert text to speech",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => handleReaction('like')}
        className={reaction === 'like' ? 'text-primary' : ''}
      >
        <ThumbsUp className="h-3 w-3" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => handleReaction('dislike')}
        className={reaction === 'dislike' ? 'text-destructive' : ''}
      >
        <ThumbsDown className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="sm" onClick={handleCopy}>
        <Copy className="h-3 w-3" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleBookmark}
        className={isBookmarked ? 'text-primary' : ''}
      >
        <Bookmark className="h-3 w-3" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleSpeak}
        className={isSpeaking ? 'text-primary' : ''}
      >
        <Volume2 className="h-3 w-3" />
      </Button>
      {onRegenerate && (
        <Button variant="ghost" size="sm" onClick={onRegenerate}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};
