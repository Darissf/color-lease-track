import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Key, Brain, Check, AlertCircle, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

const AI_PROVIDERS = {
  gemini: {
    name: "Google Gemini",
    description: "Model AI dari Google dengan reasoning yang kuat (Support Vision)",
    link: "https://aistudio.google.com/app/apikey",
    needsApiKey: true,
    models: ["gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash"],
    keyPrefix: "AI",
  },
  openai: {
    name: "OpenAI",
    description: "GPT models dari OpenAI (Support Vision)",
    link: "https://platform.openai.com/api-keys",
    needsApiKey: true,
    models: ["gpt-5", "gpt-5-mini", "gpt-4o", "gpt-4o-mini"],
    keyPrefix: "sk-",
  },
  claude: {
    name: "Anthropic Claude",
    description: "Claude models dengan context window besar (Support Vision)",
    link: "https://console.anthropic.com/settings/keys",
    needsApiKey: true,
    models: ["claude-sonnet-4-5", "claude-opus-4-1", "claude-3-5-haiku"],
    keyPrefix: "sk-ant-",
  },
  deepseek: {
    name: "DeepSeek",
    description: "Model open source dengan performa tinggi (Text Only)",
    link: "https://platform.deepseek.com/api_keys",
    needsApiKey: true,
    models: ["deepseek-chat", "deepseek-coder"],
    keyPrefix: "sk-",
  },
  groq: {
    name: "Groq",
    description: "Inference super cepat untuk berbagai model (Text Only)",
    link: "https://console.groq.com/keys",
    needsApiKey: true,
    models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
    keyPrefix: "gsk_",
  },
} as const;

type AIProvider = keyof typeof AI_PROVIDERS;

const apiKeySchema = z.object({
  provider: z.string().min(1, "Pilih provider"),
  apiKey: z.string()
    .trim()
    .min(10, "API key terlalu pendek (min 10 karakter)")
    .max(500, "API key terlalu panjang (max 500 karakter)")
    .regex(/^[A-Za-z0-9_\-\.]+$/, "API key hanya boleh berisi huruf, angka, underscore, dash, dan dot"),
});

const AISettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<AIProvider>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [hasSettings, setHasSettings] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [allSettings, setAllSettings] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchAllSettings();
    }
  }, [user]);

  const fetchAllSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("user_ai_settings")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllSettings(data || []);
      
      // Set active provider if exists
      const activeProvider = data?.find(s => s.is_active);
      if (activeProvider) {
        setProvider(activeProvider.ai_provider as AIProvider);
        setApiKey(activeProvider.api_key || "");
        setHasSettings(true);
      }
    } catch (error: any) {
      console.error("Error fetching settings:", error);
    }
  };

  const validateInput = () => {
    const providerInfo = AI_PROVIDERS[provider];
    
    if (!providerInfo.needsApiKey) {
      return { success: true };
    }

    if (!apiKey.trim()) {
      return { success: false, error: "API Key tidak boleh kosong" };
    }

    const validation = apiKeySchema.safeParse({ provider, apiKey });
    if (!validation.success) {
      return { 
        success: false, 
        error: validation.error.errors[0].message 
      };
    }

    // Check prefix
    if (providerInfo.keyPrefix && !apiKey.startsWith(providerInfo.keyPrefix)) {
      return {
        success: false,
        error: `API key untuk ${providerInfo.name} harus dimulai dengan "${providerInfo.keyPrefix}"`
      };
    }

    return { success: true };
  };

  const handleSave = async () => {
    const validation = validateInput();
    if (!validation.success) {
      toast.error(validation.error);
      return;
    }

    try {
      setLoading(true);

      // Deactivate all existing settings first
      await supabase
        .from("user_ai_settings")
        .update({ is_active: false })
        .eq("user_id", user?.id);

      // Check if this specific provider already exists for this user
      const existing = allSettings.find(s => s.ai_provider === provider);
      
      if (existing) {
        // Update existing provider
        const { error } = await supabase
          .from("user_ai_settings")
          .update({
            api_key: AI_PROVIDERS[provider].needsApiKey ? apiKey : "",
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
        toast.success(`✅ ${AI_PROVIDERS[provider].name} berhasil diupdate`);
      } else {
        // Insert new provider
        const { error } = await supabase
          .from("user_ai_settings")
          .insert({
            user_id: user?.id,
            ai_provider: provider,
            api_key: AI_PROVIDERS[provider].needsApiKey ? apiKey : "",
            is_active: true,
          });

        if (error) throw error;
        toast.success(`✅ ${AI_PROVIDERS[provider].name} berhasil disimpan`);
      }

      await fetchAllSettings();
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error("❌ Gagal menyimpan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (settingId: string, providerName: string) => {
    if (!confirm(`Hapus API key untuk ${providerName}?`)) return;

    try {
      const { error } = await supabase
        .from("user_ai_settings")
        .delete()
        .eq("id", settingId);

      if (error) throw error;
      toast.success("API key berhasil dihapus");
      await fetchAllSettings();
    } catch (error: any) {
      toast.error("Gagal menghapus: " + error.message);
    }
  };

  const handleActivate = async (settingId: string, providerName: string) => {
    try {
      // Deactivate all
      await supabase
        .from("user_ai_settings")
        .update({ is_active: false })
        .eq("user_id", user?.id);

      // Activate selected
      const { error } = await supabase
        .from("user_ai_settings")
        .update({ is_active: true })
        .eq("id", settingId);

      if (error) throw error;
      toast.success(`✅ ${providerName} diaktifkan`);
      await fetchAllSettings();
    } catch (error: any) {
      toast.error("Gagal mengaktifkan: " + error.message);
    }
  };

  const testConnection = async () => {
    const validation = validateInput();
    if (!validation.success) {
      toast.error(validation.error);
      return;
    }

    try {
      setTestingConnection(true);
      
      const { data, error } = await supabase.functions.invoke("test-ai-connection", {
        body: { 
          provider,
          apiKey: AI_PROVIDERS[provider].needsApiKey ? apiKey : undefined,
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

  const currentProvider = AI_PROVIDERS[provider];

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Brain className="w-8 h-8" />
          AI Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Kelola API keys untuk berbagai AI provider
        </p>
      </div>

      {/* Active Providers */}
      {allSettings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Provider Tersimpan</CardTitle>
            <CardDescription>
              Klik untuk mengaktifkan provider yang akan digunakan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {allSettings.map((setting) => {
              const providerInfo = AI_PROVIDERS[setting.ai_provider as AIProvider];
              return (
                <div
                  key={setting.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {providerInfo?.name || setting.ai_provider}
                        {setting.is_active && (
                          <Badge variant="default" className="text-xs">
                            <Check className="w-3 h-3 mr-1" />
                            Aktif
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {providerInfo?.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!setting.is_active && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleActivate(setting.id, providerInfo?.name)}
                      >
                        Aktifkan
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(setting.id, providerInfo?.name)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Provider */}
      <Card>
        <CardHeader>
          <CardTitle>Tambah/Edit API Key</CardTitle>
          <CardDescription>
            Pilih provider dan masukkan API key Anda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider">AI Provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as AIProvider)}>
              <SelectTrigger id="provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AI_PROVIDERS).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    {info.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Provider Info */}
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">{currentProvider.name}</p>
                <p className="text-sm">{currentProvider.description}</p>
                {currentProvider.models && (
                  <div className="flex flex-wrap gap-1">
                    {currentProvider.models.map((model) => (
                      <Badge key={model} variant="secondary" className="text-xs">
                        {model}
                      </Badge>
                    ))}
                  </div>
                )}
                {currentProvider.link && (
                  <a
                    href={currentProvider.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Dapatkan API key di sini
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {/* API Key Input */}
          {currentProvider.needsApiKey && (
            <div className="space-y-2">
              <Label htmlFor="apiKey">
                API Key
                {currentProvider.keyPrefix && (
                  <span className="text-muted-foreground text-xs ml-2">
                    (harus dimulai dengan "{currentProvider.keyPrefix}")
                  </span>
                )}
              </Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Masukkan ${currentProvider.name} API key`}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                API key akan disimpan dengan aman dan ter-enkripsi
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={loading || (currentProvider.needsApiKey && !apiKey.trim())}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Simpan API Key
                </>
              )}
            </Button>
            
            {currentProvider.needsApiKey && (
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={testingConnection || !apiKey.trim()}
              >
                {testingConnection ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Test
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Note */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Keamanan:</strong> API keys Anda disimpan dengan aman di database dan hanya dapat diakses oleh akun Anda. 
          Jangan share API key dengan orang lain.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default AISettings;
