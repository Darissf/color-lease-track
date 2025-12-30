import { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InvoiceTemplate } from "./InvoiceTemplate";
import { ReceiptTemplate } from "./ReceiptTemplate";

type Orientation = "portrait" | "landscape";
type PaperSize = "a4" | "letter" | "legal";

interface DocumentPDFGeneratorProps {
  documentRef: React.RefObject<HTMLDivElement>;
  fileName: string;
  onComplete?: () => void;
  showOptions?: boolean;
  defaultOrientation?: Orientation;
  defaultPaperSize?: PaperSize;
  // New props for off-screen rendering
  documentType?: 'invoice' | 'kwitansi';
  templateProps?: Record<string, any>;
}

const PAPER_SIZES: Record<PaperSize, { width: number; height: number; label: string }> = {
  a4: { width: 210, height: 297, label: "A4" },
  letter: { width: 216, height: 279, label: "Letter" },
  legal: { width: 216, height: 356, label: "Legal" },
};

// A4 at 96 DPI
const A4_WIDTH_PX = 793;
const A4_HEIGHT_PX = 1122;

export const DocumentPDFGenerator = ({
  documentRef,
  fileName,
  onComplete,
  showOptions = true,
  defaultOrientation = "portrait",
  defaultPaperSize = "a4",
  documentType,
  templateProps,
}: DocumentPDFGeneratorProps) => {
  const [orientation, setOrientation] = useState<Orientation>(defaultOrientation);
  const [paperSize, setPaperSize] = useState<PaperSize>(defaultPaperSize);

  const generatePDF = useCallback(async () => {
    // Prefer off-screen rendering if templateProps provided
    if (!templateProps && !documentRef.current) {
      toast.error("Dokumen tidak ditemukan");
      return;
    }

    let offScreenContainer: HTMLDivElement | null = null;
    let root: ReturnType<typeof createRoot> | null = null;

    try {
      toast.loading("Membuat PDF...", { id: "pdf-generate" });

      // Create off-screen container with exact A4 pixel dimensions
      offScreenContainer = document.createElement('div');
      offScreenContainer.id = 'pdf-offscreen-container';
      offScreenContainer.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: ${A4_WIDTH_PX}px;
        min-height: ${A4_HEIGHT_PX}px;
        background: white;
        overflow: visible;
        z-index: -1;
      `;
      document.body.appendChild(offScreenContainer);

      // Render template to off-screen container
      if (templateProps && documentType) {
        root = createRoot(offScreenContainer);
        
        await new Promise<void>((resolve) => {
          const wrapperStyle = { 
            width: `${A4_WIDTH_PX}px`,
            minHeight: `${A4_HEIGHT_PX}px`,
            background: 'white',
            overflow: 'visible' as const,
          };
          
          if (documentType === 'invoice') {
            root!.render(
              <div style={wrapperStyle}>
                <InvoiceTemplate {...(templateProps as any)} />
              </div>
            );
          } else {
            root!.render(
              <div style={wrapperStyle}>
                <ReceiptTemplate {...(templateProps as any)} />
              </div>
            );
          }
          // Wait for React to finish rendering
          setTimeout(resolve, 500);
        });
      } else if (documentRef.current) {
        // Fallback: clone existing element
        const clone = documentRef.current.cloneNode(true) as HTMLElement;
        clone.style.cssText = `
          width: ${A4_WIDTH_PX}px;
          min-height: ${A4_HEIGHT_PX}px;
          transform: none;
          margin: 0;
          position: static;
        `;
        offScreenContainer.appendChild(clone);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Force reflow
      offScreenContainer.getBoundingClientRect();

      // Capture with html2canvas
      const canvas = await html2canvas(offScreenContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: A4_WIDTH_PX,
        height: offScreenContainer.scrollHeight || A4_HEIGHT_PX,
      });

      // Cleanup
      if (root) root.unmount();
      if (offScreenContainer.parentNode) {
        document.body.removeChild(offScreenContainer);
      }

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error("Canvas kosong");
      }

      let imgData = canvas.toDataURL("image/png");
      if (!imgData || imgData === 'data:,' || imgData.length < 100) {
        imgData = canvas.toDataURL("image/jpeg", 0.95);
      }
      
      const imgFormat = imgData.includes("jpeg") ? "JPEG" : "PNG";
      
      const paper = PAPER_SIZES[paperSize];
      const pdfWidth = orientation === "portrait" ? paper.width : paper.height;
      const pdfHeight = orientation === "portrait" ? paper.height : paper.width;
      
      const pdf = new jsPDF({
        orientation: orientation,
        unit: "mm",
        format: [pdfWidth, pdfHeight],
      });

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Fit image to PDF page while maintaining aspect ratio
      const widthRatio = pdfWidth / imgWidth;
      const heightRatio = pdfHeight / imgHeight;
      const ratio = Math.min(widthRatio, heightRatio);
      
      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;
      
      // Center image on page
      const offsetX = (pdfWidth - scaledWidth) / 2;
      const offsetY = (pdfHeight - scaledHeight) / 2;

      pdf.addImage(imgData, imgFormat, offsetX, offsetY, scaledWidth, scaledHeight);

      pdf.save(`${fileName}.pdf`);

      toast.success("PDF berhasil dibuat!", { id: "pdf-generate" });
      onComplete?.();
    } catch (error) {
      // Cleanup on error
      if (root) {
        try { root.unmount(); } catch {}
      }
      const container = document.getElementById('pdf-offscreen-container');
      if (container?.parentNode) {
        document.body.removeChild(container);
      }
      console.error("Error generating PDF:", error);
      toast.error("Gagal membuat PDF", { id: "pdf-generate" });
    }
  }, [documentRef, fileName, onComplete, orientation, paperSize, documentType, templateProps]);

  const printDocument = useCallback(async () => {
    // Prefer off-screen rendering if templateProps provided
    if (!templateProps && !documentRef.current) {
      toast.error("Dokumen tidak ditemukan");
      return;
    }

    let offScreenContainer: HTMLDivElement | null = null;
    let root: ReturnType<typeof createRoot> | null = null;

    try {
      toast.loading("Menyiapkan cetak...", { id: "pdf-print" });

      // Create off-screen container with exact A4 pixel dimensions
      offScreenContainer = document.createElement('div');
      offScreenContainer.id = 'pdf-offscreen-container';
      offScreenContainer.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: ${A4_WIDTH_PX}px;
        min-height: ${A4_HEIGHT_PX}px;
        background: white;
        overflow: visible;
        z-index: -1;
      `;
      document.body.appendChild(offScreenContainer);

      // Render template to off-screen container
      if (templateProps && documentType) {
        root = createRoot(offScreenContainer);
        
        await new Promise<void>((resolve) => {
          const wrapperStyle = { 
            width: `${A4_WIDTH_PX}px`,
            minHeight: `${A4_HEIGHT_PX}px`,
            background: 'white',
            overflow: 'visible' as const,
          };
          
          if (documentType === 'invoice') {
            root!.render(
              <div style={wrapperStyle}>
                <InvoiceTemplate {...(templateProps as any)} />
              </div>
            );
          } else {
            root!.render(
              <div style={wrapperStyle}>
                <ReceiptTemplate {...(templateProps as any)} />
              </div>
            );
          }
          // Wait for React to finish rendering
          setTimeout(resolve, 500);
        });
      } else if (documentRef.current) {
        // Fallback: clone existing element
        const clone = documentRef.current.cloneNode(true) as HTMLElement;
        clone.style.cssText = `
          width: ${A4_WIDTH_PX}px;
          min-height: ${A4_HEIGHT_PX}px;
          transform: none;
          margin: 0;
          position: static;
        `;
        offScreenContainer.appendChild(clone);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Force reflow
      offScreenContainer.getBoundingClientRect();

      // Capture with html2canvas
      const canvas = await html2canvas(offScreenContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: A4_WIDTH_PX,
        height: offScreenContainer.scrollHeight || A4_HEIGHT_PX,
      });

      // Cleanup
      if (root) root.unmount();
      if (offScreenContainer.parentNode) {
        document.body.removeChild(offScreenContainer);
      }

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error("Canvas kosong");
      }

      let imgData = canvas.toDataURL("image/png");
      if (!imgData || imgData === 'data:,' || imgData.length < 100) {
        imgData = canvas.toDataURL("image/jpeg", 0.95);
      }

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${fileName}</title>
              <style>
                @page { margin: 0; size: A4; }
                body { margin: 0; display: flex; justify-content: center; align-items: flex-start; }
                img { width: 100%; height: auto; }
              </style>
            </head>
            <body>
              <img src="${imgData}" onload="window.print(); window.close();" />
            </body>
          </html>
        `);
        printWindow.document.close();
      }

      toast.success("Siap untuk dicetak!", { id: "pdf-print" });
      onComplete?.();
    } catch (error) {
      // Cleanup on error
      if (root) {
        try { root.unmount(); } catch {}
      }
      const container = document.getElementById('pdf-offscreen-container');
      if (container?.parentNode) {
        document.body.removeChild(container);
      }
      console.error("Error printing:", error);
      toast.error("Gagal mencetak dokumen", { id: "pdf-print" });
    }
  }, [documentRef, fileName, onComplete, documentType, templateProps]);

  return (
    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
      {showOptions && (
        <>
          <Select value={orientation} onValueChange={(v) => setOrientation(v as Orientation)}>
            <SelectTrigger className="w-[110px] h-9">
              <SelectValue placeholder="Orientasi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portrait">Portrait</SelectItem>
              <SelectItem value="landscape">Landscape</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={paperSize} onValueChange={(v) => setPaperSize(v as PaperSize)}>
            <SelectTrigger className="w-[90px] h-9">
              <SelectValue placeholder="Ukuran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a4">A4</SelectItem>
              <SelectItem value="letter">Letter</SelectItem>
              <SelectItem value="legal">Legal</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}
      
      <Button onClick={generatePDF} className="gap-2">
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Download PDF</span>
        <span className="sm:hidden">PDF</span>
      </Button>
      <Button variant="outline" onClick={printDocument} className="gap-2">
        <Printer className="h-4 w-4" />
        <span className="hidden sm:inline">Cetak</span>
      </Button>
    </div>
  );
};
