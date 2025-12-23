import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package } from "lucide-react";

interface ScaffoldingCalculatorProps {
  height: number;
  length: number;
  showCatwalk: boolean;
  showRailing: boolean;
}

interface ComponentCount {
  name: string;
  count: number;
  dimensions: string;
  color: string;
}

export default function ScaffoldingCalculator({ 
  height, 
  length, 
  showCatwalk, 
  showRailing 
}: ScaffoldingCalculatorProps) {
  const calculations = useMemo(() => {
    // Calculate levels (each 1.7m height needs 1 level)
    const levels = Math.max(1, Math.ceil(height / 1.7));
    
    // Calculate bays/sets (each 0.95m length needs 1 set)
    const bays = Math.max(1, Math.ceil(length / 0.95));

    // Component calculations
    // Main Frame: 2 per bay per level (front + back) × 2 sides = 4 per bay per level
    const mainFrame = levels * bays * 4;
    
    // Cross Brace: 2 per bay per level (front + back)
    const crossBrace = levels * bays * 2;
    
    // Jack Base: 4 per bay (bottom only)
    const jackBase = bays * 4;
    
    // U-Head: 4 per bay (top only)
    const uHead = bays * 4;
    
    // Catwalk: 1 per bay per level (if enabled) + 1 on top
    const catwalk = showCatwalk ? (levels * bays) + bays : 0;
    
    // Railing: 1 per bay per level (if enabled) + 1 on top
    const railing = showRailing ? (levels * bays) + bays : 0;

    return {
      levels,
      bays,
      components: [
        { name: "Main Frame", count: mainFrame, dimensions: "170 × 95 cm", color: "bg-blue-500" },
        { name: "Cross Brace", count: crossBrace, dimensions: "Standard", color: "bg-yellow-500" },
        { name: "Jack Base", count: jackBase, dimensions: "Standard", color: "bg-gray-500" },
        { name: "U-Head", count: uHead, dimensions: "Standard", color: "bg-red-500" },
        { name: "Catwalk", count: catwalk, dimensions: "95 × 40 cm", color: "bg-green-500" },
        { name: "Railing", count: railing, dimensions: "95 cm", color: "bg-orange-500" },
      ] as ComponentCount[],
    };
  }, [height, length, showCatwalk, showRailing]);

  const totalComponents = calculations.components.reduce((sum, c) => sum + c.count, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-5 w-5" />
          Kebutuhan Komponen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-sm">
            {calculations.levels} Level
          </Badge>
          <Badge variant="outline" className="text-sm">
            {calculations.bays} Bay
          </Badge>
          <Badge variant="secondary" className="text-sm">
            {totalComponents} Total Komponen
          </Badge>
        </div>

        {/* Components table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Komponen</TableHead>
              <TableHead className="text-center">Jumlah</TableHead>
              <TableHead className="hidden sm:table-cell">Dimensi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calculations.components.map((component) => (
              <TableRow key={component.name}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${component.color}`} />
                    {component.name}
                  </div>
                </TableCell>
                <TableCell className="text-center font-bold">
                  {component.count > 0 ? `${component.count} pcs` : "-"}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                  {component.dimensions}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Color Legend */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Legenda Warna 3D:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {calculations.components.map((component) => (
              <div key={component.name} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${component.color}`} />
                <span className="text-muted-foreground">{component.name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
