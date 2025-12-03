import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export interface WhatsAppAnalyticsData {
  id: string;
  user_id: string;
  whatsapp_number_id?: string;
  date: string;
  messages_sent: number;
  messages_delivered: number;
  messages_read: number;
  messages_failed: number;
  messages_received: number;
  delivery_rate?: number;
  read_rate?: number;
  response_rate?: number;
  avg_response_time_seconds?: number;
  breakdown_by_type?: Record<string, number>;
  total_link_clicks: number;
  created_at: string;
}

export interface AnalyticsSummary {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  totalReceived: number;
  deliveryRate: number;
  readRate: number;
  responseRate: number;
  avgResponseTime: number;
  totalLinkClicks: number;
}

export const useWhatsAppAnalytics = () => {
  const [analytics, setAnalytics] = useState<WhatsAppAnalyticsData[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary>({
    totalSent: 0,
    totalDelivered: 0,
    totalRead: 0,
    totalFailed: 0,
    totalReceived: 0,
    deliveryRate: 0,
    readRate: 0,
    responseRate: 0,
    avgResponseTime: 0,
    totalLinkClicks: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAnalytics = async (options?: {
    startDate?: Date;
    endDate?: Date;
    numberId?: string;
    days?: number;
  }) => {
    try {
      setLoading(true);

      const endDate = options?.endDate || new Date();
      const startDate = options?.startDate || subDays(endDate, options?.days || 30);

      let query = supabase
        .from('whatsapp_analytics')
        .select('*')
        .gte('date', format(startOfDay(startDate), 'yyyy-MM-dd'))
        .lte('date', format(endOfDay(endDate), 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (options?.numberId) {
        query = query.eq('whatsapp_number_id', options.numberId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const analyticsData = (data || []) as WhatsAppAnalyticsData[];
      setAnalytics(analyticsData);

      // Calculate summary
      const totalSent = analyticsData.reduce((sum, a) => sum + (a.messages_sent || 0), 0);
      const totalDelivered = analyticsData.reduce((sum, a) => sum + (a.messages_delivered || 0), 0);
      const totalRead = analyticsData.reduce((sum, a) => sum + (a.messages_read || 0), 0);
      const totalFailed = analyticsData.reduce((sum, a) => sum + (a.messages_failed || 0), 0);
      const totalReceived = analyticsData.reduce((sum, a) => sum + (a.messages_received || 0), 0);
      const totalLinkClicks = analyticsData.reduce((sum, a) => sum + (a.total_link_clicks || 0), 0);
      
      const totalResponseTime = analyticsData.reduce((sum, a) => sum + (a.avg_response_time_seconds || 0), 0);
      const daysWithResponseTime = analyticsData.filter(a => a.avg_response_time_seconds).length;

      setSummary({
        totalSent,
        totalDelivered,
        totalRead,
        totalFailed,
        totalReceived,
        deliveryRate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100 * 100) / 100 : 0,
        readRate: totalSent > 0 ? Math.round((totalRead / totalSent) * 100 * 100) / 100 : 0,
        responseRate: totalSent > 0 ? Math.round((totalReceived / totalSent) * 100 * 100) / 100 : 0,
        avgResponseTime: daysWithResponseTime > 0 ? Math.round(totalResponseTime / daysWithResponseTime) : 0,
        totalLinkClicks
      });

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat data analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    return analytics.map(a => ({
      date: format(new Date(a.date), 'dd MMM'),
      fullDate: a.date,
      sent: a.messages_sent || 0,
      delivered: a.messages_delivered || 0,
      read: a.messages_read || 0,
      failed: a.messages_failed || 0,
      received: a.messages_received || 0,
      linkClicks: a.total_link_clicks || 0,
      deliveryRate: a.delivery_rate || 0,
      readRate: a.read_rate || 0,
      responseRate: a.response_rate || 0
    }));
  };

  const getBreakdownByType = () => {
    const breakdown: Record<string, number> = {};
    
    analytics.forEach(a => {
      if (a.breakdown_by_type) {
        Object.entries(a.breakdown_by_type).forEach(([type, count]) => {
          breakdown[type] = (breakdown[type] || 0) + (count as number);
        });
      }
    });

    return Object.entries(breakdown).map(([type, count]) => ({
      type,
      count,
      label: getTypeLabel(type)
    }));
  };

  const exportData = async (format: 'csv' | 'json' = 'csv') => {
    try {
      if (format === 'csv') {
        const headers = ['Date', 'Sent', 'Delivered', 'Read', 'Failed', 'Received', 'Delivery Rate', 'Read Rate', 'Response Rate', 'Link Clicks'];
        const rows = analytics.map(a => [
          a.date,
          a.messages_sent,
          a.messages_delivered,
          a.messages_read,
          a.messages_failed,
          a.messages_received,
          a.delivery_rate || 0,
          a.read_rate || 0,
          a.response_rate || 0,
          a.total_link_clicks
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        downloadFile(csv, 'whatsapp-analytics.csv', 'text/csv');
      } else {
        downloadFile(JSON.stringify(analytics, null, 2), 'whatsapp-analytics.json', 'application/json');
      }

      toast({
        title: 'Berhasil',
        description: 'Data berhasil di-export',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Gagal export data',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return {
    analytics,
    summary,
    loading,
    fetchAnalytics,
    getChartData,
    getBreakdownByType,
    exportData
  };
};

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    delivery: 'Notifikasi Pengiriman',
    pickup: 'Notifikasi Pengambilan',
    invoice: 'Invoice',
    payment: 'Konfirmasi Pembayaran',
    reminder: 'Pengingat',
    manual: 'Manual',
    scheduled: 'Terjadwal',
    custom: 'Custom'
  };
  return labels[type] || type;
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
