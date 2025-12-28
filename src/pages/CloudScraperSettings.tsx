import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import JSZip from "jszip";
import { 
  ArrowLeft, Cloud, Eye, EyeOff, Key, Copy,
  Loader2, Server, CheckCircle, Download, Terminal,
  AlertCircle, Database, Webhook, FileText, AlertTriangle,
  ExternalLink, Package, FolderDown, BookOpen, Upload, Settings, Play, Monitor
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
  const [generatingPackage, setGeneratingPackage] = useState(false);
  
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

  const handleDownloadSetupPackage = async () => {
    setGeneratingPackage(true);
    try {
      const zip = new JSZip();
      
      // Fetch all template files
      const [installRes, configRes, scraperRes, runRes, readmeRes] = await Promise.all([
        fetch("/vps-scraper-template/install.sh"),
        fetch("/vps-scraper-template/config.env.template"),
        fetch("/vps-scraper-template/bca-scraper.js"),
        fetch("/vps-scraper-template/run.sh"),
        fetch("/vps-scraper-template/README.txt"),
      ]);

      const [installText, configText, scraperText, runText, readmeText] = await Promise.all([
        installRes.text(),
        configRes.text(),
        scraperRes.text(),
        runRes.text(),
        readmeRes.text(),
      ]);

      // Replace placeholders in config.env with actual values
      let configContent = configText;
      if (vpsSettings?.webhook_secret_encrypted) {
        configContent = configContent.replace(
          "SECRET_KEY=your_secret_key_here",
          `SECRET_KEY=${vpsSettings.webhook_secret_encrypted}`
        );
      }
      configContent = configContent.replace(
        "WEBHOOK_URL=https://your-project.supabase.co/functions/v1/bank-scraper-webhook",
        `WEBHOOK_URL=${vpsWebhookUrl}`
      );

      // Add files to zip
      zip.file("install.sh", installText);
      zip.file("config.env", configContent);
      zip.file("bca-scraper.js", scraperText);
      zip.file("run.sh", runText);
      zip.file("README.txt", readmeText);

      // Generate and download
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vps-scraper-setup.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Setup package berhasil di-download!");
    } catch (error) {
      console.error("Error generating package:", error);
      toast.error("Gagal generate setup package");
    } finally {
      setGeneratingPackage(false);
    }
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
            <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Download Setup Package
                </CardTitle>
                <CardDescription>
                  Download semua file dalam satu paket ZIP untuk setup VPS scraper
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Main Download Button */}
                <div className="p-4 bg-background/80 rounded-lg border border-primary/30">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Download className="h-4 w-4 text-primary" />
                        All-in-One Setup Package (ZIP)
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Berisi: install.sh, config.env, bca-scraper.js, run.sh, dan README.txt
                        {vpsSettings?.webhook_secret_encrypted && (
                          <span className="text-green-600 dark:text-green-400 font-medium"> — Secret Key & Webhook URL sudah terisi!</span>
                        )}
                      </p>
                    </div>
                    <Button 
                      onClick={handleDownloadSetupPackage} 
                      disabled={generatingPackage}
                      className="gap-2 bg-primary hover:bg-primary/90"
                      size="lg"
                    >
                      {generatingPackage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Download ZIP
                    </Button>
                  </div>
                </div>

                {!vpsSettings?.webhook_secret_encrypted && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Generate Secret Key terlebih dahulu agar otomatis terisi di package!
                    </p>
                  </div>
                )}

                <Separator />

                {/* Individual Files */}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="files" className="border-none">
                    <AccordionTrigger className="text-sm text-muted-foreground hover:no-underline py-2">
                      Download file individual (tanpa ZIP)
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 pt-2">
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
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

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

            {/* Tutorial Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Tutorial Setup Lengkap
                </CardTitle>
                <CardDescription>
                  Panduan step-by-step dari awal sampai selesai
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick Overview */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { icon: Download, label: "1. Download", desc: "File .ovpn & Setup Package" },
                    { icon: Upload, label: "2. Upload", desc: "Ke VPS via SFTP" },
                    { icon: Play, label: "3. Install", desc: "Jalankan install.sh" },
                    { icon: Settings, label: "4. Config", desc: "Edit config.env" },
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center p-3 bg-muted/30 rounded-lg text-center">
                      <div className="p-2 rounded-full bg-primary/10 mb-2">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Detailed Tutorial Accordion */}
                <Accordion type="single" collapsible className="w-full">
                  {/* Step 1: Persiapan */}
                  <AccordionItem value="step1">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">1</div>
                        <span>Persiapan: VPS & VPN</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-11 space-y-3">
                      <div className="space-y-2">
                        <h4 className="font-medium">Beli VPS Eropa</h4>
                        <p className="text-sm text-muted-foreground">
                          Rekomendasi: <strong>Contabo</strong> atau <strong>Hetzner</strong> (~$5-10/bulan). Pilih lokasi Eropa (Germany/France).
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <a href="https://contabo.com" target="_blank" rel="noopener noreferrer" className="gap-2">
                              <ExternalLink className="h-3 w-3" /> Contabo
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <a href="https://hetzner.com" target="_blank" rel="noopener noreferrer" className="gap-2">
                              <ExternalLink className="h-3 w-3" /> Hetzner
                            </a>
                          </Button>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-medium">Download File .ovpn dari VPNJantit</h4>
                        <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                          <li>Login ke VPNJantit</li>
                          <li>Pilih server <strong>Indonesia</strong></li>
                          <li>Download file <code className="bg-muted px-1 rounded">.ovpn</code></li>
                          <li>Catat username & password VPN</li>
                        </ol>
                        <Button variant="outline" size="sm" asChild>
                          <a href="https://vpnjantit.com" target="_blank" rel="noopener noreferrer" className="gap-2">
                            <ExternalLink className="h-3 w-3" /> VPNJantit
                          </a>
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Step 2: Download Files */}
                  <AccordionItem value="step2">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">2</div>
                        <span>Download Setup Package</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-11 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Klik tombol <strong>Download ZIP</strong> di atas untuk mendapatkan semua file yang dibutuhkan.
                        Secret Key dan Webhook URL sudah otomatis terisi!
                      </p>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm font-medium mb-2">Isi package:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>✓ <code>install.sh</code> - Script installer otomatis</li>
                          <li>✓ <code>config.env</code> - File konfigurasi (SECRET_KEY sudah terisi)</li>
                          <li>✓ <code>bca-scraper.js</code> - Script scraper BCA</li>
                          <li>✓ <code>run.sh</code> - Script untuk menjalankan scraper</li>
                          <li>✓ <code>README.txt</code> - Panduan singkat</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Step 3: Login VPS & Upload */}
                  <AccordionItem value="step3">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">3</div>
                        <span>Login VPS & Upload Files</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-11 space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Login ke VPS via SSH</h4>
                        <div className="p-3 bg-zinc-900 rounded-lg font-mono text-xs text-green-400 overflow-x-auto">
                          <p className="text-zinc-500"># Windows (PowerShell) / Mac / Linux:</p>
                          <p>ssh root@YOUR_VPS_IP</p>
                          <p className="text-zinc-500"># Masukkan password VPS</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Untuk Windows, bisa juga gunakan <strong>PuTTY</strong>.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium">Buat Folder di VPS</h4>
                        <div className="p-3 bg-zinc-900 rounded-lg font-mono text-xs text-green-400">
                          <p>mkdir -p /root/bca-scraper && cd /root/bca-scraper</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium">Upload Files via SFTP</h4>
                        <p className="text-sm text-muted-foreground">
                          Gunakan salah satu aplikasi berikut untuk upload file:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <a href="https://winscp.net/eng/download.php" target="_blank" rel="noopener noreferrer" className="gap-2">
                              <ExternalLink className="h-3 w-3" /> WinSCP (Windows)
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <a href="https://filezilla-project.org/download.php?type=client" target="_blank" rel="noopener noreferrer" className="gap-2">
                              <ExternalLink className="h-3 w-3" /> FileZilla (All OS)
                            </a>
                          </Button>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg text-sm">
                          <p className="font-medium mb-1">Koneksi SFTP:</p>
                          <ul className="text-muted-foreground space-y-1">
                            <li>• Host: <code className="bg-muted px-1 rounded">YOUR_VPS_IP</code></li>
                            <li>• Port: <code className="bg-muted px-1 rounded">22</code></li>
                            <li>• Username: <code className="bg-muted px-1 rounded">root</code></li>
                            <li>• Password: (password VPS Anda)</li>
                          </ul>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Upload semua file dari ZIP + file <code>.ovpn</code> ke folder <code>/root/bca-scraper</code>
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium">Alternatif: Upload via SCP (Terminal)</h4>
                        <div className="p-3 bg-zinc-900 rounded-lg font-mono text-xs text-green-400 overflow-x-auto">
                          <p className="text-zinc-500"># Dari komputer lokal:</p>
                          <p>scp -r ./vps-scraper-setup/* root@YOUR_VPS_IP:/root/bca-scraper/</p>
                          <p>scp ./indonesia.ovpn root@YOUR_VPS_IP:/root/bca-scraper/</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Step 4: Run Installer */}
                  <AccordionItem value="step4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">4</div>
                        <span>Jalankan Installer</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-11 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Di VPS, jalankan perintah berikut:
                      </p>
                      <div className="p-3 bg-zinc-900 rounded-lg font-mono text-xs text-green-400 overflow-x-auto">
                        <p>cd /root/bca-scraper</p>
                        <p>chmod +x install.sh run.sh</p>
                        <p>sudo ./install.sh</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Installer akan otomatis:
                      </p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                        <li>Install Node.js 20</li>
                        <li>Install OpenVPN</li>
                        <li>Install Puppeteer & dependencies</li>
                        <li>Setup VPN dengan file .ovpn</li>
                        <li>Setup cron job (scrape tiap 5 menit)</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Step 5: Configure */}
                  <AccordionItem value="step5">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">5</div>
                        <span>Edit Konfigurasi</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-11 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Edit file <code>config.env</code> untuk mengisi credentials:
                      </p>
                      <div className="p-3 bg-zinc-900 rounded-lg font-mono text-xs text-green-400">
                        <p>nano config.env</p>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg text-sm">
                        <p className="font-medium mb-2">Isi yang perlu diubah:</p>
                        <ul className="text-muted-foreground space-y-1">
                          <li>• <code>VPN_USERNAME</code> - Username VPNJantit</li>
                          <li>• <code>VPN_PASSWORD</code> - Password VPNJantit</li>
                          <li>• <code>BCA_USER_ID</code> - User ID KlikBCA</li>
                          <li>• <code>BCA_PIN</code> - PIN KlikBCA</li>
                          <li>• <code>BCA_ACCOUNT_NUMBER</code> - Nomor rekening BCA</li>
                        </ul>
                        <p className="mt-2 text-green-600 dark:text-green-400">
                          ✓ SECRET_KEY & WEBHOOK_URL sudah terisi otomatis!
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Simpan dengan <code>Ctrl+X</code>, lalu <code>Y</code>, lalu <code>Enter</code>
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Step 6: Test & Monitor */}
                  <AccordionItem value="step6">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">6</div>
                        <span>Test & Monitor</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-11 space-y-3">
                      <div className="space-y-2">
                        <h4 className="font-medium">Start VPN & Test</h4>
                        <div className="p-3 bg-zinc-900 rounded-lg font-mono text-xs text-green-400 overflow-x-auto">
                          <p className="text-zinc-500"># Start VPN Indonesia</p>
                          <p>sudo systemctl start openvpn-client@indonesia</p>
                          <p></p>
                          <p className="text-zinc-500"># Cek IP (harus Indonesia)</p>
                          <p>curl https://api.ipify.org</p>
                          <p></p>
                          <p className="text-zinc-500"># Test scraper manual</p>
                          <p>./run.sh</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          Monitoring
                        </h4>
                        <div className="p-3 bg-zinc-900 rounded-lg font-mono text-xs text-green-400 overflow-x-auto">
                          <p className="text-zinc-500"># Lihat status VPN</p>
                          <p>sudo systemctl status openvpn-client@indonesia</p>
                          <p></p>
                          <p className="text-zinc-500"># Lihat log scraper</p>
                          <p>tail -f /var/log/bca-scraper.log</p>
                          <p></p>
                          <p className="text-zinc-500"># Lihat cron jobs</p>
                          <p>crontab -l</p>
                        </div>
                      </div>

                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                          🎉 Selesai! Scraper akan jalan otomatis setiap 5 menit.
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Cek status di panel ini untuk melihat webhook terakhir dan mutasi yang ditemukan.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
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
