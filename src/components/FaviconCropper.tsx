import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, RotateCw, RotateCcw, EyeOff, Plus, Grid3X3, Circle, Layers, Sun, Moon } from "lucide-react";

type GuideMode = 'none' | 'center' | 'thirds' | 'circle' | 'all';

interface FaviconCropperProps {
  file: File;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
}

export function FaviconCropper({ file, onCrop, onCancel }: FaviconCropperProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [guideMode, setGuideMode] = useState<GuideMode>('center');
  const [previewBg, setPreviewBg] = useState<'light' | 'dark'>('dark');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const CANVAS_SIZE = 256; // Smaller canvas for favicon

  // Draw checkered background pattern for transparency preview
  const drawCheckerboard = (ctx: CanvasRenderingContext2D, size: number) => {
    const tileSize = 12;
    for (let y = 0; y < size; y += tileSize) {
      for (let x = 0; x < size; x += tileSize) {
        ctx.fillStyle = ((x + y) / tileSize) % 2 === 0 ? '#e8e8e8' : '#ffffff';
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }
  };

  // Draw guide lines overlay
  const drawGuides = (ctx: CanvasRenderingContext2D, size: number) => {
    if (guideMode === 'none') return;
    
    ctx.save();
    const center = size / 2;
    const third = size / 3;
    
    // Center Lines
    if (guideMode === 'center' || guideMode === 'all') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(center, 0);
      ctx.lineTo(center, size);
      ctx.moveTo(0, center);
      ctx.lineTo(size, center);
      ctx.stroke();
    }
    
    // Rule of Thirds
    if (guideMode === 'thirds' || guideMode === 'all') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(third, 0);
      ctx.lineTo(third, size);
      ctx.moveTo(third * 2, 0);
      ctx.lineTo(third * 2, size);
      ctx.moveTo(0, third);
      ctx.lineTo(size, third);
      ctx.moveTo(0, third * 2);
      ctx.lineTo(size, third * 2);
      ctx.stroke();
    }
    
    // Circular Guide
    if (guideMode === 'circle' || guideMode === 'all') {
      ctx.setLineDash([5, 3]);
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(center, center, size * 0.42, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.restore();
  };

  // Draw image on canvas
  const drawImage = (ctx: CanvasRenderingContext2D, size: number, withGuides: boolean = true) => {
    if (!image) return;

    if (withGuides) {
      drawCheckerboard(ctx, size);
    } else {
      ctx.clearRect(0, 0, size, size);
    }

    const aspectRatio = image.width / image.height;
    let drawWidth = size * scale;
    let drawHeight = size * scale;

    if (rotation === 90 || rotation === 270) {
      const rotatedAspectRatio = 1 / aspectRatio;
      if (rotatedAspectRatio > 1) {
        drawHeight = drawWidth / rotatedAspectRatio;
      } else {
        drawWidth = drawHeight * rotatedAspectRatio;
      }
    } else {
      if (aspectRatio > 1) {
        drawHeight = drawWidth / aspectRatio;
      } else {
        drawWidth = drawHeight * aspectRatio;
      }
    }

    const centerX = (size - drawWidth) / 2;
    const centerY = (size - drawHeight) / 2;

    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    const x = centerX + position.x - size / 2;
    const y = centerY + position.y - size / 2;
    ctx.drawImage(image, x, y, drawWidth, drawHeight);
    ctx.restore();

    if (withGuides) {
      drawGuides(ctx, size);
    }
  };

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => setImage(img);
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [file]);

  // Main canvas rendering
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    drawImage(ctx, CANVAS_SIZE, true);
  }, [image, scale, position, rotation, guideMode]);

  // Live preview rendering
  useEffect(() => {
    if (!image || !previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw at 64px for preview
    canvas.width = 64;
    canvas.height = 64;
    
    // Scale down from 256 to 64
    const scaleRatio = 64 / CANVAS_SIZE;
    ctx.scale(scaleRatio, scaleRatio);
    
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    const aspectRatio = image.width / image.height;
    let drawWidth = CANVAS_SIZE * scale;
    let drawHeight = CANVAS_SIZE * scale;

    if (rotation === 90 || rotation === 270) {
      const rotatedAspectRatio = 1 / aspectRatio;
      if (rotatedAspectRatio > 1) {
        drawHeight = drawWidth / rotatedAspectRatio;
      } else {
        drawWidth = drawHeight * rotatedAspectRatio;
      }
    } else {
      if (aspectRatio > 1) {
        drawHeight = drawWidth / aspectRatio;
      } else {
        drawWidth = drawHeight * aspectRatio;
      }
    }

    const centerX = (CANVAS_SIZE - drawWidth) / 2;
    const centerY = (CANVAS_SIZE - drawHeight) / 2;

    ctx.save();
    ctx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    const x = centerX + position.x - CANVAS_SIZE / 2;
    const y = centerY + position.y - CANVAS_SIZE / 2;
    ctx.drawImage(image, x, y, drawWidth, drawHeight);
    ctx.restore();
  }, [image, scale, position, rotation]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    requestAnimationFrame(() => {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    requestAnimationFrame(() => {
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleReset = () => {
    setPosition({ x: 0, y: 0 });
    setScale(1);
    setRotation(0);
  };

  const handleCrop = async () => {
    if (!canvasRef.current || !image) return;

    setProcessing(true);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setProcessing(false);
      return;
    }

    // Redraw without guides for export
    drawImage(ctx, CANVAS_SIZE, false);
    
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCrop(blob);
        }
        setProcessing(false);
        // Redraw with guides
        drawImage(ctx, CANVAS_SIZE, true);
      },
      "image/png"
    );
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-lg" aria-describedby="crop-favicon-description">
        <DialogHeader>
          <DialogTitle>🖼️ Crop Favicon</DialogTitle>
        </DialogHeader>
        <p id="crop-favicon-description" className="sr-only">
          Crop dan sesuaikan favicon dengan drag, zoom, dan rotate
        </p>

        <div className="space-y-4">
          {/* Main Canvas */}
          <div className="flex flex-col items-center gap-2">
            <canvas
              ref={canvasRef}
              className="border-2 border-border rounded-lg select-none"
              style={{ 
                width: CANVAS_SIZE,
                height: CANVAS_SIZE,
                cursor: isDragging ? 'grabbing' : 'grab'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
            <p className="text-xs text-muted-foreground">
              🖱️ Drag untuk menggeser posisi
            </p>
          </div>

          {/* Live Preview Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Live Preview</span>
              <div className="flex gap-1">
                <Button
                  variant={previewBg === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewBg('light')}
                  className="h-7 w-7 p-0"
                >
                  <Sun className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={previewBg === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewBg('dark')}
                  className="h-7 w-7 p-0"
                >
                  <Moon className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className={`flex items-end gap-3 p-3 rounded-lg ${previewBg === 'dark' ? 'bg-slate-800' : 'bg-white border'}`}>
              {/* 16px */}
              <div className="text-center">
                <div className="w-4 h-4 mx-auto overflow-hidden rounded-sm">
                  <canvas 
                    ref={previewCanvasRef}
                    className="w-full h-full"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <span className={`text-[10px] ${previewBg === 'dark' ? 'text-slate-400' : 'text-muted-foreground'}`}>16</span>
              </div>
              {/* 32px */}
              <div className="text-center">
                <div className="w-8 h-8 mx-auto overflow-hidden rounded-sm">
                  <canvas 
                    ref={previewCanvasRef}
                    className="w-full h-full"
                  />
                </div>
                <span className={`text-[10px] ${previewBg === 'dark' ? 'text-slate-400' : 'text-muted-foreground'}`}>32</span>
              </div>
              {/* 64px */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto overflow-hidden rounded">
                  <canvas 
                    ref={previewCanvasRef}
                    className="w-full h-full"
                  />
                </div>
                <span className={`text-[10px] ${previewBg === 'dark' ? 'text-slate-400' : 'text-muted-foreground'}`}>64</span>
              </div>
            </div>
          </div>

          {/* Guide Mode Selector */}
          <div className="flex items-center gap-2 justify-center flex-wrap">
            <label className="text-sm font-medium">Guide</label>
            <div className="flex gap-1">
              <Button
                variant={guideMode === 'none' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGuideMode('none')}
                title="No guides"
                className="h-8 w-8 p-0"
              >
                <EyeOff className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={guideMode === 'center' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGuideMode('center')}
                title="Center lines"
                className="h-8 w-8 p-0"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={guideMode === 'thirds' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGuideMode('thirds')}
                title="Rule of thirds"
                className="h-8 w-8 p-0"
              >
                <Grid3X3 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={guideMode === 'circle' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGuideMode('circle')}
                title="Circle guide"
                className="h-8 w-8 p-0"
              >
                <Circle className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={guideMode === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGuideMode('all')}
                title="All guides"
                className="h-8 w-8 p-0"
              >
                <Layers className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Rotation Controls */}
          <div className="flex items-center gap-2 justify-center">
            <label className="text-sm font-medium">Rotate</label>
            <Button 
              variant="outline" 
              size="icon"
              className="h-8 w-8"
              onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
              disabled={processing}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
              {rotation}°
            </span>
            <Button 
              variant="outline" 
              size="icon"
              className="h-8 w-8"
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              disabled={processing}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Zoom</label>
              <span className="text-sm text-muted-foreground">{scale.toFixed(1)}x</span>
            </div>
            <Slider
              value={[scale]}
              onValueChange={(value) => setScale(value[0])}
              min={0.5}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={processing}>
            Reset
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onCancel} disabled={processing}>
            Batal
          </Button>
          <Button onClick={handleCrop} disabled={processing}>
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Crop & Upload"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
