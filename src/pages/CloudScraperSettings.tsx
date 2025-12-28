import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import JSZip from "jszip";
import { 
  ArrowLeft, Eye, EyeOff, Key, Copy,
  Loader2, Server, CheckCircle, Download, Terminal,
  AlertCircle, Webhook, FileText, AlertTriangle,
  ExternalLink, Package, FolderDown, BookOpen, Upload, Settings, Play, Monitor,
  Zap, Clock, Timer
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
  total_scrapes?: number;
  total_mutations_found?: number;
  // Normal mode fields
  scrape_interval_minutes?: number;
  // Burst mode fields
  burst_enabled?: boolean;
  burst_in_progress?: boolean;
  burst_started_at?: string | null;
  burst_ended_at?: string | null;
  burst_interval_seconds?: number;
  burst_duration_seconds?: number;
  burst_check_count?: number;
  burst_request_id?: string | null;
  last_burst_check_at?: string | null;
}

const INTERVAL_OPTIONS = [
  { value: 5, label: '5 menit' },
  { value: 10, label: '10 menit' },
  { value: 15, label: '15 menit' },
  { value: 30, label: '30 menit' },
  { value: 60, label: '1 jam' },
  { value: 180, label: '3 jam' },
  { value: 360, label: '6 jam' },
  { value: 720, label: '12 jam' },
];

