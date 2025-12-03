import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WhatsAppNumber {
  id: string;
  user_id: string;
  name: string;
  phone_number: string;
  provider: 'waha' | 'meta_cloud';
  
  // WAHA Config
  waha_api_url?: string;
  waha_api_key?: string;
  waha_session_name?: string;
  
  // Meta Cloud Config
  meta_phone_number_id?: string;
  meta_access_token?: string;
  meta_business_account_id?: string;
  meta_webhook_verify_token?: string;
  
  // Routing
  priority: number;
  notification_types: string[];
  is_default: boolean;
  
  // Business Hours
  business_hours_enabled: boolean;
  business_hours_start?: string;
  business_hours_end?: string;
  business_days?: number[];
  
  // Rate Limiting
  daily_limit: number;
  messages_sent_today: number;
  
  // Status
  is_active: boolean;
  connection_status: string;
  last_connection_test?: string;
  consecutive_errors: number;
  error_message?: string;
  
  created_at: string;
  updated_at: string;
}

export const useWhatsAppNumbers = () => {
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchNumbers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      setNumbers((data || []) as WhatsAppNumber[]);
    } catch (error: any) {
      console.error('Error fetching WhatsApp numbers:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat daftar nomor WhatsApp',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createNumber = async (data: Partial<WhatsAppNumber>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const insertData = {
        user_id: user.id,
        name: data.name || 'New Number',
        phone_number: data.phone_number || '',
        provider: data.provider || 'waha',
        waha_api_url: data.waha_api_url,
        waha_api_key: data.waha_api_key,
        waha_session_name: data.waha_session_name,
        meta_phone_number_id: data.meta_phone_number_id,
        meta_access_token: data.meta_access_token,
        meta_business_account_id: data.meta_business_account_id,
        meta_webhook_verify_token: data.meta_webhook_verify_token,
        priority: data.priority || 0,
        notification_types: data.notification_types || [],
        is_default: data.is_default || false,
        business_hours_enabled: data.business_hours_enabled || false,
        business_hours_start: data.business_hours_start,
        business_hours_end: data.business_hours_end,
        business_days: data.business_days,
        daily_limit: data.daily_limit || 1000,
        is_active: data.is_active ?? true
      };

      const { data: result, error } = await supabase
        .from('whatsapp_numbers')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      await fetchNumbers();
      toast({
        title: 'Berhasil',
        description: 'Nomor WhatsApp berhasil ditambahkan',
      });
      return result;
    } catch (error: any) {
      console.error('Error creating WhatsApp number:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal menambahkan nomor WhatsApp',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateNumber = async (id: string, data: Partial<WhatsAppNumber>) => {
    try {
      const { error } = await supabase
        .from('whatsapp_numbers')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      await fetchNumbers();
      toast({
        title: 'Berhasil',
        description: 'Nomor WhatsApp berhasil diupdate',
      });
      return true;
    } catch (error: any) {
      console.error('Error updating WhatsApp number:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengupdate nomor WhatsApp',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteNumber = async (id: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_numbers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchNumbers();
      toast({
        title: 'Berhasil',
        description: 'Nomor WhatsApp berhasil dihapus',
      });
      return true;
    } catch (error: any) {
      console.error('Error deleting WhatsApp number:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus nomor WhatsApp',
        variant: 'destructive',
      });
      return false;
    }
  };

  const setAsDefault = async (id: string) => {
    try {
      // First, unset all defaults
      await supabase
        .from('whatsapp_numbers')
        .update({ is_default: false })
        .neq('id', id);

      // Then set the new default
      const { error } = await supabase
        .from('whatsapp_numbers')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;

      await fetchNumbers();
      toast({
        title: 'Berhasil',
        description: 'Nomor default berhasil diubah',
      });
      return true;
    } catch (error: any) {
      console.error('Error setting default number:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengubah nomor default',
        variant: 'destructive',
      });
      return false;
    }
  };

  const testConnection = async (id: string) => {
    try {
      const number = numbers.find(n => n.id === id);
      if (!number) throw new Error('Number not found');

      let result;
      if (number.provider === 'waha') {
        // Test WAHA connection
        const headers: Record<string, string> = {};
        if (number.waha_api_key) {
          headers['X-Api-Key'] = number.waha_api_key;
        }

        const response = await fetch(`${number.waha_api_url}/api/sessions/${number.waha_session_name}`, {
          headers
        });
        
        result = {
          success: response.ok,
          status: response.ok ? 'connected' : 'error',
          message: response.ok ? 'Koneksi berhasil' : 'Gagal terhubung ke WAHA'
        };
      } else {
        // Test Meta Cloud connection
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${number.meta_phone_number_id}`,
          {
            headers: {
              'Authorization': `Bearer ${number.meta_access_token}`
            }
          }
        );

        const data = await response.json();
        result = {
          success: response.ok,
          status: response.ok ? 'connected' : 'error',
          message: response.ok ? 'Koneksi berhasil' : (data.error?.message || 'Gagal terhubung ke Meta Cloud')
        };
      }

      // Update connection status
      await supabase
        .from('whatsapp_numbers')
        .update({
          connection_status: result.status,
          last_connection_test: new Date().toISOString(),
          error_message: result.success ? null : result.message,
          consecutive_errors: result.success ? 0 : (number.consecutive_errors + 1)
        })
        .eq('id', id);

      await fetchNumbers();

      toast({
        title: result.success ? 'Berhasil' : 'Gagal',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });

      return result;
    } catch (error: any) {
      console.error('Error testing connection:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal melakukan test koneksi',
        variant: 'destructive',
      });
      return { success: false, status: 'error', message: error.message };
    }
  };

  useEffect(() => {
    fetchNumbers();
  }, []);

  return {
    numbers,
    loading,
    fetchNumbers,
    createNumber,
    updateNumber,
    deleteNumber,
    setAsDefault,
    testConnection,
  };
};
