import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface VPSCredentials {
  id?: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  waha_port: number;
  waha_session_name: string;
  waha_api_key?: string;
  is_default?: boolean;
  last_used_at?: string;
  created_at?: string;
  updated_at?: string;
}

export const useVPSCredentials = () => {
  const [credentials, setCredentials] = useState<VPSCredentials[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadCredentials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('vps-credentials-manager', {
        body: { action: 'list' }
      });

      if (error) throw error;
      if (data?.success) {
        setCredentials(data.data || []);
      }
    } catch (error: any) {
      console.error('Error loading VPS credentials:', error);
      toast({
        title: 'Gagal memuat VPS credentials',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveCredentials = async (creds: VPSCredentials) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('vps-credentials-manager', {
        body: { 
          action: 'save',
          credentials: creds
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error('Failed to save credentials');

      toast({
        title: 'Berhasil',
        description: 'VPS credentials berhasil disimpan',
      });

      await loadCredentials();
      return data.data;
    } catch (error: any) {
      console.error('Error saving VPS credentials:', error);
      toast({
        title: 'Gagal menyimpan',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateCredentials = async (id: string, creds: Partial<VPSCredentials>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('vps-credentials-manager', {
        body: { 
          action: 'update',
          id,
          credentials: creds
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error('Failed to update credentials');

      toast({
        title: 'Berhasil',
        description: 'VPS credentials berhasil diupdate',
      });

      await loadCredentials();
    } catch (error: any) {
      console.error('Error updating VPS credentials:', error);
      toast({
        title: 'Gagal mengupdate',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteCredentials = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('vps-credentials-manager', {
        body: { 
          action: 'delete',
          id
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error('Failed to delete credentials');

      toast({
        title: 'Berhasil',
        description: 'VPS credentials berhasil dihapus',
      });

      await loadCredentials();
    } catch (error: any) {
      console.error('Error deleting VPS credentials:', error);
      toast({
        title: 'Gagal menghapus',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const setAsDefault = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('vps-credentials-manager', {
        body: { 
          action: 'set-default',
          id
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error('Failed to set default');

      toast({
        title: 'Berhasil',
        description: 'VPS default berhasil diubah',
      });

      await loadCredentials();
    } catch (error: any) {
      console.error('Error setting default VPS:', error);
      toast({
        title: 'Gagal',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const findByHost = (host: string) => {
    return credentials.find(cred => cred.host === host);
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  return {
    credentials,
    loading,
    loadCredentials,
    saveCredentials,
    updateCredentials,
    deleteCredentials,
    setAsDefault,
    findByHost,
  };
};