export default function BankScraperSettings() {
  const { isSuperAdmin, user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [generatingPackage, setGeneratingPackage] = useState(false);
  
  // VPS Settings State
  const [vpsSettings, setVpsSettings] = useState<VPSSettings | null>(null);
  const [showVpsSecret, setShowVpsSecret] = useState(false);
  const [generatingSecret, setGeneratingSecret] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  
  // Burst Mode State
  const [triggeringBurst, setTriggeringBurst] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [burstConfig, setBurstConfig] = useState({
    interval_seconds: 10,
    duration_seconds: 120
  });
  
  // Normal Mode State
  const [scrapeInterval, setScrapeInterval] = useState(10);
  const [pendingInterval, setPendingInterval] = useState<number | null>(null);
  
  // Burst Mode Pending State
  const [pendingBurstEnabled, setPendingBurstEnabled] = useState<boolean | null>(null);
  const [pendingBurstConfig, setPendingBurstConfig] = useState<{
    interval_seconds: number;
    duration_seconds: number;
  } | null>(null);

  const vpsWebhookUrl = `https://uqzzpxfmwhmhiqniiyjk.supabase.co/functions/v1/bank-scraper-webhook`;
  
  // Check for unsaved changes
  const hasUnsavedNormalChanges = pendingInterval !== null && pendingInterval !== scrapeInterval;
  const hasUnsavedBurstChanges = 
    (pendingBurstEnabled !== null && pendingBurstEnabled !== vpsSettings?.burst_enabled) ||
    (pendingBurstConfig !== null && (
      pendingBurstConfig.interval_seconds !== burstConfig.interval_seconds ||
      pendingBurstConfig.duration_seconds !== burstConfig.duration_seconds
    ));

  const fetchData = useCallback(async () => {
    try {
      // Fetch VPS Scraper settings
      const { data: vpsData } = await supabase
        .from("payment_provider_settings")
        .select("*")
        .eq("provider", "vps_scraper")
        .limit(1)
        .maybeSingle();
      
      if (vpsData) {
        const settings = vpsData as unknown as VPSSettings;
        setVpsSettings(settings);
        
        // Update normal mode interval from settings
        if (settings.scrape_interval_minutes) {
          setScrapeInterval(settings.scrape_interval_minutes);
        }
        
        // Update burst config from settings
        if (settings.burst_interval_seconds) {
          setBurstConfig(prev => ({ ...prev, interval_seconds: settings.burst_interval_seconds! }));
        }
        if (settings.burst_duration_seconds) {
          setBurstConfig(prev => ({ ...prev, duration_seconds: settings.burst_duration_seconds! }));
        }
      }

      // Note: pending requests count would need a dedicated table or RPC function
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/");
      return;
    }
    fetchData();
  }, [isSuperAdmin, navigate, fetchData]);

  // Auto-refresh burst status
  useEffect(() => {
    if (!vpsSettings?.burst_in_progress) return;
    
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [vpsSettings?.burst_in_progress, fetchData]);

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

  // Pending toggle for burst (doesn't save immediately)
  const handleToggleBurstEnabled = () => {
    const currentValue = pendingBurstEnabled ?? vpsSettings?.burst_enabled ?? false;
    setPendingBurstEnabled(!currentValue);
  };
  
  // Pending interval click for normal mode (doesn't save immediately)
  const handleIntervalClick = (value: number) => {
    setPendingInterval(value);
  };
  
  // Reset normal mode changes
  const handleResetNormalConfig = () => {
    setPendingInterval(null);
  };
  
  // Save normal mode interval
  const handleSaveNormalConfig = async () => {
    if (!vpsSettings || pendingInterval === null) return;
    
    try {
      const { error } = await supabase
        .from("payment_provider_settings")
        .update({ scrape_interval_minutes: pendingInterval })
        .eq("id", vpsSettings.id);

      if (error) throw error;
      
      const intervalLabel = INTERVAL_OPTIONS.find(o => o.value === pendingInterval)?.label || `${pendingInterval} menit`;
      toast.success(`Interval scraping disimpan: ${intervalLabel}`);
      setScrapeInterval(pendingInterval);
      setPendingInterval(null);
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Gagal simpan interval");
    }
  };
  
  // Reset burst mode changes
  const handleResetBurstConfig = () => {
    setPendingBurstEnabled(null);
    setPendingBurstConfig(null);
  };
  
  // Save all burst config (enabled + interval + duration)
  const handleSaveAllBurstConfig = async () => {
    if (!vpsSettings) return;
    
    const newEnabled = pendingBurstEnabled ?? vpsSettings.burst_enabled;
    const newConfig = pendingBurstConfig ?? burstConfig;
    
    try {
      const { error } = await supabase
        .from("payment_provider_settings")
        .update({ 
          burst_enabled: newEnabled,
          burst_interval_seconds: newConfig.interval_seconds,
          burst_duration_seconds: newConfig.duration_seconds
        })
        .eq("id", vpsSettings.id);

      if (error) throw error;
      toast.success("Konfigurasi Burst Mode berhasil disimpan");
      setBurstConfig(newConfig);
      setPendingBurstEnabled(null);
      setPendingBurstConfig(null);
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Gagal simpan konfigurasi burst");
    }
  };
  
  // Handle burst config input changes (pending)
  const handleBurstConfigChange = (field: 'interval_seconds' | 'duration_seconds', value: number) => {
    const current = pendingBurstConfig ?? burstConfig;
    setPendingBurstConfig({ ...current, [field]: value });
  };

  const handleTriggerBurst = async () => {
    if (!vpsSettings?.webhook_secret_encrypted) {
      toast.error("Generate secret key terlebih dahulu");
      return;
    }
    
    setTriggeringBurst(true);
    try {
      const { data, error } = await supabase.functions.invoke("trigger-burst-scrape", {
        body: { request_id: `manual_${Date.now()}` }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success("Burst mode triggered! VPS akan scrape lebih sering.");
        fetchData();
      } else {
        toast.error(data?.error || "Gagal trigger burst mode");
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Gagal trigger burst mode");
    } finally {
      setTriggeringBurst(false);
    }
  };

  const handleStopBurst = async () => {
    if (!vpsSettings) return;
    
    try {
      const { error } = await supabase
        .from("payment_provider_settings")
        .update({ 
          burst_in_progress: false,
          burst_ended_at: new Date().toISOString()
        })
        .eq("id", vpsSettings.id);

      if (error) throw error;
      toast.success("Burst mode dihentikan");
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Gagal menghentikan burst");
    }
  };

  // REMOVED: handleUpdateBurstConfig - replaced by handleSaveAllBurstConfig

  // REMOVED: handleUpdateScrapeInterval - replaced by handleSaveNormalConfig

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
      
      // Fetch all files including OpenVPN split tunneling files
      const [
        installRes, configRes, scraperRes, runRes, readmeRes,
        // OpenVPN split tunneling files
        setupSplitTunnelRes, vpnUpRes, vpnDownRes, readmeOpenvpnRes, setupOpenvpnRes
      ] = await Promise.all([
        fetch("/vps-scraper-template/install.sh"),
        fetch("/vps-scraper-template/config.env.template"),
        fetch("/vps-scraper-template/bca-scraper.js"),
        fetch("/vps-scraper-template/run.sh"),
        fetch("/vps-scraper-template/README.txt"),
        // OpenVPN split tunneling files
        fetch("/vps-scraper-template/setup-split-tunnel.sh"),
        fetch("/vps-scraper-template/vpn-up.sh"),
        fetch("/vps-scraper-template/vpn-down.sh"),
        fetch("/vps-scraper-template/README-OPENVPN.md"),
        fetch("/vps-scraper-template/setup-openvpn.sh"),
      ]);

      const [
        installText, configText, scraperText, runText, readmeText,
        setupSplitTunnelText, vpnUpText, vpnDownText, readmeOpenvpnText, setupOpenvpnText
      ] = await Promise.all([
        installRes.text(),
        configRes.text(),
        scraperRes.text(),
        runRes.text(),
        readmeRes.text(),
        setupSplitTunnelRes.text(),
        vpnUpRes.text(),
        vpnDownRes.text(),
        readmeOpenvpnRes.text(),
        setupOpenvpnRes.text(),
      ]);

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

      // Main scraper files
      zip.file("install.sh", installText);
      zip.file("config.env", configContent);
      zip.file("bca-scraper.js", scraperText);
      zip.file("run.sh", runText);
      zip.file("README.txt", readmeText);
      
      // OpenVPN split tunneling files
      zip.file("setup-split-tunnel.sh", setupSplitTunnelText);
      zip.file("vpn-up.sh", vpnUpText);
      zip.file("vpn-down.sh", vpnDownText);
      zip.file("README-OPENVPN.md", readmeOpenvpnText);
      zip.file("setup-openvpn.sh", setupOpenvpnText);

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

  // Calculate burst remaining time
  const getBurstRemainingSeconds = () => {
    if (!vpsSettings?.burst_in_progress || !vpsSettings?.burst_started_at) return 0;
    const started = new Date(vpsSettings.burst_started_at).getTime();
    const duration = (vpsSettings.burst_duration_seconds || 120) * 1000;
    const remaining = Math.max(0, Math.floor((duration - (Date.now() - started)) / 1000));
    return remaining;
  };

  if (!isSuperAdmin) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const burstRemaining = getBurstRemainingSeconds();

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
              Konfigurasi VPS Scraper untuk verifikasi pembayaran otomatis
            </p>
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
                <h3 className="font-semibold text-green-700 dark:text-green-400">VPS Scraper</h3>
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

        {/* Normal Mode Card */}
        <Card className="border-2 border-sky-500/30 bg-gradient-to-br from-sky-500/5 to-cyan-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-sky-500/20">
                  <Clock className="h-5 w-5 text-sky-500" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Normal Mode (Interval Scraping)
                    {vpsSettings?.is_active && (
                      <Badge variant="default" className="bg-sky-500">
                        Aktif
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Scrape secara berkala sesuai interval yang dipilih
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Interval Selection */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Pilih Interval Scraping
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {INTERVAL_OPTIONS.map((option) => {
                  const isSelected = (pendingInterval ?? scrapeInterval) === option.value;
                  const isPending = pendingInterval === option.value && pendingInterval !== scrapeInterval;
                  return (
                    <Button
                      key={option.value}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleIntervalClick(option.value)}
                      disabled={!vpsSettings}
                      className={`${
                        isSelected 
                          ? 'bg-sky-500 hover:bg-sky-600 text-white' 
                          : 'hover:border-sky-500/50'
                      } ${isPending ? 'ring-2 ring-amber-500 ring-offset-2' : ''}`}
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Unsaved Changes Warning & Save Buttons */}
            {hasUnsavedNormalChanges && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Ada perubahan belum disimpan: <strong>{INTERVAL_OPTIONS.find(o => o.value === pendingInterval)?.label}</strong>
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleResetNormalConfig}>
                      Reset
                    </Button>
                    <Button size="sm" onClick={handleSaveNormalConfig} className="bg-sky-500 hover:bg-sky-600 text-white gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Simpan Interval
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Status Info */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Interval Tersimpan</p>
                <p className="font-semibold text-sky-600 dark:text-sky-400">
                  {INTERVAL_OPTIONS.find(o => o.value === scrapeInterval)?.label || `${scrapeInterval}m`}
                </p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Scrapes</p>
                <p className="text-xl font-bold">{vpsSettings?.total_scrapes || 0}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Last Webhook</p>
                <p className="font-medium text-xs">
                  {vpsSettings?.last_webhook_at 
                    ? formatDistanceToNow(new Date(vpsSettings.last_webhook_at), { addSuffix: true, locale: localeId })
                    : '-'
                  }
                </p>
              </div>
            </div>

            {!vpsSettings?.is_active && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Aktifkan VPS Scraper terlebih dahulu untuk menggunakan Normal Mode
                </p>
              </div>
            )}

            <div className="p-3 bg-muted/20 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> VPS scheduler akan otomatis mengambil konfigurasi interval dari server setiap 60 detik. 
                Perubahan interval akan langsung diterapkan tanpa perlu restart VPS.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Burst Mode Card */}
        <Card className={`border-2 ${vpsSettings?.burst_in_progress ? 'border-amber-500 bg-amber-500/5' : 'border-primary/30'}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${vpsSettings?.burst_in_progress ? 'bg-amber-500/20' : 'bg-primary/20'}`}>
                  <Zap className={`h-5 w-5 ${vpsSettings?.burst_in_progress ? 'text-amber-500 animate-pulse' : 'text-primary'}`} />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Burst Mode
                    {vpsSettings?.burst_in_progress && (
                      <Badge variant="default" className="bg-amber-500 animate-pulse">
                        Active ({burstRemaining}s)
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Scrape lebih sering saat ada payment request pending
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="burst-toggle" className="text-sm">Enable</Label>
                <Switch
                  id="burst-toggle"
                  checked={(pendingBurstEnabled ?? vpsSettings?.burst_enabled) ?? false}
                  onCheckedChange={handleToggleBurstEnabled}
                  disabled={!vpsSettings}
                />
                {pendingBurstEnabled !== null && pendingBurstEnabled !== vpsSettings?.burst_enabled && (
                  <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">
                    Belum disimpan
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status & Pending Requests */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Status Tersimpan</p>
                <div className="flex items-center justify-center gap-2">
                  {vpsSettings?.burst_in_progress ? (
                    <>
                      <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="font-semibold text-amber-600 dark:text-amber-400">Active</span>
                    </>
                  ) : vpsSettings?.burst_enabled ? (
                    <>
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="font-semibold text-green-600 dark:text-green-400">Ready</span>
                    </>
                  ) : (
                    <>
                      <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                      <span className="font-semibold text-muted-foreground">Disabled</span>
                    </>
                  )}
                </div>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Pending Requests</p>
                <p className={`text-xl font-bold ${pendingRequestsCount > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                  {pendingRequestsCount}
                </p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Burst Checks</p>
                <p className="text-xl font-bold">{vpsSettings?.burst_check_count || 0}</p>
              </div>
            </div>

            {/* Trigger/Stop Button */}
            <div className="flex gap-2">
              {vpsSettings?.burst_in_progress ? (
                <Button 
                  variant="destructive" 
                  onClick={handleStopBurst}
                  className="flex-1 gap-2"
                >
                  <Timer className="h-4 w-4" />
                  Stop Burst
                </Button>
              ) : (
                <Button 
                  onClick={handleTriggerBurst}
                  disabled={triggeringBurst || !vpsSettings?.is_active || !vpsSettings?.burst_enabled}
                  className="flex-1 gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {triggeringBurst ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Trigger Burst Now
                </Button>
              )}
            </div>

            {!vpsSettings?.is_active && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Aktifkan VPS Scraper terlebih dahulu untuk menggunakan Burst Mode
                </p>
              </div>
            )}

            <Separator />

            {/* Configuration */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Konfigurasi Burst</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Interval (detik)
                  </Label>
                  <Input
                    type="number"
                    min={5}
                    max={30}
                    value={(pendingBurstConfig ?? burstConfig).interval_seconds}
                    onChange={(e) => handleBurstConfigChange('interval_seconds', Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Scrape setiap X detik saat burst (5-30)</p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Durasi (detik)
                  </Label>
                  <Input
                    type="number"
                    min={60}
                    max={300}
                    value={(pendingBurstConfig ?? burstConfig).duration_seconds}
                    onChange={(e) => handleBurstConfigChange('duration_seconds', Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Durasi burst aktif (60-300 detik)</p>
                </div>
              </div>
              
              {/* Unsaved Changes Warning & Save Buttons */}
              {hasUnsavedBurstChanges && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Ada perubahan belum disimpan
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleResetBurstConfig}>
                        Reset
                      </Button>
                      <Button size="sm" onClick={handleSaveAllBurstConfig} className="bg-primary hover:bg-primary/90 gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Simpan Konfigurasi
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Last Burst Info */}
            {(vpsSettings?.burst_started_at || vpsSettings?.burst_ended_at) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Burst Terakhir</p>
                  <div className="grid gap-2 sm:grid-cols-3 text-sm">
                    {vpsSettings.burst_started_at && (
                      <div className="p-2 bg-muted/20 rounded">
                        <p className="text-xs text-muted-foreground">Started</p>
                        <p className="font-medium">
                          {formatDistanceToNow(new Date(vpsSettings.burst_started_at), { addSuffix: true, locale: localeId })}
                        </p>
                      </div>
                    )}
                    {vpsSettings.burst_ended_at && (
                      <div className="p-2 bg-muted/20 rounded">
                        <p className="text-xs text-muted-foreground">Ended</p>
                        <p className="font-medium">
                          {formatDistanceToNow(new Date(vpsSettings.burst_ended_at), { addSuffix: true, locale: localeId })}
                        </p>
                      </div>
                    )}
                    {vpsSettings.last_burst_check_at && (
                      <div className="p-2 bg-muted/20 rounded">
                        <p className="text-xs text-muted-foreground">Last Check</p>
                        <p className="font-medium">
                          {formatDistanceToNow(new Date(vpsSettings.last_burst_check_at), { addSuffix: true, locale: localeId })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

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

            <Accordion type="single" collapsible className="w-full">
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
                    </ol>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>Note:</strong> File .ovpn biasanya sudah berisi credentials lengkap. Tidak perlu catat username/password terpisah.
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://vpnjantit.com" target="_blank" rel="noopener noreferrer" className="gap-2">
                        <ExternalLink className="h-3 w-3" /> VPNJantit
                      </a>
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

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
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Buat Folder di VPS</h4>
                    <div className="p-3 bg-zinc-900 rounded-lg font-mono text-xs text-green-400">
                      <p>mkdir -p /root/bca-scraper && cd /root/bca-scraper</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Upload Files via SFTP</h4>
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
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">4</div>
                    <span>Jalankan Installer</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-11 space-y-3">
                  <div className="p-3 bg-zinc-900 rounded-lg font-mono text-xs text-green-400 overflow-x-auto">
                    <p>chmod +x install.sh && ./install.sh</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Script akan otomatis install Node.js, OpenVPN, Puppeteer, dan setup cron job.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step5">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">5</div>
                    <span>Edit Konfigurasi</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-11 space-y-3">
                  <div className="p-3 bg-zinc-900 rounded-lg font-mono text-xs text-green-400">
                    <p>nano config.env</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg text-sm">
                    <p className="font-medium mb-2">Isi yang WAJIB diubah:</p>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• <code>BCA_USER_ID</code> - User ID KlikBCA</li>
                      <li>• <code>BCA_PIN</code> - PIN KlikBCA</li>
                      <li>• <code>BCA_ACCOUNT_NUMBER</code> - Nomor rekening BCA</li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>VPN:</strong> Tidak perlu isi VPN_USERNAME/PASSWORD. File .ovpn sudah berisi credentials lengkap.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step6">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">6</div>
                    <span>Test & Monitor</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-11 space-y-3">
                  <div className="p-3 bg-zinc-900 rounded-lg font-mono text-xs text-green-400 overflow-x-auto">
                    <p className="text-zinc-500"># Start VPN Indonesia</p>
                    <p>sudo systemctl start openvpn-client@indonesia</p>
                    <p></p>
                    <p className="text-zinc-500"># Test scraper manual</p>
                    <p>./run.sh</p>
                  </div>

                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                      🎉 Selesai! Scraper akan jalan otomatis setiap 5 menit.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
