import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MessageSquare, Loader2, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const DEFAULT_CONFIG = {
  default_model: "gemini-2.0-flash-exp",
  system_prompt: "Kamu adalah asisten AI yang membantu dengan berbagai pertanyaan. Berikan jawaban yang jelas, informatif, dan membantu.",
  enable_streaming: true,
  history_limit: 50,
  max_tokens: 4096,
  temperature: 0.7,
};

interface AIChatConfigProps {
  activeProvider: string | null;
}

export const AIChatConfig = ({ activeProvider }: AIChatConfigProps) => {
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
        .eq("feature_name", "ai_chat")
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
        .eq("feature_name", "ai_chat")
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
            feature_name: "ai_chat",
            config,
          });

        if (error) throw error;
      }

      toast.success("✅ Konfigurasi AI Chat berhasil disimpan");
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
          <MessageSquare className="h-4 w-4" />
          <AlertDescription>
            Anda belum mengaktifkan AI provider. Silakan setting provider terlebih dahulu di tab "Provider Settings".
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Model Settings</CardTitle>
          <CardDescription>
            Konfigurasi model AI untuk AI Chat (/vip/ai-chat)
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
                <SelectItem value="deepseek-chat">DeepSeek Chat</SelectItem>
                <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B</SelectItem>
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

          <div className="space-y-2">
            <Label>History Limit</Label>
            <Input
              type="number"
              min="10"
              max="100"
              value={config.history_limit}
              onChange={(e) => setConfig({ ...config, history_limit: parseInt(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              Jumlah maksimal percakapan yang disimpan
            </p>
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
          <CardTitle>Feature Settings</CardTitle>
          <CardDescription>
            Pengaturan fitur AI Chat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Streaming Response</Label>
              <p className="text-xs text-muted-foreground">Tampilkan response secara real-time</p>
            </div>
            <Switch
              checked={config.enable_streaming}
              onCheckedChange={(v) => setConfig({ ...config, enable_streaming: v })}
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