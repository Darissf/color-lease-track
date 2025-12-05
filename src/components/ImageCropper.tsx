import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, RotateCw, RotateCcw, EyeOff, Plus, Grid3X3, Circle, Layers } from "lucide-react";

type GuideMode = 'none' | 'center' | 'thirds' | 'circle' | 'all';

interface ImageCropperProps {
  file: File;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
}

export function ImageCropper({ file, onCrop, onCancel }: ImageCropperProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [guideMode, setGuideMode] = useState<GuideMode>('all');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw guide lines overlay
  const drawGuides = (ctx: CanvasRenderingContext2D, size: number) => {
    if (guideMode === 'none') return;
    
    ctx.save();
    const center = size / 2;
    const third = size / 3;
    
    // Center Lines
    if (guideMode === 'center' || guideMode === 'all') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      // Vertical center
      ctx.moveTo(center, 0);
      ctx.lineTo(center, size);
      // Horizontal center
      ctx.moveTo(0, center);
      ctx.lineTo(size, center);
      ctx.stroke();
    }
    
    // Rule of Thirds
    if (guideMode === 'thirds' || guideMode === 'all') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      // Vertical lines
      ctx.moveTo(third, 0);
      ctx.lineTo(third, size);
      ctx.moveTo(third * 2, 0);
      ctx.lineTo(third * 2, size);
      // Horizontal lines
      ctx.moveTo(0, third);
      ctx.lineTo(size, third);
      ctx.moveTo(0, third * 2);
      ctx.lineTo(size, third * 2);
      ctx.stroke();
      
      // Intersection dots (focal points)
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      [third, third * 2].forEach(x => {
        [third, third * 2].forEach(y => {
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        });
      });
    }
    
    // Circular Guide (for avatar)
    if (guideMode === 'circle' || guideMode === 'all') {
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(center, center, size * 0.42, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.restore();
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

  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 400;
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, size, size);

    const aspectRatio = image.width / image.height;
    let drawWidth = size * scale;
    let drawHeight = size * scale;

    // Handle rotation 90° or 270° - swap dimensions
    if (rotation === 90 || rotation === 270) {
      const rotatedAspectRatio = 1 / aspectRatio;
      if (rotatedAspectRatio > 1) {
        drawHeight = drawWidth / rotatedAspectRatio;
      } else {
        drawWidth = drawHeight * rotatedAspectRatio;
      }
    } else {
      // Normal 0° or 180°
      if (aspectRatio > 1) {
        drawHeight = drawWidth / aspectRatio;
      } else {
        drawWidth = drawHeight * aspectRatio;
      }
    }

    const centerX = (size - drawWidth) / 2;
    const centerY = (size - drawHeight) / 2;

    // Save context and apply rotation around center
    ctx.save();
    
    // Move origin to center for rotation
    ctx.translate(size / 2, size / 2);
    
    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);
    
    // Calculate position with rotation applied
    const x = centerX + position.x - size / 2;
    const y = centerY + position.y - size / 2;

    ctx.drawImage(image, x, y, drawWidth, drawHeight);

    // Restore context
    ctx.restore();

    // Draw guide lines overlay
    drawGuides(ctx, size);
  }, [image, scale, position, rotation, guideMode]);

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

  const handleMouseUp = () => {
    setIsDragging(false);
  };

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

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setPosition({ x: 0, y: 0 });
    setScale(1);
    setRotation(0);
  };

  const handleCrop = async () => {
    if (!canvasRef.current || !image) return;

    setProcessing(true);
    
    // Redraw without guides for final export
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setProcessing(false);
      return;
    }

    const size = 400;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, size, size);

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
    // Note: No guides drawn for export
    
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCrop(blob);
        }
        setProcessing(false);
        // Redraw with guides after export
        drawGuides(ctx, size);
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl" aria-describedby="crop-avatar-description">
        <DialogHeader>
          <DialogTitle>Crop Avatar</DialogTitle>
        </DialogHeader>
        <p id="crop-avatar-description" className="sr-only">
          Crop and adjust your avatar image by dragging, zooming, and rotating
        </p>

        <div className="space-y-4">
          <div className="flex flex-col items-center gap-2">
            <canvas
              ref={canvasRef}
              className="border-2 border-border rounded-lg select-none"
              style={{ 
                maxWidth: "100%", 
                height: "auto",
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
            <p className="text-sm text-muted-foreground">
              🖱️ Drag gambar untuk menggeser posisi
            </p>
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
              onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
              disabled={processing}
              title="Rotate counter-clockwise"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
              {rotation}°
            </span>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              disabled={processing}
              title="Rotate clockwise"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom Controls */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Zoom</label>
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

        <DialogFooter>
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
