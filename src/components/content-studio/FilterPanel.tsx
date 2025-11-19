import { useContentStore } from "@/stores/contentStore";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, X, Shield, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function FilterPanel() {
  const { filters, setFilters, resetFilters } = useContentStore();

  const pages = [
    "all",
    "/",
    "/dashboard",
    "/profile",
    "/settings",
    "/login",
    "/register",
  ];

  const categories = [
    "all",
    "general",
    "navigation",
    "button",
    "heading",
    "description",
    "error",
    "success",
  ];

  const statusOptions = [
    { value: "all", label: "All Content", icon: null },
    { value: "protected", label: "Protected", icon: Shield },
    { value: "unprotected", label: "Unprotected", icon: null },
    { value: "recently-changed", label: "Recent (24h)", icon: Clock },
    { value: "stale", label: "Stale (>30d)", icon: AlertCircle },
  ];

  const hasActiveFilters = 
    filters.page !== "all" ||
    filters.category !== "all" ||
    filters.dateRange.from !== null ||
    filters.status !== "all" ||
    filters.showSkipped;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-8"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Page Filter */}
      <div className="space-y-2">
        <Label>Page</Label>
        <Select
          value={filters.page}
          onValueChange={(value) => setFilters({ page: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pages.map((page) => (
              <SelectItem key={page} value={page}>
                {page === "all" ? "All Pages" : page}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category Filter */}
      <div className="space-y-2">
        <Label>Category</Label>
        <Select
          value={filters.category}
          onValueChange={(value) => setFilters({ category: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat === "all" ? "All Categories" : cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status Filter */}
      <div className="space-y-2">
        <Label>Status</Label>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => {
            const Icon = option.icon;
            const isActive = filters.status === option.value;
            return (
              <Badge
                key={option.value}
                variant={isActive ? "default" : "outline"}
                className={cn(
                  "cursor-pointer",
                  isActive && "bg-primary text-primary-foreground"
                )}
                onClick={() => setFilters({ status: option.value as any })}
              >
                {Icon && <Icon className="h-3 w-3 mr-1" />}
                {option.label}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Date Range */}
      <div className="space-y-2">
        <Label>Date Range</Label>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.dateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange.from ? (
                  format(filters.dateRange.from, "PP")
                ) : (
                  "From"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateRange.from || undefined}
                onSelect={(date) =>
                  setFilters({
                    dateRange: { ...filters.dateRange, from: date || null },
                  })
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.dateRange.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange.to ? (
                  format(filters.dateRange.to, "PP")
                ) : (
                  "To"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateRange.to || undefined}
                onSelect={(date) =>
                  setFilters({
                    dateRange: { ...filters.dateRange, to: date || null },
                  })
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        {(filters.dateRange.from || filters.dateRange.to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setFilters({ dateRange: { from: null, to: null } })
            }
            className="w-full"
          >
            Clear Dates
          </Button>
        )}
      </div>

      {/* Sort Options */}
      <div className="space-y-2">
        <Label>Sort By</Label>
        <Select
          value={filters.sortBy}
          onValueChange={(value) => setFilters({ sortBy: value as any })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated_at">Last Updated</SelectItem>
            <SelectItem value="created_at">Created Date</SelectItem>
            <SelectItem value="content_key">Content Key</SelectItem>
            <SelectItem value="page">Page</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Order</Label>
        <Select
          value={filters.sortOrder}
          onValueChange={(value) => setFilters({ sortOrder: value as any })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Descending</SelectItem>
            <SelectItem value="asc">Ascending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Show Skipped */}
      <div className="flex items-center justify-between space-x-2 pt-2">
        <Label htmlFor="show-skipped" className="cursor-pointer">
          Show Skip-Apply Items
        </Label>
        <Switch
          id="show-skipped"
          checked={filters.showSkipped}
          onCheckedChange={(checked) => setFilters({ showSkipped: checked })}
        />
      </div>
    </div>
  );
}
