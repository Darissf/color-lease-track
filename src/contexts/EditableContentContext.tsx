import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
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
  isSuperAdmin: boolean;
  content: EditableContent;
  updateContent: (key: string, value: string, page: string, category?: string) => Promise<void>;
  getContent: (key: string, defaultValue: string) => string;
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
  const [content, setContent] = useState<EditableContent>({});
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isSuperAdmin = userRole?.role === 'super_admin';
  const sentAtRef = useRef<Map<string, number>>(new Map());

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

  const getContent = (key: string, defaultValue: string = ""): string => {
    const value = content[key] ?? defaultValue;

    // Fire-and-forget render tracking (throttled per user+key+page)
    try {
      const page = typeof window !== 'undefined' ? window.location.pathname : 'unknown';
      const userId = user?.id;
      if (userId) {
        const now = Date.now();
        const uid = `${userId}:${key}:${page}`;
        const last = sentAtRef.current.get(uid) || 0;
        if (now - last > 8000) {
          sentAtRef.current.set(uid, now);
          // No need to await
          supabase
            .from('content_render_stats' as any)
            .upsert(
              {
                user_id: userId,
                content_key: key,
                page,
                rendered_value: String(value),
                last_seen_at: new Date().toISOString(),
              } as any,
              { onConflict: 'user_id,content_key,page' } as any
            )
            .then(() => { /* noop */ });
        }
      }
    } catch {}

    return value;
  };

  const getEditedCountForPage = (pathname: string): number => {
    return Object.keys(content).filter(key => key.startsWith(`${pathname}::`)).length;
  };

  const undo = async () => {
    if (!canUndo || !user) return;
    
    const previousIndex = historyIndex - 1;
    const previousKey = historyStack[previousIndex];

    try {
      // Fetch all versions for this key
      const { data: historyData } = await supabase
        .from('content_history')
        .select('*')
        .eq('content_key', previousKey)
        .order('version_number', { ascending: false })
        .limit(2);

      if (!historyData || historyData.length < 2) {
        toast.error("Tidak ada versi sebelumnya");
        return;
      }

      const previousVersion = historyData[1];
      await updateContent(
        previousVersion.content_key,
        previousVersion.content_value,
        previousVersion.page,
        previousVersion.category
      );

      setHistoryIndex(previousIndex);
      toast.success("Berhasil undo!");
    } catch (error: any) {
      console.error('Error undoing:', error);
      toast.error(error.message || "Gagal undo");
    }
  };

  const redo = async () => {
    if (!canRedo || !user) return;
    
    const nextIndex = historyIndex + 1;
    const nextKey = historyStack[nextIndex];

    try {
      // Fetch the next version
      const { data: historyData } = await supabase
        .from('content_history')
        .select('*')
        .eq('content_key', nextKey)
        .order('version_number', { ascending: false })
        .limit(1);

      if (!historyData || historyData.length === 0) {
        toast.error("Tidak ada versi berikutnya");
        return;
      }

      const nextVersion = historyData[0];
      await updateContent(
        nextVersion.content_key,
        nextVersion.content_value,
        nextVersion.page,
        nextVersion.category
      );

      setHistoryIndex(nextIndex);
      toast.success("Berhasil redo!");
    } catch (error: any) {
      console.error('Error redoing:', error);
      toast.error(error.message || "Gagal redo");
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
    } catch (error: any) {
      console.error('Error getting history:', error);
      toast.error(error.message || "Gagal mengambil history");
      return [];
    }
  };

  const restoreVersion = async (historyId: string) => {
    if (!user || !isSuperAdmin) {
      toast.error("Hanya super admin yang dapat restore versi");
      return;
    }

    try {
      const { data: historyData, error: historyError } = await supabase
        .from('content_history')
        .select('*')
        .eq('id', historyId)
        .single();

      if (historyError) throw historyError;

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
        isSuperAdmin,
        content,
        updateContent,
        getContent,
        getEditedCountForPage,
        undo,
        redo,
        getHistory,
        restoreVersion,
        canUndo,
        canRedo,
      }}
    >
      {children}
    </EditableContentContext.Provider>
  );
}

export const useEditableContent = () => {
  const context = useContext(EditableContentContext);
  if (context === undefined) {
    throw new Error('useEditableContent must be used within EditableContentProvider');
  }
  return context;
};
