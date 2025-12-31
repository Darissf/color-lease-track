import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, Move } from "lucide-react";
import { ReactNode, useState, useEffect } from "react";

interface ZoomableDocumentWrapperProps {
  children: ReactNode;
  showControls?: boolean;
}

const ZoomControls = () => {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="fixed bottom-20 right-4 flex flex-col gap-2 z-50">
      <Button size="icon" variant="secondary" onClick={() => zoomIn()} className="h-10 w-10 shadow-lg">
        <ZoomIn className="h-5 w-5" />
      </Button>
      <Button size="icon" variant="secondary" onClick={() => zoomOut()} className="h-10 w-10 shadow-lg">
        <ZoomOut className="h-5 w-5" />
      </Button>
      <Button size="icon" variant="secondary" onClick={() => resetTransform()} className="h-10 w-10 shadow-lg">
        <RotateCcw className="h-5 w-5" />
      </Button>
    </div>
  );
};

export const ZoomableDocumentWrapper = ({
  children,
  showControls = true,
}: ZoomableDocumentWrapperProps) => {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      setContainerSize({
        width: window.innerWidth,
        height: window.innerHeight * 0.65,
      });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Calculate initial scale to fit A4 width (793px) in screen width with padding
  const calculateInitialScale = () => {
    const availableWidth = containerSize.width - 32;
    const documentWidth = 793;
    const scale = Math.min(availableWidth / documentWidth, 0.6);
    return Math.max(scale, 0.25);
  };

  return (
    <div 
      className="relative w-full bg-muted/30 rounded-lg touch-none"
      style={{ height: '65vh' }}
    >
      {/* Hint for users */}
      <div className="absolute top-2 left-2 z-40 flex items-center gap-1 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-md">
        <Move className="h-3 w-3" />
        <span>Pinch/drag untuk zoom & scroll</span>
      </div>
      
      <TransformWrapper
        initialScale={calculateInitialScale()}
        minScale={0.15}
        maxScale={3}
        centerOnInit={false}
        limitToBounds={false}
        centerZoomedOut={false}
        alignmentAnimation={{ disabled: true }}
        velocityAnimation={{ disabled: true }}
        wheel={{ step: 0.1 }}
        doubleClick={{ mode: "toggle", step: 0.5 }}
        panning={{ 
          velocityDisabled: true,
          lockAxisX: false,
          lockAxisY: false,
        }}
        pinch={{ step: 5 }}
        initialPositionX={16}
        initialPositionY={40}
      >
        {showControls && <ZoomControls />}
        <TransformComponent
          wrapperStyle={{
            width: '100%',
            height: '100%',
            overflow: 'visible',
          }}
          contentStyle={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            padding: '8px',
          }}
        >
          {children}
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
};
