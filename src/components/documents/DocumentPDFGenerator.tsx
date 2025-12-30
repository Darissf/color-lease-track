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
  documentType?: 'invoice' | 'kwitansi';
  templateProps?: Record<string, any>;
}

const PAPER_SIZES: Record<PaperSize, { width: number; height: number; label: string }> = {
  a4: { width: 210, height: 297, label: "A4" },
  letter: { width: 216, height: 279, label: "Letter" },
  legal: { width: 216, height: 356, label: "Legal" },
};

// ========== LAYER 1: Utility Functions ==========

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ========== LAYER 2: Font Preloading ==========

async function waitForFonts(): Promise<void> {
  try {
    await document.fonts.ready;
    await sleep(150); // Extra buffer for font rendering
  } catch (e) {
    console.warn("Font loading warning:", e);
    await sleep(300);
  }
}

// ========== LAYER 3: Image Preloading ==========

async function preloadAllImages(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll('img');
  const imagePromises = Array.from(images).map(img => {
    if (img.complete && img.naturalWidth > 0) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => resolve(), 5000); // Max 5s per image
      img.onload = () => { clearTimeout(timeout); resolve(); };
      img.onerror = () => { clearTimeout(timeout); resolve(); };
    });
  });
  await Promise.all(imagePromises);
}

// ========== LAYER 4: SVG/QR Render Guard ==========

async function waitForSvgRender(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

// ========== LAYER 5: Transform Normalization ==========

interface SavedTransform {
  element: HTMLElement;
  transform: string;
  transformOrigin: string;
}

function normalizeParentTransforms(element: HTMLElement): SavedTransform[] {
  const saved: SavedTransform[] = [];
  let parent = element.parentElement;
  
  while (parent && parent !== document.body) {
    const computed = window.getComputedStyle(parent);
    if (computed.transform !== 'none') {
      saved.push({
        element: parent,
        transform: parent.style.transform,
        transformOrigin: parent.style.transformOrigin,
      });
      parent.style.transform = 'none';
      parent.style.transformOrigin = 'top left';
    }
    parent = parent.parentElement;
  }
  
  return saved;
}

function restoreParentTransforms(saved: SavedTransform[]): void {
  saved.forEach(({ element, transform, transformOrigin }) => {
    element.style.transform = transform;
    element.style.transformOrigin = transformOrigin;
  });
}

// ========== LAYER 6: Element Size Normalization ==========

interface SavedStyles {
  width: string;
  height: string;
  minHeight: string;
  maxWidth: string;
  transform: string;
  position: string;
  margin: string;
}

function forceNaturalSize(element: HTMLElement): SavedStyles {
  const saved: SavedStyles = {
    width: element.style.width,
    height: element.style.height,
    minHeight: element.style.minHeight,
    maxWidth: element.style.maxWidth,
    transform: element.style.transform,
    position: element.style.position,
    margin: element.style.margin,
  };
  
  // Force A4 dimensions at 96 DPI
  element.style.width = '210mm';
  element.style.minHeight = '297mm';
  element.style.maxWidth = '210mm';
  element.style.transform = 'none';
  element.style.margin = '0';
  
  return saved;
}

function restoreNaturalSize(element: HTMLElement, saved: SavedStyles): void {
  element.style.width = saved.width;
  element.style.height = saved.height;
  element.style.minHeight = saved.minHeight;
  element.style.maxWidth = saved.maxWidth;
  element.style.transform = saved.transform;
  element.style.position = saved.position;
  element.style.margin = saved.margin;
}

// ========== LAYER 7: Computed Style Preservation ==========

function preserveComputedStyles(_doc: Document, clonedElement: HTMLElement): void {
  const allElements = clonedElement.querySelectorAll('*');
  
  allElements.forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    
    const computed = window.getComputedStyle(el);
    
    // Force critical styles as inline
    el.style.fontFamily = computed.fontFamily;
    el.style.fontSize = computed.fontSize;
    el.style.fontWeight = computed.fontWeight;
    el.style.fontStyle = computed.fontStyle;
    el.style.lineHeight = computed.lineHeight;
    el.style.letterSpacing = computed.letterSpacing;
    el.style.color = computed.color;
    el.style.backgroundColor = computed.backgroundColor;
    el.style.borderColor = computed.borderColor;
    el.style.borderWidth = computed.borderWidth;
    el.style.borderStyle = computed.borderStyle;
    el.style.borderRadius = computed.borderRadius;
    el.style.padding = computed.padding;
    el.style.margin = computed.margin;
    el.style.textAlign = computed.textAlign;
    el.style.textDecoration = computed.textDecoration;
    el.style.display = computed.display;
    el.style.flexDirection = computed.flexDirection;
    el.style.justifyContent = computed.justifyContent;
    el.style.alignItems = computed.alignItems;
    el.style.gap = computed.gap;
    el.style.width = computed.width;
    el.style.height = computed.height;
    el.style.minWidth = computed.minWidth;
    el.style.minHeight = computed.minHeight;
    el.style.maxWidth = computed.maxWidth;
    el.style.maxHeight = computed.maxHeight;
    el.style.position = computed.position;
    el.style.top = computed.top;
    el.style.left = computed.left;
    el.style.right = computed.right;
    el.style.bottom = computed.bottom;
    el.style.zIndex = computed.zIndex;
    el.style.opacity = computed.opacity;
    el.style.overflow = computed.overflow;
    el.style.boxShadow = computed.boxShadow;
    el.style.transform = computed.transform;
    el.style.transformOrigin = computed.transformOrigin;
  });
}

