import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WhatsAppSettings {
  id: string;
  user_id: string;
  waha_api_url: string;
  waha_api_key: string;
  waha_session_name: string;
  is_active: boolean;
  connection_status: 'connected' | 'disconnected' | 'error' | 'unknown';
  last_connection_test: string | null;
  error_message: string | null;
  auto_retry_enabled: boolean;
  max_retry_attempts: number;
  retry_delay_minutes: number;
}

export const useWhatsAppSettings = () => {
  const [settings, setSettings] = useState<WhatsAppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      console.log('[WhatsApp Settings] Fetching settings...');
      
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('[WhatsApp Settings] Error:', error);
        throw error;
      }
      
      console.log('[WhatsApp Settings] Data fetched:', data ? 'Found' : 'Empty');
      setSettings(data as WhatsAppSettings | null);
    } catch (error) {
      console.error('[WhatsApp Settings] Fetch error:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat pengaturan WhatsApp',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (data: Partial<WhatsAppSettings>) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      if (settings?.id) {
        const { error } = await supabase
          .from('whatsapp_settings')
          .update(data)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const insertData: any = { ...data, user_id: user.user.id };
        const { error } = await supabase
          .from('whatsapp_settings')
          .insert([insertData]);
        if (error) throw error;
      }

      await fetchSettings();
      toast({
        title: 'Berhasil',
        description: 'Pengaturan WhatsApp berhasil disimpan',
      });
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Gagal menyimpan pengaturan',
        variant: 'destructive',
      });
      return false;
    }
  };

  const testConnection = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-whatsapp-health');
      
      if (error) throw error;
      
      await fetchSettings();
      
      const result = data?.results?.[0];
      if (result?.healthy) {
        toast({
          title: 'Koneksi Berhasil',
          description: `WAHA terhubung (${result.response_time_ms}ms)`,
        });
        return true;
      } else {
        toast({
          title: 'Koneksi Gagal',
          description: result?.error || 'Tidak dapat terhubung ke WAHA',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengecek koneksi',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    fetchSettings,
    saveSettings,
    testConnection,
  };
};
