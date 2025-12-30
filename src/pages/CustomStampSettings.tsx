import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { StampSection } from "@/components/template-settings/StampSection";
import { DynamicStamp } from "@/components/documents/DynamicStamp";
import { defaultSettings, TemplateSettings } from "@/components/template-settings/types";
import { format } from "date-fns";

const CustomStampSettings = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [settings, setSettings] = useState<TemplateSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/");
      return;
    }
    fetchSettings();
  }, [isSuperAdmin, navigate]);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("document_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(prev => ({
          ...prev,
          stamp_type: data.stamp_type || prev.stamp_type,
          stamp_font_family: data.stamp_font_family || prev.stamp_font_family,
          stamp_font_size: data.stamp_font_size || prev.stamp_font_size,
          stamp_rotation: data.stamp_rotation ?? prev.stamp_rotation,
          stamp_border_width: data.stamp_border_width || prev.stamp_border_width,
          stamp_border_style: data.stamp_border_style || prev.stamp_border_style,
          stamp_show_date: data.stamp_show_date ?? prev.stamp_show_date,
          stamp_show_document_number: data.stamp_show_document_number ?? prev.stamp_show_document_number,
          stamp_show_company_name: data.stamp_show_company_name ?? prev.stamp_show_company_name,
          stamp_color: data.stamp_color || prev.stamp_color,
          stamp_color_lunas: data.stamp_color_lunas || prev.stamp_color_lunas,
          stamp_color_belum_lunas: data.stamp_color_belum_lunas || prev.stamp_color_belum_lunas,
          stamp_size: data.stamp_size || prev.stamp_size,
          stamp_position: data.stamp_position || prev.stamp_position,
          stamp_opacity: data.stamp_opacity ?? prev.stamp_opacity,
          show_stamp: data.show_stamp ?? prev.show_stamp,
          show_stamp_on_invoice: data.show_stamp_on_invoice ?? prev.show_stamp_on_invoice,
          show_stamp_on_receipt: data.show_stamp_on_receipt ?? prev.show_stamp_on_receipt,
          custom_stamp_url: data.custom_stamp_url || prev.custom_stamp_url,
          company_name: data.company_name || prev.company_name,
          // New fields
          stamp_custom_text: data.stamp_custom_text || prev.stamp_custom_text,
          stamp_use_custom_text: data.stamp_use_custom_text ?? prev.stamp_use_custom_text,
          stamp_position_x: data.stamp_position_x ?? prev.stamp_position_x,
          stamp_position_y: data.stamp_position_y ?? prev.stamp_position_y,
        }));
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Gagal memuat pengaturan");
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: keyof TemplateSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleFileSelect = async (file: File, settingKey: keyof TemplateSettings) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/custom-stamp-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("signatures")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("signatures")
        .getPublicUrl(fileName);

      updateSetting(settingKey, publicUrl);
      toast.success("Gambar berhasil diupload");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Gagal mengupload gambar");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (settingKey: keyof TemplateSettings) => {
    updateSetting(settingKey, "");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const stampSettings = {
        user_id: user.id,
        stamp_type: settings.stamp_type,
        stamp_font_family: settings.stamp_font_family,
        stamp_font_size: settings.stamp_font_size,
        stamp_rotation: settings.stamp_rotation,
        stamp_border_width: settings.stamp_border_width,
        stamp_border_style: settings.stamp_border_style,
        stamp_show_date: settings.stamp_show_date,
        stamp_show_document_number: settings.stamp_show_document_number,
        stamp_show_company_name: settings.stamp_show_company_name,
        stamp_color: settings.stamp_color,
        stamp_color_lunas: settings.stamp_color_lunas,
        stamp_color_belum_lunas: settings.stamp_color_belum_lunas,
        stamp_size: settings.stamp_size,
        stamp_position: settings.stamp_position,
        stamp_opacity: settings.stamp_opacity,
        show_stamp: settings.show_stamp,
        show_stamp_on_invoice: settings.show_stamp_on_invoice,
        show_stamp_on_receipt: settings.show_stamp_on_receipt,
        custom_stamp_url: settings.custom_stamp_url,
        company_name: settings.company_name,
        // New fields
        stamp_custom_text: settings.stamp_custom_text,
        stamp_use_custom_text: settings.stamp_use_custom_text,
        stamp_position_x: settings.stamp_position_x,
        stamp_position_y: settings.stamp_position_y,
      };

      const { error } = await supabase
        .from("document_settings")
        .upsert(stampSettings, { onConflict: "user_id" });

      if (error) throw error;

      toast.success("Pengaturan stempel berhasil disimpan");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(prev => ({
      ...prev,
      stamp_type: defaultSettings.stamp_type,
      stamp_font_family: defaultSettings.stamp_font_family,
      stamp_font_size: defaultSettings.stamp_font_size,
      stamp_rotation: defaultSettings.stamp_rotation,
      stamp_border_width: defaultSettings.stamp_border_width,
      stamp_border_style: defaultSettings.stamp_border_style,
      stamp_show_date: defaultSettings.stamp_show_date,
      stamp_show_document_number: defaultSettings.stamp_show_document_number,
      stamp_show_company_name: defaultSettings.stamp_show_company_name,
      stamp_color: defaultSettings.stamp_color,
      stamp_color_lunas: defaultSettings.stamp_color_lunas,
      stamp_color_belum_lunas: defaultSettings.stamp_color_belum_lunas,
      stamp_size: defaultSettings.stamp_size,
      stamp_position: defaultSettings.stamp_position,
      stamp_opacity: defaultSettings.stamp_opacity,
      show_stamp: defaultSettings.show_stamp,
      show_stamp_on_invoice: defaultSettings.show_stamp_on_invoice,
      show_stamp_on_receipt: defaultSettings.show_stamp_on_receipt,
      custom_stamp_url: defaultSettings.custom_stamp_url,
      // New fields
      stamp_custom_text: defaultSettings.stamp_custom_text,
      stamp_use_custom_text: defaultSettings.stamp_use_custom_text,
      stamp_position_x: defaultSettings.stamp_position_x,
      stamp_position_y: defaultSettings.stamp_position_y,
    }));
    toast.info("Pengaturan direset ke default");
  };

  if (!isSuperAdmin) return null;

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/vip/settings/invoice")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Custom Stempel</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Pengaturan Stempel</CardTitle>
          </CardHeader>
          <CardContent>
            <StampSection
              settings={settings}
              updateSetting={updateSetting}
              onFileSelect={handleFileSelect}
              onRemoveImage={handleRemoveImage}
              uploading={uploading}
            />
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Preview Stempel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Document Preview with Free Position */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Preview Posisi di Dokumen</p>
              <div 
                className="relative bg-white border rounded-lg overflow-hidden"
                style={{ aspectRatio: '210 / 297', minHeight: '400px' }}
              >
                {/* Simulated document content */}
                <div className="absolute inset-4 border-2 border-dashed border-muted-foreground/20 rounded flex flex-col">
                  {/* Header area */}
                  <div className="h-16 bg-muted/20 border-b border-dashed border-muted-foreground/20 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">Header Invoice/Kwitansi</span>
                  </div>
                  {/* Content area */}
                  <div className="flex-1 p-4">
                    <div className="space-y-2">
                      <div className="h-3 bg-muted/30 rounded w-1/3"></div>
                      <div className="h-3 bg-muted/30 rounded w-1/2"></div>
                      <div className="h-3 bg-muted/30 rounded w-2/5"></div>
                      <div className="h-20 bg-muted/20 rounded mt-4"></div>
                    </div>
                  </div>
                  {/* Footer area */}
                  <div className="h-20 bg-muted/20 border-t border-dashed border-muted-foreground/20 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">Signature Area</span>
                  </div>
                </div>
                
                {/* Free-positioned stamp */}
                {settings.show_stamp && (
                  <div 
                    className="absolute pointer-events-none z-10"
                    style={{
                      left: `${settings.stamp_position_x ?? 10}%`,
                      top: `${settings.stamp_position_y ?? 70}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <DynamicStamp
                      status={settings.stamp_use_custom_text ? 'CUSTOM' : 'LUNAS'}
                      customText={settings.stamp_custom_text}
                      documentNumber="DOC-2024-001"
                      companyName={settings.company_name || "Nama Perusahaan"}
                      date={format(new Date(), "dd/MM/yyyy")}
                      settings={settings}
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Gunakan slider untuk mengatur posisi stempel
              </p>
            </div>

            {/* Stamp Variants Preview */}
            <div className="grid grid-cols-2 gap-4">
              {/* Custom/LUNAS Preview */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground text-center">
                  {settings.stamp_use_custom_text ? 'Custom Teks' : 'LUNAS'}
                </p>
                <div className="flex items-center justify-center p-4 bg-muted/30 rounded-lg border">
                  <DynamicStamp
                    status={settings.stamp_use_custom_text ? 'CUSTOM' : 'LUNAS'}
                    customText={settings.stamp_custom_text}
                    documentNumber="KWT-2024-001"
                    companyName={settings.company_name || "Nama Perusahaan"}
                    date={format(new Date(), "dd/MM/yyyy")}
                    settings={settings}
                  />
                </div>
              </div>

              {/* BELUM LUNAS Preview */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground text-center">BELUM LUNAS</p>
                <div className="flex items-center justify-center p-4 bg-muted/30 rounded-lg border">
                  <DynamicStamp
                    status="BELUM_LUNAS"
                    documentNumber="INV-2024-001"
                    companyName={settings.company_name || "Nama Perusahaan"}
                    date={format(new Date(), "dd/MM/yyyy")}
                    settings={settings}
                  />
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
              <p>• Stempel ditampilkan di posisi X: {settings.stamp_position_x ?? 10}%, Y: {settings.stamp_position_y ?? 70}%</p>
              <p>• {settings.stamp_use_custom_text ? `Teks kustom: "${settings.stamp_custom_text}"` : 'Menggunakan teks default (LUNAS/BELUM LUNAS)'}</p>
              <p>• Invoice: {settings.show_stamp_on_invoice ? 'Aktif' : 'Nonaktif'} | Kwitansi: {settings.show_stamp_on_receipt ? 'Aktif' : 'Nonaktif'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomStampSettings;
