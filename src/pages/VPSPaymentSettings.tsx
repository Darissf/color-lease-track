import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
  ArrowLeft, Key, Copy, Eye, EyeOff,
  Loader2, Webhook, Server, Download, Terminal,
  FileText, CheckCircle, AlertCircle
} from "lucide-react";

interface ProviderSettings {
  id: string;
  user_id: string;
  provider: string;
  api_key_encrypted: string | null;
  webhook_secret_encrypted: string | null;
  is_active: boolean;
  last_webhook_at: string | null;
  last_error: string | null;
  error_count: number;
  config: Record<string, unknown>;
}

export default function VPSPaymentSettings() {
  const { isSuperAdmin, user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [vpsSettings, setVpsSettings] = useState<ProviderSettings | null>(null);
  const [showVpsSecret, setShowVpsSecret] = useState(false);
  const [generatingSecret, setGeneratingSecret] = useState(false);

  const vpsWebhookUrl = `https://uqzzpxfmwhmhiqniiyjk.supabase.co/functions/v1/bank-scraper-webhook`;

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/");
      return;
    }
    fetchData();
  }, [isSuperAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: vpsData } = await supabase
        .from("payment_provider_settings")
        .select("*")
        .eq("provider", "vps_scraper")
        .limit(1)
        .maybeSingle();
      
      if (vpsData) {
        setVpsSettings(vpsData as ProviderSettings);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateVpsSecretKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'vps_';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSaveVpsSettings = async () => {
    setGeneratingSecret(true);
    try {
      const secretKey = generateVpsSecretKey();
      
      if (vpsSettings) {
        const { error } = await supabase
          .from("payment_provider_settings")
          .update({
            webhook_secret_encrypted: secretKey,
            is_active: true,
          })
          .eq("id", vpsSettings.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("payment_provider_settings")
          .insert({
            provider: "vps_scraper",
            user_id: user?.id,
            webhook_secret_encrypted: secretKey,
            is_active: true,
          });
        
        if (error) throw error;
      }
      
      toast.success("VPS Scraper berhasil dikonfigurasi!");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan pengaturan VPS");
    } finally {
      setGeneratingSecret(false);
    }
  };

  const handleToggleVpsActive = async () => {
    if (!vpsSettings) return;
    
    try {
      const { error } = await supabase
        .from("payment_provider_settings")
        .update({ is_active: !vpsSettings.is_active })
        .eq("id", vpsSettings.id);

      if (error) throw error;
      toast.success(vpsSettings.is_active ? "VPS Scraper dinonaktifkan" : "VPS Scraper diaktifkan");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Gagal mengubah status");
    }
  };

  const handleTestVpsWebhook = async () => {
    if (!vpsSettings?.webhook_secret_encrypted) {
      toast.error("Generate secret key terlebih dahulu");
      return;
    }
    
    setTesting(true);
    try {
      const response = await fetch(vpsWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret_key: vpsSettings.webhook_secret_encrypted,
          mutations: [{
            date: new Date().toISOString().split("T")[0],
            time: new Date().toTimeString().split(" ")[0],
            amount: 1,
            type: "credit",
            description: "TEST VPS WEBHOOK - IGNORE",
          }],
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success("VPS Webhook test berhasil!");
      } else {
        toast.error(`VPS Webhook test gagal: ${result.error}`);
      }
    } catch (error: any) {
      toast.error(`Test gagal: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const copyVpsSecretKey = () => {
    if (vpsSettings?.webhook_secret_encrypted) {
      navigator.clipboard.writeText(vpsSettings.webhook_secret_encrypted);
      toast.success("Secret Key berhasil disalin!");
    }
  };

  const copyVpsWebhookUrl = () => {
    navigator.clipboard.writeText(vpsWebhookUrl);
    toast.success("VPS Webhook URL berhasil disalin!");
  };

  if (!isSuperAdmin) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-3 py-3 sm:px-4 sm:py-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/vip/settings/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
              VPS Payment Scraper
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Verifikasi pembayaran otomatis via VPS Self-Hosted
            </p>
          </div>
          <div className="flex items-center gap-2">
            {vpsSettings?.is_active && (
              <Badge variant="default" className="bg-green-500">
                Aktif
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-4 space-y-4">
        {/* VPS Info Banner */}
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-green-500/20">
                <Server className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-700 dark:text-green-400">VPS Scraper (Self-Hosted)</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Jalankan script scraper di VPS sendiri. <strong>Gratis tanpa biaya langganan</strong>, 
                  hanya butuh VPS murah (~$5/bulan). Interval bisa dikonfigurasi via cron.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Secret Key Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Secret Key
              </CardTitle>
              <CardDescription>
                Generate secret key untuk autentikasi webhook dari VPS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {vpsSettings?.webhook_secret_encrypted ? (
                <>
                  <div className="space-y-2">
                    <Label>Your Secret Key</Label>
                    <div className="flex gap-2">
                      <Input
                        type={showVpsSecret ? "text" : "password"}
                        value={vpsSettings.webhook_secret_encrypted}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button variant="ghost" size="icon" onClick={() => setShowVpsSecret(!showVpsSecret)}>
                        {showVpsSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="icon" onClick={copyVpsSecretKey}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-green-600">✓ Secret key sudah dikonfigurasi</p>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Status VPS Scraper</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={vpsSettings.is_active}
                        onCheckedChange={handleToggleVpsActive}
                      />
                      <Badge variant={vpsSettings.is_active ? "default" : "secondary"}>
                        {vpsSettings.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                  </div>

                  <Button variant="outline" onClick={handleSaveVpsSettings} disabled={generatingSecret} className="w-full">
                    {generatingSecret && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Re-generate Secret Key
                  </Button>
                </>
              ) : (
                <Button onClick={handleSaveVpsSettings} disabled={generatingSecret} className="w-full">
                  {generatingSecret && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Generate Secret Key
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Webhook URL Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhook URL
              </CardTitle>
              <CardDescription>
                URL ini digunakan oleh VPS scraper untuk mengirim data mutasi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook Endpoint</Label>
                <div className="flex gap-2">
                  <Input
                    value={vpsWebhookUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={copyVpsWebhookUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label>Payload Format</Label>
                <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`{
  "secret_key": "vps_xxx...",
  "mutations": [{
    "date": "2025-12-28",
    "time": "10:30:00",
    "amount": 1500000,
    "type": "credit",
    "description": "Transfer dari BUDI",
    "balance_after": 15000000
  }]
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* VPS Script Download */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Script
            </CardTitle>
            <CardDescription>
              Download template script untuk dijalankan di VPS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Button variant="outline" className="justify-start gap-3 h-auto py-3" asChild>
                <a href="/vps-scraper-template/bca-scraper.js" download>
                  <Terminal className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">bca-scraper.js</p>
                    <p className="text-xs text-muted-foreground">Node.js + Puppeteer script</p>
                  </div>
                </a>
              </Button>
              <Button variant="outline" className="justify-start gap-3 h-auto py-3" asChild>
                <a href="/vps-scraper-template/README.md" download>
                  <FileText className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">README.md</p>
                    <p className="text-xs text-muted-foreground">Panduan setup lengkap</p>
                  </div>
                </a>
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleTestVpsWebhook} disabled={testing || !vpsSettings?.webhook_secret_encrypted}>
                {testing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Test VPS Webhook
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* VPS Status */}
        {vpsSettings?.last_webhook_at && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-500/20">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last VPS Webhook</p>
                    <p className="font-semibold">
                      {format(new Date(vpsSettings.last_webhook_at), "dd MMM yyyy HH:mm", { locale: localeId })}
                    </p>
                  </div>
                </div>
                {vpsSettings.last_error && (
                  <Badge variant="destructive">Error: {vpsSettings.error_count}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {vpsSettings?.last_error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Error Terakhir
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{vpsSettings.last_error}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Error count: {vpsSettings.error_count}
              </p>
            </CardContent>
          </Card>
        )}

        {/* VPS Setup Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Panduan Setup VPS Scraper</CardTitle>
            <CardDescription>
              Ikuti langkah-langkah berikut untuk mengaktifkan VPS scraper
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold">Generate Secret Key</h4>
                  <p className="text-sm text-muted-foreground">
                    Klik tombol "Generate Secret Key" di atas untuk mendapatkan key autentikasi.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold">Siapkan VPS</h4>
                  <p className="text-sm text-muted-foreground">
                    Sewa VPS murah (DigitalOcean, Vultr, Linode) dengan Ubuntu/Debian.
                    Minimal: 1 vCPU, 1GB RAM, ~$5/bulan.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold">Install Dependencies</h4>
                  <pre className="p-3 bg-muted rounded-lg text-xs mt-2 overflow-x-auto">
{`# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Chrome dependencies
sudo apt-get install -y chromium-browser

# Install Puppeteer
npm install puppeteer`}
                  </pre>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h4 className="font-semibold">Download & Configure Script</h4>
                  <p className="text-sm text-muted-foreground">
                    Download bca-scraper.js, edit konfigurasi (username, password BCA, secret key, webhook URL).
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
                  5
                </div>
                <div>
                  <h4 className="font-semibold">Setup Cron Job</h4>
                  <pre className="p-3 bg-muted rounded-lg text-xs mt-2 overflow-x-auto">
{`# Jalankan setiap 5 menit
crontab -e
*/5 * * * * cd /path/to/scraper && node bca-scraper.js >> /var/log/scraper.log 2>&1`}
                  </pre>
                </div>
              </div>
            </div>

            <Separator />

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">💡 Cara Kerja</h4>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Script di VPS login ke BCA iBanking dan scrape mutasi terbaru</li>
                <li>Data mutasi dikirim ke webhook URL dengan secret key</li>
                <li>Sistem otomatis cocokkan nominal dengan payment request</li>
                <li>Customer terima notifikasi WhatsApp bahwa pembayaran sudah dikonfirmasi</li>
              </ol>
            </div>

            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="font-semibold mb-2 text-green-800 dark:text-green-200">💰 Biaya</h4>
              <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                <li>• VPS: ~$5/bulan (DigitalOcean, Vultr, Linode)</li>
                <li>• Tidak ada biaya langganan per transaksi</li>
                <li>• Interval bisa dikonfigurasi (1-15 menit)</li>
                <li>• Full control atas data dan script</li>
              </ul>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
              <h4 className="font-semibold mb-2 text-amber-800 dark:text-amber-200">⚠️ Perhatian</h4>
              <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                <li>• Pastikan VPS memiliki IP statis</li>
                <li>• Gunakan proxy jika diperlukan untuk menghindari blokir</li>
                <li>• Simpan kredensial BCA dengan aman (environment variables)</li>
                <li>• Monitor log untuk memastikan script berjalan normal</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
