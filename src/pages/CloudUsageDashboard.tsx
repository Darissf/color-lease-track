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
  bucketName: string;
  fileCount: number;
  size: number;
  isPublic: boolean;
}

export default function CloudUsageDashboard() {
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
      // Estimate from row counts (rough approximation)
      const tableQueries = [
        { name: 'editable_content', query: supabase.from('editable_content').select('*', { count: 'exact', head: true }) },
        { name: 'blog_posts', query: supabase.from('blog_posts').select('*', { count: 'exact', head: true }) },
        { name: 'ai_usage_analytics', query: supabase.from('ai_usage_analytics').select('*', { count: 'exact', head: true }) },
        { name: 'expenses', query: supabase.from('expenses').select('*', { count: 'exact', head: true }) },
        { name: 'profiles', query: supabase.from('profiles').select('*', { count: 'exact', head: true }) },
        { name: 'monthly_budgets', query: supabase.from('monthly_budgets').select('*', { count: 'exact', head: true }) },
        { name: 'bank_accounts', query: supabase.from('bank_accounts').select('*', { count: 'exact', head: true }) },
        { name: 'income_sources', query: supabase.from('income_sources').select('*', { count: 'exact', head: true }) },
      ];

      let totalSize = 0;
      const tableStats: TableStats[] = [];

      for (const { name, query } of tableQueries) {
        try {
          const { count } = await query;
          
          // Rough estimate: 1KB per row average
          const estimatedSize = (count || 0) * 1024;
          totalSize += estimatedSize;

          tableStats.push({
            tableName: name,
            size: estimatedSize,
            rowCount: count || 0,
            lastModified: 'Recently'
          });
        } catch (err) {
          console.log(`Could not access table: ${name}`);
        }
      }

      // Sort by size descending
      tableStats.sort((a, b) => b.size - a.size);
      setTables(tableStats.slice(0, 10)); // Top 10 tables
      setDatabaseSize(totalSize);
    } catch (error) {
      console.error("Error fetching database stats:", error);
      setDatabaseSize(0);
    }
  };

  const fetchStorageStats = async () => {
    try {
      // Known storage buckets
      const bucketNames = ['avatars', 'ktp-documents', 'client-icons', 'portfolio-images', 'payment-proofs'];
      const bucketStats: BucketStats[] = [];
      let totalSize = 0;

      for (const bucketName of bucketNames) {
        try {
          const { data: objects, error } = await supabase
            .storage
            .from(bucketName)
            .list();

          if (error) {
            console.log(`Could not access bucket ${bucketName}:`, error);
            continue;
          }

          const fileCount = objects?.length || 0;
          // Rough estimate: 16KB average per file
          const bucketSize = fileCount * 16 * 1024;
          totalSize += bucketSize;

          // Determine if bucket is public (hardcoded knowledge)
          const isPublic = ['avatars', 'client-icons', 'portfolio-images'].includes(bucketName);

          bucketStats.push({
            bucketName,
            fileCount,
            size: bucketSize,
            isPublic
          });
        } catch (err) {
          console.log(`Error accessing bucket ${bucketName}:`, err);
        }
      }

      setBuckets(bucketStats);
      setStorageSize(totalSize);
    } catch (error) {
      console.error("Error fetching storage stats:", error);
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
      ...buckets.map(b => [b.bucketName, b.fileCount.toString(), (b.size / 1024).toFixed(2)])
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
          <h1 className="text-3xl font-bold">☁️ Cloud Usage Dashboard</h1>
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
