import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

interface RincianImageExportProps {
  elementRef: React.RefObject<HTMLElement>;
  invoiceNumber?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function RincianImageExport({
  elementRef,
  invoiceNumber = 'rincian',
  className = '',
  variant = 'outline',
  size = 'sm',
}: RincianImageExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!elementRef.current) {
      toast.error('Element tidak ditemukan');
      return;
    }

    setIsExporting(true);
    
    try {
      const canvas = await html2canvas(elementRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Convert to PNG and download
      const link = document.createElement('a');
      const cleanInvoice = invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_');
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
  }, [elementRef, invoiceNumber]);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isExporting}
      className={className}
    >
      {isExporting ? (
        <>
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          <span className="text-xs">Menyimpan...</span>
        </>
      ) : (
        <>
          <Download className="w-3.5 h-3.5 mr-1.5" />
          <span className="text-xs">💾 Simpan Gambar</span>
        </>
      )}
    </Button>
  );
}

// Hook for standalone usage
export function useRincianImageExport() {
  const [isExporting, setIsExporting] = useState(false);
  
  const exportToImage = useCallback(async (element: HTMLElement | null, invoiceNumber: string = 'rincian') => {
    if (!element) {
      toast.error('Element tidak ditemukan');
      return false;
    }

    setIsExporting(true);
    
    try {
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const link = document.createElement('a');
      const cleanInvoice = invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `Rincian_Sewa_${cleanInvoice}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Gambar berhasil disimpan');
      return true;
    } catch (error) {
      console.error('Error exporting image:', error);
      toast.error('Gagal menyimpan gambar');
      return false;
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { isExporting, exportToImage };
}
