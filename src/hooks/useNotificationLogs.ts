import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NotificationLog {
  id: string;
  user_id: string;
  contract_id: string | null;
  notification_type: string;
  recipient_phone: string;
  recipient_name: string | null;
  message_content: string;
  status: 'pending' | 'sent' | 'failed' | 'queued' | 'retrying';
  error_message: string | null;
  waha_response: any;
  retry_count: number;
  sent_at: string | null;
  created_at: string;
}

export interface NotificationStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  successRate: number;
}

interface Filters {
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  status?: string;
}

export const useNotificationLogs = (filters?: Filters) => {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      console.log('[Notification Logs] Fetching logs with filters:', filters);
      
      let query = supabase
        .from('whatsapp_notifications_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      if (filters?.type && filters.type !== 'all') {
        query = query.eq('notification_type', filters.type);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('[Notification Logs] Error:', error);
        throw error;
      }
      
      console.log('[Notification Logs] Data fetched:', data?.length || 0, 'logs');
      setLogs((data || []) as NotificationLog[]);

      // Calculate stats
      const sent = data?.filter(l => l.status === 'sent').length || 0;
      const failed = data?.filter(l => l.status === 'failed').length || 0;
      const pending = data?.filter(l => ['pending', 'queued', 'retrying'].includes(l.status)).length || 0;
      const total = count || 0;

      setStats({
        total,
        sent,
        failed,
        pending,
        successRate: total > 0 ? (sent / total) * 100 : 0,
      });
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const retryNotification = async (logId: string) => {
    try {
      const log = logs.find(l => l.id === logId);
      if (!log) throw new Error('Log not found');

      // Re-send notification
      const { error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone: log.recipient_phone,
          message: log.message_content,
          notificationType: 'manual',
          contractId: log.contract_id,
        },
      });

      if (error) throw error;

      await fetchLogs();
      toast({
        title: 'Berhasil',
        description: 'Notifikasi berhasil dikirim ulang',
      });
      return true;
    } catch (error) {
      console.error('Error retrying notification:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengirim ulang notifikasi',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  return {
    logs,
    stats,
    loading,
    fetchLogs,
    retryNotification,
  };
};
