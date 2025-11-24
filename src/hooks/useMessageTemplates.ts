import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type TemplateType = 'delivery' | 'pickup' | 'invoice' | 'payment' | 'reminder' | 'custom';

export interface MessageTemplate {
  id: string;
  user_id: string;
  template_type: TemplateType;
  template_name: string;
  template_content: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useMessageTemplates = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_message_templates')
        .select('*')
        .order('template_type');

      if (error) throw error;
      setTemplates((data || []) as MessageTemplate[]);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat template',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = async (templateType: TemplateType, content: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_message_templates')
        .update({ template_content: content, updated_at: new Date().toISOString() })
        .eq('template_type', templateType);

      if (error) throw error;

      await fetchTemplates();
      toast({
        title: 'Berhasil',
        description: 'Template berhasil diupdate',
      });
      return true;
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengupdate template',
        variant: 'destructive',
      });
      return false;
    }
  };

  const getTemplate = (type: TemplateType): MessageTemplate | undefined => {
    return templates.find(t => t.template_type === type);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    fetchTemplates,
    updateTemplate,
    getTemplate,
  };
};
