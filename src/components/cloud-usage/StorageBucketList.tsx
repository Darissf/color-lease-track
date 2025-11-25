import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lock, Unlock } from "lucide-react";

interface BucketStats {
  bucketName: string;
  fileCount: number;
  size: number;
  isPublic: boolean;
}

interface StorageBucketListProps {
  buckets: BucketStats[];
  totalSize: number;
}

const FREE_STORAGE = 1024 * 1024 * 1024; // 1GB

export function StorageBucketList({ buckets, totalSize }: StorageBucketListProps) {
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

  const totalPercentage = (totalSize / FREE_STORAGE) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>📦 Storage Buckets</CardTitle>
        <CardDescription>
          Total storage used: {formatBytes(totalSize)} of 1 GB ({totalPercentage.toFixed(2)}%)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bucket Name</TableHead>
              <TableHead className="text-right">Files</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Usage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buckets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No storage buckets found
                </TableCell>
              </TableRow>
            ) : (
              buckets.map((bucket) => {
                const percentage = totalSize > 0 ? (bucket.size / totalSize) * 100 : 0;
                return (
                  <TableRow key={bucket.bucketName}>
                    <TableCell className="font-medium">{bucket.bucketName}</TableCell>
                    <TableCell className="text-right">{formatNumber(bucket.fileCount)}</TableCell>
                    <TableCell className="text-right">{formatBytes(bucket.size)}</TableCell>
                    <TableCell>
                      <Badge variant={bucket.isPublic ? "default" : "secondary"} className="flex items-center gap-1 w-fit">
                        {bucket.isPublic ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                        {bucket.isPublic ? "Public" : "Private"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={percentage} className="h-2 w-32" />
                        <span className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</span>
                      </div>
                    </TableCell>
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
