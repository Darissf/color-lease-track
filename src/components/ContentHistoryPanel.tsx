import { useState, useEffect } from "react";
import { useEditableContent } from "@/contexts/EditableContentContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Undo2, Redo2, History, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

export function ContentHistoryPanel() {
  const { undo, redo, canUndo, canRedo, isSuperAdmin, getHistory, restoreVersion } = useEditableContent();
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [history, setHistory] = useState<ContentHistory[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadHistory = async (key: string) => {
    const data = await getHistory(key);
    setHistory(data);
    setSelectedKey(key);
  };

  const handleRestore = async (historyId: string) => {
    await restoreVersion(historyId);
    setIsDialogOpen(false);
    if (selectedKey) {
      await loadHistory(selectedKey);
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Riwayat Konten
        </CardTitle>
        <CardDescription>
          Kelola perubahan konten dengan undo/redo dan restore versi sebelumnya
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={!canUndo}
            className="flex items-center gap-2"
          >
            <Undo2 className="h-4 w-4" />
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={!canRedo}
            className="flex items-center gap-2"
          >
            <Redo2 className="h-4 w-4" />
            Redo
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" className="w-full">
              <History className="h-4 w-4 mr-2" />
              Lihat Riwayat Detail
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Riwayat Perubahan Konten</DialogTitle>
              <DialogDescription>
                Lihat dan restore versi sebelumnya dari konten yang telah diedit
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Content Key:</label>
                <input
                  type="text"
                  placeholder="Masukkan content key (contoh: /nabila::path...)"
                  value={selectedKey}
                  onChange={(e) => setSelectedKey(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
                <Button
                  size="sm"
                  onClick={() => selectedKey && loadHistory(selectedKey)}
                  className="mt-2"
                  disabled={!selectedKey}
                >
                  Muat Riwayat
                </Button>
              </div>

              {history.length > 0 && (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {history.map((item, index) => (
                      <Card key={item.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-semibold">
                              Versi {item.version_number}
                              {index === 0 && (
                                <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                                  Terbaru
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(item.created_at), {
                                addSuffix: true,
                                locale: id,
                              })}
                            </p>
                          </div>
                          {index !== 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRestore(item.id)}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Restore
                            </Button>
                          )}
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground">Konten:</p>
                          <p className="text-sm mt-1 p-2 bg-muted rounded">
                            {item.content_value}
                          </p>
                        </div>
                        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                          <span>Halaman: {item.page}</span>
                          <span>Kategori: {item.category}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {history.length === 0 && selectedKey && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Tidak ada riwayat untuk content key ini
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <div className="text-xs text-muted-foreground">
          <p>💡 Tips:</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Gunakan Undo/Redo untuk membatalkan perubahan terakhir</li>
            <li>Klik "Lihat Riwayat Detail" untuk melihat semua versi</li>
            <li>Restore versi lama untuk mengembalikan konten sebelumnya</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
