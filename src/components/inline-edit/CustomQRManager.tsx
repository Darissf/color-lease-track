import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, QrCode } from "lucide-react";

export interface CustomQR {
  id: string;
  label: string;
  url: string;
  position_x: number;
  position_y: number;
  size: number;
}

interface CustomQRManagerProps {
  qrCodes: CustomQR[];
  onChange: (qrCodes: CustomQR[]) => void;
}

const CustomQRManager: React.FC<CustomQRManagerProps> = ({ qrCodes, onChange }) => {
  const addQRCode = () => {
    const newQR: CustomQR = {
      id: crypto.randomUUID(),
      label: `QR ${qrCodes.length + 1}`,
      url: "",
      position_x: 50,
      position_y: 80,
      size: 80,
    };
    onChange([...qrCodes, newQR]);
  };

  const updateQRCode = (id: string, updates: Partial<CustomQR>) => {
    onChange(
      qrCodes.map((qr) => (qr.id === id ? { ...qr, ...updates } : qr))
    );
  };

  const removeQRCode = (id: string) => {
    onChange(qrCodes.filter((qr) => qr.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Custom QR Codes</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addQRCode}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Tambah QR
        </Button>
      </div>

      {qrCodes.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Belum ada custom QR code
        </p>
      )}

      {qrCodes.map((qr, index) => (
        <Card key={qr.id} className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">QR {index + 1}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => removeQRCode(qr.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Label</Label>
            <Input
              value={qr.label}
              onChange={(e) => updateQRCode(qr.id, { label: e.target.value })}
              placeholder="Label QR"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">URL / Link</Label>
            <Input
              value={qr.url}
              onChange={(e) => updateQRCode(qr.id, { url: e.target.value })}
              placeholder="https://..."
              className="h-8 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Posisi X (%)</Label>
              <Slider
                value={[qr.position_x]}
                onValueChange={([val]) => updateQRCode(qr.id, { position_x: val })}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground">{qr.position_x}%</span>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Posisi Y (%)</Label>
              <Slider
                value={[qr.position_y]}
                onValueChange={([val]) => updateQRCode(qr.id, { position_y: val })}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground">{qr.position_y}%</span>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Ukuran (px)</Label>
              <Slider
                value={[qr.size]}
                onValueChange={([val]) => updateQRCode(qr.id, { size: val })}
                min={40}
                max={150}
                step={5}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground">{qr.size}px</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default CustomQRManager;
