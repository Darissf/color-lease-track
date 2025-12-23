import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Ruler, ArrowUpDown } from "lucide-react";

interface ScaffoldingInputPanelProps {
  height: number;
  length: number;
  showCatwalk: boolean;
  showRailing: boolean;
  onHeightChange: (value: number) => void;
  onLengthChange: (value: number) => void;
  onCatwalkChange: (value: boolean) => void;
  onRailingChange: (value: boolean) => void;
}

export default function ScaffoldingInputPanel({
  height,
  length,
  showCatwalk,
  showRailing,
  onHeightChange,
  onLengthChange,
  onCatwalkChange,
  onRailingChange,
}: ScaffoldingInputPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Ruler className="h-5 w-5" />
          Dimensi Bangunan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Height Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="height" className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              Tinggi Bangunan
            </Label>
            <div className="flex items-center gap-1">
              <Input
                id="height"
                type="number"
                value={height}
                onChange={(e) => onHeightChange(Math.min(20, Math.max(1, Number(e.target.value))))}
                className="w-16 h-8 text-right"
                min={1}
                max={20}
              />
              <span className="text-sm text-muted-foreground">meter</span>
            </div>
          </div>
          <Slider
            value={[height]}
            onValueChange={([value]) => onHeightChange(value)}
            min={1}
            max={20}
            step={0.5}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1m</span>
            <span>10m</span>
            <span>20m</span>
          </div>
        </div>

        {/* Length Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="length" className="flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              Panjang Bangunan
            </Label>
            <div className="flex items-center gap-1">
              <Input
                id="length"
                type="number"
                value={length}
                onChange={(e) => onLengthChange(Math.min(50, Math.max(1, Number(e.target.value))))}
                className="w-16 h-8 text-right"
                min={1}
                max={50}
              />
              <span className="text-sm text-muted-foreground">meter</span>
            </div>
          </div>
          <Slider
            value={[length]}
            onValueChange={([value]) => onLengthChange(value)}
            min={1}
            max={50}
            step={0.5}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1m</span>
            <span>25m</span>
            <span>50m</span>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-4 pt-2 border-t">
          <p className="text-sm font-medium">Opsi Tambahan</p>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="catwalk" className="flex flex-col gap-0.5 cursor-pointer">
              <span>Catwalk</span>
              <span className="text-xs text-muted-foreground font-normal">
                Platform jalan di setiap level
              </span>
            </Label>
            <Switch
              id="catwalk"
              checked={showCatwalk}
              onCheckedChange={onCatwalkChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="railing" className="flex flex-col gap-0.5 cursor-pointer">
              <span>Railing</span>
              <span className="text-xs text-muted-foreground font-normal">
                Pagar pengaman di setiap level
              </span>
            </Label>
            <Switch
              id="railing"
              checked={showRailing}
              onCheckedChange={onRailingChange}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
