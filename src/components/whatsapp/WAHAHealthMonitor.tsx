import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useWhatsAppHealth } from '@/hooks/useWhatsAppHealth';
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Zap,
} from 'lucide-react';

export const WAHAHealthMonitor = () => {
  const { latestCheck, loading, runHealthCheck } = useWhatsAppHealth();
  const [autoCheck, setAutoCheck] = useState(true);

  useEffect(() => {
    if (autoCheck) {
      runHealthCheck();
      const interval = setInterval(() => {
        runHealthCheck();
      }, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [autoCheck]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'unhealthy':
        return 'bg-red-500/10 text-red-600 dark:text-red-400';
      default:
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
    }
  };

  const getResponseTimeColor = (ms: number | null) => {
    if (!ms) return 'text-muted-foreground';
    if (ms < 200) return 'text-green-600 dark:text-green-400';
    if (ms < 500) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getResponseProgress = (ms: number | null) => {
    if (!ms) return 0;
    return Math.min((ms / 1000) * 100, 100);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Health Monitor</h3>
        </div>
        {latestCheck && (
          <Badge className={getStatusColor(latestCheck.status)}>
            {getStatusIcon(latestCheck.status)}
            <span className="ml-2">{latestCheck.status.toUpperCase()}</span>
          </Badge>
        )}
      </div>

      {loading && !latestCheck ? (
        <div className="text-center py-8 text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-4 animate-pulse" />
          <p>Checking health status...</p>
        </div>
      ) : latestCheck ? (
        <div className="space-y-4">
          {/* Response Time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Response Time</span>
              </div>
              <span className={`text-sm font-medium ${getResponseTimeColor(latestCheck.response_time_ms)}`}>
                {latestCheck.response_time_ms ? `${latestCheck.response_time_ms}ms` : 'N/A'}
              </span>
            </div>
            <Progress
              value={getResponseProgress(latestCheck.response_time_ms)}
              className="h-2"
            />
          </div>

          {/* WAHA Version */}
          {latestCheck.waha_version && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">WAHA Version</span>
              <span className="text-sm font-medium">{latestCheck.waha_version}</span>
            </div>
          )}

          {/* Session Status */}
          {latestCheck.session_status && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Session Status</span>
              <Badge variant="outline">{latestCheck.session_status}</Badge>
            </div>
          )}

          {/* Last Check */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Last Check</span>
            </div>
            <span className="text-sm font-medium">
              {new Date(latestCheck.checked_at).toLocaleString('id-ID')}
            </span>
          </div>

          {/* Error Message */}
          {latestCheck.error_message && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">
                ⚠️ {latestCheck.error_message}
              </p>
            </div>
          )}

          {/* Health Tips */}
          {latestCheck.status === 'healthy' && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400">
                ✅ All systems operational
              </p>
            </div>
          )}

          {latestCheck.status === 'unhealthy' && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg space-y-2">
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                ⚠️ Health Check Tips:
              </p>
              <ul className="text-xs text-yellow-600 dark:text-yellow-400 space-y-1 list-disc list-inside">
                <li>Check if WAHA container is running: <code>docker ps</code></li>
                <li>View container logs: <code>docker logs waha</code></li>
                <li>Restart container: <code>docker restart waha</code></li>
                <li>Check firewall settings on port {latestCheck.waha_version || '3000'}</li>
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-4 opacity-50" />
          <p>No health data available</p>
          <p className="text-sm">Health checks will appear here</p>
        </div>
      )}
    </Card>
  );
};