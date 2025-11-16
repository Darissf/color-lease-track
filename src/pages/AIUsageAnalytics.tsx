import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, DollarSign, Activity, Zap } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface UsageData {
  id: string;
  ai_provider: string;
  model_name: string;
  tokens_used: number | null;
  request_tokens: number | null;
  response_tokens: number | null;
  cost_estimate: number | null;
  response_time_ms: number | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface UsageStats {
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
  successRate: number;
}

export default function AIUsageAnalytics() {
  const { user } = useAuth();
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (user) {
      fetchUsageData();
    }
  }, [user, filter]);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("ai_usage_analytics")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (filter !== "all") {
        query = query.eq("ai_provider", filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setUsageData(data || []);
      calculateStats(data || []);
    } catch (error: any) {
      console.error("Error fetching usage data:", error);
      toast.error("Failed to load usage analytics");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: UsageData[]) => {
    if (data.length === 0) {
      setStats(null);
      return;
    }

    const totalCalls = data.length;
    const totalTokens = data.reduce((sum, d) => sum + (d.tokens_used || 0), 0);
    const totalCost = data.reduce((sum, d) => sum + (d.cost_estimate || 0), 0);
    const avgResponseTime = data.reduce((sum, d) => sum + (d.response_time_ms || 0), 0) / totalCalls;
    const successCount = data.filter(d => d.status === "success").length;
    const successRate = (successCount / totalCalls) * 100;

    setStats({
      totalCalls,
      totalTokens,
      totalCost,
      avgResponseTime,
      successRate
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(amount * 15000);
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
          <h1 className="text-3xl font-bold">AI Usage Analytics</h1>
          <p className="text-muted-foreground">Monitor your AI API usage, costs, and performance</p>
        </div>
        
        <div className="flex gap-2">
          <Badge 
            variant={filter === "all" ? "default" : "outline"} 
            className="cursor-pointer"
            onClick={() => setFilter("all")}
          >
            All
          </Badge>
          <Badge 
            variant={filter === "openai" ? "default" : "outline"} 
            className="cursor-pointer"
            onClick={() => setFilter("openai")}
          >
            OpenAI
          </Badge>
          <Badge 
            variant={filter === "deepseek" ? "default" : "outline"} 
            className="cursor-pointer"
            onClick={() => setFilter("deepseek")}
          >
            DeepSeek
          </Badge>
        </div>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCalls}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTokens.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalCost)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(stats.avgResponseTime)}ms</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent API Calls</CardTitle>
          <CardDescription>Last 100 AI API requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Response Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No usage data yet
                    </TableCell>
                  </TableRow>
                ) : (
                  usageData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(item.created_at), "MMM dd, HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.ai_provider}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{item.model_name}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {item.tokens_used?.toLocaleString() || "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {item.cost_estimate ? formatCurrency(item.cost_estimate) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {item.response_time_ms ? `${item.response_time_ms}ms` : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.status === "success" ? "default" : "destructive"}>
                          {item.status}
                        </Badge>
                        {item.error_message && (
                          <p className="text-xs text-destructive mt-1">{item.error_message}</p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
