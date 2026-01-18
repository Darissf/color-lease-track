import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Copy, Check, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

interface RincianTagihanCardProps {
  template: string;
  invoiceNumber?: string;
  copiedField?: string | null;
  onCopy: (text: string) => void;
}

export function RincianTagihanCard({
  template,
  invoiceNumber = 'rincian',
  copiedField,
  onCopy,
}: RincianTagihanCardProps) {
  const [isExporting, setIsExporting] = useState(false);
  const templateRef = useRef<HTMLPreElement>(null);

  const handleSaveImage = async () => {
    if (!templateRef.current) {
      toast.error('Element tidak ditemukan');
      return;
    }

    setIsExporting(true);
    
    try {
      const canvas = await html2canvas(templateRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const link = document.createElement('a');
      const cleanInvoice = (invoiceNumber || 'rincian').replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `Rincian_Sewa_${cleanInvoice}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Gambar berhasil disimpan');
    } catch (error) {
      console.error('Error exporting image:', error);
      toast.error('Gagal menyimpan gambar');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Rincian Tagihan
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveImage}
              disabled={isExporting}
              className="h-8 gap-1.5"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-xs">Menyimpan...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span className="text-xs">💾 Simpan</span>
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCopy(template)}
              className="h-8 gap-1.5"
            >
              {copiedField === 'template' ? (
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
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <pre 
          ref={templateRef}
          className="whitespace-pre-wrap font-mono text-xs sm:text-sm p-3 sm:p-4 bg-muted/50 rounded-lg overflow-x-auto leading-relaxed"
        >
          {template}
        </pre>
      </CardContent>
    </Card>
  );
}
