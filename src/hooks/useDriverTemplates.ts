import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DriverTemplate {
  id: string;
  user_id: string;
  template_name: string;
  driver_name: string;
  driver_phone: string | null;
  vehicle_info: string | null;
  warehouse_address: string | null;
  warehouse_lat: number | null;
  warehouse_lng: number | null;
  warehouse_gmaps_link: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface DriverTemplateInput {
  template_name: string;
  driver_name: string;
  driver_phone?: string;
  vehicle_info?: string;
  warehouse_address?: string;
  warehouse_lat?: number;
  warehouse_lng?: number;
  warehouse_gmaps_link?: string;
  is_default?: boolean;
}

export const useDriverTemplates = () => {
  const [templates, setTemplates] = useState<DriverTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultTemplate, setDefaultTemplate] = useState<DriverTemplate | null>(null);
  const { toast } = useToast();

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('driver_templates')
        .select('*')
        .order('is_default', { ascending: false })
        .order('template_name', { ascending: true });

      if (error) throw error;

      // Type assertion since the table is new and not in types yet
      const typedData = data as unknown as DriverTemplate[];
      setTemplates(typedData || []);
      
      const defaultTpl = typedData?.find(t => t.is_default) || null;
      setDefaultTemplate(defaultTpl);
    } catch (error: any) {
      console.error('Error fetching driver templates:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat template driver',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (input: DriverTemplateInput): Promise<DriverTemplate | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('driver_templates')
        .insert({
          user_id: userData.user.id,
          template_name: input.template_name,
          driver_name: input.driver_name,
          driver_phone: input.driver_phone || null,
          vehicle_info: input.vehicle_info || null,
          warehouse_address: input.warehouse_address || null,
          warehouse_lat: input.warehouse_lat || null,
          warehouse_lng: input.warehouse_lng || null,
          warehouse_gmaps_link: input.warehouse_gmaps_link || null,
          is_default: input.is_default || false,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: `Template "${input.template_name}" berhasil disimpan`,
      });

      await fetchTemplates();
      return data as unknown as DriverTemplate;
    } catch (error: any) {
      console.error('Error creating driver template:', error);
      toast({
        title: 'Error',
        description: 'Gagal menyimpan template driver',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateTemplate = async (id: string, input: Partial<DriverTemplateInput>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('driver_templates')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Template driver berhasil diperbarui',
      });

      await fetchTemplates();
      return true;
    } catch (error: any) {
      console.error('Error updating driver template:', error);
      toast({
        title: 'Error',
        description: 'Gagal memperbarui template driver',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteTemplate = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('driver_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Template driver berhasil dihapus',
      });

      await fetchTemplates();
      return true;
    } catch (error: any) {
      console.error('Error deleting driver template:', error);
      toast({
        title: 'Error',
        description: 'Gagal menghapus template driver',
        variant: 'destructive',
      });
      return false;
    }
  };

  const setAsDefault = async (id: string): Promise<boolean> => {
    return updateTemplate(id, { is_default: true });
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    defaultTemplate,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setAsDefault,
  };
};
