import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Loader2, RotateCcw, RotateCw, ZoomIn } from 'lucide-react';

interface SignatureCropperProps {
  file: File;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
}

// Landscape canvas for signatures - 600x300 (2:1 ratio)
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 300;

export function SignatureCropper({ file, onCrop, onCancel }: SignatureCropperProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      // Auto-fit image to canvas
      const scaleX = CANVAS_WIDTH / img.width;
      const scaleY = CANVAS_HEIGHT / img.height;
      const fitScale = Math.max(scaleX, scaleY);
      setScale(Math.max(0.1, Math.min(fitScale, 3)));
      setPosition({ x: 0, y: 0 });
    };
    img.src = URL.createObjectURL(file);
    return () => URL.revokeObjectURL(img.src);
  }, [file]);

  // Draw canvas
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Draw checkerboard for transparency
    const squareSize = 10;
    for (let y = 0; y < CANVAS_HEIGHT; y += squareSize) {
      for (let x = 0; x < CANVAS_WIDTH; x += squareSize) {
        const isEven = ((x / squareSize) + (y / squareSize)) % 2 === 0;
        ctx.fillStyle = isEven ? '#ffffff' : '#e5e7eb';
        ctx.fillRect(x, y, squareSize, squareSize);
      }
    }

    // Draw image centered with transformations
    ctx.save();
    ctx.translate(CANVAS_WIDTH / 2 + position.x, CANVAS_HEIGHT / 2 + position.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.restore();
  }, [image, scale, position, rotation]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  }, [position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleReset = () => {
    if (!image) return;
    const scaleX = CANVAS_WIDTH / image.width;
    const scaleY = CANVAS_HEIGHT / image.height;
    const fitScale = Math.max(scaleX, scaleY);
    setScale(Math.max(0.1, Math.min(fitScale, 3)));
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleCrop = async () => {
    if (!canvasRef.current || !image) return;
    setProcessing(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Redraw without checkerboard (transparent background)
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.save();
    ctx.translate(CANVAS_WIDTH / 2 + position.x, CANVAS_HEIGHT / 2 + position.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.restore();

    canvas.toBlob((blob) => {
      if (blob) {
        onCrop(blob);
      }
      setProcessing(false);
    }, 'image/png');
  };

  return (
    <Dialog open onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop Gambar Tanda Tangan (Landscape)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Canvas */}
          <div 
            className="relative mx-auto border rounded-lg overflow-hidden cursor-move select-none"
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, maxWidth: '100%' }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="block"
              style={{ width: '100%', height: 'auto' }}
            />
          </div>

          {/* Controls */}
          <div className="space-y-3">
            {/* Rotation */}
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRotation(r => r - 90)}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground w-16 text-center">{rotation}°</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRotation(r => r + 90)}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Zoom */}
            <div className="flex items-center gap-3">
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[scale * 100]}
                onValueChange={([value]) => setScale(value / 100)}
                min={10}
                max={300}
                step={5}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-12">{Math.round(scale * 100)}%</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Batal
          </Button>
          <Button type="button" onClick={handleCrop} disabled={processing}>
            {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Crop & Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
