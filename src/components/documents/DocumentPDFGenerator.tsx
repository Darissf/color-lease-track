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

    let captureContainer: HTMLDivElement | null = null;

    try {
      toast.loading("Membuat PDF...", { id: "pdf-generate" });
      
      const element = documentRef.current;
      
      // 1. Clone the visible element
      const clone = element.cloneNode(true) as HTMLElement;
      
      // 2. Create a container for the clone with FIXED A4 size
      captureContainer = document.createElement('div');
      captureContainer.id = 'pdf-clone-container';
      captureContainer.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        width: 793px;
        height: 1122px;
        background: white;
        z-index: 99999;
        overflow: visible;
        pointer-events: none;
      `;
      
      // 3. Reset any transforms on clone and set fixed size
      clone.style.transform = 'none';
      clone.style.width = '793px';
      clone.style.minWidth = '793px';
      clone.style.maxWidth = '793px';
      clone.style.height = 'auto';
      clone.style.minHeight = '1122px';
      
      captureContainer.appendChild(clone);
      document.body.appendChild(captureContainer);
      
      // 4. Wait for browser to render the clone
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 5. Force layout recalculation
      clone.getBoundingClientRect();
      
      // 6. Capture the clone
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 793,
        height: 1122,
      });
      
      // 7. Remove the clone container
      document.body.removeChild(captureContainer);
      captureContainer = null;

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
      
      // Fit image ke halaman PDF dengan mempertahankan aspect ratio
      const widthRatio = pdfWidth / imgWidth;
      const heightRatio = pdfHeight / imgHeight;
      const ratio = Math.min(widthRatio, heightRatio);
      
      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;
      
      // Center image di halaman
      const offsetX = (pdfWidth - scaledWidth) / 2;
      const offsetY = (pdfHeight - scaledHeight) / 2;

      pdf.addImage(imgData, imgFormat, offsetX, offsetY, scaledWidth, scaledHeight);

      pdf.save(`${fileName}.pdf`);

      toast.success("PDF berhasil dibuat!", { id: "pdf-generate" });
      onComplete?.();
    } catch (error) {
      // Cleanup clone if exists
      if (captureContainer && document.body.contains(captureContainer)) {
        document.body.removeChild(captureContainer);
      }
      console.error("Error generating PDF:", error);
      toast.error("Gagal membuat PDF", { id: "pdf-generate" });
    }
  }, [documentRef, fileName, onComplete, orientation, paperSize]);

  const printDocument = useCallback(async () => {
    if (!documentRef.current) {
      toast.error("Dokumen tidak ditemukan");
      return;
    }

    let captureContainer: HTMLDivElement | null = null;

    try {
      toast.loading("Menyiapkan cetak...", { id: "pdf-print" });
      
      const element = documentRef.current;
      
      // 1. Clone the visible element
      const clone = element.cloneNode(true) as HTMLElement;
      
      // 2. Create a container for the clone with FIXED A4 size
      captureContainer = document.createElement('div');
      captureContainer.id = 'print-clone-container';
      captureContainer.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        width: 793px;
        height: 1122px;
        background: white;
        z-index: 99999;
        overflow: visible;
        pointer-events: none;
      `;
      
      // 3. Reset any transforms on clone and set fixed size
      clone.style.transform = 'none';
      clone.style.width = '793px';
      clone.style.minWidth = '793px';
      clone.style.maxWidth = '793px';
      clone.style.height = 'auto';
      clone.style.minHeight = '1122px';
      
      captureContainer.appendChild(clone);
      document.body.appendChild(captureContainer);
      
      // 4. Wait for browser to render the clone
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 5. Force layout recalculation
      clone.getBoundingClientRect();
      
      // 6. Capture the clone
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 793,
        height: 1122,
      });
      
      // 7. Remove the clone container
      document.body.removeChild(captureContainer);
      captureContainer = null;

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
      // Cleanup clone if exists
      if (captureContainer && document.body.contains(captureContainer)) {
        document.body.removeChild(captureContainer);
      }
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
