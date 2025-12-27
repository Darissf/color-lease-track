import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FileText, Copy, Check, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RincianTemplateDisplayProps {
  template: string;
  className?: string;
  showCopyButton?: boolean;
  showModeToggle?: boolean;
  isWhatsAppMode?: boolean;
  onToggleMode?: (mode: boolean) => void;
  isTogglingMode?: boolean;
}

export function RincianTemplateDisplay({ 
  template, 
  className = '',
  showCopyButton = true,
  showModeToggle = false,
  isWhatsAppMode = false,
  onToggleMode,
  isTogglingMode = false,
}: RincianTemplateDisplayProps) {
  const [copied, setCopied] = useState(false);

  if (!template) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(template);
      setCopied(true);
      toast.success('Template berhasil disalin');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Gagal menyalin template');
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Rincian Tagihan
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {showModeToggle && onToggleMode && (
              <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-lg">
                <MessageCircle className={cn(
                  "w-3.5 h-3.5 transition-colors",
                  isWhatsAppMode ? "text-green-500" : "text-muted-foreground"
                )} />
                <Switch
                  id="whatsapp-mode"
                  checked={isWhatsAppMode}
                  onCheckedChange={onToggleMode}
                  disabled={isTogglingMode}
                  className="data-[state=checked]:bg-green-500"
                />
                <Label 
                  htmlFor="whatsapp-mode" 
                  className={cn(
                    "text-xs cursor-pointer transition-colors",
                    isWhatsAppMode ? "text-green-600 font-medium" : "text-muted-foreground"
                  )}
                >
                  WhatsApp
                </Label>
              </div>
            )}
            
            {showCopyButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-8 gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-xs">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-xs">Salin</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm p-3 sm:p-4 bg-muted/50 rounded-lg overflow-x-auto leading-relaxed">
          {template}
        </pre>
      </CardContent>
    </Card>
  );
}
