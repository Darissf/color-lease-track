import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ArrowLeft, 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
  TrendingUp,
  Zap
} from "lucide-react";
import { format, formatDistanceToNow, differenceInMinutes } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface SyncLog {
  id: string;
  status: string;
  mode: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  mutations_found: number;
  mutations_new: number;
  mutations_matched: number;
  error_message: string | null;
  error_code: string | null;
}

export default function ScraperMonitoring() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [settings, setSettings] = useState<{
    id: string;
    is_active: boolean | null;
    last_webhook_at: string | null;
    last_scrape_at: string | null;
    scrape_interval_minutes: number | null;
    scrape_status: string | null;
    last_error: string | null;
    error_count: number | null;
    total_scrapes: number | null;
  } | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/");
      return;
    }
    fetchData();
    
    // Set up realtime subscription for sync logs
    const channel = supabase
      .channel('scraper-monitoring')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bca_sync_logs' },
        () => fetchSyncLogs()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payment_provider_settings' },
        () => fetchSettings()
      )
      .subscribe();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [isSuperAdmin]);

  const fetchData = async () => {
    await Promise.all([fetchSettings(), fetchSyncLogs()]);
    setLoading(false);
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("payment_provider_settings")
      .select("id, is_active, last_webhook_at, last_scrape_at, scrape_interval_minutes, scrape_status, last_error, error_count, total_scrapes")
      .eq("provider", "vps_scraper")
      .maybeSingle();
    
    if (data) setSettings(data);
  };

  const fetchSyncLogs = async () => {
    const { data } = await supabase
      .from("bca_sync_logs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(50);
    
    if (data) setSyncLogs(data);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Calculate statistics
  const last24hLogs = syncLogs.filter(log => {
    const logTime = new Date(log.started_at);
    const now = new Date();
    return differenceInMinutes(now, logTime) <= 1440; // 24 hours
  });

  const successCount = last24hLogs.filter(l => l.status === 'completed').length;
  const errorCount = last24hLogs.filter(l => l.status === 'error').length;
  const totalMutations = last24hLogs.reduce((sum, l) => sum + (l.mutations_new || 0), 0);
  const avgDuration = last24hLogs.length > 0 
    ? Math.round(last24hLogs.reduce((sum, l) => sum + (l.duration_ms || 0), 0) / last24hLogs.length / 1000)
    : 0;
  const uptimePercent = last24hLogs.length > 0 
    ? Math.round((successCount / last24hLogs.length) * 100)
    : 0;

  const getStatusInfo = () => {
    if (!settings) return { status: 'unknown', color: 'bg-muted', icon: WifiOff };
    
    const lastSync = settings.last_webhook_at ? new Date(settings.last_webhook_at) : null;
    const minutesSinceSync = lastSync ? differenceInMinutes(new Date(), lastSync) : Infinity;
    const expectedInterval = settings.scrape_interval_minutes || 15;

    if (!settings.is_active) {
      return { status: 'Nonaktif', color: 'bg-muted text-muted-foreground', icon: WifiOff };
    }
    
    if (minutesSinceSync <= expectedInterval + 5) {
      return { status: 'Online', color: 'bg-emerald-500', icon: Wifi };
    } else if (minutesSinceSync <= expectedInterval * 2) {
      return { status: 'Delayed', color: 'bg-yellow-500', icon: Clock };
    } else {
      return { status: 'Offline', color: 'bg-destructive', icon: WifiOff };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  if (!isSuperAdmin) return null;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Scraper Monitoring</h1>
            <p className="text-muted-foreground text-sm">Real-time status dan history</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Status Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Current Status */}
            <Card className="relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-24 h-24 rounded-full ${statusInfo.color} opacity-10 -mr-8 -mt-8`} />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Status VPS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${statusInfo.color}`}>
                    <StatusIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{statusInfo.status}</p>
                    <p className="text-xs text-muted-foreground">
                      {settings?.total_scrapes || 0} total scrapes
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Uptime */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-emerald-500 opacity-10 -mr-8 -mt-8" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Uptime 24h
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-emerald-600">{uptimePercent}%</p>
                <p className="text-xs text-muted-foreground">
                  {successCount} sukses / {last24hLogs.length} total
                </p>
              </CardContent>
            </Card>

            {/* Errors */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-destructive opacity-10 -mr-8 -mt-8" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Error 24h
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${errorCount > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                  {errorCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  {errorCount > 0 ? 'Perlu perhatian' : 'Tidak ada error'}
                </p>
              </CardContent>
            </Card>

            {/* Performance */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-primary opacity-10 -mr-8 -mt-8" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Performa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{avgDuration}s</p>
                <p className="text-xs text-muted-foreground">
                  Rata-rata durasi scrape
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detail Cards */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Last Sync Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Info Terakhir
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Last Webhook</p>
                    <p className="font-medium">
                      {settings?.last_webhook_at 
                        ? formatDistanceToNow(new Date(settings.last_webhook_at), { addSuffix: true, locale: idLocale })
                        : '-'}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Interval</p>
                    <p className="font-medium">{settings?.scrape_interval_minutes || 15} menit</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Mutasi Baru (24h)</p>
                    <p className="font-medium text-primary">{totalMutations}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Error Count</p>
                    <p className={`font-medium ${(settings?.error_count || 0) > 0 ? 'text-destructive' : ''}`}>
                      {settings?.error_count || 0}
                    </p>
                  </div>
                </div>
                {settings?.last_error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-xs text-destructive font-medium">Last Error</p>
                    <p className="text-sm text-destructive/80">{settings.last_error}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sync History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Sync History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[280px] pr-4">
                  <div className="space-y-2">
                    {syncLogs.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-8">
                        Belum ada sync log
                      </p>
                    ) : (
                      syncLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          {log.status === 'completed' ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                          ) : log.status === 'error' ? (
                            <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                          ) : (
                            <RefreshCw className="h-5 w-5 text-primary animate-spin mt-0.5 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">
                                {log.status === 'completed' ? 'Sukses' : log.status === 'error' ? 'Error' : 'Running'}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {log.mode}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(log.started_at), 'dd MMM HH:mm:ss', { locale: idLocale })}
                              {log.duration_ms && ` • ${Math.round(log.duration_ms / 1000)}s`}
                            </p>
                            {log.status === 'completed' && (
                              <p className="text-xs text-muted-foreground">
                                {log.mutations_found} ditemukan, {log.mutations_new} baru, {log.mutations_matched} matched
                              </p>
                            )}
                            {log.error_message && (
                              <p className="text-xs text-destructive truncate mt-1">
                                {log.error_message}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
