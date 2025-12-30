import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ResponsiveDocumentWrapper } from "./ResponsiveDocumentWrapper";
import { ZoomableDocumentWrapper } from "./ZoomableDocumentWrapper";

interface DocumentWrapperProps {
  children: ReactNode;
  /**
   * Force a specific wrapper type instead of auto-detecting based on device
   */
  forceType?: 'responsive' | 'zoomable';
}

/**
 * Wrapper component that automatically selects the appropriate document wrapper:
 * - Mobile: ZoomableDocumentWrapper (pinch-to-zoom, pan)
 * - Desktop: ResponsiveDocumentWrapper (auto-scaling)
 */
export const DocumentWrapper = ({
  children,
  forceType,
}: DocumentWrapperProps) => {
  const isMobile = useIsMobile();
  
  const shouldUseZoomable = forceType 
    ? forceType === 'zoomable'
    : isMobile;

  if (shouldUseZoomable) {
    return <ZoomableDocumentWrapper>{children}</ZoomableDocumentWrapper>;
  }

  return <ResponsiveDocumentWrapper>{children}</ResponsiveDocumentWrapper>;
};
