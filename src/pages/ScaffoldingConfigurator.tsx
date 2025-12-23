import { useState, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, Box, Loader2 } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";
import ScaffoldingInputPanel from "@/components/scaffolding/ScaffoldingInputPanel";
import ScaffoldingCalculator from "@/components/scaffolding/ScaffoldingCalculator";

// Lazy load the heavy 3D scene
const ScaffoldingScene = lazy(() => import("@/components/scaffolding/ScaffoldingScene"));

export default function ScaffoldingConfigurator() {
  const { activeTheme } = useAppTheme();
  const navigate = useNavigate();
  
  const [height, setHeight] = useState(5);
  const [length, setLength] = useState(3);
  const [showCatwalk, setShowCatwalk] = useState(true);
  const [showRailing, setShowRailing] = useState(true);
  const [key, setKey] = useState(0);

  const handleReset = () => {
    setHeight(5);
    setLength(3);
    setShowCatwalk(true);
    setShowRailing(true);
    setKey((prev) => prev + 1);
  };

  return (
    <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto px-2 py-2 md:px-8 md:py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className={cn(
                "text-2xl md:text-3xl font-bold",
                activeTheme === 'japanese' && "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
              )}>
                3D Scaffolding Configurator
              </h1>
              <p className="text-muted-foreground text-sm">
                Hitung kebutuhan scaffolding untuk proyek Anda
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset} className="shrink-0">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-3 space-y-4">
            <ScaffoldingInputPanel
              height={height}
              length={length}
              showCatwalk={showCatwalk}
              showRailing={showRailing}
              onHeightChange={setHeight}
              onLengthChange={setLength}
              onCatwalkChange={setShowCatwalk}
              onRailingChange={setShowRailing}
            />
            <ScaffoldingCalculator
              height={height}
              length={length}
              showCatwalk={showCatwalk}
              showRailing={showRailing}
            />
          </div>

          {/* Right Panel - 3D View */}
          <div className="lg:col-span-9">
            <Card className="h-[400px] lg:h-[calc(100vh-200px)] overflow-hidden">
              <CardContent className="p-0 h-full relative">
                <Suspense
                  fallback={
                    <div className="h-full flex flex-col items-center justify-center gap-4 bg-muted/20">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <p className="text-muted-foreground">Memuat 3D Viewer...</p>
                    </div>
                  }
                >
                  <ScaffoldingScene
                    key={key}
                    height={height}
                    length={length}
                    showCatwalk={showCatwalk}
                    showRailing={showRailing}
                  />
                </Suspense>
                
                {/* 3D Controls Help */}
                <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm rounded-lg p-3 text-xs space-y-1 border">
                  <p className="font-medium flex items-center gap-1.5">
                    <Box className="h-3.5 w-3.5" />
                    Kontrol 3D
                  </p>
                  <p className="text-muted-foreground">🖱️ Klik & drag: Putar</p>
                  <p className="text-muted-foreground">🔍 Scroll: Zoom</p>
                  <p className="text-muted-foreground">⌨️ Shift + drag: Geser</p>
                </div>

                {/* Dimension Display */}
                <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm rounded-lg p-3 text-sm border">
                  <p className="font-medium">Dimensi Aktual</p>
                  <p className="text-muted-foreground">
                    Tinggi: <span className="font-medium text-foreground">{height}m</span> ({Math.ceil(height / 1.7)} level)
                  </p>
                  <p className="text-muted-foreground">
                    Panjang: <span className="font-medium text-foreground">{length}m</span> ({Math.ceil(length / 0.95)} bay)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
