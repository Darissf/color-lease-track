import { useCallback } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";

interface DocumentPDFGeneratorProps {
  documentRef: React.RefObject<HTMLDivElement>;
  fileName: string;
  onComplete?: () => void;
}

export const DocumentPDFGenerator = ({
  documentRef,
  fileName,
  onComplete,
}: DocumentPDFGeneratorProps) => {
  const generatePDF = useCallback(async () => {
    if (!documentRef.current) {
      toast.error("Dokumen tidak ditemukan");
      return;
    }

    try {
      toast.loading("Membuat PDF...", { id: "pdf-generate" });

      const canvas = await html2canvas(documentRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
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
  }, [documentRef, fileName, onComplete]);

  const printDocument = useCallback(async () => {
    if (!documentRef.current) {
      toast.error("Dokumen tidak ditemukan");
      return;
    }

    try {
      toast.loading("Menyiapkan cetak...", { id: "pdf-print" });

      const canvas = await html2canvas(documentRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

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
    <div className="flex gap-2">
      <Button onClick={generatePDF} className="gap-2">
        <Download className="h-4 w-4" />
        Download PDF
      </Button>
      <Button variant="outline" onClick={printDocument} className="gap-2">
        <Printer className="h-4 w-4" />
        Cetak
      </Button>
    </div>
  );
};
