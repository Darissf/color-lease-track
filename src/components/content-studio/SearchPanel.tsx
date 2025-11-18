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

export function SearchPanel() {
  const { setSearchQuery, setFilters, filters } = useContentStore();
  const [localSearch, setLocalSearch] = useState("");
  const [isAISearch, setIsAISearch] = useState(false);

  const handleSearch = () => {
    setSearchQuery(localSearch);
  };

  const handleAISearch = async () => {
    setIsAISearch(true);
    // TODO: Implement AI search via edge function
    setSearchQuery(localSearch);
    setTimeout(() => setIsAISearch(false), 1000);
  };

  return (
    <Card className="p-4">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content... (try: 'cari semua teks tentang budget')"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch} variant="secondary">
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
        <Button 
          onClick={handleAISearch} 
          variant="default"
          disabled={isAISearch}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          AI Search
        </Button>
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
