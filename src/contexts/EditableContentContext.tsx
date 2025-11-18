import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditableContent {
  [key: string]: string;
}

interface ContentHistory {
  id: string;
  content_key: string;
  content_value: string;
  page: string;
  category: string;
  user_id: string;
  created_at: string;
  version_number: number;
}

interface EditableContentContextType {
  isEditMode: boolean;
  isSuperAdmin: boolean;
  content: EditableContent;
  updateContent: (key: string, value: string, page: string, category?: string) => Promise<void>;
  getContent: (key: string, defaultValue: string) => string;
  toggleEditMode: () => void;
  getEditedCountForPage: (pathname: string) => number;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  getHistory: (contentKey: string) => Promise<ContentHistory[]>;
  restoreVersion: (historyId: string) => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
}

const EditableContentContext = createContext<EditableContentContextType | undefined>(undefined);

export function EditableContentProvider({ children }: { children: ReactNode }) {
  const { user, userRole } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [content, setContent] = useState<EditableContent>({});
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
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

  // Auto-seed helper
  const ensureSeed = async (key: string, defaultValue: string, page: string, category: string) => {
    if (!isSuperAdmin) return;

    try {
      const { data: existing } = await supabase
        .from("editable_content")
        .select("id")
        .eq("content_key", key)
        .maybeSingle();

      if (!existing) {
        await supabase.from("editable_content").insert({
          content_key: key,
          content_value: defaultValue,
          page,
          category,
        });
      }
    } catch (error) {
      console.error("Error seeding content:", error);
    }
  };

  const updateContent = async (key: string, value: string, page: string, category: string = 'general') => {
    if (!isSuperAdmin || !user) {
      toast.error("Hanya super admin yang dapat mengedit konten");
      return;
    }

    try {
      // Get current version number
      const { data: historyData } = await supabase
        .from('content_history')
        .select('version_number')
        .eq('content_key', key)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = (historyData?.[0]?.version_number || 0) + 1;

      // Save to history
      const { error: historyError } = await supabase
        .from('content_history')
        .insert({
          content_key: key,
          content_value: value,
          page,
          category,
          user_id: user.id,
          version_number: nextVersion
        });

      if (historyError) throw historyError;

      // Update current content
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
      
      // Update history stack for undo/redo
      const newStack = [...historyStack.slice(0, historyIndex + 1), key];
      setHistoryStack(newStack);
      setHistoryIndex(newStack.length - 1);
      
      toast.success("Konten berhasil diupdate!");
    } catch (error: any) {
      console.error('Error updating content:', error);
      toast.error(error.message || "Gagal mengupdate konten");
    }
  };

  const getContent = (key: string, defaultValue: string = "", page?: string, category?: string): string => {
    // Auto-seed if needed (debounced)
    if (defaultValue && page && isSuperAdmin && !content[key]) {
      setTimeout(() => ensureSeed(key, defaultValue, page, category || "auto"), 100);
    }
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

  const getEditedCountForPage = (pathname: string): number => {
    return Object.keys(content).filter(key => key.startsWith(`${pathname}::`)).length;
  };

  const undo = async () => {
    if (!canUndo || !user) return;
    
    const previousIndex = historyIndex - 1;
    const previousKey = historyStack[previousIndex];
    
    if (!previousKey) return;

    try {
      // Get the previous version from history
      const { data: historyData, error } = await supabase
        .from('content_history')
        .select('*')
        .eq('content_key', previousKey)
        .order('created_at', { ascending: false })
        .limit(2);

      if (error) throw error;
      
      const previousVersion = historyData?.[1];
      if (previousVersion) {
        await updateContent(
          previousVersion.content_key,
          previousVersion.content_value,
          previousVersion.page,
          previousVersion.category
        );
        setHistoryIndex(previousIndex);
      }
    } catch (error) {
      console.error('Error during undo:', error);
      toast.error("Gagal melakukan undo");
    }
  };

  const redo = async () => {
    if (!canRedo || !user) return;
    
    const nextIndex = historyIndex + 1;
    const nextKey = historyStack[nextIndex];
    
    if (!nextKey) return;

    try {
      const { data: historyData, error } = await supabase
        .from('content_history')
        .select('*')
        .eq('content_key', nextKey)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      const nextVersion = historyData?.[0];
      if (nextVersion) {
        await updateContent(
          nextVersion.content_key,
          nextVersion.content_value,
          nextVersion.page,
          nextVersion.category
        );
        setHistoryIndex(nextIndex);
      }
    } catch (error) {
      console.error('Error during redo:', error);
      toast.error("Gagal melakukan redo");
    }
  };

  const getHistory = async (contentKey: string): Promise<ContentHistory[]> => {
    try {
      const { data, error } = await supabase
        .from('content_history')
        .select('*')
        .eq('content_key', contentKey)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching history:', error);
      return [];
    }
  };

  const restoreVersion = async (historyId: string) => {
    if (!isSuperAdmin || !user) {
      toast.error("Hanya super admin yang dapat restore konten");
      return;
    }

    try {
      const { data: historyData, error: fetchError } = await supabase
        .from('content_history')
        .select('*')
        .eq('id', historyId)
        .single();

      if (fetchError) throw fetchError;

      await updateContent(
        historyData.content_key,
        historyData.content_value,
        historyData.page,
        historyData.category
      );

      toast.success("Versi berhasil direstore!");
    } catch (error: any) {
      console.error('Error restoring version:', error);
      toast.error(error.message || "Gagal restore versi");
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyStack.length - 1;

  return (
    <EditableContentContext.Provider
      value={{
        isEditMode,
        isSuperAdmin,
        content,
        updateContent,
        getContent,
        toggleEditMode,
        getEditedCountForPage,
        undo,
        redo,
        getHistory,
        restoreVersion,
        canUndo,
        canRedo
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
