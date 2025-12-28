import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, Palette, Eye, FileText, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InvoiceTemplatePreview } from "@/components/documents/InvoiceTemplatePreview";
import { ReceiptTemplatePreview } from "@/components/documents/ReceiptTemplatePreview";

interface TemplateSettings {
  template_style: string;
  header_color_primary: string;
  header_color_secondary: string;
  border_color: string;
  accent_color: string;
  show_qr_code: boolean;
  show_terbilang: boolean;
  footer_text: string;
  terms_conditions: string;
  paper_size: string;
  logo_position: string;
}

const defaultSettings: TemplateSettings = {
  template_style: "modern",
  header_color_primary: "#06b6d4",
  header_color_secondary: "#2563eb",
  border_color: "#bfdbfe",
  accent_color: "#f97316",
  show_qr_code: true,
  show_terbilang: true,
  footer_text: "",
  terms_conditions: "",
  paper_size: "A4",
  logo_position: "left",
};

const InvoiceTemplateSettings = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TemplateSettings>(defaultSettings);
  const [previewTab, setPreviewTab] = useState<"invoice" | "kwitansi">("invoice");

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/");
      return;
    }
    fetchSettings();
  }, [isSuperAdmin, user]);

  const fetchSettings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("document_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          template_style: data.template_style || defaultSettings.template_style,
          header_color_primary: data.header_color_primary || defaultSettings.header_color_primary,
          header_color_secondary: data.header_color_secondary || defaultSettings.header_color_secondary,
          border_color: data.border_color || defaultSettings.border_color,
          accent_color: data.accent_color || defaultSettings.accent_color,
          show_qr_code: data.show_qr_code ?? defaultSettings.show_qr_code,
          show_terbilang: data.show_terbilang ?? defaultSettings.show_terbilang,
          footer_text: data.footer_text || defaultSettings.footer_text,
          terms_conditions: data.terms_conditions || defaultSettings.terms_conditions,
          paper_size: data.paper_size || defaultSettings.paper_size,
          logo_position: data.logo_position || defaultSettings.logo_position,
        });
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
      toast.error("Gagal memuat pengaturan");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("document_settings")
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) throw error;
      toast.success("Pengaturan template berhasil disimpan");
    } catch (err) {
      console.error("Error saving settings:", err);
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof TemplateSettings>(key: K, value: TemplateSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!isSuperAdmin) return null;

  return (
    <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-3 py-3 sm:px-4 sm:py-4 md:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/vip/settings/invoice")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 w-full min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent break-words">
              Template Invoice & Kwitansi
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Sesuaikan tampilan template dokumen sesuai branding Anda
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="shrink-0">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Simpan
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-3 sm:px-4 md:px-6 lg:px-8 pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            {/* Settings Panel */}
            <Card className="p-4 overflow-hidden flex flex-col">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Settings2 className="h-5 w-5 text-primary" />
                Pengaturan
              </h2>
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-6">
                  {/* Color Settings */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                      <Palette className="h-4 w-4" />
                      Warna
                    </h3>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="header_primary" className="text-sm">Header Primary</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="header_primary"
                            type="color"
                            value={settings.header_color_primary}
                            onChange={(e) => updateSetting("header_color_primary", e.target.value)}
                            className="w-12 h-8 p-1 cursor-pointer"
                          />
                          <Input
                            value={settings.header_color_primary}
                            onChange={(e) => updateSetting("header_color_primary", e.target.value)}
                            className="w-24 h-8 text-xs font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="header_secondary" className="text-sm">Header Secondary</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="header_secondary"
                            type="color"
                            value={settings.header_color_secondary}
                            onChange={(e) => updateSetting("header_color_secondary", e.target.value)}
                            className="w-12 h-8 p-1 cursor-pointer"
                          />
                          <Input
                            value={settings.header_color_secondary}
                            onChange={(e) => updateSetting("header_color_secondary", e.target.value)}
                            className="w-24 h-8 text-xs font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="border_color" className="text-sm">Border</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="border_color"
                            type="color"
                            value={settings.border_color}
                            onChange={(e) => updateSetting("border_color", e.target.value)}
                            className="w-12 h-8 p-1 cursor-pointer"
                          />
                          <Input
                            value={settings.border_color}
                            onChange={(e) => updateSetting("border_color", e.target.value)}
                            className="w-24 h-8 text-xs font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="accent_color" className="text-sm">Aksen (Total)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="accent_color"
                            type="color"
                            value={settings.accent_color}
                            onChange={(e) => updateSetting("accent_color", e.target.value)}
                            className="w-12 h-8 p-1 cursor-pointer"
                          />
                          <Input
                            value={settings.accent_color}
                            onChange={(e) => updateSetting("accent_color", e.target.value)}
                            className="w-24 h-8 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Display Settings */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                      <Eye className="h-4 w-4" />
                      Tampilan
                    </h3>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="show_qr" className="text-sm">Tampilkan QR Code</Label>
                        <Switch
                          id="show_qr"
                          checked={settings.show_qr_code}
                          onCheckedChange={(checked) => updateSetting("show_qr_code", checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="show_terbilang" className="text-sm">Tampilkan Terbilang</Label>
                        <Switch
                          id="show_terbilang"
                          checked={settings.show_terbilang}
                          onCheckedChange={(checked) => updateSetting("show_terbilang", checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="logo_position" className="text-sm">Posisi Logo</Label>
                        <Select
                          value={settings.logo_position}
                          onValueChange={(value) => updateSetting("logo_position", value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Kiri</SelectItem>
                            <SelectItem value="center">Tengah</SelectItem>
                            <SelectItem value="right">Kanan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Footer & Terms */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      Footer & Ketentuan
                    </h3>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="footer_text" className="text-sm">Teks Footer</Label>
                        <Textarea
                          id="footer_text"
                          value={settings.footer_text}
                          onChange={(e) => updateSetting("footer_text", e.target.value)}
                          placeholder="Terima kasih atas kepercayaan Anda..."
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="terms" className="text-sm">Syarat & Ketentuan</Label>
                        <Textarea
                          id="terms"
                          value={settings.terms_conditions}
                          onChange={(e) => updateSetting("terms_conditions", e.target.value)}
                          placeholder="1. Pembayaran dilakukan dalam waktu 7 hari...&#10;2. Barang yang sudah disewa tidak dapat dikembalikan..."
                          rows={4}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </Card>

            {/* Preview Panel */}
            <Card className="p-4 overflow-hidden flex flex-col">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Eye className="h-5 w-5 text-primary" />
                Preview
              </h2>
              <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as "invoice" | "kwitansi")} className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="w-full grid grid-cols-2 mb-4">
                  <TabsTrigger value="invoice">Invoice</TabsTrigger>
                  <TabsTrigger value="kwitansi">Kwitansi</TabsTrigger>
                </TabsList>
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="bg-muted/30 rounded-lg p-4 flex justify-center">
                      <TabsContent value="invoice" className="m-0 w-full">
                        <div className="transform scale-[0.5] origin-top">
                          <InvoiceTemplatePreview settings={settings} />
                        </div>
                      </TabsContent>
                      <TabsContent value="kwitansi" className="m-0 w-full">
                        <div className="transform scale-[0.5] origin-top">
                          <ReceiptTemplatePreview settings={settings} />
                        </div>
                      </TabsContent>
                    </div>
                  </ScrollArea>
                </div>
              </Tabs>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceTemplateSettings;
