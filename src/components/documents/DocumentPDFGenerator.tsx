import React, { useCallback, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { pdf } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Download, Printer, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InvoicePDFTemplate, type InvoicePDFTemplateProps } from "@/components/documents/pdf/InvoicePDFTemplate";

type Orientation = "portrait" | "landscape";
type PaperSize = "a4" | "letter" | "legal";

interface DocumentPDFGeneratorProps {
  documentRef: React.RefObject<HTMLDivElement>;
  page2Ref?: React.RefObject<HTMLDivElement>; // Optional ref for page 2 (Rincian Tagihan)
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
    // Check for any transform (including from react-zoom-pan-pinch)
    const hasTransform = computed.transform !== 'none' && computed.transform !== '';
    const hasScale = computed.transform.includes('scale') || computed.transform.includes('matrix');
    
    if (hasTransform || hasScale) {
      saved.push({
        element: parent,
        transform: parent.style.transform,
        transformOrigin: parent.style.transformOrigin,
      });
      parent.style.transform = 'none';
      parent.style.transformOrigin = 'top left';
      
      // Also handle inline style for transform from react-zoom-pan-pinch
      const inlineTransform = parent.getAttribute('style');
      if (inlineTransform && inlineTransform.includes('transform')) {
        parent.style.setProperty('transform', 'none', 'important');
      }
    }
    
    // Also check for wrapper containers that may clip content (e.g., TransformComponent)
    if (computed.overflow === 'hidden' || computed.overflow === 'scroll') {
      const oldOverflow = parent.style.overflow;
      saved.push({
        element: parent,
        transform: oldOverflow,
        transformOrigin: '', // reuse for overflow
      });
      parent.style.overflow = 'visible';
    }
    
    parent = parent.parentElement;
  }
  
  return saved;
}

