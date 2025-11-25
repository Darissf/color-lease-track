import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface EdgeFunctionStats {
  functionName: string;
  calls24h: number;
  avgTime: number;
  errors: number;
  lastCalled: string;
}

interface EdgeFunctionTableProps {
  functions: EdgeFunctionStats[];
}

export function EdgeFunctionTable({ functions }: EdgeFunctionTableProps) {
  const getStatusIcon = (errors: number, calls: number) => {
    const errorRate = calls > 0 ? (errors / calls) * 100 : 0;
    if (errorRate === 0) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (errorRate < 5) return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    return <XCircle className="h-4 w-4 text-destructive" />;
  };

  const getStatusBadge = (errors: number, calls: number) => {
    const errorRate = calls > 0 ? (errors / calls) * 100 : 0;
    if (errorRate === 0) return <Badge className="bg-green-500">Healthy</Badge>;
    if (errorRate < 5) return <Badge variant="outline" className="border-orange-500 text-orange-500">Warning</Badge>;
    return <Badge variant="destructive">Critical</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>⚡ Edge Functions Performance</CardTitle>
        <CardDescription>Function calls, response times, and error rates (Last 24h)</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Function Name</TableHead>
              <TableHead className="text-right">Calls</TableHead>
              <TableHead className="text-right">Avg Time</TableHead>
              <TableHead className="text-right">Errors</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Called</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {functions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No function calls in the last 24 hours
                </TableCell>
              </TableRow>
            ) : (
              functions.map((func) => (
                <TableRow key={func.functionName}>
                  <TableCell className="font-medium">{func.functionName}</TableCell>
                  <TableCell className="text-right">{func.calls24h}</TableCell>
                  <TableCell className="text-right">{func.avgTime}ms</TableCell>
                  <TableCell className="text-right">
                    <span className={func.errors > 0 ? "text-destructive font-semibold" : ""}>
                      {func.errors}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(func.errors, func.calls24h)}
                      {getStatusBadge(func.errors, func.calls24h)}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{func.lastCalled}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
