import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

interface TableStats {
  tableName: string;
  size: number;
  rowCount: number;
  lastModified: string;
}

interface DatabaseSizeChartProps {
  tables: TableStats[];
  totalSize: number;
}

export function DatabaseSizeChart({ tables, totalSize }: DatabaseSizeChartProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>💾 Database Size Breakdown</CardTitle>
        <CardDescription>
          Total database size: {formatBytes(totalSize)} • Top tables by size
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Table Name</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead className="text-right">Rows (est.)</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Last Modified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No table data available
                </TableCell>
              </TableRow>
            ) : (
              tables.map((table) => {
                const percentage = totalSize > 0 ? (table.size / totalSize) * 100 : 0;
                return (
                  <TableRow key={table.tableName}>
                    <TableCell className="font-medium">{table.tableName}</TableCell>
                    <TableCell className="text-right">{formatBytes(table.size)}</TableCell>
                    <TableCell className="text-right">{formatNumber(table.rowCount)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={percentage} className="h-2 w-20" />
                        <span className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{table.lastModified}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
