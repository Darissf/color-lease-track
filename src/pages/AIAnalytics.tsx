import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Clock, DollarSign, Zap, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AnalyticsSummary {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
  successRate: number;
}

interface ProviderStats {
  provider: string;
  requests: number;
  avgResponseTime: number;
  successRate: number;
  cost: number;
}

export default function AIAnalytics() {
  const [summary, setSummary] = useState<AnalyticsSummary>({
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    avgResponseTime: 0,
    successRate: 0,
  });
  const [providerStats, setProviderStats] = useState<ProviderStats[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch overall summary
      const { data: analytics, error } = await (supabase as any)
        .from("ai_usage_analytics")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const data = analytics || [];

      // Calculate summary
      const totalRequests = data.length;
      const successfulRequests = data.filter((a: any) => a.status === "success").length;
      const totalTokens = data.reduce((sum: number, a: any) => sum + (a.tokens_used || 0), 0);
      const totalCost = data.reduce((sum: number, a: any) => sum + (parseFloat(a.cost_estimate as any) || 0), 0);
      const avgResponseTime = data.length > 0
        ? data.reduce((sum: number, a: any) => sum + (a.response_time_ms || 0), 0) / data.length
        : 0;
      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

      setSummary({
        totalRequests,
        totalTokens,
        totalCost,
        avgResponseTime: Math.round(avgResponseTime),
        successRate: Math.round(successRate),
      });

      // Calculate per-provider stats
      const providerMap = new Map<string, any>();
      
      data.forEach((item: any) => {
        const provider = item.ai_provider;
        if (!providerMap.has(provider)) {
          providerMap.set(provider, {
            provider,
            requests: 0,
            totalResponseTime: 0,
            successCount: 0,
            cost: 0,
          });
        }
        
        const stats = providerMap.get(provider);
        stats.requests++;
        stats.totalResponseTime += item.response_time_ms || 0;
        if (item.status === "success") stats.successCount++;
        stats.cost += parseFloat(item.cost_estimate as any) || 0;
      });

      const providers: ProviderStats[] = Array.from(providerMap.values()).map(p => ({
        provider: p.provider,
        requests: p.requests,
        avgResponseTime: Math.round(p.totalResponseTime / p.requests),
        successRate: Math.round((p.successCount / p.requests) * 100),
        cost: p.cost,
      }));

      setProviderStats(providers);
      setRecentActivity(data.slice(0, 10));

    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      lovable: "bg-blue-500/10 text-blue-500",
      gemini: "bg-purple-500/10 text-purple-500",
      openai: "bg-green-500/10 text-green-500",
      claude: "bg-orange-500/10 text-orange-500",
      deepseek: "bg-pink-500/10 text-pink-500",
      groq: "bg-cyan-500/10 text-cyan-500",
    };
    return colors[provider] || "bg-gray-500/10 text-gray-500";
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="w-8 h-8" />
          AI Analytics Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor penggunaan AI, cost, dan performance
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalRequests}</div>
            <p className="text-xs text-muted-foreground">
              {summary.successRate}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">
              Average latency
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalTokens.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Tokens processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary.totalCost.toFixed(4)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total spend
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="providers">Per Provider</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Provider Performance</CardTitle>
              <CardDescription>
                Bandingkan performa antar AI provider
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {providerStats.map((stat) => (
                  <div
                    key={stat.provider}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={getProviderColor(stat.provider)}>
                        {stat.provider}
                      </Badge>
                      <div>
                        <p className="font-medium">{stat.requests} requests</p>
                        <p className="text-sm text-muted-foreground">
                          {stat.avgResponseTime}ms avg • {stat.successRate}% success
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${stat.cost.toFixed(4)}</p>
                      <p className="text-xs text-muted-foreground">cost</p>
                    </div>
                  </div>
                ))}
                {providerStats.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Belum ada data analytics. Mulai gunakan ChatBot AI untuk melihat statistik.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                10 request terakhir
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 border rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={activity.status === "success" ? "default" : "destructive"}
                      >
                        {activity.status}
                      </Badge>
                      <Badge variant="outline" className={getProviderColor(activity.ai_provider)}>
                        {activity.ai_provider}
                      </Badge>
                      <span className="text-muted-foreground">{activity.model_name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span>{activity.response_time_ms}ms</span>
                      <span>{new Date(activity.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
                {recentActivity.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Belum ada aktivitas yang tercatat.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
