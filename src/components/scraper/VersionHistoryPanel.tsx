import { useState, useEffect } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { 
  History, 
  Download, 
  RotateCcw, 
  Check, 
  Clock, 
  Upload,
  ChevronDown,
  ChevronUp,
  Trash2,
  FileCode,
  Loader2,
  AlertCircle,
  GitBranch,
  Rocket
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScraperVersion {
  id: string;
  user_id: string;
  version_number: string;
  content: string;
  content_hash: string;
  changelog: string | null;
  is_current: boolean;
  line_count: number | null;
  file_size_bytes: number | null;
  deployed_to_vps: boolean;
  deployed_at: string | null;
  created_at: string;
  updated_by: string | null;
}

interface VersionHistoryPanelProps {
  userId: string;
  onVersionChange?: () => void;
}

export function VersionHistoryPanel({ userId, onVersionChange }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<ScraperVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [savingNew, setSavingNew] = useState(false);
  const [newVersionChangelog, setNewVersionChangelog] = useState("");
  const [showNewVersionDialog, setShowNewVersionDialog] = useState(false);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchVersions();
  }, [userId]);

  const fetchVersions = async () => {
    try {
      const { data, error } = await supabase
        .from("scraper_versions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVersions((data || []) as ScraperVersion[]);
    } catch (error) {
      console.error("Error fetching versions:", error);
      toast.error("Gagal memuat version history");
    } finally {
      setLoading(false);
    }
  };

  const generateHash = async (content: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const handleSaveNewVersion = async () => {
    setSavingNew(true);
    try {
      // Fetch current bca-scraper.js from public
      const response = await fetch("/vps-scraper-template/bca-scraper.js");
      const content = await response.text();
      const contentHash = await generateHash(content);
      const lineCount = content.split("\n").length;
      const fileSize = new Blob([content]).size;

      // Get next version number
      const { data: nextVersionData } = await supabase
        .rpc("get_next_scraper_version", { p_user_id: userId });

      const versionNumber = nextVersionData || "1.0.0";

      // Insert new version
      const { error } = await supabase
        .from("scraper_versions")
        .insert({
          user_id: userId,
          version_number: versionNumber,
          content: content,
          content_hash: contentHash,
          changelog: newVersionChangelog || `Version ${versionNumber}`,
          is_current: true,
          line_count: lineCount,
          file_size_bytes: fileSize,
          deployed_to_vps: false,
          updated_by: "admin",
        });

      if (error) throw error;

      toast.success(`Version ${versionNumber} berhasil disimpan!`);
      setNewVersionChangelog("");
      setShowNewVersionDialog(false);
      fetchVersions();
      onVersionChange?.();
    } catch (error) {
      console.error("Error saving version:", error);
      toast.error("Gagal menyimpan version baru");
    } finally {
      setSavingNew(false);
    }
  };

  const handleRollback = async (version: ScraperVersion) => {
    setRollingBack(version.id);
    try {
      // Set this version as current
      const { error } = await supabase
        .from("scraper_versions")
        .update({ is_current: true, deployed_to_vps: false })
        .eq("id", version.id);

      if (error) throw error;

      toast.success(`Rollback ke v${version.version_number} berhasil! VPS akan update saat scrape berikutnya.`);
      fetchVersions();
      onVersionChange?.();
    } catch (error) {
      console.error("Error rolling back:", error);
      toast.error("Gagal rollback version");
    } finally {
      setRollingBack(null);
    }
  };

  const handleDelete = async (version: ScraperVersion) => {
    if (version.is_current) {
      toast.error("Tidak bisa menghapus versi aktif");
      return;
    }

    setDeleting(version.id);
    try {
      const { error } = await supabase
        .from("scraper_versions")
        .delete()
        .eq("id", version.id);

      if (error) throw error;

      toast.success(`Version ${version.version_number} berhasil dihapus`);
      fetchVersions();
    } catch (error) {
      console.error("Error deleting version:", error);
      toast.error("Gagal menghapus version");
    } finally {
      setDeleting(null);
    }
  };

  const handleDownloadVersion = (version: ScraperVersion) => {
    const blob = new Blob([version.content], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bca-scraper-v${version.version_number}.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`bca-scraper-v${version.version_number}.js downloaded`);
  };

  const toggleExpanded = (id: string) => {
    setExpandedVersions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const currentVersion = versions.find(v => v.is_current);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-primary" />
            Version History
          </CardTitle>
          <Dialog open={showNewVersionDialog} onOpenChange={setShowNewVersionDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Upload className="h-4 w-4" />
                Save Current as New Version
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save New Version</DialogTitle>
                <DialogDescription>
                  Simpan file bca-scraper.js saat ini sebagai versi baru yang bisa di-deploy ke VPS.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Changelog / Release Notes</label>
                  <Textarea
                    placeholder="Contoh: Fix login frame detection, tambah retry logic..."
                    value={newVersionChangelog}
                    onChange={(e) => setNewVersionChangelog(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewVersionDialog(false)}>
                  Batal
                </Button>
                <Button onClick={handleSaveNewVersion} disabled={savingNew} className="gap-2">
                  {savingNew ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Rocket className="h-4 w-4" />
                  )}
                  Save & Set as Current
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current Version Status */}
        {currentVersion && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="gap-1">
                  <GitBranch className="h-3 w-3" />
                  v{currentVersion.version_number}
                </Badge>
                <span className="text-sm text-muted-foreground">Current Version</span>
              </div>
              <div className="flex items-center gap-2">
                {currentVersion.deployed_to_vps ? (
                  <Badge variant="outline" className="gap-1 text-green-600 border-green-500/50">
                    <Check className="h-3 w-3" />
                    Deployed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/50">
                    <Clock className="h-3 w-3" />
                    Pending Deploy
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileCode className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Belum ada version yang disimpan</p>
            <p className="text-sm mt-1">Klik "Save Current as New Version" untuk memulai</p>
          </div>
        ) : (
          <div className="space-y-2">
            {versions.map((version) => (
              <Collapsible
                key={version.id}
                open={expandedVersions.has(version.id)}
                onOpenChange={() => toggleExpanded(version.id)}
              >
                <div className={`border rounded-lg ${version.is_current ? "border-primary/50 bg-primary/5" : ""}`}>
                  <CollapsibleTrigger asChild>
                    <div className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={version.is_current ? "default" : "secondary"}>
                              v{version.version_number}
                            </Badge>
                            {version.is_current && (
                              <Badge variant="outline" className="text-xs">Current</Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(version.created_at), "dd MMM yyyy, HH:mm", { locale: id })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {version.deployed_to_vps ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-500" />
                          )}
                          {expandedVersions.has(version.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                      {version.changelog && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {version.changelog}
                        </p>
                      )}
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <Separator />
                    <div className="p-3 space-y-3">
                      {/* Changelog */}
                      {version.changelog && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Changelog:</p>
                          <p className="text-sm bg-muted/50 p-2 rounded">{version.changelog}</p>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Lines:</span>{" "}
                          <span className="font-medium">{version.line_count?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Size:</span>{" "}
                          <span className="font-medium">{formatBytes(version.file_size_bytes)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Hash:</span>{" "}
                          <code className="text-xs bg-muted px-1 rounded">
                            {version.content_hash.substring(0, 8)}...
                          </code>
                        </div>
                        {version.deployed_at && (
                          <div>
                            <span className="text-muted-foreground">Deployed:</span>{" "}
                            <span className="font-medium">
                              {format(new Date(version.deployed_at), "dd MMM HH:mm", { locale: id })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadVersion(version)}
                          className="gap-1"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </Button>

                        {!version.is_current && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRollback(version)}
                              disabled={rollingBack === version.id}
                              className="gap-1"
                            >
                              {rollingBack === version.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3 w-3" />
                              )}
                              Rollback
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Hapus Version {version.version_number}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Version ini akan dihapus permanen dan tidak bisa dikembalikan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(version)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    {deleting === version.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      "Hapus"
                                    )}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}

        {/* Auto-update Info */}
        <div className="p-3 bg-muted/30 rounded-lg mt-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">Auto-Update</p>
              <p>VPS akan otomatis cek dan download versi terbaru setiap kali scraper dijalankan.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
