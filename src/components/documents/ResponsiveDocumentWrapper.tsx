import { useRef, useState, useEffect, ReactNode } from "react";

interface ResponsiveDocumentWrapperProps {
  children: ReactNode;
  documentRef?: React.RefObject<HTMLDivElement>;
}

const A4_WIDTH_PX = 793; // 210mm in pixels at 96dpi
const A4_HEIGHT_PX = 1122; // 297mm in pixels at 96dpi

export const ResponsiveDocumentWrapper = ({
  children,
  documentRef,
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
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: A4_WIDTH_PX,
          height: A4_HEIGHT_PX * scale,
          marginBottom: scale < 1 ? -(A4_HEIGHT_PX * (1 - scale)) : 0,
        }}
      >
        <div ref={documentRef}>{children}</div>
      </div>
    </div>
  );
};
