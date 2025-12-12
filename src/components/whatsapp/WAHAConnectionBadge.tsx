import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWhatsAppSettings } from '@/hooks/useWhatsAppSettings';

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'unknown';

interface WAHAConnectionBadgeProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const WAHAConnectionBadge = ({ showLabel = true, size = 'md' }: WAHAConnectionBadgeProps) => {
  const { settings } = useWhatsAppSettings();
  const [status, setStatus] = useState<ConnectionStatus>('unknown');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkConnection = async () => {
    if (!settings?.waha_api_url || !settings?.waha_session_name) {
      setStatus('disconnected');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('waha-session-control', {
        body: {
          action: 'status',
          sessionName: settings.waha_session_name
        }
      });

      if (error) throw error;

      if (data.status === 'WORKING') {
        setStatus('connected');
      } else if (data.status === 'STARTING' || data.status === 'SCAN_QR_CODE') {
        setStatus('connecting');
      } else {
        setStatus('disconnected');
      }
      
      setLastChecked(new Date());
    } catch (err) {
      console.error('Connection check error:', err);
      setStatus('disconnected');
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [settings?.waha_api_url, settings?.waha_session_name]);

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          label: 'Terhubung',
          className: 'bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20',
          dotColor: 'bg-green-500',
          tooltip: 'WhatsApp terhubung dan siap digunakan'
        };
      case 'connecting':
        return {
          icon: Loader2,
          label: 'Menghubungkan...',
          className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/20',
          dotColor: 'bg-yellow-500',
          tooltip: 'Sedang menghubungkan ke WhatsApp'
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          label: 'Terputus',
          className: 'bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20',
          dotColor: 'bg-red-500',
          tooltip: 'WhatsApp tidak terhubung'
        };
      default:
        return {
          icon: WifiOff,
          label: 'Unknown',
          className: 'bg-gray-500/10 text-gray-600 border-gray-500/30 hover:bg-gray-500/20',
          dotColor: 'bg-gray-500',
          tooltip: 'Status koneksi tidak diketahui'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  const dotSize = size === 'sm' ? 'h-1.5 w-1.5' : size === 'lg' ? 'h-2.5 w-2.5' : 'h-2 w-2';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`${config.className} cursor-pointer transition-colors gap-1.5`}
            onClick={() => checkConnection()}
          >
            <span className={`${dotSize} ${config.dotColor} rounded-full animate-pulse`} />
            <Icon className={`${iconSize} ${status === 'connecting' ? 'animate-spin' : ''}`} />
            {showLabel && <span className="text-xs">{config.label}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
          {lastChecked && (
            <p className="text-xs text-muted-foreground mt-1">
              Terakhir dicek: {lastChecked.toLocaleTimeString('id-ID')}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
