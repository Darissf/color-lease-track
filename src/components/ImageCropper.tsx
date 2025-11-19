import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, RotateCw, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [showPreview, setShowPreview] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

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

    const x = centerX + position.x;
    const y = centerY + position.y;

    // Save context and apply rotation
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-size / 2, -size / 2);

    ctx.drawImage(image, x, y, drawWidth, drawHeight);

    // Restore context
    ctx.restore();
  }, [image, scale, position, rotation]);

  // Preview canvas effect
  useEffect(() => {
    if (!image || !previewCanvasRef.current || !showPreview) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 400;
    canvas.width = size;
    canvas.height = size;

    // Draw original image (centered, fit to canvas)
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(0, 0, size, size);

    const aspectRatio = image.width / image.height;
    let drawWidth = size * 0.8;
    let drawHeight = size * 0.8;

    if (aspectRatio > 1) {
      drawHeight = drawWidth / aspectRatio;
    } else {
      drawWidth = drawHeight * aspectRatio;
    }

    const x = (size - drawWidth) / 2;
    const y = (size - drawHeight) / 2;

    ctx.drawImage(image, x, y, drawWidth, drawHeight);
  }, [image, showPreview]);

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
    if (!canvasRef.current) return;

    setProcessing(true);
    
    canvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          onCrop(blob);
        }
        setProcessing(false);
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className={cn(showPreview ? "max-w-4xl" : "max-w-2xl")}>
        <DialogHeader>
          <DialogTitle>Crop Avatar</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={!showPreview ? "default" : "outline"}
              onClick={() => setShowPreview(false)}
              className="flex-1"
              disabled={processing}
            >
              ✏️ Edit
            </Button>
            <Button
              variant={showPreview ? "default" : "outline"}
              onClick={() => setShowPreview(true)}
              className="flex-1"
              disabled={processing}
            >
              👁️ Preview
            </Button>
          </div>

          {showPreview ? (
            /* Preview Mode - Side by Side */
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-medium">Original</p>
                <canvas
                  ref={previewCanvasRef}
                  className="border-2 border-border rounded-lg"
                  style={{ maxWidth: "100%", height: "auto" }}
                />
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-medium">Hasil Crop</p>
                <canvas
                  ref={canvasRef}
                  className="border-2 border-primary rounded-lg"
                  style={{ maxWidth: "100%", height: "auto" }}
                />
              </div>
            </div>
          ) : (
            /* Edit Mode */
            <>
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
            </>
          )}
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
