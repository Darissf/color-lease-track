import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: string;
  content: string;
  created_at: string;
}

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  messages: Message[];
  conversationTitle: string;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ 
  open, 
  onOpenChange, 
  conversationId,
  messages,
  conversationTitle 
}) => {
  const [format, setFormat] = useState<'txt' | 'md' | 'json' | 'html'>('txt');
  const { toast } = useToast();

  const exportToText = () => {
    const text = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    return text;
  };

  const exportToMarkdown = () => {
    const md = messages.map(m => 
      `## ${m.role === 'user' ? 'You' : 'Assistant'}\n\n${m.content}`
    ).join('\n\n---\n\n');
    return `# ${conversationTitle}\n\n${md}`;
  };

  const exportToHTML = () => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${conversationTitle}</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 0 auto; padding: 20px; }
    .message { margin: 20px 0; padding: 15px; border-radius: 8px; }
    .user { background: #e3f2fd; }
    .assistant { background: #f5f5f5; }
    .role { font-weight: bold; margin-bottom: 10px; }
  </style>
</head>
<body>
  <h1>${conversationTitle}</h1>
  ${messages.map(m => `
    <div class="message ${m.role}">
      <div class="role">${m.role === 'user' ? 'You' : 'Assistant'}</div>
      <div>${m.content.replace(/\n/g, '<br>')}</div>
    </div>
  `).join('')}
</body>
</html>`;
    return html;
  };

  const exportToJSON = () => {
    return JSON.stringify({
      title: conversationTitle,
      conversationId,
      exportedAt: new Date().toISOString(),
      messages,
    }, null, 2);
  };

  const handleExport = () => {
    let content = '';
    let filename = '';
    let mimeType = '';

    switch (format) {
      case 'txt':
        content = exportToText();
        filename = `${conversationTitle}.txt`;
        mimeType = 'text/plain';
        break;
      case 'md':
        content = exportToMarkdown();
        filename = `${conversationTitle}.md`;
        mimeType = 'text/markdown';
        break;
      case 'html':
        content = exportToHTML();
        filename = `${conversationTitle}.html`;
        mimeType = 'text/html';
        break;
      case 'json':
        content = exportToJSON();
        filename = `${conversationTitle}.json`;
        mimeType = 'application/json';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: "Conversation exported" });
    onOpenChange(false);
  };

  const handleShare = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const shareToken = crypto.randomUUID();
    
    await supabase.from('conversation_sharing').insert({
      conversation_id: conversationId,
      user_id: user.id,
      share_token: shareToken,
      is_public: true,
    });

    const shareUrl = `${window.location.origin}/shared/${shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    
    toast({ 
      title: "Share link copied", 
      description: "Anyone with this link can view the conversation" 
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Format</Label>
            <RadioGroup value={format} onValueChange={(v: any) => setFormat(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="txt" id="txt" />
                <Label htmlFor="txt">Plain Text (.txt)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="md" id="md" />
                <Label htmlFor="md">Markdown (.md)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="html" id="html" />
                <Label htmlFor="html">HTML (.html)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json">JSON (.json)</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} className="flex-1">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button onClick={handleShare} variant="outline" className="flex-1">
              <LinkIcon className="mr-2 h-4 w-4" />
              Share Link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
