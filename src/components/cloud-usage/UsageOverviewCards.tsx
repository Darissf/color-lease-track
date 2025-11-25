import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, HardDrive, Zap, Brain, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface UsageOverviewCardsProps {
  databaseSize: number;
  storageSize: number;
  functionCalls: number;
  aiCost: number;
  activeUsers: number;
}

const FREE_DB = 500 * 1024 * 1024; // 500MB
const FREE_STORAGE = 1024 * 1024 * 1024; // 1GB
const FREE_FUNCTIONS = 500000; // 500K
const FREE_USERS = 50000; // 50K MAU

export function UsageOverviewCards({
  databaseSize,
  storageSize,
  functionCalls,
  aiCost,
  activeUsers
}: UsageOverviewCardsProps) {
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

  const dbPercentage = (databaseSize / FREE_DB) * 100;
  const storagePercentage = (storageSize / FREE_STORAGE) * 100;
  const functionsPercentage = (functionCalls / FREE_FUNCTIONS) * 100;
  const usersPercentage = (activeUsers / FREE_USERS) * 100;

  return (
    <div className="grid gap-4 md:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Database</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatBytes(databaseSize)}</div>
          <p className="text-xs text-muted-foreground mb-2">of 500 MB</p>
          <Progress value={Math.min(dbPercentage, 100)} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">{dbPercentage.toFixed(1)}% used</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Storage</CardTitle>
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatBytes(storageSize)}</div>
          <p className="text-xs text-muted-foreground mb-2">of 1 GB</p>
          <Progress value={Math.min(storagePercentage, 100)} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">{storagePercentage.toFixed(2)}% used</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Functions</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(functionCalls)}</div>
          <p className="text-xs text-muted-foreground mb-2">of 500K calls</p>
          <Progress value={Math.min(functionsPercentage, 100)} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">{functionsPercentage.toFixed(2)}% used</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">AI Usage</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0
            }).format(aiCost * 15000)}
          </div>
          <p className="text-xs text-muted-foreground">This month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(activeUsers)}</div>
          <p className="text-xs text-muted-foreground mb-2">of 50K MAU</p>
          <Progress value={Math.min(usersPercentage, 100)} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">{usersPercentage.toFixed(2)}% used</p>
        </CardContent>
      </Card>
    </div>
  );
}
