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
  setSearchQuery: (query: string) => void;
  setFilters: (filters: ContentFilters) => void;
  setSelectedContent: (content: ContentItem | null) => void;
}

export const useContentStore = create<ContentStore>((set) => ({
  searchQuery: "",
  filters: {
    page: "all",
    category: "all",
  },
  selectedContent: null,
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilters: (filters) => set({ filters }),
  setSelectedContent: (content) => set({ selectedContent: content }),
}));
