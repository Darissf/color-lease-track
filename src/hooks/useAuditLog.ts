import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAuditLog() {
  const { user } = useAuth();

  const logAction = async (
    action: string,
    entityType: string,
    entityId?: string,
    oldData?: any,
    newData?: any
  ) => {
    if (!user) return;

    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_data: oldData,
        new_data: newData,
      });
    } catch (error) {
      console.error('Error logging audit action:', error);
    }
  };

  return { logAction };
}
