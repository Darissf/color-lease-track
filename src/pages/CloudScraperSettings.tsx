import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
  ArrowLeft, Cloud, Eye, EyeOff, Key, Copy,
  Loader2, Server, CheckCircle, Download, Terminal,
  AlertCircle, Database, Webhook, FileText, AlertTriangle,
  ExternalLink, Package, FolderDown
} from "lucide-react";

interface VPSSettings {
  id: string;
  user_id: string;
  provider: string;
  webhook_secret_encrypted: string | null;
  is_active: boolean;
  last_webhook_at: string | null;
  last_error: string | null;
  error_count: number;
  config: Record<string, unknown>;
  // VPS specific stats
  total_scrapes?: number;
  total_mutations_found?: number;
}

interface CloudScraperSettings {
  id: string;
  user_id: string;
  provider: string;
  is_active: boolean;
  bank_credentials: {
    user_id?: string;
    pin?: string;
    account_number?: string;
  };
  scrape_interval_minutes: number;
  last_scrape_at: string | null;
  scrape_status: string;
  total_scrapes: number;
  total_mutations_found: number;
  last_error: string | null;
  error_count: number;
}

export default function BankScraperSettings() {
  const { isSuperAdmin, user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("vps");
  
  // VPS Settings State
  const [vpsSettings, setVpsSettings] = useState<VPSSettings | null>(null);
  const [showVpsSecret, setShowVpsSecret] = useState(false);
  const [generatingSecret, setGeneratingSecret] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  
  // Cloud Settings State (read-only for deprecated display)
  const [cloudSettings, setCloudSettings] = useState<CloudScraperSettings | null>(null);

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
      // Fetch VPS Scraper settings
      const { data: vpsData } = await supabase
        .from("payment_provider_settings")
        .select("*")
        .eq("provider", "vps_scraper")
        .limit(1)
        .maybeSingle();
      
      if (vpsData) {
        setVpsSettings(vpsData as unknown as VPSSettings);
      }

      // Fetch Cloud Scraper settings (for deprecated display)
      const { data: cloudData } = await supabase
        .from("payment_provider_settings")
        .select("*")
        .eq("provider", "cloud_scraper")
        .limit(1)
        .maybeSingle();
      
      if (cloudData) {
        setCloudSettings(cloudData as unknown as CloudScraperSettings);
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

  const handleGenerateSecretKey = async () => {
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
      
      toast.success("Secret Key berhasil di-generate!");
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Gagal generate secret key");
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
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Gagal mengubah status");
    }
  };

  const handleTestWebhook = async () => {
    if (!vpsSettings?.webhook_secret_encrypted) {
      toast.error("Generate secret key terlebih dahulu");
      return;
    }
    
    setTestingWebhook(true);
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
        toast.success("Webhook test berhasil!");
        fetchData();
      } else {
        toast.error(`Webhook test gagal: ${result.error}`);
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(`Test gagal: ${err.message}`);
    } finally {
      setTestingWebhook(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} berhasil disalin!`);
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
              Bank Scraper Settings
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Pilih metode verifikasi pembayaran otomatis
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="vps" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              VPS Scraper
              <Badge variant="default" className="ml-1 bg-green-500 text-xs">Recommended</Badge>
            </TabsTrigger>
            <TabsTrigger value="cloud" className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Cloud Scraper
              <Badge variant="secondary" className="ml-1 text-xs">Deprecated</Badge>
            </TabsTrigger>
          </TabsList>

          {/* VPS Scraper Tab */}
          <TabsContent value="vps" className="space-y-4">
            {/* VPS Info Banner */}
            <Card className="bg-green-500/10 border-green-500/30">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-full bg-green-500/20">
                    <Server className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-700 dark:text-green-400">VPS Scraper (Recommended)</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Jalankan scraper di VPS Eropa dengan OpenVPN Indonesia. <strong>Biaya ~$5-10/bulan</strong>.
                      Full control, lebih reliable, dan tidak membutuhkan layanan berbayar mahal.
                    </p>
                  </div>
                  {vpsSettings?.is_active && (
                    <Badge variant="default" className="bg-green-500">Aktif</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Webhook URL Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="h-5 w-5" />
                    Webhook URL
                  </CardTitle>
                  <CardDescription>
                    URL untuk VPS scraper mengirim data mutasi
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
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(vpsWebhookUrl, "Webhook URL")}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Secret Key Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Secret Key
                  </CardTitle>
                  <CardDescription>
                    Key autentikasi untuk webhook dari VPS
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
                          <Button variant="outline" size="icon" onClick={() => copyToClipboard(vpsSettings.webhook_secret_encrypted!, "Secret Key")}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-green-600">✓ Secret key sudah dikonfigurasi</p>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm">Status VPS Scraper</span>
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

                      <Button variant="outline" onClick={handleGenerateSecretKey} disabled={generatingSecret} className="w-full">
                        {generatingSecret && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Re-generate Secret Key
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleGenerateSecretKey} disabled={generatingSecret} className="w-full">
                      {generatingSecret && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Generate Secret Key
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Download Setup Package */}
            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Download Setup Package
                </CardTitle>
                <CardDescription>
                  Download semua file dalam satu paket untuk setup VPS scraper
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Main Download Button */}
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold">All-in-One Setup Package</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Download semua file: install.sh, config.env, bca-scraper.js, run.sh, dan panduan setup.
                        {vpsSettings?.webhook_secret_encrypted && (
                          <span className="text-green-600 dark:text-green-400"> Secret Key sudah terisi otomatis!</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Individual Files */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Download file individual:</Label>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <Button variant="outline" size="sm" className="justify-start gap-2 h-auto py-2" asChild>
                      <a href="/vps-scraper-template/install.sh" download>
                        <FolderDown className="h-4 w-4" />
                        <span>install.sh</span>
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start gap-2 h-auto py-2" asChild>
                      <a href="/vps-scraper-template/config.env.template" download="config.env">
                        <FileText className="h-4 w-4" />
                        <span>config.env</span>
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start gap-2 h-auto py-2" asChild>
                      <a href="/vps-scraper-template/bca-scraper.js" download>
                        <Terminal className="h-4 w-4" />
                        <span>bca-scraper.js</span>
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start gap-2 h-auto py-2" asChild>
                      <a href="/vps-scraper-template/run.sh" download>
                        <Terminal className="h-4 w-4" />
                        <span>run.sh</span>
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start gap-2 h-auto py-2" asChild>
                      <a href="/vps-scraper-template/README.txt" download>
                        <FileText className="h-4 w-4" />
                        <span>README.txt</span>
                      </a>
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleTestWebhook} disabled={testingWebhook || !vpsSettings?.webhook_secret_encrypted}>
                    {testingWebhook && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Test Webhook
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
                        <p className="text-sm text-muted-foreground">Last Webhook Received</p>
                        <p className="font-semibold">
                          {format(new Date(vpsSettings.last_webhook_at), "dd MMM yyyy HH:mm:ss", { locale: localeId })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {vpsSettings.total_scrapes !== undefined && (
                        <div className="text-center">
                          <p className="text-2xl font-bold">{vpsSettings.total_scrapes || 0}</p>
                          <p className="text-xs text-muted-foreground">Scrapes</p>
                        </div>
                      )}
                      {vpsSettings.total_mutations_found !== undefined && (
                        <div className="text-center">
                          <p className="text-2xl font-bold">{vpsSettings.total_mutations_found || 0}</p>
                          <p className="text-xs text-muted-foreground">Mutations</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* VPS Error Display */}
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

            {/* Quick Setup Steps */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Setup (4 Langkah)</CardTitle>
                <CardDescription>
                  Panduan singkat setup VPS scraper - semua otomatis!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  {[
                    { 
                      step: 1, 
                      title: "Persiapan", 
                      desc: "Beli VPS Eropa (Contabo/Hetzner ~$5/bulan) & Download file .ovpn dari VPNJantit",
                      highlight: false
                    },
                    { 
                      step: 2, 
                      title: "Upload ke VPS", 
                      desc: "Upload semua file (install.sh, config.env, bca-scraper.js, run.sh, + file .ovpn) ke folder /root/bca-scraper di VPS",
                      highlight: false
                    },
                    { 
                      step: 3, 
                      title: "Jalankan Installer", 
                      desc: "chmod +x install.sh && sudo ./install.sh - Otomatis install Node.js, OpenVPN, dan setup cron!",
                      highlight: true
                    },
                    { 
                      step: 4, 
                      title: "Edit config.env", 
                      desc: "nano config.env → Isi BCA_USER_ID, BCA_PIN, dan VPN credentials. SECRET_KEY sudah terisi!",
                      highlight: false
                    },
                  ].map((item) => (
                    <div key={item.step} className={`flex gap-4 items-start p-3 rounded-lg ${item.highlight ? 'bg-green-500/10 border border-green-500/30' : ''}`}>
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
                        {item.step}
                      </div>
                      <div>
                        <h4 className="font-medium">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Terminal Example */}
                <div className="p-4 bg-zinc-900 rounded-lg text-green-400 font-mono text-xs overflow-x-auto">
                  <p className="text-zinc-500"># Di VPS, setelah upload semua file:</p>
                  <p>$ cd /root/bca-scraper</p>
                  <p>$ chmod +x install.sh && sudo ./install.sh</p>
                  <p className="text-zinc-500"># Ikuti instruksi installer, lalu:</p>
                  <p>$ nano config.env  <span className="text-zinc-500"># Edit credentials</span></p>
                  <p>$ ./run.sh  <span className="text-zinc-500"># Test manual</span></p>
                  <p className="text-green-300 mt-2"># Selesai! Scraper jalan otomatis tiap 5 menit 🎉</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cloud Scraper Tab (Deprecated) */}
          <TabsContent value="cloud" className="space-y-4">
            {/* Deprecation Warning */}
            <Card className="bg-amber-500/10 border-amber-500/30">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-full bg-amber-500/20">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-700 dark:text-amber-400">Cloud Scraper Tidak Tersedia</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Cloud Scraper membutuhkan <strong>Browserless paid plan ($200+/bulan)</strong> dan proxy Indonesia 
                      yang support dari Oxylabs. Saat ini tidak dapat digunakan karena:
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                      <li>Browserless free tier tidak support proxy</li>
                      <li>Oxylabs datacenter proxy tidak support lokasi Indonesia</li>
                      <li>KlikBCA memblokir akses dari IP luar Indonesia</li>
                    </ul>
                    <div className="mt-4">
                      <Button variant="outline" onClick={() => setActiveTab("vps")} className="gap-2">
                        <Server className="h-4 w-4" />
                        Gunakan VPS Scraper
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cloud Status (Read-only) */}
            {cloudSettings && (
              <Card className="opacity-60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Status Terakhir (Read-only)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <p className="font-semibold capitalize">
                        {cloudSettings.scrape_status === 'idle' && '⚪ Idle'}
                        {cloudSettings.scrape_status === 'running' && '🔵 Running'}
                        {cloudSettings.scrape_status === 'error' && '🔴 Error'}
                      </p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Total Scrapes</p>
                      <p className="font-semibold">{cloudSettings.total_scrapes || 0}</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Mutasi Ditemukan</p>
                      <p className="font-semibold">{cloudSettings.total_mutations_found || 0}</p>
                    </div>
                  </div>

                  {cloudSettings.last_scrape_at && (
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Last Scrape</p>
                      <p className="font-semibold">
                        {format(new Date(cloudSettings.last_scrape_at), "dd MMM yyyy HH:mm", { locale: localeId })}
                      </p>
                    </div>
                  )}

                  {cloudSettings.last_error && (
                    <Card className="border-destructive">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-destructive mb-2">
                          <AlertCircle className="h-4 w-4" />
                          <span className="font-medium">Last Error</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{cloudSettings.last_error}</p>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Credentials Info (Read-only) */}
            {cloudSettings?.bank_credentials?.user_id && (
              <Card className="opacity-60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Kredensial Tersimpan (Read-only)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>User ID</Label>
                      <Input value={cloudSettings.bank_credentials.user_id || ""} readOnly disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Number</Label>
                      <Input value={cloudSettings.bank_credentials.account_number || ""} readOnly disabled />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
