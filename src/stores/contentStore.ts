import { create } from "zustand";

interface ContentItem {
  id: string;
  content_key: string;
  content_value: string;
  page: string;
  category: string;
  updated_at: string;
}

interface ContentFilters {
  page: string;
  category: string;
}

interface ContentStore {
  searchQuery: string;
  filters: ContentFilters;
  selectedContent: ContentItem | null;
  aiMode: boolean; // if true, ContentList will use AI-ranked ids
  aiResults: string[]; // ordered list of content ids from AI search
  setSearchQuery: (query: string) => void;
  setFilters: (filters: ContentFilters) => void;
  setSelectedContent: (content: ContentItem | null) => void;
  setAiResults: (ids: string[]) => void;
  clearAiResults: () => void;
}

export const useContentStore = create<ContentStore>((set) => ({
  searchQuery: "",
  filters: {
    page: "all",
    category: "all",
  },
  selectedContent: null,
  aiMode: false,
  aiResults: [],
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilters: (filters) => set({ filters }),
  setSelectedContent: (content) => set({ selectedContent: content }),
  setAiResults: (ids) => set({ aiResults: ids, aiMode: ids.length > 0 }),
  clearAiResults: () => set({ aiResults: [], aiMode: false }),
}));
