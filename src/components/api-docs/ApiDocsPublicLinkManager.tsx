import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import QRCode from "react-qr-code";
import { 
  Link2, 
  Plus, 
  Copy, 
  ExternalLink, 
  QrCode, 
  Trash2, 
  Clock, 
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";

interface PublicLink {
  id: string;
  access_code: string;
  expires_at: string;
  created_at: string;
  view_count: number;
  is_active: boolean;
  notes: string | null;
}

export function ApiDocsPublicLinkManager() {
  const { user, isSuperAdmin } = useAuth();
  const [links, setLinks] = useState<PublicLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<PublicLink | null>(null);
  const [expirationType, setExpirationType] = useState("24h");
  const [customValue, setCustomValue] = useState("1");
  const [customUnit, setCustomUnit] = useState("days");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (user && isSuperAdmin) {
      fetchLinks();
    }
  }, [user, isSuperAdmin]);

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from("api_docs_public_links")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error("Error fetching links:", error);
      toast.error("Gagal mengambil daftar link");
    } finally {
      setLoading(false);
    }
  };

  const generateLink = async () => {
    if (!user) return;
    
    setGenerating(true);
    try {
      // Calculate expiration
      let expiresAt = new Date();
      switch (expirationType) {
        case "1h":
          expiresAt.setHours(expiresAt.getHours() + 1);
          break;
        case "24h":
          expiresAt.setHours(expiresAt.getHours() + 24);
          break;
        case "7d":
          expiresAt.setDate(expiresAt.getDate() + 7);
          break;
        case "30d":
          expiresAt.setDate(expiresAt.getDate() + 30);
          break;
        case "custom":
          const value = parseInt(customValue) || 1;
          if (customUnit === "hours") {
            expiresAt.setHours(expiresAt.getHours() + value);
          } else {
            expiresAt.setDate(expiresAt.getDate() + value);
          }
          break;
      }

      // Generate access code
      const { data: codeData, error: codeError } = await supabase.rpc("generate_api_docs_access_code");
      if (codeError) throw codeError;

      // Insert link
      const { data, error } = await supabase
        .from("api_docs_public_links")
        .insert({
          user_id: user.id,
          access_code: codeData,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setLinks([data, ...links]);
      setDialogOpen(false);
      toast.success("Link berhasil dibuat!");
      
      // Auto copy to clipboard
      const publicUrl = getPublicUrl(data.access_code);
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link disalin ke clipboard");
    } catch (error) {
      console.error("Error generating link:", error);
      toast.error("Gagal membuat link");
    } finally {
      setGenerating(false);
    }
  };

  const deleteLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from("api_docs_public_links")
        .delete()
        .eq("id", linkId);

      if (error) throw error;

      setLinks(links.filter(l => l.id !== linkId));
      toast.success("Link berhasil dihapus");
    } catch (error) {
      console.error("Error deleting link:", error);
      toast.error("Gagal menghapus link");
    }
  };

  const getPublicUrl = (accessCode: string) => {
    return `${window.location.origin}/api-docs/${accessCode}`;
  };

  const copyToClipboard = async (accessCode: string, linkId: string) => {
    try {
      await navigator.clipboard.writeText(getPublicUrl(accessCode));
      setCopiedId(linkId);
      toast.success("Link disalin ke clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error("Gagal menyalin link");
    }
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  const activeLinks = links.filter(l => l.is_active && !isExpired(l.expires_at));
  const inactiveLinks = links.filter(l => !l.is_active || isExpired(l.expires_at));

  if (!isSuperAdmin) return null;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Public API Docs
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Generate Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Link Public</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Masa Berlaku</Label>
                  <Select value={expirationType} onValueChange={setExpirationType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">1 Jam</SelectItem>
                      <SelectItem value="24h">24 Jam</SelectItem>
                      <SelectItem value="7d">7 Hari</SelectItem>
                      <SelectItem value="30d">30 Hari</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {expirationType === "custom" && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="number"
                        min="1"
                        max="999"
                        value={customValue}
                        onChange={(e) => setCustomValue(e.target.value)}
                        placeholder="Jumlah"
                      />
                    </div>
                    <Select value={customUnit} onValueChange={setCustomUnit}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hours">Jam</SelectItem>
                        <SelectItem value="days">Hari</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Batal
                </Button>
                <Button onClick={generateLink} disabled={generating}>
                  {generating ? "Membuat..." : "Generate Link"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">Memuat...</div>
        ) : links.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Belum ada link public</p>
            <p className="text-sm">Buat link untuk membagikan dokumentasi API ke AI atau pihak lain</p>
          </div>
        ) : (
          <>
            {/* Active Links */}
            {activeLinks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Link Aktif ({activeLinks.length})
                </h4>
                {activeLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                          Aktif
                        </Badge>
                        <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                          {link.access_code}
                        </code>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Berlaku hingga {format(new Date(link.expires_at), "dd MMM yyyy HH:mm", { locale: id })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {link.view_count} views
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(link.access_code, link.id)}
                        title="Copy link"
                      >
                        {copiedId === link.id ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(getPublicUrl(link.access_code), "_blank")}
                        title="Buka di tab baru"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedLink(link);
                          setQrDialogOpen(true);
                        }}
                        title="Tampilkan QR Code"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteLink(link.id)}
                        className="text-destructive hover:text-destructive"
                        title="Hapus link"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Inactive Links */}
            {inactiveLinks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Link Tidak Aktif ({inactiveLinks.length})
                </h4>
                {inactiveLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 opacity-60"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-muted">
                          {isExpired(link.expires_at) ? (
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Expired
                            </span>
                          ) : (
                            "Nonaktif"
                          )}
                        </Badge>
                        <code className="text-sm font-mono">{link.access_code}</code>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isExpired(link.expires_at)
                          ? `Expired ${format(new Date(link.expires_at), "dd MMM yyyy HH:mm", { locale: id })}`
                          : "Dinonaktifkan"}
                        {" · "}{link.view_count} views
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteLink(link.id)}
                      className="text-destructive hover:text-destructive"
                      title="Hapus link"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* QR Code Dialog */}
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>QR Code</DialogTitle>
            </DialogHeader>
            {selectedLink && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="bg-white p-4 rounded-lg">
                  <QRCode value={getPublicUrl(selectedLink.access_code)} size={200} />
                </div>
                <code className="text-sm font-mono bg-muted px-3 py-1 rounded">
                  {selectedLink.access_code}
                </code>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
