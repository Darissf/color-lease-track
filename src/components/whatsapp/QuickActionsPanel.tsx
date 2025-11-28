import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Copy,
  RotateCw,
  Download,
  CheckCircle2,
  Trash2,
  Shield,
  Activity,
  Terminal,
} from 'lucide-react';

interface QuickActionsPanelProps {
  host: string;
  wahaPort: number;
  onAction?: (action: string) => void;
}

export const QuickActionsPanel = ({ host, wahaPort, onAction }: QuickActionsPanelProps) => {
  const { toast } = useToast();

  const quickActions = [
    {
      id: 'copy-setup',
      label: 'Copy Setup Script',
      icon: Copy,
      description: 'Copy full installation script',
      command: 'setup-script',
    },
    {
      id: 'restart',
      label: 'Restart WAHA',
      icon: RotateCw,
      description: 'Restart WAHA container',
      command: 'docker restart waha',
    },
    {
      id: 'logs',
      label: 'Download Logs',
      icon: Download,
      description: 'Download container logs',
      command: 'docker logs waha > waha-logs.txt',
    },
    {
      id: 'status',
      label: 'Check Status',
      icon: CheckCircle2,
      description: 'View container status',
      command: 'docker ps -a | grep waha',
    },
    {
      id: 'system-info',
      label: 'System Info',
      icon: Activity,
      description: 'View VPS resources',
      command: 'free -h && df -h',
    },
    {
      id: 'firewall',
      label: 'Firewall Setup',
      icon: Shield,
      description: 'Configure firewall',
      command: `sudo ufw allow ${wahaPort}/tcp`,
    },
    {
      id: 'cleanup',
      label: 'Cleanup',
      icon: Trash2,
      description: 'Remove unused images',
      command: 'docker image prune -a',
    },
    {
      id: 'terminal',
      label: 'Open Terminal',
      icon: Terminal,
      description: 'Access web terminal',
      command: 'terminal',
    },
  ];

  const handleAction = (action: typeof quickActions[0]) => {
    if (action.command === 'setup-script') {
      // This will be handled by parent component
      if (onAction) onAction('show-script');
    } else if (action.command === 'terminal') {
      if (onAction) onAction('show-terminal');
    } else {
      // Copy command to clipboard
      navigator.clipboard.writeText(action.command);
      toast({
        title: '✅ Command Copied!',
        description: `Run this in your VPS terminal: ${action.command}`,
      });
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">⚡ Quick Actions</h3>
        <p className="text-sm text-muted-foreground">
          One-click commands untuk manage WAHA di VPS
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              variant="outline"
              className="h-auto flex flex-col items-start p-4 hover:bg-muted/50"
              onClick={() => handleAction(action)}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{action.label}</span>
              </div>
              <p className="text-xs text-muted-foreground text-left">
                {action.description}
              </p>
            </Button>
          );
        })}
      </div>

      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
        <p className="text-sm font-medium">💡 Tips:</p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Klik tombol untuk copy command ke clipboard</li>
          <li>Paste dan jalankan command di SSH terminal VPS</li>
          <li>Beberapa action memerlukan sudo privileges</li>
          <li>Gunakan "Open Terminal" untuk akses langsung via browser</li>
        </ul>
      </div>

      {/* Connection Info */}
      <div className="space-y-2 pt-4 border-t">
        <p className="text-sm font-medium">📍 Connection Info:</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">VPS IP:</span>
            <span className="ml-2 font-mono">{host}</span>
          </div>
          <div>
            <span className="text-muted-foreground">WAHA Port:</span>
            <span className="ml-2 font-mono">{wahaPort}</span>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">API URL:</span>
            <span className="ml-2 font-mono text-xs">http://{host}:{wahaPort}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};