import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Clock, DollarSign, Zap, AlertCircle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface AnalyticsSummary {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
  successRate: number;
  errorRate: number;
}

interface ProviderStats {
  provider: string;
  requests: number;
  avgResponseTime: number;
  successRate: number;
  cost: number;
}

interface FrequentQuestion {
  question: string;
  count: number;
  lastAsked: string;
}

interface ErrorStats {
  errorType: string;
  count: number;
  lastOccurred: string;
}

interface TrendData {
  date: string;
  tokens: number;
  cost: number;
  requests: number;
}

export default function AIAnalytics() {
  const [summary, setSummary] = useState<AnalyticsSummary>({
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    avgResponseTime: 0,
    successRate: 0,
    errorRate: 0,
  });
  const [providerStats, setProviderStats] = useState<ProviderStats[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [frequentQuestions, setFrequentQuestions] = useState<FrequentQuestion[]>([]);
  const [errorStats, setErrorStats] = useState<ErrorStats[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    fetchTrendData();
  }, [trendPeriod]);

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

      const errorRate = totalRequests > 0 ? ((totalRequests - successfulRequests) / totalRequests) * 100 : 0;

      setSummary({
        totalRequests,
        totalTokens,
        totalCost,
        avgResponseTime: Math.round(avgResponseTime),
        successRate: Math.round(successRate),
        errorRate: Math.round(errorRate),
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

      // Fetch frequent questions from chat messages
      const { data: messages, error: messagesError } = await (supabase as any)
        .from("chat_messages")
        .select("content, created_at")
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!messagesError && messages) {
        // Group similar questions (simple word matching)
        const questionMap = new Map<string, { count: number; lastAsked: string }>();
        
        messages.forEach((msg: any) => {
          const content = msg.content.toLowerCase().trim();
          // Skip very short questions
          if (content.length < 10) return;
          
          // Find similar question
          let found = false;
          for (const [key, value] of questionMap.entries()) {
            // Simple similarity check - if 60% of words match
            const words1 = content.split(/\s+/);
            const words2 = key.split(/\s+/);
            const commonWords = words1.filter(w => words2.includes(w)).length;
            const similarity = commonWords / Math.max(words1.length, words2.length);
            
            if (similarity > 0.6) {
              value.count++;
              value.lastAsked = msg.created_at;
              found = true;
              break;
            }
          }
          
          if (!found) {
            questionMap.set(content, { count: 1, lastAsked: msg.created_at });
          }
        });

        const questions: FrequentQuestion[] = Array.from(questionMap.entries())
          .map(([question, data]) => ({
            question,
            count: data.count,
            lastAsked: data.lastAsked,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        setFrequentQuestions(questions);
      }

      // Fetch error statistics
      const errorData = data.filter((a: any) => a.status === "error");
      const errorMap = new Map<string, { count: number; lastOccurred: string }>();
      
      errorData.forEach((item: any) => {
        const errorType = item.error_message || "Unknown Error";
        const existing = errorMap.get(errorType);
        if (existing) {
          existing.count++;
          if (item.created_at > existing.lastOccurred) {
            existing.lastOccurred = item.created_at;
          }
        } else {
          errorMap.set(errorType, { count: 1, lastOccurred: item.created_at });
        }
      });

      const errors: ErrorStats[] = Array.from(errorMap.entries())
        .map(([errorType, data]) => ({
          errorType,
          count: data.count,
          lastOccurred: data.lastOccurred,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setErrorStats(errors);

    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendData = async () => {
    try {
      const { data: analytics, error } = await (supabase as any)
        .from("ai_usage_analytics")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;

      const data = analytics || [];
      
      // Agregasi data berdasarkan periode
      const trendMap = new Map<string, { tokens: number; cost: number; requests: number }>();
      
      data.forEach((item: any) => {
        const date = new Date(item.created_at);
        let dateKey: string;
        
        if (trendPeriod === "daily") {
          dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        } else if (trendPeriod === "weekly") {
          const startOfWeek = new Date(date);
          startOfWeek.setDate(date.getDate() - date.getDay());
          dateKey = startOfWeek.toISOString().split('T')[0];
        } else { // monthly
          dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        
        if (!trendMap.has(dateKey)) {
          trendMap.set(dateKey, { tokens: 0, cost: 0, requests: 0 });
        }
        
        const trend = trendMap.get(dateKey)!;
        trend.tokens += item.tokens_used || 0;
        trend.cost += parseFloat(item.cost_estimate as any) || 0;
        trend.requests += 1;
      });
      
      const trends: TrendData[] = Array.from(trendMap.entries())
        .map(([date, stats]) => ({
          date,
          tokens: stats.tokens,
          cost: parseFloat(stats.cost.toFixed(6)),
          requests: stats.requests,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      setTrendData(trends);
    } catch (error) {
      console.error("Error fetching trend data:", error);
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.errorRate}%</div>
            <p className="text-xs text-muted-foreground">
              {summary.totalRequests - Math.round((summary.successRate / 100) * summary.totalRequests)} failed requests
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="questions">Top Questions</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="recent">Activity</TabsTrigger>
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

        <TabsContent value="trends" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Usage Trends</h3>
              <p className="text-sm text-muted-foreground">Visualisasi tokens dan cost dari waktu ke waktu</p>
            </div>
            <Select value={trendPeriod} onValueChange={(value: any) => setTrendPeriod(value)}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Harian</SelectItem>
                <SelectItem value="weekly">Mingguan</SelectItem>
                <SelectItem value="monthly">Bulanan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Token Usage Over Time</CardTitle>
              <CardDescription>Total tokens digunakan per periode</CardDescription>
            </CardHeader>
            <CardContent>
              {trendData.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Belum ada data untuk periode ini. Gunakan ChatBot AI untuk mulai tracking.
                  </AlertDescription>
                </Alert>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="tokens" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1}
                      fill="url(#colorTokens)"
                      name="Tokens"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cost Over Time</CardTitle>
              <CardDescription>Estimasi biaya penggunaan AI per periode</CardDescription>
            </CardHeader>
            <CardContent>
              {trendData.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Belum ada data untuk periode ini.
                  </AlertDescription>
                </Alert>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `$${value.toFixed(4)}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: any) => [`$${value.toFixed(6)}`, 'Cost']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cost" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-2))', r: 4 }}
                      name="Cost (USD)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Request Volume</CardTitle>
              <CardDescription>Jumlah request AI per periode</CardDescription>
            </CardHeader>
            <CardContent>
              {trendData.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Belum ada data untuk periode ini.
                  </AlertDescription>
                </Alert>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="requests" 
                      stroke="hsl(var(--chart-3))" 
                      fillOpacity={1}
                      fill="url(#colorRequests)"
                      name="Requests"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pertanyaan Paling Sering</CardTitle>
              <CardDescription>
                10 pertanyaan yang paling sering ditanyakan ke AI chat
              </CardDescription>
            </CardHeader>
            <CardContent>
              {frequentQuestions.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Belum ada pertanyaan yang tercatat. Mulai gunakan ChatBot AI.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {frequentQuestions.map((q, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium mb-1 line-clamp-2">
                          {q.question}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {q.count}x ditanya
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(q.lastAsked).toLocaleString('id-ID', { 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Error Statistics
              </CardTitle>
              <CardDescription>
                Analisis error yang terjadi pada AI chat
              </CardDescription>
            </CardHeader>
            <CardContent>
              {errorStats.length === 0 ? (
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    Tidak ada error yang tercatat. Sistem berjalan dengan baik! 🎉
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {errorStats.map((error, index) => (
                    <div key={index} className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-destructive mb-1 line-clamp-2">
                            {error.errorType}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {error.count} occurrences
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(error.lastOccurred).toLocaleString('id-ID', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                        <Badge variant="destructive">{error.count}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
