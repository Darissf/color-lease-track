import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, RefreshCw, Loader2 } from 'lucide-react';
import { useNotificationLogs } from '@/hooks/useNotificationLogs';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface NotificationDetailDialogProps {
  logId: string;
  onClose: () => void;
}

export const NotificationDetailDialog = ({ logId, onClose }: NotificationDetailDialogProps) => {
  const { logs, retryNotification } = useNotificationLogs();
  const { toast } = useToast();
  const log = logs.find(l => l.id === logId);

  if (!log) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(log.message_content);
    toast({
      title: 'Berhasil',
      description: 'Pesan berhasil disalin',
    });
  };

  const handleRetry = async () => {
    await retryNotification(logId);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detail Notifikasi</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-1">Penerima</p>
              <p className="text-sm">{log.recipient_name || 'N/A'}</p>
              <p className="text-xs text-muted-foreground">{log.recipient_phone}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Status</p>
              <Badge variant={log.status === 'sent' ? 'default' : log.status === 'failed' ? 'destructive' : 'outline'}>
                {log.status}
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Waktu</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(log.created_at), 'dd MMMM yyyy HH:mm:ss', { locale: idLocale })}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Pesan</p>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            <div className="p-4 bg-muted rounded-lg max-h-60 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap font-sans">
                {log.message_content}
              </pre>
            </div>
          </div>

          {log.error_message && (
            <div>
              <p className="text-sm font-medium mb-1 text-red-500">Error Message</p>
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <p className="text-xs text-red-600 dark:text-red-400">{log.error_message}</p>
              </div>
            </div>
          )}

          {log.waha_response && (
            <div>
              <p className="text-sm font-medium mb-1">WAHA Response</p>
              <div className="p-3 bg-muted rounded-lg max-h-40 overflow-y-auto">
                <pre className="text-xs">{JSON.stringify(log.waha_response, null, 2)}</pre>
              </div>
            </div>
          )}

          {log.retry_count > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Retry Info</p>
              <p className="text-sm text-muted-foreground">
                Percobaan ke-{log.retry_count}
              </p>
            </div>
          )}

          {log.status === 'failed' && (
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Kirim Ulang
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
