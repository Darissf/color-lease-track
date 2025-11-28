import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Container,
  Play,
  Square,
  RotateCw,
  FileText,
  Download,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DockerDashboardProps {
  wahaApiUrl: string;
  wahaApiKey: string;
}

interface ContainerInfo {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error';
  uptime: string;
  memory: string;
  cpu: string;
}

export const DockerDashboard = ({ wahaApiUrl, wahaApiKey }: DockerDashboardProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [containerInfo, setContainerInfo] = useState<ContainerInfo | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchContainerInfo();
    const interval = setInterval(fetchContainerInfo, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [wahaApiUrl, wahaApiKey]);

  const fetchContainerInfo = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase.functions.invoke('waha-docker-control', {
        body: {
          action: 'status',
          wahaApiUrl,
          wahaApiKey,
        },
      });

      if (error) throw error;
      if (data.success) {
        setContainerInfo(data.container);
      }
    } catch (error: any) {
      console.error('Failed to fetch container info:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleContainerAction = async (action: 'start' | 'stop' | 'restart') => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('waha-docker-control', {
        body: {
          action,
          wahaApiUrl,
          wahaApiKey,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: `✅ ${action.charAt(0).toUpperCase() + action.slice(1)} berhasil!`,
          description: data.message,
        });
        await fetchContainerInfo();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Action Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('waha-docker-control', {
        body: {
          action: 'logs',
          wahaApiUrl,
          wahaApiKey,
        },
      });

      if (error) throw error;
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (error: any) {
      toast({
        title: 'Failed to fetch logs',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadLogs = () => {
    const logContent = logs.join('\n');
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waha-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'stopped':
        return 'bg-red-500/10 text-red-600 dark:text-red-400';
      default:
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Container className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Docker Dashboard</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchContainerInfo}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs" onClick={fetchLogs}>Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {containerInfo ? (
            <>
              {/* Container Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Container ID</p>
                  <p className="font-mono text-sm">{containerInfo.id}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(containerInfo.status)}>
                    {containerInfo.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Uptime</p>
                  <p className="font-medium">{containerInfo.uptime}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Memory Usage</p>
                  <p className="font-medium">{containerInfo.memory}</p>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button
                  onClick={() => handleContainerAction('start')}
                  disabled={loading || containerInfo.status === 'running'}
                  className="w-full"
                  variant="outline"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </Button>
                <Button
                  onClick={() => handleContainerAction('stop')}
                  disabled={loading || containerInfo.status === 'stopped'}
                  className="w-full"
                  variant="outline"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
                <Button
                  onClick={() => handleContainerAction('restart')}
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  <RotateCw className="h-4 w-4 mr-2" />
                  Restart
                </Button>
                <Button
                  onClick={fetchLogs}
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Logs
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Container className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No container information available</p>
              <p className="text-sm">Make sure WAHA is running</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {logs.length} log entries
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadLogs}
              disabled={logs.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>

          <ScrollArea className="h-[400px] w-full rounded-md border bg-muted/30">
            <div className="p-4 font-mono text-xs space-y-1">
              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <div key={index} className="text-muted-foreground">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No logs available. Click "View Logs" to fetch.
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </Card>
  );
};