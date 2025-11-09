import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditableContent {
  [key: string]: string;
}

interface EditableContentContextType {
  isEditMode: boolean;
  isSuperAdmin: boolean;
  content: EditableContent;
  updateContent: (key: string, value: string, page: string, category?: string) => Promise<void>;
  getContent: (key: string, defaultValue: string) => string;
  toggleEditMode: () => void;
}

const EditableContentContext = createContext<EditableContentContextType | undefined>(undefined);

export function EditableContentProvider({ children }: { children: ReactNode }) {
  const { user, userRole } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [content, setContent] = useState<EditableContent>({});
  const isSuperAdmin = userRole?.role === 'super_admin';

  useEffect(() => {
    fetchContent();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('editable-content-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'editable_content'
        },
        () => {
          fetchContent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchContent = async () => {
    const { data, error } = await supabase
      .from('editable_content')
      .select('*');

    if (error) {
      console.error('Error fetching content:', error);
      return;
    }

    const contentMap: EditableContent = {};
    data?.forEach((item) => {
      contentMap[item.content_key] = item.content_value;
    });
    setContent(contentMap);
  };

  const updateContent = async (key: string, value: string, page: string, category: string = 'general') => {
    if (!isSuperAdmin || !user) {
      toast.error("Hanya super admin yang dapat mengedit konten");
      return;
    }

    try {
      const { error } = await supabase
        .from('editable_content')
        .upsert({
          content_key: key,
          content_value: value,
          page,
          category,
          updated_by: user.id,
          created_by: user.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'content_key'
        });

      if (error) throw error;

      setContent(prev => ({ ...prev, [key]: value }));
      toast.success("Konten berhasil diupdate!");
    } catch (error: any) {
      console.error('Error updating content:', error);
      toast.error(error.message || "Gagal mengupdate konten");
    }
  };

  const getContent = (key: string, defaultValue: string): string => {
    return content[key] || defaultValue;
  };

  const toggleEditMode = () => {
    if (!isSuperAdmin) {
      toast.error("Hanya super admin yang dapat mengaktifkan mode edit");
      return;
    }
    setIsEditMode(!isEditMode);
    toast.success(isEditMode ? "Mode edit dinonaktifkan" : "Mode edit diaktifkan - Double click pada text untuk mengedit");
  };

  return (
    <EditableContentContext.Provider
      value={{
        isEditMode,
        isSuperAdmin,
        content,
        updateContent,
        getContent,
        toggleEditMode
      }}
    >
      {children}
    </EditableContentContext.Provider>
  );
}

export function useEditableContent() {
  const context = useContext(EditableContentContext);
  if (context === undefined) {
    throw new Error("useEditableContent must be used within EditableContentProvider");
  }
  return context;
}
