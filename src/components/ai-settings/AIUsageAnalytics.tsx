import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, Loader2, TrendingUp, Zap, DollarSign, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UsageStats {
  total_calls: number;
  total_tokens: number;
  estimated_cost: number;
  success_rate: number;
  avg_response_time: number;
  by_provider: { [key: string]: number };
  by_model: { [key: string]: number };
  recent_errors: any[];
}

export const AIUsageAnalytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UsageStats | null>(null);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      const { data: usageData, error } = await supabase
        .from("ai_usage_analytics")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      if (usageData && usageData.length > 0) {
        const totalCalls = usageData.length;
        const totalTokens = usageData.reduce((sum, item) => sum + (item.tokens_used || 0), 0);
        const estimatedCost = usageData.reduce((sum, item) => sum + (item.cost_estimate || 0), 0);
        const successCalls = usageData.filter(item => item.status === 'success').length;
        const successRate = (successCalls / totalCalls) * 100;
        const avgResponseTime = usageData.reduce((sum, item) => sum + (item.response_time_ms || 0), 0) / totalCalls;

        const byProvider: { [key: string]: number } = {};
        const byModel: { [key: string]: number } = {};
        usageData.forEach(item => {
          byProvider[item.ai_provider] = (byProvider[item.ai_provider] || 0) + 1;
          byModel[item.model_name] = (byModel[item.model_name] || 0) + 1;
        });

        const recentErrors = usageData
          .filter(item => item.status === 'error')
          .slice(0, 5);

        setStats({
          total_calls: totalCalls,
          total_tokens: totalTokens,
          estimated_cost: estimatedCost,
          success_rate: successRate,
          avg_response_time: avgResponseTime,
          by_provider: byProvider,
          by_model: byModel,
          recent_errors: recentErrors,
        });
      }
    } catch (error: any) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Alert>
        <BarChart3 className="h-4 w-4" />
        <AlertDescription>
          Belum ada data usage AI. Data akan muncul setelah Anda menggunakan fitur AI Chat atau ChatBot AI.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_calls.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total request ke AI</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_tokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Token yang digunakan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.estimated_cost.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">Estimasi biaya API</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.success_rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Request berhasil</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Usage by Provider</CardTitle>
            <CardDescription>Distribusi penggunaan per AI provider</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.by_provider).map(([provider, count]) => (
                <div key={provider} className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{provider}</span>
                  <span className="text-sm text-muted-foreground">{count} calls</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage by Model</CardTitle>
            <CardDescription>Distribusi penggunaan per model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.by_model).map(([model, count]) => (
                <div key={model} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{model}</span>
                  <span className="text-sm text-muted-foreground">{count} calls</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>Statistik performa AI</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Avg Response Time</span>
            <span className="text-sm text-muted-foreground">{stats.avg_response_time.toFixed(0)} ms</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Avg Tokens per Call</span>
            <span className="text-sm text-muted-foreground">
              {(stats.total_tokens / stats.total_calls).toFixed(0)} tokens
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Avg Cost per Call</span>
            <span className="text-sm text-muted-foreground">
              ${(stats.estimated_cost / stats.total_calls).toFixed(6)}
            </span>
          </div>
        </CardContent>
      </Card>

      {stats.recent_errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Recent Errors
            </CardTitle>
            <CardDescription>5 error terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recent_errors.map((error) => (
                <div key={error.id} className="border-l-2 border-destructive pl-3 py-2">
                  <p className="text-sm font-medium">{error.model_name}</p>
                  <p className="text-xs text-muted-foreground">{error.error_message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(error.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};