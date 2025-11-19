import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useContentAutoDiscovery, DiscoveredContent } from "@/hooks/useContentAutoDiscovery";
import { useAuth } from "@/contexts/AuthContext";
import { Search, CheckCircle2, XCircle, Sparkles, Save, Trash2, RefreshCw, Zap, ZapOff, Copy, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface AutoDiscoveryPanelProps {
  currentPage: string;
}

export default function AutoDiscoveryPanel({ currentPage }: AutoDiscoveryPanelProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"confidence" | "category" | "text">("confidence");
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [selectedKeepKeys, setSelectedKeepKeys] = useState<Record<number, string>>({});
  
  const {
    discoveries,
    isScanning,
    smartAutoEnabled,
    autoSavedCount,
    duplicates,
    scanPage,
    approveDiscovery,
    updateKey,
    updateCategory,
    bulkApprove,
    saveApproved,
    clearDiscoveries,
    toggleSmartAuto,
    findDuplicates,
    cleanupDuplicates,
    analyzeKeyQuality,
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

  const handleFindDuplicates = async () => {
    const found = await findDuplicates();
    if (found && found.length > 0) {
      // Smart default selection: auto-select the best key for each group
      const initialSelections: Record<number, string> = {};
      found.forEach((group, index) => {
        const sortedEntries = [...group.entries].sort((a, b) => {
          const qualityA = analyzeKeyQuality(a.key);
          const qualityB = analyzeKeyQuality(b.key);
          
          if (qualityA.priority !== qualityB.priority) {
            return qualityA.priority - qualityB.priority;
          }
          return a.key.length - b.key.length;
        });
        
        initialSelections[index] = sortedEntries[0].key;
      });
      setSelectedKeepKeys(initialSelections);
      setShowDuplicatesModal(true);
    }
  };

  const handleCleanupDuplicate = async (groupIndex: number) => {
    const keepKey = selectedKeepKeys[groupIndex];
    if (!keepKey) return;
    await cleanupDuplicates(groupIndex, keepKey);
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
      {/* Duplicate Detection Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Copy className="h-5 w-5 text-primary" />
                Duplicate Detection
                {duplicates.length > 0 && (
                  <Badge variant="destructive">{duplicates.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Find and clean duplicate content entries
              </CardDescription>
            </div>
            <Button onClick={handleFindDuplicates} variant="outline" size="sm">
              <Search className="h-4 w-4 mr-2" />
              Scan for Duplicates
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Auto-Discovery
                {smartAutoEnabled && (
                  <Badge variant="secondary" className="text-xs">
                    Smart Auto (≥80%)
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {smartAutoEnabled 
                  ? "High-confidence items (≥80%) are auto-saved. Review remaining items below."
                  : "Scan pages and manually review discovered content"}
              </CardDescription>
              {autoSavedCount > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  ✨ {autoSavedCount} items auto-saved this session
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={toggleSmartAuto}
                variant={smartAutoEnabled ? "default" : "outline"}
                size="sm"
              >
                {smartAutoEnabled ? <Zap className="mr-2 h-4 w-4" /> : <ZapOff className="mr-2 h-4 w-4" />}
                Smart Auto
              </Button>
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

      {/* Duplicates Modal */}
      <Dialog open={showDuplicatesModal} onOpenChange={setShowDuplicatesModal}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Duplicate Content Found</DialogTitle>
            <DialogDescription>
              Found {duplicates.length} group(s) of duplicate content. These entries have the same content but different keys.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {duplicates.map((group, groupIndex) => {
                const allGenerated = group.entries.every(e => analyzeKeyQuality(e.key).type === 'generated');
                
                return (
                  <Card key={groupIndex}>
                    <CardHeader>
                      <div className="space-y-2">
                        <div className="text-lg font-bold text-primary">"{group.content}"</div>
                        <CardDescription>
                          Page: {group.page} • {group.entries.length} duplicate entries
                        </CardDescription>
                      </div>
                      
                      {allGenerated && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3 flex items-start gap-2 mt-3">
                          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-yellow-700 dark:text-yellow-500">
                            All entries are auto-generated. Consider creating a semantic key manually (e.g., "dashboard.section_name").
                          </div>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm font-medium">Select the best key to keep:</div>
                      <div className="text-xs text-muted-foreground mb-2">
                        💡 Tip: Semantic keys (short, descriptive) are easier to maintain than selector-based keys
                      </div>
                      
                      <RadioGroup
                        value={selectedKeepKeys[groupIndex]}
                        onValueChange={(value) => 
                          setSelectedKeepKeys(prev => ({ ...prev, [groupIndex]: value }))
                        }
                      >
                        {group.entries.map((entry) => {
                          const quality = analyzeKeyQuality(entry.key);
                          const isRecommended = selectedKeepKeys[groupIndex] === entry.key;
                          
                          return (
                            <div 
                              key={entry.id} 
                              className={`flex items-start space-x-2 p-3 rounded-md border ${
                                isRecommended ? 'bg-green-500/5 border-green-500/20' : 'border-border'
                              }`}
                            >
                              <RadioGroupItem 
                                value={entry.key} 
                                id={`${groupIndex}-${entry.id}`}
                                className="mt-1 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  {quality.type === 'semantic' && (
                                    <>
                                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                      <Badge variant="default" className="bg-green-600 text-xs">Recommended</Badge>
                                    </>
                                  )}
                                  {quality.type === 'generated' && (
                                    <>
                                      <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                                      <Badge variant="outline" className="text-xs border-yellow-600 text-yellow-600">Auto-Generated</Badge>
                                    </>
                                  )}
                                  {quality.type === 'component' && (
                                    <Badge variant="secondary" className="text-xs">Component-Based</Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">({entry.key.length} chars)</span>
                                </div>
                                <Label 
                                  htmlFor={`${groupIndex}-${entry.id}`}
                                  className="cursor-pointer text-xs font-mono break-all block"
                                >
                                  {entry.key.length > 80 
                                    ? `${entry.key.substring(0, 40)}...${entry.key.substring(entry.key.length - 35)}` 
                                    : entry.key
                                  }
                                </Label>
                              </div>
                            </div>
                          );
                        })}
                      </RadioGroup>
                      
                      <Button
                        onClick={() => {
                          handleCleanupDuplicate(groupIndex);
                          toast.success("Duplicates cleaned successfully");
                        }}
                        size="sm"
                        variant="destructive"
                        className="w-full"
                        disabled={!selectedKeepKeys[groupIndex]}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clean This Group ({group.entries.length - 1} will be deleted)
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
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
