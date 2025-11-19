import { create } from "zustand";

interface ContentItem {
  id: string;
  content_key: string;
  content_value: string;
  page: string;
  category: string;
  updated_at: string;
  is_protected?: boolean;
  protection_reason?: string;
  last_applied_at?: string;
}

interface ContentFilters {
  page: string;
  category: string;
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  updatedBy: string;
  status: "all" | "protected" | "unprotected" | "recently-changed" | "stale";
  sortBy: "updated_at" | "created_at" | "content_key" | "page";
  sortOrder: "asc" | "desc";
  showSkipped: boolean;
}

type SearchMode = "text" | "regex" | "fuzzy" | "ai";

interface ContentStore {
  searchQuery: string;
  searchMode: SearchMode;
  filters: ContentFilters;
  selectedContent: ContentItem | null;
  selectedIds: Set<string>;
  aiMode: boolean;
  aiResults: string[];
  previewMode: "diff" | "live" | "side-by-side";
  showPreview: boolean;
  
  setSearchQuery: (query: string) => void;
  setSearchMode: (mode: SearchMode) => void;
  setFilters: (filters: Partial<ContentFilters>) => void;
  resetFilters: () => void;
  setSelectedContent: (content: ContentItem | null) => void;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setAiResults: (ids: string[]) => void;
  clearAiResults: () => void;
  setPreviewMode: (mode: "diff" | "live" | "side-by-side") => void;
  togglePreview: () => void;
}

const defaultFilters: ContentFilters = {
  page: "all",
  category: "all",
  dateRange: {
    from: null,
    to: null,
  },
  updatedBy: "all",
  status: "all",
  sortBy: "updated_at",
  sortOrder: "desc",
  showSkipped: false,
};

export const useContentStore = create<ContentStore>((set) => ({
  searchQuery: "",
  searchMode: "text",
  filters: defaultFilters,
  selectedContent: null,
  selectedIds: new Set(),
  aiMode: false,
  aiResults: [],
  previewMode: "diff",
  showPreview: false,
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchMode: (mode) => set({ searchMode: mode }),
  setFilters: (newFilters) => set((state) => ({ 
    filters: { ...state.filters, ...newFilters } 
  })),
  resetFilters: () => set({ filters: defaultFilters }),
  setSelectedContent: (content) => set({ selectedContent: content }),
  toggleSelection: (id) => set((state) => {
    const newSet = new Set(state.selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    return { selectedIds: newSet };
  }),
  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
  clearSelection: () => set({ selectedIds: new Set() }),
  setAiResults: (ids) => set({ aiResults: ids, aiMode: ids.length > 0 }),
  clearAiResults: () => set({ aiResults: [], aiMode: false }),
  setPreviewMode: (mode) => set({ previewMode: mode }),
  togglePreview: () => set((state) => ({ showPreview: !state.showPreview })),
}));
