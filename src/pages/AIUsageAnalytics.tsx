import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, Wallet, Activity, Zap, Download, Calendar, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
  function_name: string | null;
}

interface UsageStats {
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
  successRate: number;
}

interface CostAlert {
  level: 'low' | 'medium' | 'high';
  message: string;
}

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function AIUsageAnalytics() {
  const { user } = useAuth();
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7days");
  const [costAlert, setCostAlert] = useState<CostAlert | null>(null);

  useEffect(() => {
    if (user) {
      fetchUsageData();
    }
  }, [user, filter, dateRange]);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      
      const dateFilter = getDateFilter();
      
      let query = supabase
        .from("ai_usage_analytics")
        .select("*")
        .eq("user_id", user!.id)
        .gte("created_at", dateFilter.toISOString())
        .order("created_at", { ascending: false })
        .limit(500);

      if (filter !== "all") {
        query = query.eq("ai_provider", filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setUsageData(data || []);
      calculateStats(data || []);
      checkCostAlerts(data || []);
    } catch (error: any) {
      console.error("Error fetching usage data:", error);
      toast.error("Failed to load usage analytics");
    } finally {
      setLoading(false);
    }
  };

  const getDateFilter = () => {
    switch (dateRange) {
      case "24h":
        return subDays(new Date(), 1);
      case "7days":
        return subDays(new Date(), 7);
      case "30days":
        return subDays(new Date(), 30);
      default:
        return subDays(new Date(), 7);
    }
  };

  const checkCostAlerts = (data: UsageData[]) => {
    const dailyCost = data
      .filter(d => new Date(d.created_at) > subDays(new Date(), 1))
      .reduce((sum, d) => sum + (d.cost_estimate || 0), 0);
    
    const dailyCostIDR = dailyCost * 15000;

    if (dailyCostIDR > 150000) {
      setCostAlert({
        level: 'high',
        message: `⚠️ High daily cost: ${formatCurrency(dailyCost)}. Consider optimizing AI usage.`
      });
    } else if (dailyCostIDR > 75000) {
      setCostAlert({
        level: 'medium',
        message: `⚡ Medium daily cost: ${formatCurrency(dailyCost)}. Monitor usage closely.`
      });
    } else {
      setCostAlert({
        level: 'low',
        message: `✅ Daily cost is within normal range: ${formatCurrency(dailyCost)}`
      });
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

  const exportToCSV = () => {
    const headers = ["Time", "Provider", "Model", "Function", "Tokens", "Cost (USD)", "Response Time", "Status"];
    const rows = usageData.map(item => [
      format(new Date(item.created_at), "yyyy-MM-dd HH:mm:ss"),
      item.ai_provider,
      item.model_name,
      item.function_name || "unknown",
      item.tokens_used || 0,
      item.cost_estimate || 0,
      item.response_time_ms || 0,
      item.status
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-usage-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    toast.success("Data exported successfully");
  };

  const getProviderBreakdown = () => {
    const breakdown: Record<string, number> = {};
    usageData.forEach(item => {
      const provider = item.ai_provider;
      breakdown[provider] = (breakdown[provider] || 0) + 1;
    });
    return Object.entries(breakdown).map(([name, value]) => ({ name, value }));
  };

  const getFunctionBreakdown = () => {
    const breakdown: Record<string, number> = {};
    usageData.forEach(item => {
      const func = item.function_name || "unknown";
      breakdown[func] = (breakdown[func] || 0) + (item.cost_estimate || 0);
    });
    return Object.entries(breakdown).map(([name, value]) => ({ 
      name: name.replace('ai-', ''), 
      value: value * 15000 
    }));
  };

  const getDailyTrend = () => {
    const dailyData: Record<string, { calls: number; cost: number; tokens: number }> = {};
    
    usageData.forEach(item => {
      const date = format(new Date(item.created_at), "MMM dd");
      if (!dailyData[date]) {
        dailyData[date] = { calls: 0, cost: 0, tokens: 0 };
      }
      dailyData[date].calls += 1;
      dailyData[date].cost += (item.cost_estimate || 0) * 15000;
      dailyData[date].tokens += (item.tokens_used || 0);
    });

    return Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .reverse();
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
          <h1 className="text-3xl font-bold">📊 AI Usage Dashboard</h1>
          <p className="text-muted-foreground">Monitor your AI API usage, costs, and performance in real-time</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Cost Alert Banner */}
      {costAlert && (
        <Card className={`border-2 ${
          costAlert.level === 'high' ? 'border-destructive bg-destructive/10' :
          costAlert.level === 'medium' ? 'border-orange-500 bg-orange-500/10' :
          'border-green-500 bg-green-500/10'
        }`}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              {costAlert.level !== 'low' && <AlertTriangle className="h-5 w-5" />}
              <p className="font-medium">{costAlert.message}</p>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Date Range Filter */}
      <div className="flex gap-2 items-center">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Badge 
          variant={dateRange === "24h" ? "default" : "outline"} 
          className="cursor-pointer"
          onClick={() => setDateRange("24h")}
        >
          24 Hours
        </Badge>
        <Badge 
          variant={dateRange === "7days" ? "default" : "outline"} 
          className="cursor-pointer"
          onClick={() => setDateRange("7days")}
        >
          7 Days
        </Badge>
        <Badge 
          variant={dateRange === "30days" ? "default" : "outline"} 
          className="cursor-pointer"
          onClick={() => setDateRange("30days")}
        >
          30 Days
        </Badge>

        <div className="ml-4 flex gap-2">
          <Badge 
            variant={filter === "all" ? "default" : "outline"} 
            className="cursor-pointer"
            onClick={() => setFilter("all")}
          >
            All Providers
          </Badge>
          <Badge 
            variant={filter === "deepseek" ? "default" : "outline"} 
            className="cursor-pointer"
            onClick={() => setFilter("deepseek")}
          >
            DeepSeek
          </Badge>
          <Badge 
            variant={filter === "claude" ? "default" : "outline"} 
            className="cursor-pointer"
            onClick={() => setFilter("claude")}
          >
            Claude
          </Badge>
          <Badge 
            variant={filter === "lovable" ? "default" : "outline"} 
            className="cursor-pointer"
            onClick={() => setFilter("lovable")}
          >
            Lovable AI
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCalls}</div>
              <p className="text-xs text-muted-foreground">API requests made</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTokens.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Tokens processed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalCost)}</div>
              <p className="text-xs text-muted-foreground">${stats.totalCost.toFixed(4)} USD</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(stats.avgResponseTime)}ms</div>
              <p className="text-xs text-muted-foreground">Average latency</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Request success</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Tabs */}
      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trend">Usage Trend</TabsTrigger>
          <TabsTrigger value="providers">Provider Breakdown</TabsTrigger>
          <TabsTrigger value="functions">Cost by Function</TabsTrigger>
          <TabsTrigger value="details">Detailed Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="trend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage Trend (Last {dateRange})</CardTitle>
              <CardDescription>Daily calls, cost, and token usage over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={getDailyTrend()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="calls" stackId="1" stroke="#0ea5e9" fill="#0ea5e9" name="API Calls" />
                  <Area yAxisId="right" type="monotone" dataKey="cost" stackId="2" stroke="#8b5cf6" fill="#8b5cf6" name="Cost (Rp)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Provider Distribution</CardTitle>
                <CardDescription>API calls by provider</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getProviderBreakdown()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getProviderBreakdown().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Provider Comparison</CardTitle>
                <CardDescription>Usage statistics by provider</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getProviderBreakdown().map((provider, index) => {
                    const providerData = usageData.filter(d => d.ai_provider === provider.name);
                    const avgCost = providerData.reduce((sum, d) => sum + (d.cost_estimate || 0), 0) / providerData.length;
                    const avgTime = providerData.reduce((sum, d) => sum + (d.response_time_ms || 0), 0) / providerData.length;

                    return (
                      <div key={provider.name} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <div>
                            <p className="font-medium">{provider.name}</p>
                            <p className="text-xs text-muted-foreground">{provider.value} calls</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrency(avgCost)}</p>
                          <p className="text-xs text-muted-foreground">{Math.round(avgTime)}ms avg</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="functions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost by Function</CardTitle>
              <CardDescription>Total cost breakdown by edge function</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getFunctionBreakdown()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="value" fill="#8b5cf6" name="Cost (Rp)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent API Calls</CardTitle>
              <CardDescription>Detailed log of last {usageData.length} AI API requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Function</TableHead>
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
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
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
                            <Badge variant="outline" className="text-xs">
                              {item.function_name?.replace('ai-', '') || 'unknown'}
                            </Badge>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}