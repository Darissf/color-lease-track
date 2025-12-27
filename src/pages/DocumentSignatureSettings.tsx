import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, FileSignature, Building2, Hash, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SignatureUploader } from "@/components/documents/SignatureUploader";
import { DynamicStamp } from "@/components/documents/DynamicStamp";
import { format } from "date-fns";

interface DocumentSettings {
  id?: string;
  user_id: string;
  signature_image_url: string | null;
  company_name: string;
  company_address: string;
  company_phone: string;
  owner_name: string;
  counter_invoice: number;
  counter_receipt: number;
}

const DocumentSignatureSettings = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<DocumentSettings>({
    user_id: "",
    signature_image_url: null,
    company_name: "",
    company_address: "",
    company_phone: "",
    owner_name: "",
    counter_invoice: 0,
    counter_receipt: 0,
  });

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/");
      return;
    }
    if (user) {
      fetchSettings();
    }
  }, [isSuperAdmin, user]);

  const fetchSettings = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("document_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching settings:", error);
      toast.error("Gagal memuat pengaturan");
    }

    if (data) {
      setSettings(data as DocumentSettings);
    } else {
      setSettings((prev) => ({ ...prev, user_id: user.id }));
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const settingsData = {
        ...settings,
        user_id: user.id,
      };

      if (settings.id) {
        const { error } = await supabase
          .from("document_settings")
          .update(settingsData)
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        const { error, data } = await supabase
          .from("document_settings")
          .insert(settingsData)
          .select()
          .single();

        if (error) throw error;
        if (data) setSettings(data as DocumentSettings);
      }

      toast.success("Pengaturan berhasil disimpan");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  };

  const handleSignatureChange = (url: string | null) => {
    setSettings((prev) => ({ ...prev, signature_image_url: url }));
  };

  if (!isSuperAdmin) return null;

  const today = format(new Date(), "dd/MM/yyyy");
  const nextInvoiceNumber = String(settings.counter_invoice + 1).padStart(6, "0");
  const nextReceiptNumber = String(settings.counter_receipt + 1).padStart(6, "0");

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
              TTD Digital & Stempel
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Kelola tanda tangan digital dan stempel untuk dokumen
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving || loading} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Company Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="h-5 w-5" />
                    Informasi Perusahaan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="company_name">Nama Perusahaan</Label>
                    <Input
                      id="company_name"
                      value={settings.company_name}
                      onChange={(e) => setSettings((prev) => ({ ...prev, company_name: e.target.value }))}
                      placeholder="PT Sewa Scaffolding Bali"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company_address">Alamat</Label>
                    <Textarea
                      id="company_address"
                      value={settings.company_address}
                      onChange={(e) => setSettings((prev) => ({ ...prev, company_address: e.target.value }))}
                      placeholder="Jl. Raya Denpasar No. 123"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="company_phone">Nomor Telepon</Label>
                    <Input
                      id="company_phone"
                      value={settings.company_phone}
                      onChange={(e) => setSettings((prev) => ({ ...prev, company_phone: e.target.value }))}
                      placeholder="0812-3456-7890"
                    />
                  </div>
                  <div>
                    <Label htmlFor="owner_name">Nama Pemilik (untuk label TTD)</Label>
                    <Input
                      id="owner_name"
                      value={settings.owner_name}
                      onChange={(e) => setSettings((prev) => ({ ...prev, owner_name: e.target.value }))}
                      placeholder="Nama lengkap"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Signature Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileSignature className="h-5 w-5" />
                    Tanda Tangan Digital
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SignatureUploader
                    currentSignatureUrl={settings.signature_image_url}
                    onSignatureChange={handleSignatureChange}
                  />
                </CardContent>
              </Card>

              {/* Counter Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Hash className="h-5 w-5" />
                    Penomoran Dokumen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="counter_invoice">Counter Invoice</Label>
                      <Input
                        id="counter_invoice"
                        type="number"
                        min="0"
                        value={settings.counter_invoice}
                        onChange={(e) => setSettings((prev) => ({ ...prev, counter_invoice: parseInt(e.target.value) || 0 }))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Nomor berikutnya: <span className="font-mono font-semibold">{nextInvoiceNumber}</span>
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="counter_receipt">Counter Kwitansi</Label>
                      <Input
                        id="counter_receipt"
                        type="number"
                        min="0"
                        value={settings.counter_receipt}
                        onChange={(e) => setSettings((prev) => ({ ...prev, counter_receipt: parseInt(e.target.value) || 0 }))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Nomor berikutnya: <span className="font-mono font-semibold">{nextReceiptNumber}</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Preview */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Eye className="h-5 w-5" />
                    Preview Stempel Dinamis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-8 py-4">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm font-medium text-muted-foreground">LUNAS</p>
                      <DynamicStamp
                        status="LUNAS"
                        documentNumber={nextReceiptNumber}
                        companyName={settings.company_name || "Nama Perusahaan"}
                        date={today}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm font-medium text-muted-foreground">BELUM LUNAS</p>
                      <DynamicStamp
                        status="BELUM_LUNAS"
                        documentNumber={nextInvoiceNumber}
                        companyName={settings.company_name || "Nama Perusahaan"}
                        date={today}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview TTD */}
              {settings.signature_image_url && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Preview TTD pada Dokumen</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center py-4">
                      <p className="text-sm text-muted-foreground mb-2">Hormat Kami,</p>
                      <img
                        src={settings.signature_image_url}
                        alt="Preview TTD"
                        className="max-h-24 object-contain"
                      />
                      <p className="font-semibold mt-2">
                        {settings.owner_name || settings.company_name || "(Nama)"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentSignatureSettings;
