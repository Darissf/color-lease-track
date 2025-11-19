import { useState } from "react";
import { Search, Sparkles, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useContentStore } from "@/stores/contentStore";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SearchPanel() {
  const { 
    setSearchQuery, 
    setFilters, 
    filters, 
    setAiResults, 
    clearAiResults,
    searchMode,
    setSearchMode 
  } = useContentStore();
  const [localSearch, setLocalSearch] = useState("");
  const [isAISearch, setIsAISearch] = useState(false);

  const handleSearch = () => {
    clearAiResults();
    setSearchQuery(localSearch);
  };

  const handleAISearch = async () => {
    if (!localSearch.trim()) {
      toast.message("Masukkan kata kunci untuk AI Search");
      return;
    }
    setIsAISearch(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-content-search", {
        body: {
          query: localSearch,
          filters,
        },
      });
      if (error) throw error;

      const ids: string[] = (data?.results || []).map((r: any) => r.id);
      setAiResults(ids);
      setSearchQuery(localSearch);
      if (ids.length === 0) toast.info("AI tidak menemukan konten yang relevan");
    } catch (e) {
      console.error(e);
      toast.error("Gagal menjalankan AI Search");
    } finally {
      setIsAISearch(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant={searchMode === "text" ? "default" : "outline"} 
          className="cursor-pointer"
          onClick={() => setSearchMode("text")}>
          Text
        </Badge>
        <Badge variant={searchMode === "regex" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setSearchMode("regex")}>
          Regex
        </Badge>
        <Badge variant={searchMode === "fuzzy" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setSearchMode("fuzzy")}>
          Fuzzy
        </Badge>
        <Badge variant={searchMode === "ai" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setSearchMode("ai")}>
          <Sparkles className="h-3 w-3 mr-1" />
          AI
        </Badge>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              searchMode === "ai" 
                ? "Ask AI anything about your content..."
                : searchMode === "regex"
                ? "Enter regex pattern..."
                : "Search content..."
            }
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                searchMode === "ai" ? handleAISearch() : handleSearch();
              }
            }}
            className="pl-9"
          />
        </div>
        {searchMode === "ai" ? (
          <Button 
            onClick={handleAISearch} 
            disabled={isAISearch}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI Search
          </Button>
        ) : (
          <Button onClick={handleSearch} variant="secondary">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mt-3 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filters.page} onValueChange={(v) => setFilters({ ...filters, page: v })}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Pages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pages</SelectItem>
            <SelectItem value="/">Home</SelectItem>
            <SelectItem value="/dashboard">Dashboard</SelectItem>
            <SelectItem value="/nabila">Nabila</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="heading">Headings</SelectItem>
            <SelectItem value="button">Buttons</SelectItem>
            <SelectItem value="description">Descriptions</SelectItem>
            <SelectItem value="auto">Auto</SelectItem>
          </SelectContent>
        </Select>

        {(filters.page !== "all" || filters.category !== "all") && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setFilters({ page: "all", category: "all" })}
          >
            Clear Filters
          </Button>
        )}
      </div>
    </Card>
  );
}

