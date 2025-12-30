import { useCallback, useState } from "react";
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

type Orientation = "portrait" | "landscape";
type PaperSize = "a4" | "letter" | "legal";

interface DocumentPDFGeneratorProps {
  documentRef: React.RefObject<HTMLDivElement>;
  fileName: string;
  onComplete?: () => void;
  showOptions?: boolean;
  defaultOrientation?: Orientation;
  defaultPaperSize?: PaperSize;
}

const PAPER_SIZES: Record<PaperSize, { width: number; height: number; label: string }> = {
  a4: { width: 210, height: 297, label: "A4" },
  letter: { width: 216, height: 279, label: "Letter" },
  legal: { width: 216, height: 356, label: "Legal" },
};

export const DocumentPDFGenerator = ({
  documentRef,
  fileName,
  onComplete,
  showOptions = true,
  defaultOrientation = "portrait",
  defaultPaperSize = "a4",
}: DocumentPDFGeneratorProps) => {
  const [orientation, setOrientation] = useState<Orientation>(defaultOrientation);
  const [paperSize, setPaperSize] = useState<PaperSize>(defaultPaperSize);

  const generatePDF = useCallback(async () => {
    if (!documentRef.current) {
      toast.error("Dokumen tidak ditemukan");
      return;
    }

    try {
      toast.loading("Membuat PDF...", { id: "pdf-generate" });

      // Clone element to avoid transform issues
      const clone = documentRef.current.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.left = '0';
      clone.style.top = '0';
      clone.style.transform = 'none';
      clone.style.transformOrigin = 'top left';
      clone.style.width = '210mm';
      clone.style.zIndex = '-9999';
      clone.style.pointerEvents = 'none';
      clone.style.opacity = '1';
      document.body.appendChild(clone);

      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(clone, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
        });
      } finally {
        document.body.removeChild(clone);
      }

      const imgData = canvas.toDataURL("image/png");
      
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
      
      // Scale based on width only to maintain aspect ratio
      const ratio = pdfWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;
      
      // Check if content exceeds one page
      if (scaledHeight > pdfHeight) {
        // Multi-page PDF
        let remainingHeight = scaledHeight;
        let sourceY = 0;
        const pageHeightInPixels = pdfHeight / ratio;
        
        while (remainingHeight > 0) {
          // Create a temporary canvas for this page section
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = imgWidth;
          pageCanvas.height = Math.min(pageHeightInPixels, imgHeight - sourceY);
          
          const ctx = pageCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(
              canvas,
              0, sourceY, imgWidth, pageCanvas.height,
              0, 0, imgWidth, pageCanvas.height
            );
            
            const pageImgData = pageCanvas.toDataURL("image/png");
            const pageScaledHeight = pageCanvas.height * ratio;
            
            pdf.addImage(pageImgData, "PNG", 0, 0, pdfWidth, pageScaledHeight);
          }
          
          remainingHeight -= pdfHeight;
          sourceY += pageHeightInPixels;
          
          if (remainingHeight > 0) {
            pdf.addPage();
          }
        }
      } else {
        // Single page - add image at top
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, scaledHeight);
      }

      pdf.save(`${fileName}.pdf`);

      toast.success("PDF berhasil dibuat!", { id: "pdf-generate" });
      onComplete?.();
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Gagal membuat PDF", { id: "pdf-generate" });
    }
  }, [documentRef, fileName, onComplete, orientation, paperSize]);

  const printDocument = useCallback(async () => {
    if (!documentRef.current) {
      toast.error("Dokumen tidak ditemukan");
      return;
    }

    try {
      toast.loading("Menyiapkan cetak...", { id: "pdf-print" });

      // Clone element to avoid transform issues
      const clone = documentRef.current.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.left = '0';
      clone.style.top = '0';
      clone.style.transform = 'none';
      clone.style.transformOrigin = 'top left';
      clone.style.width = '210mm';
      clone.style.zIndex = '-9999';
      clone.style.pointerEvents = 'none';
      clone.style.opacity = '1';
      document.body.appendChild(clone);

      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(clone, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
        });
      } finally {
        document.body.removeChild(clone);
      }

      const imgData = canvas.toDataURL("image/png");

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${fileName}</title>
              <style>
                @page { margin: 0; }
                body { margin: 0; display: flex; justify-content: center; }
                img { max-width: 100%; height: auto; }
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
      console.error("Error printing:", error);
      toast.error("Gagal mencetak dokumen", { id: "pdf-print" });
    }
  }, [documentRef, fileName, onComplete]);

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
