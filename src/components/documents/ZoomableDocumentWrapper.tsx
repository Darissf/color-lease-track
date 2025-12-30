import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { ReactNode } from "react";

interface ZoomableDocumentWrapperProps {
  children: ReactNode;
  showControls?: boolean;
}

const ZoomControls = () => {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute bottom-4 right-4 flex gap-2 z-20">
      <Button size="icon" variant="secondary" onClick={() => zoomIn()} className="h-8 w-8 shadow-md">
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="secondary" onClick={() => zoomOut()} className="h-8 w-8 shadow-md">
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="secondary" onClick={() => resetTransform()} className="h-8 w-8 shadow-md">
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
};

export const ZoomableDocumentWrapper = ({
  children,
  showControls = true,
}: ZoomableDocumentWrapperProps) => {
  return (
    <div className="relative w-full h-full min-h-[60vh] overflow-hidden bg-muted/30 rounded-lg">
      <TransformWrapper
        initialScale={0.4}
        minScale={0.2}
        maxScale={3}
        centerOnInit={true}
        wheel={{ step: 0.1 }}
        doubleClick={{ mode: "toggle" }}
        panning={{ velocityDisabled: false }}
      >
        {showControls && <ZoomControls />}
        <TransformComponent
          wrapperClass="!w-full !h-full"
          contentClass="flex items-center justify-center p-4"
        >
          {children}
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
};
