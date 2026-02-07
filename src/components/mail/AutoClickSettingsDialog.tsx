import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Plus, Link, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AutoClickSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keywords: string[];
  onSave: (keywords: string[]) => Promise<void>;
  onCancel: () => void;
}

export function AutoClickSettingsDialog({
  open,
  onOpenChange,
  keywords: initialKeywords,
  onSave,
  onCancel,
}: AutoClickSettingsDialogProps) {
  const { toast } = useToast();
  const [keywords, setKeywords] = useState<string[]>(initialKeywords);
  const [newKeyword, setNewKeyword] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync with parent state when dialog opens
  useEffect(() => {
    if (open) {
      setKeywords(initialKeywords);
      setNewKeyword("");
    }
  }, [open, initialKeywords]);

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim();
    if (!trimmed) {
      toast({
        title: "Error",
        description: "Keyword tidak boleh kosong",
        variant: "destructive",
      });
      return;
    }
    if (keywords.includes(trimmed)) {
      toast({
        title: "Error",
        description: "Keyword sudah ada dalam daftar",
        variant: "destructive",
      });
      return;
    }
    setKeywords([...keywords, trimmed]);
    setNewKeyword("");
  };

  const handleRemoveKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (keywords.length === 0) {
      toast({
        title: "Error",
        description: "Minimal harus ada 1 keyword",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      await onSave(keywords);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        handleCancel();
      }
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Pengaturan Auto-Click
          </DialogTitle>
          <DialogDescription>
            Hanya link yang terkait dengan teks di bawah ini yang akan diklik otomatis. 
            Keyword harus sama persis (case-sensitive).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add new keyword */}
          <div className="space-y-2">
            <Label htmlFor="new-keyword">Tambah keyword/phrase baru</Label>
            <div className="flex gap-2">
              <Input
                id="new-keyword"
                placeholder="Masukkan keyword/phrase..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                }}
              />
              <Button onClick={handleAddKeyword} size="icon" variant="secondary">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Keywords list */}
          <div className="space-y-2">
            <Label>Keywords aktif ({keywords.length})</Label>
            <ScrollArea className="h-[200px] rounded-md border p-2">
              {keywords.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Belum ada keyword. Tambahkan minimal 1 keyword.
                </div>
              ) : (
                <div className="space-y-2">
                  {keywords.map((keyword, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Link className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{keyword}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => handleRemoveKeyword(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving || keywords.length === 0}>
            {saving ? "Menyimpan..." : "Simpan & Aktifkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
