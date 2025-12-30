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

    const element = documentRef.current;
    const container = element.parentElement;

    try {
      toast.loading("Membuat PDF...", { id: "pdf-generate" });
      
      // Simpan state original
      const originalVisibility = container?.style.visibility;
      const originalZIndex = container?.style.zIndex;
      
      // Buat visible untuk capture (visibility trick untuk mobile)
      if (container) {
        container.style.visibility = 'visible';
        container.style.zIndex = '9999';
      }

      // Tunggu browser fully render (penting untuk mobile)
      await new Promise(resolve => setTimeout(resolve, 200));

      // Force browser to recalculate layout
      element.getBoundingClientRect();

      // Capture - biarkan html2canvas capture actual size dari fixed A4 container
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 793,  // A4 width in px at 96dpi
        windowHeight: 1122, // A4 height in px at 96dpi
      });

      // Kembalikan ke hidden state
      if (container) {
        container.style.visibility = originalVisibility || 'hidden';
        container.style.zIndex = originalZIndex || '-9999';
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
      // Pastikan selalu kembalikan ke hidden meski error
      if (container) {
        container.style.visibility = 'hidden';
        container.style.zIndex = '-9999';
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

    const element = documentRef.current;
    const container = element.parentElement;

    try {
      toast.loading("Menyiapkan cetak...", { id: "pdf-print" });
      
      // Simpan state original
      const originalVisibility = container?.style.visibility;
      const originalZIndex = container?.style.zIndex;
      
      // Buat visible untuk capture (visibility trick untuk mobile)
      if (container) {
        container.style.visibility = 'visible';
        container.style.zIndex = '9999';
      }

      // Tunggu browser fully render (penting untuk mobile)
      await new Promise(resolve => setTimeout(resolve, 200));

      // Force browser to recalculate layout
      element.getBoundingClientRect();

      // Capture - biarkan html2canvas capture actual size
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 793,
        windowHeight: 1122,
      });

      // Kembalikan ke hidden state
      if (container) {
        container.style.visibility = originalVisibility || 'hidden';
        container.style.zIndex = originalZIndex || '-9999';
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
      // Pastikan selalu kembalikan ke hidden meski error
      if (container) {
        container.style.visibility = 'hidden';
        container.style.zIndex = '-9999';
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
