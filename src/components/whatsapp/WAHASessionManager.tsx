import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Square, RefreshCw, LogOut, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWhatsAppSettings } from '@/hooks/useWhatsAppSettings';

type SessionStatus = 'WORKING' | 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'FAILED' | 'UNKNOWN';

export const WAHASessionManager = () => {
  const { toast } = useToast();
  const { settings } = useWhatsAppSettings();
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('UNKNOWN');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSessionStatus = async () => {
    if (!settings?.waha_session_name) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('waha-session-control', {
        body: {
          action: 'status',
          sessionName: settings.waha_session_name
        }
      });

      if (error) throw error;
      setSessionStatus(data.status || 'UNKNOWN');
    } catch (err: any) {
      console.error('Error fetching status:', err);
      toast({
        title: 'Error',
        description: 'Gagal mengambil status session',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionStatus();
    const interval = setInterval(fetchSessionStatus, 10000);
    return () => clearInterval(interval);
  }, [settings?.waha_session_name]);

  const executeAction = async (action: 'start' | 'stop' | 'restart' | 'logout') => {
    if (!settings?.waha_session_name) {
      toast({
        title: 'Error',
        description: 'Session name belum dikonfigurasi',
        variant: 'destructive'
      });
      return;
    }

    setActionLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke('waha-session-control', {
        body: {
          action,
          sessionName: settings.waha_session_name
        }
      });

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: `Session ${action} berhasil dijalankan`
      });

      // Refresh status after action
      setTimeout(fetchSessionStatus, 2000);
    } catch (err: any) {
      console.error(`Error ${action}:`, err);
      toast({
        title: 'Error',
        description: err.message || `Gagal ${action} session`,
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusDisplay = () => {
    const statusConfig = {
      WORKING: { 
        icon: CheckCircle, 
        color: 'text-green-500', 
        bg: 'bg-green-500/5', 
        border: 'border-green-500/20',
        label: 'Session Aktif & Terhubung' 
      },
      STOPPED: { 
        icon: Square, 
        color: 'text-gray-500', 
        bg: 'bg-gray-500/5', 
        border: 'border-gray-500/20',
        label: 'Session Dihentikan' 
      },
      STARTING: { 
        icon: Clock, 
        color: 'text-blue-500', 
        bg: 'bg-blue-500/5', 
        border: 'border-blue-500/20',
        label: 'Session Sedang Dimulai...' 
      },
      SCAN_QR_CODE: { 
        icon: Clock, 
        color: 'text-yellow-500', 
        bg: 'bg-yellow-500/5', 
        border: 'border-yellow-500/20',
        label: 'Menunggu Scan QR Code' 
      },
      FAILED: { 
        icon: XCircle, 
        color: 'text-red-500', 
        bg: 'bg-red-500/5', 
        border: 'border-red-500/20',
        label: 'Session Gagal' 
      },
      UNKNOWN: { 
        icon: Clock, 
        color: 'text-gray-500', 
        bg: 'bg-gray-500/5', 
        border: 'border-gray-500/20',
        label: 'Status Tidak Diketahui' 
      }
    };

    const config = statusConfig[sessionStatus];
    const Icon = config.icon;

    return (
      <Alert className={`${config.border} ${config.bg}`}>
        <Icon className={`h-4 w-4 ${config.color}`} />
        <AlertDescription className={config.color}>
          {config.label}
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Status Session</h3>
            <p className="text-sm text-muted-foreground">
              Session: {settings?.waha_session_name || 'Belum dikonfigurasi'}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchSessionStatus}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {getStatusDisplay()}
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Kontrol Session</h3>
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => executeAction('start')}
            disabled={!settings?.waha_session_name || actionLoading !== null || sessionStatus === 'WORKING'}
            className="w-full"
          >
            {actionLoading === 'start' ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Start Session
          </Button>

          <Button
            onClick={() => executeAction('stop')}
            disabled={!settings?.waha_session_name || actionLoading !== null || sessionStatus === 'STOPPED'}
            variant="destructive"
            className="w-full"
          >
            {actionLoading === 'stop' ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Square className="h-4 w-4 mr-2" />
            )}
            Stop Session
          </Button>

          <Button
            onClick={() => executeAction('restart')}
            disabled={!settings?.waha_session_name || actionLoading !== null}
            variant="outline"
            className="w-full"
          >
            {actionLoading === 'restart' ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Restart Session
          </Button>

          <Button
            onClick={() => executeAction('logout')}
            disabled={!settings?.waha_session_name || actionLoading !== null || sessionStatus !== 'WORKING'}
            variant="outline"
            className="w-full"
          >
            {actionLoading === 'logout' ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4 mr-2" />
            )}
            Logout WhatsApp
          </Button>
        </div>
      </Card>

      <Card className="p-4 bg-muted/50">
        <p className="text-sm font-medium mb-2">ℹ️ Penjelasan</p>
        <ul className="text-xs space-y-1 text-muted-foreground">
          <li>• <strong>Start:</strong> Memulai session baru (perlu scan QR jika belum terhubung)</li>
          <li>• <strong>Stop:</strong> Menghentikan session tanpa logout WhatsApp</li>
          <li>• <strong>Restart:</strong> Restart session (berguna jika ada masalah koneksi)</li>
          <li>• <strong>Logout:</strong> Disconnect WhatsApp dari WAHA (perlu scan QR lagi)</li>
        </ul>
      </Card>
    </div>
  );
};
