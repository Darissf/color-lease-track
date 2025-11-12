import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Key, Brain, Check, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AISettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<"gemini" | "openai" | "claude">("gemini");
  const [apiKey, setApiKey] = useState("");
  const [hasSettings, setHasSettings] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("user_ai_settings")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProvider(data.ai_provider as "gemini" | "openai" | "claude");
        setApiKey(data.api_key);
        setHasSettings(true);
      }
    } catch (error: any) {
      console.error("Error fetching settings:", error);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error("API Key tidak boleh kosong");
      return;
    }

    try {
      setLoading(true);

      if (hasSettings) {
        // Update existing settings
        const { error } = await supabase
          .from("user_ai_settings")
          .update({
            ai_provider: provider,
            api_key: apiKey,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user?.id);

        if (error) throw error;
        toast.success("Pengaturan AI berhasil diupdate");
      } else {
        // Insert new settings
        const { error } = await supabase
          .from("user_ai_settings")
          .insert({
            user_id: user?.id,
            ai_provider: provider,
            api_key: apiKey,
          });

        if (error) throw error;
        toast.success("Pengaturan AI berhasil disimpan");
        setHasSettings(true);
      }
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error("Gagal menyimpan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!apiKey.trim()) {
      toast.error("Masukkan API Key terlebih dahulu");
      return;
    }

    try {
      setTestingConnection(true);
      
      // Call edge function with test phone number and credentials
      const { data, error } = await supabase.functions.invoke("validate-whatsapp", {
        body: { 
          phoneNumber: "+628123456789",
          test: true,
          test_api_key: apiKey,
          test_provider: provider
        }
      });

      if (error) throw error;

      toast.success("✅ Koneksi berhasil! API key valid.");
    } catch (error: any) {
      console.error("Connection test failed:", error);
      toast.error("❌ Koneksi gagal: " + error.message);
    } finally {
      setTestingConnection(false);
    }
  };

  const getProviderInfo = () => {
    switch (provider) {
      case "gemini":
        return {
          name: "Google Gemini",
          link: "https://aistudio.google.com/app/apikey",
          instructions: "1. Buka Google AI Studio\n2. Klik 'Get API Key'\n3. Buat project baru atau pilih yang ada\n4. Copy API key",
          format: "AIza..."
        };
      case "openai":
        return {
          name: "OpenAI",
          link: "https://platform.openai.com/api-keys",
          instructions: "1. Login ke OpenAI Platform\n2. Buka Settings → API Keys\n3. Klik 'Create new secret key'\n4. Copy dan simpan key tersebut",
          format: "sk-proj-..."
        };
      case "claude":
        return {
          name: "Anthropic Claude",
          link: "https://console.anthropic.com/settings/keys",
          instructions: "1. Login ke Anthropic Console\n2. Buka Settings → API Keys\n3. Klik 'Create Key'\n4. Copy API key",
          format: "sk-ant-..."
        };
    }
  };

  const providerInfo = getProviderInfo();

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mb-2">
            Pengaturan AI
          </h1>
          <p className="text-muted-foreground">
            Konfigurasi API key untuk validasi WhatsApp otomatis
          </p>
        </div>

        <Card className="p-6 gradient-card border-0 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center text-white shadow-lg">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Validasi WhatsApp dengan AI</h2>
              <p className="text-sm text-muted-foreground">
                AI akan menganalisa nomor dan memprediksi keberadaan WhatsApp
              </p>
            </div>
          </div>

          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              API key Anda disimpan dengan aman dan hanya digunakan untuk validasi WhatsApp.
              Pastikan API key memiliki credit/quota yang cukup.
            </AlertDescription>
          </Alert>

          <div className="space-y-6">
            <div>
              <Label>Provider AI</Label>
              <Select value={provider} onValueChange={(value) => setProvider(value as "gemini" | "openai" | "claude")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Google Gemini (Rekomendasi)</SelectItem>
                  <SelectItem value="openai">OpenAI GPT</SelectItem>
                  <SelectItem value="claude">Anthropic Claude</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`Contoh: ${providerInfo.format}`}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  onClick={testConnection}
                  disabled={!apiKey.trim() || testingConnection}
                >
                  {testingConnection ? "Testing..." : "Test"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Format: {providerInfo.format}
              </p>
            </div>

            <Card className="p-4 bg-muted/50 border-muted">
              <div className="flex items-start gap-3">
                <Key className="h-5 w-5 text-primary mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Cara mendapatkan API Key {providerInfo.name}</h3>
                  <ol className="text-sm space-y-1 mb-3 list-decimal list-inside text-muted-foreground">
                    {providerInfo.instructions.split("\n").map((step, i) => (
                      <li key={i}>{step.replace(/^\d+\.\s/, "")}</li>
                    ))}
                  </ol>
                  <a
                    href={providerInfo.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm font-medium"
                  >
                    Buka {providerInfo.name} Dashboard →
                  </a>
                </div>
              </div>
            </Card>

            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={loading || !apiKey.trim()}
                className="flex-1"
              >
                {loading ? "Menyimpan..." : hasSettings ? "Update Pengaturan" : "Simpan Pengaturan"}
              </Button>
            </div>

            {hasSettings && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" />
                <span>AI sudah dikonfigurasi dan siap digunakan</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 mt-6 gradient-card border-0 shadow-lg">
          <h3 className="font-bold mb-3">Cara Kerja Validasi AI</h3>
          <ol className="text-sm space-y-2 text-muted-foreground list-decimal list-inside">
            <li>Saat Anda mengetik nomor telepon di form client, AI akan menganalisa nomor tersebut</li>
            <li>AI memprediksi apakah nomor kemungkinan memiliki WhatsApp berdasarkan:
              <ul className="ml-6 mt-1 list-disc list-inside">
                <li>Operator seluler Indonesia (Telkomsel, Indosat, XL, dll)</li>
                <li>Format dan validitas nomor</li>
                <li>Pola penggunaan WhatsApp di Indonesia</li>
              </ul>
            </li>
            <li>Hasil prediksi ditampilkan sebagai icon badge di daftar client</li>
            <li>✅ = Kemungkinan besar ada WhatsApp</li>
            <li>❌ = Kemungkinan tidak ada WhatsApp</li>
            <li>⚠️ = Tidak yakin / perlu verifikasi manual</li>
          </ol>
        </Card>
      </div>
    </div>
  );
};

export default AISettings;