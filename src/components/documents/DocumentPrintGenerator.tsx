import React, { useCallback, useState, useRef, useEffect, ComponentType } from "react";
import { useReactToPrint } from "react-to-print";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Download, Printer, Image as ImageIcon, Server } from "lucide-react";
import { toast } from "sonner";
import { generatePDFFromBackend } from "@/lib/pdfBackendService";
import { generateFullHTMLDocument, generateMultiPageHTMLDocument } from "@/lib/templateToHTML";

interface DocumentPrintGeneratorProps {
  printContainerRef: React.RefObject<HTMLDivElement>;
  fileName: string;
  onComplete?: () => void;
  hasPage2?: boolean;
  // Props for backend PDF generation
  documentType?: 'invoice' | 'kwitansi';
  templateComponent?: ComponentType<any>;
  templateProps?: any;
  page2Component?: ComponentType<any>;
  page2Props?: any;
  useBackendPDF?: boolean;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MAX_PDF_TIMEOUT_SECONDS = 90;

export const DocumentPrintGenerator = ({
  printContainerRef,
  fileName,
  onComplete,
  hasPage2 = false,
  documentType,
  templateComponent,
  templateProps,
  page2Component,
  page2Props,
  useBackendPDF = false,
}: DocumentPrintGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedSecondsRef = useRef(0);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

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
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .paper-document {
          width: 210mm !important;
          height: 297mm !important;
          padding: 10mm !important;
          padding-bottom: 15mm !important;
          box-sizing: border-box !important;
          margin: 0 !important;
        }
        .print-container {
          display: block !important;
          position: relative !important;
          width: 210mm !important;
        }
        .print-page {
          display: block !important;
          position: relative !important;
          width: 210mm !important;
          min-height: 297mm !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          background: white !important;
        }
        .print-page-break {
          display: block !important;
          height: 0 !important;
          page-break-after: always !important;
          break-after: page !important;
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

  // Backend PDF generation - sends HTML to VPS server
  const generateBackendPDF = useCallback(async () => {
    // DEBUG: Baris pertama - konfirmasi tombol ditekan
    console.log("🚀 [DocumentPrintGenerator] TOMBOL DITEKAN! Memulai proses generate HTML...");
    console.log("🚀 [DocumentPrintGenerator] useBackendPDF:", useBackendPDF);
    console.log("🚀 [DocumentPrintGenerator] templateComponent:", templateComponent ? "ADA" : "TIDAK ADA");
    console.log("🚀 [DocumentPrintGenerator] templateProps:", templateProps ? "ADA" : "TIDAK ADA");
    console.log("🚀 [DocumentPrintGenerator] templateProps detail:", JSON.stringify(templateProps, null, 2)?.substring(0, 500));

    if (!templateComponent || !templateProps) {
      console.error("❌ [DocumentPrintGenerator] BATAL: templateComponent atau templateProps tidak ada!");
      toast.error("Data template tidak ditemukan untuk Backend PDF");
      return;
    }

    setIsGenerating(true);
    elapsedSecondsRef.current = 0;
    
    // Show loading toast with progress
    const toastId = toast.loading(`Membuat PDF... Mohon tunggu (0/${MAX_PDF_TIMEOUT_SECONDS}s)`, {
      duration: Infinity,
    });

    // Start progress interval
    progressIntervalRef.current = setInterval(() => {
      elapsedSecondsRef.current += 5;
      if (elapsedSecondsRef.current <= MAX_PDF_TIMEOUT_SECONDS) {
        toast.loading(`Membuat PDF... Mohon tunggu (${elapsedSecondsRef.current}/${MAX_PDF_TIMEOUT_SECONDS}s)`, { 
          id: toastId 
        });
      }
    }, 5000);

    try {
      let htmlContent: string;

      console.log("📄 [DocumentPrintGenerator] Generating HTML content...");
      console.log("📄 [DocumentPrintGenerator] hasPage2:", hasPage2);

      if (hasPage2 && page2Component && page2Props) {
        // Multi-page document
        console.log("📄 [DocumentPrintGenerator] Mode: Multi-page (2 halaman)");
        htmlContent = generateMultiPageHTMLDocument([
          { component: templateComponent, props: templateProps },
          { component: page2Component, props: page2Props },
        ]);
      } else {
        // Single page document
        console.log("📄 [DocumentPrintGenerator] Mode: Single page");
        htmlContent = generateFullHTMLDocument(templateComponent, templateProps);
      }

      console.log("📄 [DocumentPrintGenerator] HTML generated! Length:", htmlContent.length, "chars");
      console.log("📄 [DocumentPrintGenerator] HTML preview (first 1000 chars):");
      console.log(htmlContent.substring(0, 1000));

      console.log("📡 [DocumentPrintGenerator] Memanggil generatePDFFromBackend...");
      const result = await generatePDFFromBackend(htmlContent, fileName);

      // Clear progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      console.log("📡 [DocumentPrintGenerator] Result dari backend:", result);

      if (result.success) {
        console.log("✅ [DocumentPrintGenerator] PDF berhasil dibuat!");
        toast.success("PDF berhasil dibuat via server!", { id: toastId });
        onComplete?.();
      } else {
        console.error("❌ [DocumentPrintGenerator] PDF gagal:", result.error);
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      // Clear progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      console.error("❌ [DocumentPrintGenerator] EXCEPTION:", error);
      const errorMessage = (error as Error).message;
      
      // Check if it's a timeout error - offer fallback
      if (errorMessage.toLowerCase().includes('timeout')) {
        toast.warning("Server timeout. Menggunakan PDF browser sebagai alternatif...", { id: toastId });
        
        // Wait a moment then fallback to browser PDF
        setTimeout(() => {
          generatePDFViaPrint();
        }, 1000);
      } else {
        toast.error("Gagal membuat PDF: " + errorMessage, { id: toastId });
      }
    } finally {
      setIsGenerating(false);
      console.log("🏁 [DocumentPrintGenerator] generateBackendPDF selesai.");
    }
  }, [templateComponent, templateProps, page2Component, page2Props, hasPage2, fileName, onComplete, useBackendPDF, generatePDFViaPrint]);

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

  // Determine which PDF method to use - WITH DEBUG LOG
  const handleDownloadPDF = useBackendPDF && templateComponent && templateProps
    ? generateBackendPDF
    : generatePDFViaPrint;

  // DEBUG: Log saat komponen render
  console.log("🔧 [DocumentPrintGenerator] RENDER - useBackendPDF:", useBackendPDF, 
    "| templateComponent:", !!templateComponent, 
    "| templateProps:", !!templateProps,
    "| akan pakai:", useBackendPDF && templateComponent && templateProps ? "BACKEND" : "BROWSER PRINT");

  return (
    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
      {/* Primary PDF Download Button */}
      <Button 
        onClick={handleDownloadPDF} 
        className="gap-2" 
        disabled={isGenerating}
      >
        {useBackendPDF ? <Server className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        <span className="hidden sm:inline">
          Download PDF{hasPage2 ? ' (2 Halaman)' : ''}
        </span>
        <span className="sm:hidden">PDF</span>
      </Button>
      
      {/* Fallback: Browser Print PDF (when backend is primary) */}
      {useBackendPDF && (
        <Button 
          variant="outline" 
          onClick={generatePDFViaPrint} 
          className="gap-2" 
          disabled={isGenerating}
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">PDF Browser</span>
        </Button>
      )}
      
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
