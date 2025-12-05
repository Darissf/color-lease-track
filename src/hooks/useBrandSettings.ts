import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BrandSettings {
  id: string;
  brand_text: string;
  display_mode: 'text' | 'image';
  brand_image_url: string | null;
  image_height: number;
  image_max_width: number;
  font_family: string;
  font_weight: string;
  font_size: number;
  letter_spacing: number;
  text_transform: string;
  text_align: string;
  color_type: string;
  solid_color: string;
  gradient_type: string;
  gradient_colors: string[];
  gradient_angle: number;
  shadow_enabled: boolean;
  shadow_color: string;
  shadow_x: number;
  shadow_y: number;
  shadow_blur: number;
  glow_enabled: boolean;
  glow_color: string;
  glow_blur: number;
  outline_enabled: boolean;
  outline_color: string;
  outline_width: number;
  animation: string;
  // Sidebar Logo Settings
  sidebar_logo_url: string | null;
  sidebar_logo_height: number;
  sidebar_logo_max_width: number;
  sidebar_text: string;
  sidebar_display_mode: 'logo' | 'text' | 'both';
}

export const useBrandSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['brand-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vip_design_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as BrandSettings | null;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<BrandSettings>) => {
      if (!settings?.id) {
        // Create new settings
        const { data, error } = await supabase
          .from('vip_design_settings')
          .insert([{ ...newSettings, user_id: user?.id }])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Update existing settings
        const { data, error } = await supabase
          .from('vip_design_settings')
          .update({ ...newSettings, updated_at: new Date().toISOString() })
          .eq('id', settings.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-settings'] });
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
  };
};
