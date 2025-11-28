import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Bot, Loader2, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const DEFAULT_CONFIG = {
  default_model: "gemini-2.0-flash-exp",
  system_prompt: "Kamu adalah asisten keuangan yang membantu pengguna mengelola keuangan mereka dengan bijak. Berikan saran yang praktis dan mudah dipahami.",
  enable_function_calling: true,
  enable_context_memory: true,
  enable_persona: true,
  enable_voice_input: true,
  enable_image_upload: true,
  max_tokens: 4096,
  temperature: 0.7,
};

interface ChatBotConfigProps {
  activeProvider: string | null;
}

export const ChatBotConfig = ({ activeProvider }: ChatBotConfigProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    if (user) {
      loadConfig();
    }
  }, [user]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("ai_feature_config")
        .select("*")
        .eq("user_id", user?.id)
        .eq("feature_name", "chatbot_ai")
        .maybeSingle();

      if (error) throw error;

      if (data && data.config && typeof data.config === 'object') {
        setConfig({ ...DEFAULT_CONFIG, ...data.config as any });
      }
    } catch (error: any) {
      console.error("Error loading config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { data: existing } = await supabase
        .from("ai_feature_config")
        .select("id")
        .eq("user_id", user?.id)
        .eq("feature_name", "chatbot_ai")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("ai_feature_config")
          .update({
            config,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ai_feature_config")
          .insert({
            user_id: user?.id,
            feature_name: "chatbot_ai",
            config,
          });

        if (error) throw error;
      }

      toast.success("✅ Konfigurasi ChatBot AI berhasil disimpan");
    } catch (error: any) {
      console.error("Error saving config:", error);
      toast.error("❌ Gagal menyimpan: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm("Reset ke konfigurasi default?")) return;
    setConfig(DEFAULT_CONFIG);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!activeProvider && (
        <Alert>
          <Bot className="h-4 w-4" />
          <AlertDescription>
            Anda belum mengaktifkan AI provider. Silakan setting provider terlebih dahulu di tab "Provider Settings".
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Model Settings</CardTitle>
          <CardDescription>
            Konfigurasi model AI untuk ChatBot AI (/vip/chatbot)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Model</Label>
            <Select 
              value={config.default_model} 
              onValueChange={(v) => setConfig({ ...config, default_model: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash</SelectItem>
                <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                <SelectItem value="claude-sonnet-4-5">Claude Sonnet 4.5</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Temperature ({config.temperature})</Label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.temperature}
              onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Nilai lebih tinggi = lebih kreatif, nilai lebih rendah = lebih deterministik
            </p>
          </div>

          <div className="space-y-2">
            <Label>Max Tokens</Label>
            <Select 
              value={config.max_tokens.toString()} 
              onValueChange={(v) => setConfig({ ...config, max_tokens: parseInt(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1024">1024 tokens</SelectItem>
                <SelectItem value="2048">2048 tokens</SelectItem>
                <SelectItem value="4096">4096 tokens</SelectItem>
                <SelectItem value="8192">8192 tokens</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Prompt</CardTitle>
          <CardDescription>
            Instruksi sistem yang menentukan karakter dan perilaku AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.system_prompt}
            onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
            rows={6}
            placeholder="Masukkan system prompt..."
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature Toggles</CardTitle>
          <CardDescription>
            Aktifkan atau nonaktifkan fitur-fitur ChatBot AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Function Calling</Label>
              <p className="text-xs text-muted-foreground">AI dapat query database untuk data akurat</p>
            </div>
            <Switch
              checked={config.enable_function_calling}
              onCheckedChange={(v) => setConfig({ ...config, enable_function_calling: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Context Memory</Label>
              <p className="text-xs text-muted-foreground">Simpan konteks percakapan</p>
            </div>
            <Switch
              checked={config.enable_context_memory}
              onCheckedChange={(v) => setConfig({ ...config, enable_context_memory: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Persona System</Label>
              <p className="text-xs text-muted-foreground">Gunakan persona AI yang berbeda</p>
            </div>
            <Switch
              checked={config.enable_persona}
              onCheckedChange={(v) => setConfig({ ...config, enable_persona: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Voice Input</Label>
              <p className="text-xs text-muted-foreground">Input menggunakan suara</p>
            </div>
            <Switch
              checked={config.enable_voice_input}
              onCheckedChange={(v) => setConfig({ ...config, enable_voice_input: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Image Upload</Label>
              <p className="text-xs text-muted-foreground">Upload gambar untuk analisis AI</p>
            </div>
            <Switch
              checked={config.enable_image_upload}
              onCheckedChange={(v) => setConfig({ ...config, enable_image_upload: v })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Simpan Konfigurasi
            </>
          )}
        </Button>
        <Button onClick={handleReset} variant="outline">
          Reset Default
        </Button>
      </div>
    </div>
  );
};