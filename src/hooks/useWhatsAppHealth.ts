import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HealthCheck {
  id: string;
  user_id: string;
  check_type: 'manual' | 'scheduled' | 'auto';
  status: 'healthy' | 'unhealthy' | 'error';
  response_time_ms: number | null;
  waha_version: string | null;
  session_status: string | null;
  error_message: string | null;
  checked_at: string;
}

export const useWhatsAppHealth = () => {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [latestCheck, setLatestCheck] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealthChecks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_health_checks')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setHealthChecks((data || []) as HealthCheck[]);
      if (data && data.length > 0) {
        setLatestCheck(data[0] as HealthCheck);
      }
    } catch (error) {
      console.error('Error fetching health checks:', error);
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-whatsapp-health');
      if (error) throw error;
      await fetchHealthChecks();
      return data;
    } catch (error) {
      console.error('Error running health check:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchHealthChecks();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchHealthChecks, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    healthChecks,
    latestCheck,
    loading,
    fetchHealthChecks,
    runHealthCheck,
  };
};