function restoreParentTransforms(saved: SavedTransform[]): void {
  saved.forEach(({ element, transform, transformOrigin }) => {
    // Check if this was saved for overflow or transform
    if (transformOrigin === '') {
      // This was an overflow save
      element.style.overflow = transform;
    } else {
      element.style.transform = transform;
      element.style.transformOrigin = transformOrigin;
    }
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
  
  // Force A4 dimensions at 96 DPI - USE PIXEL UNITS (793px x 1122px)
  // This fixes mobile scaling issues from ResponsiveDocumentWrapper
  element.style.width = '793px';
  element.style.height = 'auto';
  element.style.minHeight = '1122px';
  element.style.maxWidth = '793px';
  element.style.transform = 'none'; // CRITICAL: Remove any mobile scaling
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

// ========== LAYER 7: Critical Inline Styles (Before Capture) ==========

interface SavedElementStyle {
  element: HTMLElement;
  originalStyle: string;
}

interface SavedSvgStyle {
  element: SVGElement;
  originalStyle: string;
  originalWidth: string | null;
  originalHeight: string | null;
}

interface SavedPathStyle {
  element: SVGElement;
  originalStroke: string | null;
  originalFill: string | null;
  originalStrokeWidth: string | null;
}

function applyCriticalInlineStyles(container: HTMLElement): {
  elements: SavedElementStyle[];
  svgs: SavedSvgStyle[];
  paths: SavedPathStyle[];
} {
  const savedElements: SavedElementStyle[] = [];
  const savedSvgs: SavedSvgStyle[] = [];
  const savedPaths: SavedPathStyle[] = [];

  // Apply inline styles to ALL elements
  const allElements = container.querySelectorAll('*');
  allElements.forEach((el) => {
    if (!(el instanceof HTMLElement)) return;

    // ===== TARGETED EXCLUSION CHECK =====
    const tagName = el.tagName.toUpperCase();
    const isQrContainer = el.closest('.qr-code-container') !== null || 
                          el.classList.contains('qr-code-container') ||
                          el.closest('[data-qr]') !== null ||
                          el.closest('[class*="qr"]') !== null;
    const isCanvas = tagName === 'CANVAS';
    const isImage = tagName === 'IMG';
    
    // Flag to skip background styles for QR/Canvas/Image to prevent black QR codes
    const shouldSkipBackgrounds = isQrContainer || isCanvas || isImage;

    // Save original style attribute
    savedElements.push({
      element: el,
      originalStyle: el.getAttribute('style') || '',
    });

    const computed = window.getComputedStyle(el);

    // === BORDERS (Critical for invoice number box) ===
    const borderWidth = computed.borderWidth;
    if (borderWidth && borderWidth !== '0px') {
      el.style.borderWidth = borderWidth;
      el.style.borderStyle = computed.borderStyle;
      el.style.borderColor = computed.borderColor;
      el.style.borderTopWidth = computed.borderTopWidth;
      el.style.borderRightWidth = computed.borderRightWidth;
      el.style.borderBottomWidth = computed.borderBottomWidth;
      el.style.borderLeftWidth = computed.borderLeftWidth;
      el.style.borderTopStyle = computed.borderTopStyle;
      el.style.borderRightStyle = computed.borderRightStyle;
      el.style.borderBottomStyle = computed.borderBottomStyle;
      el.style.borderLeftStyle = computed.borderLeftStyle;
      el.style.borderTopColor = computed.borderTopColor;
      el.style.borderRightColor = computed.borderRightColor;
      el.style.borderBottomColor = computed.borderBottomColor;
      el.style.borderLeftColor = computed.borderLeftColor;
    }
    el.style.borderRadius = computed.borderRadius;

    // === BACKGROUNDS (SKIP for QR/Canvas/Image to prevent black QR codes) ===
    if (!shouldSkipBackgrounds) {
      if (computed.backgroundColor !== 'rgba(0, 0, 0, 0)' && computed.backgroundColor !== 'transparent') {
        el.style.backgroundColor = computed.backgroundColor;
      }
      if (computed.backgroundImage !== 'none') {
        el.style.backgroundImage = computed.backgroundImage;
      }
    }

    // === FONTS ===
    el.style.fontFamily = computed.fontFamily;
    el.style.fontSize = computed.fontSize;
    el.style.fontWeight = computed.fontWeight;
    el.style.fontStyle = computed.fontStyle;
    el.style.lineHeight = computed.lineHeight;
    el.style.letterSpacing = computed.letterSpacing;
    el.style.color = computed.color;
    el.style.textAlign = computed.textAlign;
    el.style.textDecoration = computed.textDecoration;
    el.style.textTransform = computed.textTransform;
    el.style.whiteSpace = computed.whiteSpace;
    el.style.wordBreak = computed.wordBreak;

    // === LAYOUT ===
    el.style.display = computed.display;
    el.style.flexDirection = computed.flexDirection;
    el.style.flexWrap = computed.flexWrap;
    el.style.justifyContent = computed.justifyContent;
    el.style.alignItems = computed.alignItems;
    el.style.alignContent = computed.alignContent;
    el.style.gap = computed.gap;
    el.style.rowGap = computed.rowGap;
    el.style.columnGap = computed.columnGap;

    // === SIZING ===
    el.style.width = computed.width;
    el.style.height = computed.height;
    el.style.minWidth = computed.minWidth;
    el.style.minHeight = computed.minHeight;
    el.style.maxWidth = computed.maxWidth;
    el.style.maxHeight = computed.maxHeight;

    // === SPACING ===
    el.style.padding = computed.padding;
    el.style.paddingTop = computed.paddingTop;
    el.style.paddingRight = computed.paddingRight;
    el.style.paddingBottom = computed.paddingBottom;
    el.style.paddingLeft = computed.paddingLeft;
    el.style.margin = computed.margin;
    el.style.marginTop = computed.marginTop;
    el.style.marginRight = computed.marginRight;
    el.style.marginBottom = computed.marginBottom;
    el.style.marginLeft = computed.marginLeft;

    // === POSITIONING ===
    el.style.position = computed.position;
    el.style.top = computed.top;
    el.style.right = computed.right;
    el.style.bottom = computed.bottom;
    el.style.left = computed.left;
    el.style.zIndex = computed.zIndex;

    // === EFFECTS ===
    el.style.opacity = computed.opacity;
    el.style.boxShadow = computed.boxShadow;
    el.style.overflow = computed.overflow;
    el.style.visibility = computed.visibility;
  });

  // === HELPER: Detect QR Code SVGs (react-qr-code generates specific patterns) ===
  function isQrCodeSvg(svg: SVGElement): boolean {
    // Method 1: Check parent containers for QR-related markers
    if (svg.closest('[data-qr]') || 
        svg.closest('.qr-code-container') || 
        svg.closest('[class*="qr"]')) {
      return true;
    }
    
    // Method 2: react-qr-code uses shape-rendering="crispEdges"
    const shapeRendering = svg.getAttribute('shape-rendering');
    if (shapeRendering === 'crispEdges') {
      return true;
    }
    
    // Method 3: Check if it's a square viewBox with many fill-based paths (QR pattern)
    const viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.split(' ');
      if (parts.length === 4) {
        const width = parseFloat(parts[2]);
        const height = parseFloat(parts[3]);
        // QR codes are square and typically have viewBox like "0 0 29 29"
        if (width === height && width > 15) {
          const paths = svg.querySelectorAll('path');
          if (paths.length > 5) {
            // QR code paths use fill (not stroke) - count fill-only paths
            let fillPathCount = 0;
            paths.forEach(path => {
              const fill = path.getAttribute('fill');
              const stroke = path.getAttribute('stroke');
              if (fill && fill !== 'none' && (!stroke || stroke === 'none')) {
                fillPathCount++;
              }
            });
            // If most paths are fill-based, it's a QR code
            if (fillPathCount > paths.length / 2) {
              return true;
            }
          }
        }
      }
    }
    
    return false;
  }

  // === SVG ICONS (Critical for lucide-react icons) ===
  const svgs = container.querySelectorAll('svg');
  svgs.forEach((svg) => {
    if (!(svg instanceof SVGElement)) return;

    // ===== SKIP QR Code SVGs using enhanced detection =====
    if (isQrCodeSvg(svg)) {
      console.log('[PDF] Skipping QR code SVG');
      return; // Skip QR SVGs entirely - do not modify!
    }

    // Save original attributes
    savedSvgs.push({
      element: svg,
      originalStyle: svg.getAttribute('style') || '',
      originalWidth: svg.getAttribute('width'),
      originalHeight: svg.getAttribute('height'),
    });

    const computed = window.getComputedStyle(svg);
    const width = computed.width;
    const height = computed.height;
    const color = computed.color;

    // Force explicit dimensions
    (svg as unknown as HTMLElement).style.width = width;
    (svg as unknown as HTMLElement).style.height = height;
    (svg as unknown as HTMLElement).style.minWidth = width;
    (svg as unknown as HTMLElement).style.minHeight = height;
    (svg as unknown as HTMLElement).style.maxWidth = width;
    (svg as unknown as HTMLElement).style.maxHeight = height;
    (svg as unknown as HTMLElement).style.display = 'inline-block';
    (svg as unknown as HTMLElement).style.flexShrink = '0';
    (svg as unknown as HTMLElement).style.verticalAlign = 'middle';
    (svg as unknown as HTMLElement).style.color = color;

    // Set explicit width/height attributes
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);

    // Handle paths, circles, lines inside SVG
    const paths = svg.querySelectorAll('path, circle, rect, line, polyline, polygon, ellipse');
    paths.forEach((path) => {
      if (!(path instanceof SVGElement)) return;

      savedPaths.push({
        element: path,
        originalStroke: path.getAttribute('stroke'),
        originalFill: path.getAttribute('fill'),
        originalStrokeWidth: path.getAttribute('stroke-width'),
      });

      const pathComputed = window.getComputedStyle(path);
      
      // Force stroke and fill colors
      const stroke = pathComputed.stroke;
      const fill = pathComputed.fill;
      const strokeWidth = pathComputed.strokeWidth;

      if (stroke && stroke !== 'none') {
        path.setAttribute('stroke', stroke === 'currentcolor' || stroke === 'currentColor' ? color : stroke);
      } else {
        path.setAttribute('stroke', 'currentColor');
      }
      
      if (fill && fill !== 'none' && fill !== 'rgba(0, 0, 0, 0)') {
        path.setAttribute('fill', fill === 'currentcolor' || fill === 'currentColor' ? color : fill);
      }
      
      if (strokeWidth) {
        path.setAttribute('stroke-width', strokeWidth);
      }

      // Also set stroke-linecap and stroke-linejoin for clean icons
      path.setAttribute('stroke-linecap', pathComputed.strokeLinecap || 'round');
      path.setAttribute('stroke-linejoin', pathComputed.strokeLinejoin || 'round');
    });
  });

  return { elements: savedElements, svgs: savedSvgs, paths: savedPaths };
}

function restoreCriticalInlineStyles(saved: {
  elements: SavedElementStyle[];
  svgs: SavedSvgStyle[];
  paths: SavedPathStyle[];
}): void {
  // Restore HTML elements
  saved.elements.forEach(({ element, originalStyle }) => {
    if (originalStyle) {
      element.setAttribute('style', originalStyle);
    } else {
      element.removeAttribute('style');
    }
  });

  // Restore SVG elements
  saved.svgs.forEach(({ element, originalStyle, originalWidth, originalHeight }) => {
    if (originalStyle) {
      element.setAttribute('style', originalStyle);
    } else {
      element.removeAttribute('style');
    }
    if (originalWidth !== null) {
      element.setAttribute('width', originalWidth);
    } else {
      element.removeAttribute('width');
    }
    if (originalHeight !== null) {
      element.setAttribute('height', originalHeight);
    } else {
      element.removeAttribute('height');
    }
  });

  // Restore path elements
  saved.paths.forEach(({ element, originalStroke, originalFill, originalStrokeWidth }) => {
    if (originalStroke !== null) {
      element.setAttribute('stroke', originalStroke);
    } else {
      element.removeAttribute('stroke');
    }
    if (originalFill !== null) {
      element.setAttribute('fill', originalFill);
    } else {
      element.removeAttribute('fill');
    }
    if (originalStrokeWidth !== null) {
      element.setAttribute('stroke-width', originalStrokeWidth);
    } else {
      element.removeAttribute('stroke-width');
    }
    element.removeAttribute('stroke-linecap');
    element.removeAttribute('stroke-linejoin');
  });
}

// ========== MAIN COMPONENT ==========

export const DocumentPDFGenerator = ({
  documentRef,
  page2Ref,
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

      // LAYER 6: Apply critical inline styles BEFORE capture
      toast.loading("Menerapkan styles...", { id: toastId });
      const savedInlineStyles = applyCriticalInlineStyles(targetElement);

      // Force browser reflow after inline styles applied
      targetElement.getBoundingClientRect();
      await sleep(150);

      // LAYER 7: Capture with high-fidelity settings
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
      });

      // LAYER 8: Restore everything
      restoreCriticalInlineStyles(savedInlineStyles);
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

  // Generate multi-page PDF using DOM capture (html2canvas) for perfect WYSIWYG
  const generateMultiPagePDF = useCallback(async () => {
    if (!documentRef.current) {
      toast.error("Dokumen tidak ditemukan");
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading("Menyiapkan dokumen multi-halaman...");

    try {
      const pages: HTMLElement[] = [documentRef.current];
      if (page2Ref?.current) {
        pages.push(page2Ref.current);
      }

      const pageImages: { imgData: string; width: number; height: number }[] = [];

      // Capture each page
      for (let i = 0; i < pages.length; i++) {
        const targetElement = pages[i];
        toast.loading(`Memproses halaman ${i + 1}/${pages.length}...`, { id: toastId });

        // MOBILE FIX: Clone element to capture outside of transform context
        // This ensures html2canvas can capture the full element without transform issues
        const clone = targetElement.cloneNode(true) as HTMLElement;
        clone.style.position = 'fixed';
        clone.style.top = '0';
        clone.style.left = '0';
        clone.style.width = '793px';
        clone.style.height = '1122px';
        clone.style.zIndex = '-9999';
        clone.style.visibility = 'visible';
        clone.style.opacity = '1';
        clone.style.transform = 'none';
        clone.style.pointerEvents = 'none';
        clone.style.overflow = 'visible';
        document.body.appendChild(clone);

        // Apply all layers to clone
        await waitForFonts();
        await preloadAllImages(clone);
        await waitForSvgRender();

        const savedStyles = forceNaturalSize(clone);
        const savedInlineStyles = applyCriticalInlineStyles(clone);

        // Force layout recalculation
        clone.getBoundingClientRect();
        await sleep(250); // Wait for mobile rendering

        // Capture the clone which is outside of any transform context
        const canvas = await html2canvas(clone, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          imageTimeout: 15000,
          removeContainer: false,
          foreignObjectRendering: false,
          width: 793,
          height: 1122,
          windowWidth: 793,
          windowHeight: 1122,
          x: 0,
          y: 0,
          scrollX: 0,
          scrollY: 0,
        });

        // Clean up clone
        restoreCriticalInlineStyles(savedInlineStyles);
        restoreNaturalSize(clone, savedStyles);
        document.body.removeChild(clone);

        if (!canvas || canvas.width === 0 || canvas.height === 0) {
          console.error(`Canvas halaman ${i + 1} kosong - width: ${canvas?.width}, height: ${canvas?.height}`);
          throw new Error(`Canvas halaman ${i + 1} kosong`);
        }

        console.log(`Page ${i + 1} captured: ${canvas.width}x${canvas.height}`);

        let imgData = canvas.toDataURL("image/png", 1.0);
        if (!imgData || imgData === 'data:,' || imgData.length < 100) {
          imgData = canvas.toDataURL("image/jpeg", 0.98);
        }

        pageImages.push({
          imgData,
          width: canvas.width,
          height: canvas.height,
        });
      }

      // Create PDF with all pages
      toast.loading("Membuat PDF...", { id: toastId });
      
      const paper = PAPER_SIZES[paperSize];
      const pdfWidth = orientation === "portrait" ? paper.width : paper.height;
      const pdfHeight = orientation === "portrait" ? paper.height : paper.width;

      const pdf = new jsPDF({
        orientation: orientation,
        unit: "mm",
        format: [pdfWidth, pdfHeight],
      });

      // Add each captured page to PDF
      for (let i = 0; i < pageImages.length; i++) {
        if (i > 0) {
          pdf.addPage([pdfWidth, pdfHeight], orientation);
        }

        const { imgData, width: imgWidth, height: imgHeight } = pageImages[i];
        const imgFormat = imgData.includes("jpeg") ? "JPEG" : "PNG";

        // Fit width perfectly
        const scaledWidth = pdfWidth;
        const scaledHeight = (imgHeight * pdfWidth) / imgWidth;

        pdf.addImage(imgData, imgFormat, 0, 0, scaledWidth, scaledHeight);
      }

      pdf.save(`${fileName}.pdf`);
      toast.success(`PDF ${pages.length} halaman berhasil dibuat!`, { id: toastId });
      onComplete?.();

    } catch (error) {
      console.error("Error generating multi-page PDF:", error);
      toast.error("Gagal membuat PDF: " + (error as Error).message, { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  }, [documentRef, page2Ref, fileName, onComplete, orientation, paperSize]);

  // Helper: Convert image URL to base64 data URL (avoids Buffer error in react-pdf)
  const convertImageToBase64 = async (url: string): Promise<string | undefined> => {
    try {
      console.log("Converting image to base64:", url);
      const response = await fetch(url, { mode: 'cors' });
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          console.log("Image converted to base64 successfully");
          resolve(reader.result as string);
        };
        reader.onerror = (error) => {
          console.error("FileReader error:", error);
          reject(error);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error converting image to base64:", error);
      return undefined;
    }
  };

  // Generate PDF using @react-pdf/renderer for multi-page support (Invoice with Rincian Tagihan)
  const generatePDFWithReactPDF = useCallback(async () => {
    console.log("=== generatePDFWithReactPDF Debug ===");
    console.log("documentType:", documentType);
    console.log("templateProps:", templateProps);
    console.log("lineItems:", templateProps?.lineItems);
    console.log("lineItems length:", templateProps?.lineItems?.length);
    
    if (!templateProps) {
      toast.error("Template props tidak ditemukan");
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading("Menyiapkan dokumen...");

    try {
      toast.loading("Memuat gambar dan QR codes...", { id: toastId });

      // Pre-generate QR codes as data URLs (required by react-pdf) with timeout
      let qrCodeDataUrl: string | undefined;
      let verificationQrDataUrl: string | undefined;

      const generateQRWithTimeout = async (url: string, timeout = 5000): Promise<string | undefined> => {
        try {
          return await Promise.race([
            QRCode.toDataURL(url, { width: 200, margin: 1, color: { dark: '#000000', light: '#ffffff' } }),
            new Promise<undefined>((_, reject) => setTimeout(() => reject(new Error('QR timeout')), timeout))
          ]);
        } catch (error) {
          console.warn("QR generation failed:", error);
          return undefined;
        }
      };

      // Generate payment QR if bank info available
      if (templateProps.contractBankInfo?.account_number) {
        const paymentUrl = `https://wa.me/${templateProps.settings?.payment_wa_number || ''}?text=Pembayaran%20${encodeURIComponent(templateProps.documentNumber)}`;
        qrCodeDataUrl = await generateQRWithTimeout(paymentUrl);
      }

      // Generate verification QR
      const verificationUrl = `${window.location.origin}/verify/${templateProps.verificationCode}`;
      verificationQrDataUrl = await generateQRWithTimeout(verificationUrl);

      // Convert ALL image URLs to base64 data URLs (CRITICAL: avoids Buffer error in react-pdf)
      let logoBase64: string | undefined;
      let signatureBase64: string | undefined;
      let stampBase64: string | undefined;
      let bankLogoBase64: string | undefined;

      console.log("Converting all images to base64...");

      // Convert logo
      if (templateProps?.settings?.invoice_logo_url) {
        logoBase64 = await convertImageToBase64(templateProps.settings.invoice_logo_url);
        console.log("Logo base64:", logoBase64 ? "success" : "failed");
      }

      // Convert signature
      if (templateProps?.settings?.signature_url) {
        signatureBase64 = await convertImageToBase64(templateProps.settings.signature_url);
        console.log("Signature base64:", signatureBase64 ? "success" : "failed");
      }

      // Convert custom stamp
      if (templateProps?.settings?.custom_stamp_url) {
        stampBase64 = await convertImageToBase64(templateProps.settings.custom_stamp_url);
        console.log("Stamp base64:", stampBase64 ? "success" : "failed");
      }

      // Convert bank logo
      if (templateProps?.settings?.bank_logo_url) {
        bankLogoBase64 = await convertImageToBase64(templateProps.settings.bank_logo_url);
        console.log("Bank logo base64:", bankLogoBase64 ? "success" : "failed");
      }

      toast.loading("Membuat PDF 2 halaman...", { id: toastId });

      // Create PDF document using InvoicePDFTemplate with explicit defaults
      const pdfProps: InvoicePDFTemplateProps = {
        documentNumber: templateProps.documentNumber || '',
        verificationCode: templateProps.verificationCode || '',
        issuedAt: templateProps.issuedAt || new Date(),
        clientName: templateProps.clientName || 'Pelanggan',
        clientAddress: templateProps.clientAddress,
        description: templateProps.description || '',
        amount: templateProps.amount || 0,
        contractInvoice: templateProps.contractInvoice,
        period: templateProps.period,
        contractBankInfo: templateProps.contractBankInfo,
        accessCode: templateProps.accessCode,
        customTextElements: templateProps.customTextElements,
        lineItems: Array.isArray(templateProps.lineItems) ? templateProps.lineItems : [],
        transportDelivery: templateProps.transportDelivery || 0,
        transportPickup: templateProps.transportPickup || 0,
        discount: templateProps.discount || 0,
        settings: {
          ...templateProps.settings,
          // Use base64 images instead of URLs to avoid Buffer error
          invoice_logo_url: logoBase64 || undefined,
          signature_url: signatureBase64 || undefined,
          custom_stamp_url: stampBase64 || undefined,
          bank_logo_url: bankLogoBase64 || undefined,
        },
        qrCodeDataUrl,
        verificationQrDataUrl,
      };
      
      console.log("=== PDF Props Debug ===");
      console.log("pdfProps.lineItems:", pdfProps.lineItems);
      console.log("pdfProps.lineItems.length:", pdfProps.lineItems?.length);
      console.log("pdfProps.settings.invoice_logo_url:", pdfProps.settings?.invoice_logo_url ? "base64 data" : "none");
      console.log("Creating PDF document...");

      // Generate PDF blob using @react-pdf/renderer
      const pdfDocument = <InvoicePDFTemplate {...pdfProps} />;
      console.log("PDF document element created");
      
      const blob = await pdf(pdfDocument).toBlob();
      console.log("PDF blob created, size:", blob.size);
      
      if (blob.size === 0) {
        throw new Error("PDF blob is empty");
      }
      
      // Download the PDF
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("PDF 2 halaman berhasil dibuat!", { id: toastId });
      onComplete?.();

    } catch (error) {
      console.error("Error generating PDF with react-pdf:", error);
      console.error("Error stack:", (error as Error).stack);
      
      // Fallback to html2canvas method
      toast.loading("Mencoba metode alternatif...", { id: toastId });
      try {
        await generatePDF();
        toast.success("PDF berhasil dibuat (1 halaman)", { id: toastId });
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
        toast.error("Gagal membuat PDF: " + (error as Error).message, { id: toastId });
      }
    } finally {
      setIsGenerating(false);
    }
  }, [templateProps, fileName, onComplete, generatePDF, documentType]);

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

      // Apply critical inline styles
      const savedInlineStyles = applyCriticalInlineStyles(targetElement);

      targetElement.getBoundingClientRect();
      await sleep(150);

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
      });

      restoreCriticalInlineStyles(savedInlineStyles);
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

  const generatePNG = useCallback(async () => {
    if (!documentRef.current) {
      toast.error("Dokumen tidak ditemukan");
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading("Menyiapkan gambar PNG...");

    try {
      const targetElement = documentRef.current;

      // Apply all protective layers (same as PDF)
      await waitForFonts();
      await preloadAllImages(targetElement);
      await waitForSvgRender();

      const savedTransforms = normalizeParentTransforms(targetElement);
      const savedStyles = forceNaturalSize(targetElement);
      const savedInlineStyles = applyCriticalInlineStyles(targetElement);

      targetElement.getBoundingClientRect();
      await sleep(150);

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
      });

      // Restore everything
      restoreCriticalInlineStyles(savedInlineStyles);
      restoreNaturalSize(targetElement, savedStyles);
      restoreParentTransforms(savedTransforms);

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error("Canvas kosong");
      }

      // Convert canvas to PNG blob and download
      toast.loading("Mengunduh PNG...", { id: toastId });

      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Gagal membuat PNG", { id: toastId });
          setIsGenerating(false);
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("PNG berhasil diunduh!", { id: toastId });
        setIsGenerating(false);
        onComplete?.();
      }, 'image/png', 1.0);

    } catch (error) {
      console.error("Error generating PNG:", error);
      toast.error("Gagal membuat PNG: " + (error as Error).message, { id: toastId });
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
      
      <Button 
        onClick={page2Ref ? generateMultiPagePDF : generatePDF} 
        className="gap-2" 
        disabled={isGenerating}
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Download PDF{page2Ref ? ' (2 Halaman)' : ''}</span>
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
