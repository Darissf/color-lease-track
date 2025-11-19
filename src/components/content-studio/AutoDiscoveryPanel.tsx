import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useContentAutoDiscovery, DiscoveredContent } from "@/hooks/useContentAutoDiscovery";
import { useAuth } from "@/contexts/AuthContext";
import { Search, CheckCircle2, XCircle, Sparkles, Save, Trash2, RefreshCw } from "lucide-react";

interface AutoDiscoveryPanelProps {
  currentPage: string;
}

export default function AutoDiscoveryPanel({ currentPage }: AutoDiscoveryPanelProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"confidence" | "category" | "text">("confidence");
  
  const {
    discoveries,
    isScanning,
    scanPage,
    approveDiscovery,
    updateKey,
    updateCategory,
    bulkApprove,
    saveApproved,
    clearDiscoveries,
  } = useContentAutoDiscovery();

  const filteredDiscoveries = discoveries
    .filter(d => {
      if (filterCategory !== "all" && d.category !== filterCategory) return false;
      if (searchQuery && !d.textContent.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !d.suggestedKey.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "confidence") return b.confidence - a.confidence;
      if (sortBy === "category") return a.category.localeCompare(b.category);
      if (sortBy === "text") return a.textContent.localeCompare(b.textContent);
      return 0;
    });

  const approvedCount = discoveries.filter(d => d.approved).length;
  const categories = Array.from(new Set(discoveries.map(d => d.category)));

  const handleScan = () => {
    scanPage(currentPage);
  };

  const handleSave = async () => {
    if (!user) return;
    const saved = await saveApproved(user.id);
    if (saved && saved > 0) {
      // Optionally refresh or navigate
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-orange-600";
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return "default";
    if (confidence >= 0.6) return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Auto-Discovery
              </CardTitle>
              <CardDescription>
                Automatically scan and capture content from the current page
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleScan}
                disabled={isScanning}
                variant="default"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Scan Page
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {discoveries.length > 0 && (
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              {/* Search */}
              <div className="flex-1">
                <Input
                  placeholder="Search content or keys..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confidence">Confidence</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bulk Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bulkApprove(true)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bulkApprove(false)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject All
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={clearDiscoveries}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
              <span>Found: {discoveries.length}</span>
              <span>•</span>
              <span>Showing: {filteredDiscoveries.length}</span>
              <span>•</span>
              <span className="text-primary font-medium">Approved: {approvedCount}</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Discovery List */}
      {filteredDiscoveries.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="p-4 space-y-2">
                {filteredDiscoveries.map((discovery) => (
                  <DiscoveryItem
                    key={discovery.id}
                    discovery={discovery}
                    onApprove={() => approveDiscovery(discovery.id)}
                    onUpdateKey={(key) => updateKey(discovery.id, key)}
                    onUpdateCategory={(cat) => updateCategory(discovery.id, cat)}
                    getConfidenceColor={getConfidenceColor}
                    getConfidenceBadge={getConfidenceBadge}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      {approvedCount > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg">
            <Save className="h-4 w-4 mr-2" />
            Save {approvedCount} Items
          </Button>
        </div>
      )}

      {/* Empty State */}
      {discoveries.length === 0 && !isScanning && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No discoveries yet</p>
              <p className="text-sm mb-4">Click "Scan Page" to start discovering content</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface DiscoveryItemProps {
  discovery: DiscoveredContent;
  onApprove: () => void;
  onUpdateKey: (key: string) => void;
  onUpdateCategory: (category: string) => void;
  getConfidenceColor: (confidence: number) => string;
  getConfidenceBadge: (confidence: number) => "default" | "secondary" | "outline";
}

function DiscoveryItem({
  discovery,
  onApprove,
  onUpdateKey,
  onUpdateCategory,
  getConfidenceColor,
  getConfidenceBadge,
}: DiscoveryItemProps) {
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [editedKey, setEditedKey] = useState(discovery.suggestedKey);

  const handleSaveKey = () => {
    onUpdateKey(editedKey);
    setIsEditingKey(false);
  };

  return (
    <Card className={discovery.approved ? "border-primary bg-primary/5" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <Checkbox
            checked={discovery.approved}
            onCheckedChange={onApprove}
            className="mt-1"
          />

          {/* Content */}
          <div className="flex-1 space-y-2">
            {/* Text Preview */}
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium line-clamp-2">
                {discovery.textContent}
              </p>
              <Badge variant={getConfidenceBadge(discovery.confidence)}>
                <span className={getConfidenceColor(discovery.confidence)}>
                  {(discovery.confidence * 100).toFixed(0)}%
                </span>
              </Badge>
            </div>

            {/* Key Input */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Key:</span>
              {isEditingKey ? (
                <div className="flex-1 flex gap-2">
                  <Input
                    value={editedKey}
                    onChange={(e) => setEditedKey(e.target.value)}
                    className="h-7 text-xs"
                  />
                  <Button size="sm" variant="outline" onClick={handleSaveKey}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingKey(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <code
                  className="flex-1 text-xs bg-muted px-2 py-1 rounded cursor-pointer hover:bg-muted/80"
                  onClick={() => setIsEditingKey(true)}
                >
                  {discovery.suggestedKey}
                </code>
              )}
            </div>

            {/* Meta */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {discovery.category}
              </Badge>
              <Separator orientation="vertical" className="h-4" />
              <span>{discovery.selector}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
