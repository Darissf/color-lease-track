import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Zap, FileText, Hash, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AutoInvoiceSettings {
  auto_invoice_enabled: boolean;
  auto_invoice_prefix: string;
  auto_invoice_start: number;
  auto_invoice_current: number;
  auto_invoice_padding: number;
}

const AutoInvoiceSettingsPage = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AutoInvoiceSettings>({
    auto_invoice_enabled: false,
    auto_invoice_prefix: "",
    auto_invoice_start: 1,
    auto_invoice_current: 0,
    auto_invoice_padding: 6,
  });

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/");
      return;
    }
    fetchSettings();
  }, [isSuperAdmin, user]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("document_settings")
        .select("auto_invoice_enabled, auto_invoice_prefix, auto_invoice_start, auto_invoice_current, auto_invoice_padding")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          auto_invoice_enabled: data.auto_invoice_enabled ?? false,
          auto_invoice_prefix: data.auto_invoice_prefix ?? "",
          auto_invoice_start: data.auto_invoice_start ?? 1,
          auto_invoice_current: data.auto_invoice_current ?? 0,
          auto_invoice_padding: data.auto_invoice_padding ?? 6,
        });
      }
    } catch (error: any) {
      toast.error("Gagal memuat pengaturan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Jika start number diubah dan lebih besar dari current, update current juga
      let currentToSave = settings.auto_invoice_current;
      if (settings.auto_invoice_start > settings.auto_invoice_current + 1) {
        currentToSave = settings.auto_invoice_start - 1;
      }

      const { error } = await supabase
        .from("document_settings")
        .upsert({
          user_id: user?.id,
          auto_invoice_enabled: settings.auto_invoice_enabled,
          auto_invoice_prefix: settings.auto_invoice_prefix,
          auto_invoice_start: settings.auto_invoice_start,
          auto_invoice_current: currentToSave,
          auto_invoice_padding: settings.auto_invoice_padding,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      // Refresh settings after save
      await fetchSettings();
      toast.success("Pengaturan Auto Invoice berhasil disimpan");
    } catch (error: any) {
      toast.error("Gagal menyimpan: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetCounter = async () => {
    if (!confirm("Yakin ingin reset counter ke nomor awal? Ini akan mengatur ulang nomor invoice berikutnya.")) {
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from("document_settings")
        .update({
          auto_invoice_current: settings.auto_invoice_start - 1,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user?.id);

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        auto_invoice_current: settings.auto_invoice_start - 1
      }));
      
      toast.success("Counter berhasil direset");
    } catch (error: any) {
      toast.error("Gagal reset counter: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getNextInvoiceNumber = () => {
    const nextNumber = settings.auto_invoice_current + 1;
    const paddedNumber = String(nextNumber).padStart(settings.auto_invoice_padding, '0');
    return `${settings.auto_invoice_prefix}${paddedNumber}`;
  };

  const getPreviewFromStart = () => {
    const paddedNumber = String(settings.auto_invoice_start).padStart(settings.auto_invoice_padding, '0');
    return `${settings.auto_invoice_prefix}${paddedNumber}`;
  };

  const getLastUsedInvoice = () => {
    if (settings.auto_invoice_current === 0) return "Belum ada";
    const paddedNumber = String(settings.auto_invoice_current).padStart(settings.auto_invoice_padding, '0');
    return `${settings.auto_invoice_prefix}${paddedNumber}`;
  };

  if (!isSuperAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-104px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-3 py-3 sm:px-4 sm:py-4 md:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/vip/settings/invoice")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 w-full min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Auto Invoice
              </h1>
              <Badge variant={settings.auto_invoice_enabled ? "default" : "secondary"} className="text-xs">
                {settings.auto_invoice_enabled ? "ON" : "OFF"}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Pengaturan auto-generate nomor invoice secara berurutan
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Status Toggle */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${settings.auto_invoice_enabled ? 'bg-emerald-600' : 'bg-muted'}`}>
                  <Zap className={`h-5 w-5 ${settings.auto_invoice_enabled ? 'text-white' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <h3 className="font-semibold">Status Auto Invoice</h3>
                  <p className="text-sm text-muted-foreground">
                    {settings.auto_invoice_enabled 
                      ? "Nomor invoice akan otomatis di-generate" 
                      : "Nomor invoice harus diisi manual"}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.auto_invoice_enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_invoice_enabled: checked }))}
              />
            </div>
          </Card>

          {/* Settings Form */}
          <Card className="p-4 sm:p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Hash className="h-5 w-5 text-primary" />
              Pengaturan Nomor Invoice
            </h3>
            
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prefix">Prefix (opsional)</Label>
                  <Input
                    id="prefix"
                    value={settings.auto_invoice_prefix}
                    onChange={(e) => setSettings(prev => ({ ...prev, auto_invoice_prefix: e.target.value }))}
                    placeholder="Contoh: INV-"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Awalan nomor invoice
                  </p>
                </div>
                <div>
                  <Label htmlFor="start">Nomor Awal</Label>
                  <Input
                    id="start"
                    type="number"
                    min={1}
                    value={settings.auto_invoice_start}
                    onChange={(e) => setSettings(prev => ({ ...prev, auto_invoice_start: parseInt(e.target.value) || 1 }))}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Nomor awal invoice
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="padding">Jumlah Digit</Label>
                <Input
                  id="padding"
                  type="number"
                  min={1}
                  max={10}
                  value={settings.auto_invoice_padding}
                  onChange={(e) => setSettings(prev => ({ ...prev, auto_invoice_padding: Math.min(10, Math.max(1, parseInt(e.target.value) || 6)) }))}
                  className="mt-1 max-w-[120px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Jumlah digit dengan padding nol (contoh: 6 = 000001)
                </p>
              </div>

              {/* Preview */}
              <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Preview Nomor Awal:</p>
                    <p className="font-mono text-lg font-bold text-primary">
                      {getPreviewFromStart()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Invoice Berikutnya:</p>
                    <p className="font-mono text-lg font-bold text-emerald-600">
                      {getNextInvoiceNumber()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Info Card */}
          <Card className="p-4 sm:p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Informasi
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Nomor terakhir digunakan:</span>
                <span className="font-mono font-semibold">{getLastUsedInvoice()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Total invoice otomatis:</span>
                <span className="font-semibold">{settings.auto_invoice_current}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Invoice berikutnya:</span>
                <Badge variant="outline" className="font-mono">
                  {getNextInvoiceNumber()}
                </Badge>
              </div>
            </div>

            {settings.auto_invoice_current > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full"
                onClick={handleResetCounter}
                disabled={saving}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset Counter ke Nomor Awal
              </Button>
            )}
          </Card>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full"
            size="lg"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Simpan Pengaturan
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AutoInvoiceSettingsPage;
