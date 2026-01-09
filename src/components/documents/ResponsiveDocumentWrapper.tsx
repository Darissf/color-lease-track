import { useRef, useState, useEffect, ReactNode } from "react";

interface ResponsiveDocumentWrapperProps {
  children: ReactNode;
}

// A4 dimensions in millimeters
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export const ResponsiveDocumentWrapper = ({
  children,
}: ResponsiveDocumentWrapperProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [a4WidthPx, setA4WidthPx] = useState(793); // Fallback 96dpi

  useEffect(() => {
    // Get accurate pixel equivalent of 210mm for current screen DPI
    const getA4WidthInPixels = () => {
      const tempDiv = document.createElement('div');
      tempDiv.style.width = '210mm';
      tempDiv.style.position = 'absolute';
      tempDiv.style.visibility = 'hidden';
      document.body.appendChild(tempDiv);
      const width = tempDiv.offsetWidth;
      document.body.removeChild(tempDiv);
      return width;
    };

    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const a4Width = getA4WidthInPixels();
        setA4WidthPx(a4Width);
        // Calculate scale based on container width, max 1 (no upscaling)
        const newScale = Math.min(1, (containerWidth - 16) / a4Width);
        setScale(newScale);
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // Calculate scaled dimensions in pixels for outer container
  const scaledWidth = a4WidthPx * scale;
  const scaledHeight = (a4WidthPx * (A4_HEIGHT_MM / A4_WIDTH_MM)) * scale;

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      {/* Outer container dengan ukuran yang sudah di-scale (dalam pixel) */}
      <div
        style={{
          width: scaledWidth,
          height: scaledHeight,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Inner container dengan ukuran A4 FIXED dalam MM untuk positioning konsisten */}
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: `${A4_WIDTH_MM}mm`,
            height: `${A4_HEIGHT_MM}mm`, // FIXED 297mm - tidak di-scale
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
