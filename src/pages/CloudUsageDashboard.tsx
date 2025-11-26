import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format, subDays, formatDistanceToNow } from "date-fns";
import { UsageOverviewCards } from "@/components/cloud-usage/UsageOverviewCards";
import { CostEstimator } from "@/components/cloud-usage/CostEstimator";
import { EdgeFunctionTable } from "@/components/cloud-usage/EdgeFunctionTable";
import { DatabaseSizeChart } from "@/components/cloud-usage/DatabaseSizeChart";
import { StorageBucketList } from "@/components/cloud-usage/StorageBucketList";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

interface EdgeFunctionStats {
  functionName: string;
  calls24h: number;
  avgTime: number;
  errors: number;
  lastCalled: string;
}

interface TableStats {
  tableName: string;
  size: number;
  rowCount: number;
  lastModified: string;
}

interface BucketStats {
  name: string;
  fileCount: number;
  size: number;
  isPublic: boolean;
}

export default function CloudUsageDashboard() {
  const { activeTheme } = useAppTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Overview stats
  const [databaseSize, setDatabaseSize] = useState(0);
  const [storageSize, setStorageSize] = useState(0);
  const [functionCalls, setFunctionCalls] = useState(0);
  const [aiCost, setAiCost] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);

  // Detailed stats
  const [edgeFunctions, setEdgeFunctions] = useState<EdgeFunctionStats[]>([]);
  const [tables, setTables] = useState<TableStats[]>([]);
  const [buckets, setBuckets] = useState<BucketStats[]>([]);

  useEffect(() => {
    if (user) {
      fetchAllUsageData();
    }
  }, [user]);

  const fetchAllUsageData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchDatabaseStats(),
        fetchStorageStats(),
        fetchEdgeFunctionStats(),
        fetchAIStats(),
        fetchUserStats()
      ]);
    } catch (error: any) {
      console.error("Error fetching usage data:", error);
      toast.error("Failed to load usage data");
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchAllUsageData();
    setRefreshing(false);
    toast.success("Data refreshed successfully");
  };

  const fetchDatabaseStats = async () => {
    try {
      // Use edge function to get real database metrics
      const { data, error } = await supabase.functions.invoke('get-cloud-metrics');
      
      if (error) throw error;

      setDatabaseSize(data.databaseSize || 0);
      
      // Transform data to match interface
      const tableStats: TableStats[] = (data.tables || []).map((t: any) => ({
        tableName: t.tableName || '',
        size: t.size || 0,
        rowCount: t.rowCount || 0,
        lastModified: t.lastModified ? formatDistanceToNow(new Date(t.lastModified), { addSuffix: true }) : 'Unknown'
      }));
      
      setTables(tableStats.slice(0, 10)); // Top 10 tables
    } catch (error) {
      console.error("Error fetching database stats:", error);
      toast.error("Failed to fetch database statistics");
      setDatabaseSize(0);
    }
  };

  const fetchStorageStats = async () => {
    try {
      // Use edge function to get real storage metrics
      const { data, error } = await supabase.functions.invoke('get-cloud-metrics');
      
      if (error) throw error;

      setStorageSize(data.storageSize || 0);
      setBuckets(data.buckets || []);
    } catch (error) {
      console.error("Error fetching storage stats:", error);
      toast.error("Failed to fetch storage statistics");
      setStorageSize(0);
    }
  };

  const fetchEdgeFunctionStats = async () => {
    try {
      // Get analytics from postgres_logs or function_edge_logs
      // Since we don't have direct access to analytics, we'll use ai_usage_analytics as proxy
      const yesterday = subDays(new Date(), 1);
      
      const { data: aiData } = await supabase
        .from('ai_usage_analytics')
        .select('function_name, response_time_ms, status, created_at')
        .gte('created_at', yesterday.toISOString());

      const functionMap = new Map<string, EdgeFunctionStats>();

      aiData?.forEach(item => {
        const funcName = item.function_name || 'unknown';
        const existing = functionMap.get(funcName) || {
          functionName: funcName,
          calls24h: 0,
          avgTime: 0,
          errors: 0,
          lastCalled: item.created_at
        };

        existing.calls24h += 1;
        existing.avgTime = (existing.avgTime * (existing.calls24h - 1) + (item.response_time_ms || 0)) / existing.calls24h;
        if (item.status !== 'success') existing.errors += 1;
        if (new Date(item.created_at) > new Date(existing.lastCalled)) {
          existing.lastCalled = item.created_at;
        }

        functionMap.set(funcName, existing);
      });

      const functionStats = Array.from(functionMap.values()).map(stat => ({
        ...stat,
        avgTime: Math.round(stat.avgTime),
        lastCalled: formatDistanceToNow(new Date(stat.lastCalled), { addSuffix: true })
      }));

      setEdgeFunctions(functionStats);
      setFunctionCalls(aiData?.length || 0);
    } catch (error) {
      console.error("Error fetching edge function stats:", error);
      setEdgeFunctions([]);
      setFunctionCalls(0);
    }
  };

  const fetchAIStats = async () => {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('ai_usage_analytics')
        .select('cost_estimate')
        .gte('created_at', startOfMonth.toISOString());

      const totalCost = data?.reduce((sum, item) => sum + (item.cost_estimate || 0), 0) || 0;
      setAiCost(totalCost);
    } catch (error) {
      console.error("Error fetching AI stats:", error);
      setAiCost(0);
    }
  };

  const fetchUserStats = async () => {
    try {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setActiveUsers(count || 0);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      setActiveUsers(0);
    }
  };

  const exportToCSV = () => {
    const data = [
      ['Metric', 'Value'],
      ['Database Size (MB)', (databaseSize / (1024 * 1024)).toFixed(2)],
      ['Storage Size (MB)', (storageSize / (1024 * 1024)).toFixed(2)],
      ['Function Calls (24h)', functionCalls.toString()],
      ['AI Cost (USD)', aiCost.toFixed(4)],
      ['Active Users', activeUsers.toString()],
      ['', ''],
      ['Table Name', 'Size (KB)', 'Rows'],
      ...tables.map(t => [t.tableName, (t.size / 1024).toFixed(2), t.rowCount.toString()]),
      ['', ''],
      ['Bucket Name', 'Files', 'Size (KB)'],
      ...buckets.map(b => [b.name, b.fileCount.toString(), (b.size / 1024).toFixed(2)])
    ];

    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cloud-usage-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success("Data exported successfully");
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={cn(
            "text-3xl font-bold",
            activeTheme === 'japanese' && "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
          )}>☁️ Cloud Usage Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor all your cloud resources, costs, and performance in one place
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <UsageOverviewCards
        databaseSize={databaseSize}
        storageSize={storageSize}
        functionCalls={functionCalls}
        aiCost={aiCost}
        activeUsers={activeUsers}
      />

      {/* Cost Estimator */}
      <CostEstimator
        databaseSize={databaseSize}
        storageSize={storageSize}
        functionCalls={functionCalls}
        aiCost={aiCost}
        activeUsers={activeUsers}
      />

      {/* Detailed Tabs */}
      <Tabs defaultValue="functions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="functions">Edge Functions</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
        </TabsList>

        <TabsContent value="functions" className="space-y-4">
          <EdgeFunctionTable functions={edgeFunctions} />
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <DatabaseSizeChart tables={tables} totalSize={databaseSize} />
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
          <StorageBucketList buckets={buckets} totalSize={storageSize} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
