import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MessageSquarePlus, Search, Zap } from 'lucide-react';
import { useMessageTemplates } from '@/hooks/useMessageTemplates';

interface QuickReplyTemplatesProps {
  onSelectTemplate: (content: string) => void;
  customerName?: string;
  disabled?: boolean;
}

export const QuickReplyTemplates = ({ 
  onSelectTemplate, 
  customerName,
  disabled 
}: QuickReplyTemplatesProps) => {
  const { templates, loading } = useMessageTemplates();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Quick replies for common responses
  const quickReplies = [
    { label: 'Terima Kasih', content: 'Terima kasih atas informasinya! 🙏' },
    { label: 'Akan Diproses', content: 'Baik, akan segera kami proses. Mohon ditunggu ya.' },
    { label: 'Sudah Diterima', content: 'Pembayaran sudah kami terima. Terima kasih! ✅' },
    { label: 'Info Rekening', content: 'Silakan transfer ke rekening berikut:\n\nBank: BCA\nNo. Rek: 1234567890\nA/N: Sewa Scaffolding Bali' },
    { label: 'Jadwal Kirim', content: 'Pengiriman scaffolding akan dilakukan pada tanggal yang sudah dijadwalkan. Tim kami akan menghubungi sebelum pengiriman.' },
    { label: 'Jadwal Ambil', content: 'Pengambilan scaffolding akan dilakukan sesuai jadwal. Mohon pastikan akses ke lokasi tersedia.' },
    { label: 'Konfirmasi', content: 'Baik, sudah dikonfirmasi. Ada yang bisa kami bantu lagi?' },
    { label: 'Tanya Lanjut', content: 'Apakah ada pertanyaan lain yang bisa kami bantu?' },
  ];

  const filteredTemplates = templates.filter(t => 
    t.template_name.toLowerCase().includes(search.toLowerCase()) ||
    t.template_content.toLowerCase().includes(search.toLowerCase())
  );

  const filteredQuickReplies = quickReplies.filter(q =>
    q.label.toLowerCase().includes(search.toLowerCase()) ||
    q.content.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (content: string) => {
    // Replace variables with actual values
    let processedContent = content;
    if (customerName) {
      processedContent = processedContent.replace(/\{\{nama\}\}/gi, customerName);
    }
    onSelectTemplate(processedContent);
    setOpen(false);
    setSearch('');
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      delivery: 'bg-blue-500/10 text-blue-600',
      pickup: 'bg-orange-500/10 text-orange-600',
      invoice: 'bg-purple-500/10 text-purple-600',
      payment: 'bg-green-500/10 text-green-600',
      reminder: 'bg-yellow-500/10 text-yellow-600',
      custom: 'bg-gray-500/10 text-gray-600',
    };
    return colors[type] || colors.custom;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          disabled={disabled}
          className="shrink-0"
        >
          <Zap className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="top">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Quick Reply</span>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari template..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        
        <ScrollArea className="h-64">
          {/* Quick Replies Section */}
          {filteredQuickReplies.length > 0 && (
            <div className="p-2">
              <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
                Balasan Cepat
              </p>
              <div className="space-y-1">
                {filteredQuickReplies.map((reply, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(reply.content)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <p className="text-sm font-medium">{reply.label}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {reply.content}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Templates Section */}
          {filteredTemplates.length > 0 && (
            <div className="p-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
                Template Notifikasi
              </p>
              <div className="space-y-1">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelect(template.template_content)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-[10px] px-1.5 py-0 ${getTypeColor(template.template_type)}`}>
                        {template.template_type}
                      </Badge>
                      <span className="text-sm font-medium truncate flex-1">
                        {template.template_name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {template.template_content.replace(/\n/g, ' ')}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredQuickReplies.length === 0 && filteredTemplates.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Tidak ada template yang cocok
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
