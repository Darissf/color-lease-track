import { useRef, useState, useEffect, ReactNode } from "react";

interface ResponsiveDocumentWrapperProps {
  children: ReactNode;
}

const A4_WIDTH_PX = 793; // 210mm in pixels at 96dpi
const A4_HEIGHT_PX = 1122; // 297mm in pixels at 96dpi

export const ResponsiveDocumentWrapper = ({
  children,
}: ResponsiveDocumentWrapperProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        // Calculate scale based on container width, max 1 (no upscaling)
        const newScale = Math.min(1, (containerWidth - 16) / A4_WIDTH_PX);
        setScale(newScale);
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      {/* Outer container dengan ukuran yang sudah di-scale */}
      <div
        style={{
          width: A4_WIDTH_PX * scale,
          height: A4_HEIGHT_PX * scale,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Inner container dengan ukuran A4 tetap untuk positioning konsisten */}
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: A4_WIDTH_PX,
            height: A4_HEIGHT_PX, // FIXED - tidak dikalikan scale
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
