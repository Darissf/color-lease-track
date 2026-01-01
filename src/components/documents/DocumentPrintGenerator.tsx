import React, { useRef, useCallback, useState } from "react";
import { useReactToPrint } from "react-to-print";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Download, Printer, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface DocumentPrintGeneratorProps {
  printContainerRef: React.RefObject<HTMLDivElement>;
  fileName: string;
  onComplete?: () => void;
  hasPage2?: boolean;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const DocumentPrintGenerator = ({
  printContainerRef,
  fileName,
  onComplete,
  hasPage2 = false,
}: DocumentPrintGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // React-to-print hook for native browser PDF generation
  const handlePrintPDF = useReactToPrint({
    contentRef: printContainerRef,
    documentTitle: fileName,
    onBeforePrint: async () => {
      // Add print-target class to container before printing
      if (printContainerRef.current) {
        printContainerRef.current.classList.add('print-target');
        // Also add to all child pages
        const pages = printContainerRef.current.querySelectorAll('.print-page');
        pages.forEach(page => page.classList.add('print-target'));
      }
      return Promise.resolve();
    },
    onAfterPrint: () => {
      // Remove print-target class after printing
      if (printContainerRef.current) {
        printContainerRef.current.classList.remove('print-target');
        const pages = printContainerRef.current.querySelectorAll('.print-page');
        pages.forEach(page => page.classList.remove('print-target'));
      }
      onComplete?.();
      toast.success("Dokumen siap dicetak/disimpan sebagai PDF!");
    },
    pageStyle: `
      @page { 
        size: A4 portrait; 
        margin: 0; 
      }
      @media print {
        html, body {
          width: 210mm;
          min-height: 297mm;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .print-page-break {
          page-break-after: always;
          break-after: page;
        }
      }
    `,
  });

  // Wrapper function to trigger print with user guidance
  const generatePDFViaPrint = useCallback(() => {
    setIsGenerating(true);
    toast.info(
      "Dialog print akan terbuka. Pilih 'Save as PDF' atau 'Microsoft Print to PDF' untuk menyimpan sebagai PDF.",
      { duration: 6000 }
    );
    
    // Small delay to ensure toast is visible before print dialog
    setTimeout(() => {
      handlePrintPDF();
      setIsGenerating(false);
    }, 500);
  }, [handlePrintPDF]);

  // PNG generation - still uses html2canvas (no native alternative)
  const generatePNG = useCallback(async () => {
    if (!printContainerRef.current) {
      toast.error("Dokumen tidak ditemukan");
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading("Membuat PNG...");

    try {
      // Get all pages in the container
      const pages = printContainerRef.current.querySelectorAll('.print-page');
      const pageElements = pages.length > 0 ? Array.from(pages) : [printContainerRef.current];

      for (let i = 0; i < pageElements.length; i++) {
        const element = pageElements[i] as HTMLElement;
        
        toast.loading(`Memproses halaman ${i + 1}/${pageElements.length}...`, { id: toastId });

        // Wait for resources
        await document.fonts.ready;
        await sleep(300);

        const canvas = await html2canvas(element, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          imageTimeout: 15000,
          width: 793, // A4 width at 96 DPI
          height: 1122, // A4 height at 96 DPI
        });

        // Download each page
        const link = document.createElement('a');
        const pageSuffix = pageElements.length > 1 ? `-halaman${i + 1}` : '';
        link.download = `${fileName}${pageSuffix}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        await sleep(200);
      }

      toast.success(`PNG ${pageElements.length > 1 ? pageElements.length + ' halaman ' : ''}berhasil diunduh!`, { id: toastId });
      onComplete?.();
    } catch (error) {
      console.error("Error generating PNG:", error);
      toast.error("Gagal membuat PNG: " + (error as Error).message, { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  }, [printContainerRef, fileName, onComplete]);

  // Direct print (same as PDF but user selects physical printer)
  const printDocument = useCallback(() => {
    setIsGenerating(true);
    toast.info("Dialog cetak akan terbuka...", { duration: 3000 });
    
    setTimeout(() => {
      handlePrintPDF();
      setIsGenerating(false);
    }, 300);
  }, [handlePrintPDF]);

  return (
    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
      <Button 
        onClick={generatePDFViaPrint} 
        className="gap-2" 
        disabled={isGenerating}
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Download PDF{hasPage2 ? ' (2 Halaman)' : ''}</span>
        <span className="sm:hidden">PDF</span>
      </Button>
      <Button variant="outline" onClick={generatePNG} className="gap-2" disabled={isGenerating}>
        <ImageIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Download PNG</span>
        <span className="sm:hidden">PNG</span>
      </Button>
      <Button variant="outline" onClick={printDocument} className="gap-2" disabled={isGenerating}>
        <Printer className="h-4 w-4" />
        <span className="hidden sm:inline">Cetak</span>
      </Button>
    </div>
  );
};