// ========== MAIN COMPONENT ==========

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
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = useCallback(async () => {
    if (!documentRef.current) {
      toast.error("Dokumen tidak ditemukan");
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading("Menyiapkan dokumen...");

    try {
      const targetElement = documentRef.current;

      // LAYER 1: Wait for fonts
      toast.loading("Memuat font...", { id: toastId });
      await waitForFonts();

      // LAYER 2: Wait for images
      toast.loading("Memuat gambar...", { id: toastId });
      await preloadAllImages(targetElement);

      // LAYER 3: Wait for SVG/QR render
      await waitForSvgRender();

      // LAYER 4: Normalize parent transforms
      toast.loading("Memproses layout...", { id: toastId });
      const savedTransforms = normalizeParentTransforms(targetElement);

      // LAYER 5: Force natural size
      const savedStyles = forceNaturalSize(targetElement);

      // Force browser reflow
      targetElement.getBoundingClientRect();
      await sleep(100);

      // LAYER 6: Capture with high-fidelity settings
      toast.loading("Membuat gambar...", { id: toastId });
      
      const canvas = await html2canvas(targetElement, {
        scale: 3, // High quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 15000,
        removeContainer: false,
        foreignObjectRendering: false,
        windowWidth: targetElement.scrollWidth,
        windowHeight: targetElement.scrollHeight,
        onclone: preserveComputedStyles,
      });

      // LAYER 7: Restore everything
      restoreNaturalSize(targetElement, savedStyles);
      restoreParentTransforms(savedTransforms);

      // Validate canvas
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error("Canvas kosong");
      }

      // Generate image data
      toast.loading("Membuat PDF...", { id: toastId });
      
      let imgData = canvas.toDataURL("image/png", 1.0);
      if (!imgData || imgData === 'data:,' || imgData.length < 100) {
        imgData = canvas.toDataURL("image/jpeg", 0.98);
      }

      const imgFormat = imgData.includes("jpeg") ? "JPEG" : "PNG";

      // Create PDF
      const paper = PAPER_SIZES[paperSize];
      const pdfWidth = orientation === "portrait" ? paper.width : paper.height;
      const pdfHeight = orientation === "portrait" ? paper.height : paper.width;

      const pdf = new jsPDF({
        orientation: orientation,
        unit: "mm",
        format: [pdfWidth, pdfHeight],
      });

      // Calculate scaling to fit page
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Fit width perfectly, allow height to extend if needed
      const scaledWidth = pdfWidth;
      const scaledHeight = (imgHeight * pdfWidth) / imgWidth;

      // Add pages if content is taller than one page
      if (scaledHeight <= pdfHeight) {
        // Single page - center vertically
        const offsetY = 0;
        pdf.addImage(imgData, imgFormat, 0, offsetY, scaledWidth, scaledHeight);
      } else {
        // Multi-page handling
        const pageCount = Math.ceil(scaledHeight / pdfHeight);
        
        for (let page = 0; page < pageCount; page++) {
          if (page > 0) {
            pdf.addPage([pdfWidth, pdfHeight], orientation);
          }
          
          const yOffset = -(page * pdfHeight);
          pdf.addImage(imgData, imgFormat, 0, yOffset, scaledWidth, scaledHeight);
        }
      }

      pdf.save(`${fileName}.pdf`);

      toast.success("PDF berhasil dibuat!", { id: toastId });
      onComplete?.();

    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Gagal membuat PDF: " + (error as Error).message, { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  }, [documentRef, fileName, onComplete, orientation, paperSize]);

  const printDocument = useCallback(async () => {
    if (!documentRef.current) {
      toast.error("Dokumen tidak ditemukan");
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading("Menyiapkan cetak...");

    try {
      const targetElement = documentRef.current;

      // Apply all layers
      await waitForFonts();
      await preloadAllImages(targetElement);
      await waitForSvgRender();

      const savedTransforms = normalizeParentTransforms(targetElement);
      const savedStyles = forceNaturalSize(targetElement);

      targetElement.getBoundingClientRect();
      await sleep(100);

      toast.loading("Membuat gambar...", { id: toastId });

      const canvas = await html2canvas(targetElement, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 15000,
        removeContainer: false,
        foreignObjectRendering: false,
        windowWidth: targetElement.scrollWidth,
        windowHeight: targetElement.scrollHeight,
        onclone: preserveComputedStyles,
      });

      restoreNaturalSize(targetElement, savedStyles);
      restoreParentTransforms(savedTransforms);

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error("Canvas kosong");
      }

      let imgData = canvas.toDataURL("image/png", 1.0);
      if (!imgData || imgData === 'data:,' || imgData.length < 100) {
        imgData = canvas.toDataURL("image/jpeg", 0.98);
      }

      // Open print window
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${fileName}</title>
              <style>
                @page { 
                  margin: 0; 
                  size: A4 portrait; 
                }
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                html, body {
                  width: 100%;
                  height: 100%;
                  margin: 0;
                  padding: 0;
                }
                body { 
                  display: flex; 
                  justify-content: center; 
                  align-items: flex-start;
                  background: white;
                }
                img { 
                  width: 210mm;
                  height: auto;
                  display: block;
                }
                @media print {
                  img {
                    width: 100%;
                    height: auto;
                    page-break-after: auto;
                  }
                }
              </style>
            </head>
            <body>
              <img src="${imgData}" onload="setTimeout(function() { window.print(); window.close(); }, 200);" />
            </body>
          </html>
        `);
        printWindow.document.close();
      }

      toast.success("Siap untuk dicetak!", { id: toastId });
      onComplete?.();

    } catch (error) {
      console.error("Error printing:", error);
      toast.error("Gagal mencetak: " + (error as Error).message, { id: toastId });
    } finally {
      setIsGenerating(false);
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
      
      <Button onClick={generatePDF} className="gap-2" disabled={isGenerating}>
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Download PDF</span>
        <span className="sm:hidden">PDF</span>
      </Button>
      <Button variant="outline" onClick={printDocument} className="gap-2" disabled={isGenerating}>
        <Printer className="h-4 w-4" />
        <span className="hidden sm:inline">Cetak</span>
      </Button>
    </div>
  );
};
