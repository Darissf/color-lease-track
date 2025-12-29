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
  Zap, Clock, Timer, History, RefreshCw, Code, Calendar, Wallet
} from "lucide-react";
import { VersionHistoryPanel } from "@/components/scraper/VersionHistoryPanel";
import { VPSScriptDownloadDialog } from "@/components/scraper/VPSScriptDownloadDialog";
import { WindowsScriptDownloadDialog } from "@/components/scraper/WindowsScriptDownloadDialog";
import { ScraperFileUploader } from "@/components/scraper/ScraperFileUploader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [generatingWindowsPackage, setGeneratingWindowsPackage] = useState(false);
  const [downloadingScraperOnly, setDownloadingScraperOnly] = useState(false);
  const [downloadingUpdatePackage, setDownloadingUpdatePackage] = useState(false);
  
  // Scraper File Info State
  const [scraperFileInfo, setScraperFileInfo] = useState<{
    version: string;
    buildDate: string;
    lineCount: number;
    loaded: boolean;
  } | null>(null);
  const [loadingFileInfo, setLoadingFileInfo] = useState(false);
  
  // Windows Scraper File Info State
  const [windowsScraperInfo, setWindowsScraperInfo] = useState<{
    version: string;
    buildDate: string;
    lineCount: number;
    changelog: string[];
    loaded: boolean;
  } | null>(null);
  const [loadingWindowsInfo, setLoadingWindowsInfo] = useState(false);
  
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

  // Fetch scraper file info (version, line count, build date)
  const fetchScraperFileInfo = useCallback(async () => {
    setLoadingFileInfo(true);
    try {
      const response = await fetch(`/vps-scraper-template/bca-scraper.js?v=${Date.now()}`);
      const content = await response.text();
      
      // Parse version dari file
      const versionMatch = content.match(/SCRAPER_VERSION\s*=\s*["']([^"']+)["']/);
      const buildDateMatch = content.match(/SCRAPER_BUILD_DATE\s*=\s*["']([^"']+)["']/);
      const lineCount = content.split('\n').length;
      
      setScraperFileInfo({
        version: versionMatch?.[1] || 'unknown',
        buildDate: buildDateMatch?.[1] || 'unknown',
        lineCount,
        loaded: true
      });
    } catch (error) {
      console.error('Failed to fetch scraper file info:', error);
      setScraperFileInfo(null);
    } finally {
      setLoadingFileInfo(false);
    }
  }, []);

  // Fetch Windows scraper file info
  const fetchWindowsScraperInfo = useCallback(async () => {
    setLoadingWindowsInfo(true);
    try {
      const response = await fetch(`/windows-scraper-template/bca-scraper-windows.js?v=${Date.now()}`);
      const content = await response.text();
      
      // Parse version dari file
      const versionMatch = content.match(/SCRAPER_VERSION\s*=\s*["']([^"']+)["']/);
      const buildDateMatch = content.match(/SCRAPER_BUILD_DATE\s*=\s*["']([^"']+)["']/);
      const lineCount = content.split('\n').length;
      
      // Extract changelog from comments (lines starting with // v or * v)
      const changelogMatches = content.match(/(?:\/\/|\*)\s*(v[\d.]+[^\n]*)/gm) || [];
      const changelog = changelogMatches
        .slice(0, 5)
        .map(line => line.replace(/^(?:\/\/|\*)\s*/, '').trim());
      
      setWindowsScraperInfo({
        version: versionMatch?.[1] || 'unknown',
        buildDate: buildDateMatch?.[1] || 'unknown',
        lineCount,
        changelog,
        loaded: true
      });
    } catch (error) {
      console.error('Failed to fetch Windows scraper file info:', error);
      setWindowsScraperInfo(null);
    } finally {
      setLoadingWindowsInfo(false);
    }
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/");
      return;
    }
    fetchData();
    fetchScraperFileInfo();
    fetchWindowsScraperInfo();
  }, [isSuperAdmin, navigate, fetchData, fetchScraperFileInfo, fetchWindowsScraperInfo]);

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
      // Cache busting timestamp to ensure latest files
      const cacheBuster = `?v=${Date.now()}`;
      
      const [
        installRes, configRes, scraperRes, runRes, readmeRes,
        // OpenVPN split tunneling files
        setupSplitTunnelRes, vpnUpRes, vpnDownRes, readmeOpenvpnRes, setupOpenvpnRes
      ] = await Promise.all([
        fetch(`/vps-scraper-template/install.sh${cacheBuster}`),
        fetch(`/vps-scraper-template/config.env.template${cacheBuster}`),
        fetch(`/vps-scraper-template/bca-scraper.js${cacheBuster}`),
        fetch(`/vps-scraper-template/run.sh${cacheBuster}`),
        fetch(`/vps-scraper-template/README.txt${cacheBuster}`),
        // OpenVPN split tunneling files
        fetch(`/vps-scraper-template/setup-split-tunnel.sh${cacheBuster}`),
        fetch(`/vps-scraper-template/vpn-up.sh${cacheBuster}`),
        fetch(`/vps-scraper-template/vpn-down.sh${cacheBuster}`),
        fetch(`/vps-scraper-template/README-OPENVPN.md${cacheBuster}`),
        fetch(`/vps-scraper-template/setup-openvpn.sh${cacheBuster}`),
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

  const handleDownloadScraperOnly = async () => {
    setDownloadingScraperOnly(true);
    try {
      // Cache busting to ensure latest file
      const response = await fetch(`/vps-scraper-template/bca-scraper.js?v=${Date.now()}`);
      const content = await response.text();
      const lineCount = content.split('\n').length;
      
      const blob = new Blob([content], { type: "application/javascript" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bca-scraper.js";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`bca-scraper.js berhasil di-download! (${lineCount} lines)`);
    } catch (error) {
      console.error("Error downloading scraper:", error);
      toast.error("Gagal download bca-scraper.js");
    } finally {
      setDownloadingScraperOnly(false);
    }
  };

  const handleDownloadUpdatePackage = async () => {
    setDownloadingUpdatePackage(true);
    try {
      const zip = new JSZip();
      const cacheBuster = `?v=${Date.now()}`;
      
      // Fetch update files
      const [scraperRes, serviceRes, installRes, installServiceRes] = await Promise.all([
        fetch(`/vps-scraper-template/bca-scraper.js${cacheBuster}`),
        fetch(`/vps-scraper-template/bca-scraper.service${cacheBuster}`),
        fetch(`/vps-scraper-template/install.sh${cacheBuster}`),
        fetch(`/vps-scraper-template/install-service.sh${cacheBuster}`),
      ]);

      const [scraperText, serviceText, installText, installServiceText] = await Promise.all([
        scraperRes.text(),
        serviceRes.text(),
        installRes.text(),
        installServiceRes.text(),
      ]);

      // Add files to zip
      zip.file("bca-scraper.js", scraperText);
      zip.file("bca-scraper.service", serviceText);
      zip.file("install.sh", installText);
      zip.file("install-service.sh", installServiceText);

      // Add update instructions
      const updateInstructions = `
================================================================================
VPS Bank Scraper - Update v4.1.5 (Step 5 Navigation Logging)
================================================================================

PERUBAHAN v4.1.5:
- DETAILED LOGGING: Step 5 navigation dengan logging lengkap
- FRAME DEBUG: Log semua frame yang tersedia
- CLICK TRACKING: Hasil click Informasi Rekening & Mutasi Rekening
- ERROR HANDLING: Throw error jika click gagal (tidak silent fail)

PERUBAHAN v4.1.4:
- FULL NAVIGATION LOOP: Step 5-6-7 dijalankan setiap iterasi burst
- STOP ON MATCH: Loop berhenti segera jika pembayaran cocok
- RE-GRAB ATM FRAME: Frame di-refresh setelah setiap klik Lihat

PERUBAHAN v4.1.3:
- NO LOGOUT DURING BURST: Session tetap aktif antar iterasi burst
- POST-BURST COOLDOWN: Delay 10 detik setelah burst selesai
- BURST TIMING RESET: VPS mendapat full duration dari saat fetch pertama

PERUBAHAN v4.1.2:
- Fixed Cooldown Logic: Skip 5-min wait jika logout sebelumnya berhasil
- Burst Mode Beruntun: Tidak perlu menunggu 5 menit antar burst

FITUR ULTRA-ROBUST (sejak v4.0.0):
- Global Scrape Timeout: Max 2 menit per scrape, auto-abort jika lewat
- Safe Frame Operations: Semua operasi frame dengan timeout protection
- Session Expired Detection: Auto-detect & restart browser
- Periodic Browser Restart: Setiap 2 jam atau 50 scrapes
- Retry with Exponential Backoff: 3x retry (5s → 15s → 45s)
- Force Kill & Restart: Nuclear option jika browser unresponsive

================================================================================
LANGKAH UPDATE:
================================================================================

1. STOP SERVICE:
   sudo systemctl stop bca-scraper

2. UPLOAD FILE BARU:
   Upload semua file dari ZIP ini ke /opt/bca-scraper/:
   - bca-scraper.js (daemon utama v4.1.5)
   - bca-scraper.service (systemd service)
   - install.sh (installer)
   - install-service.sh (service installer)

3. SET PERMISSIONS:
   chmod +x /opt/bca-scraper/*.sh
   chmod +x /opt/bca-scraper/*.js

4. INSTALL ULANG SERVICE:
   cd /opt/bca-scraper
   sudo ./install-service.sh

5. CEK STATUS:
   sudo systemctl status bca-scraper
   sudo tail -f /var/log/bca-scraper.log

================================================================================
`;
      zip.file("UPDATE-INSTRUCTIONS.txt", updateInstructions);

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Update-Navigation-Logging-v4.1.5.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Update package v4.1.5 Navigation Logging berhasil di-download!");
    } catch (error) {
      console.error("Error generating update package:", error);
      toast.error("Gagal generate update package");
    } finally {
      setDownloadingUpdatePackage(false);
    }
  };


  // Download Windows Package as ZIP
  const handleDownloadWindowsPackage = async () => {
    setGeneratingWindowsPackage(true);
    try {
      const zip = new JSZip();
      const cacheBuster = `?v=${Date.now()}`;
      const updateDate = new Date().toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
      
      // Fetch all Windows files
      const [scraperRes, configRes, installRes, runRes, autoStartRes, readmeRes] = await Promise.all([
        fetch(`/windows-scraper-template/bca-scraper-windows.js${cacheBuster}`),
        fetch(`/windows-scraper-template/config.env.template${cacheBuster}`),
        fetch(`/windows-scraper-template/install-windows.bat${cacheBuster}`),
        fetch(`/windows-scraper-template/run-windows.bat${cacheBuster}`),
        fetch(`/windows-scraper-template/setup-autostart.bat${cacheBuster}`),
        fetch(`/windows-scraper-template/README-WINDOWS.md${cacheBuster}`),
      ]);

      const [scraperText, configText, installText, runText, autoStartText, readmeText] = await Promise.all([
        scraperRes.text(),
        configRes.text(),
        installRes.text(),
        runRes.text(),
        autoStartRes.text(),
        readmeRes.text(),
      ]);

      // Extract version from scraper file (single source of truth)
      const versionMatch = scraperText.match(/SCRAPER_VERSION\s*=\s*["']([^"']+)["']/);
      const version = versionMatch?.[1] || 'unknown';
      
      // Extract changelog from scraper file comments
      const changelogMatches = scraperText.match(/(?:\/\/|\*)\s*(v[\d.]+[^\n]*)/gm) || [];
      const changelogLines = changelogMatches
        .slice(0, 10)
        .map(line => '- ' + line.replace(/^(?:\/\/|\*)\s*/, '').trim())
        .join('\n');

      // Modify config with secret key and webhook URL
      let configContent = configText;
      if (vpsSettings?.webhook_secret_encrypted) {
        configContent = configContent.replace(
          "SECRET_KEY=YOUR_SECRET_KEY_HERE",
          `SECRET_KEY=${vpsSettings.webhook_secret_encrypted}`
        );
      }
      configContent = configContent.replace(
        /WEBHOOK_URL=.*/,
        `WEBHOOK_URL=${vpsWebhookUrl}`
      );

      // Add files to ZIP
      zip.file("bca-scraper-windows.js", scraperText);
      zip.file("config.env", configContent);
      zip.file("install-windows.bat", installText);
      zip.file("run-windows.bat", runText);
      zip.file("setup-autostart.bat", autoStartText);
      zip.file("README-WINDOWS.md", readmeText);
      
      // Add VERSION.txt with dynamic changelog
      zip.file("VERSION.txt", `BCA Scraper Windows v${version}
========================================
Tanggal Update: ${updateDate}
Platform: Windows RDP / Desktop

CARA INSTALL:
1. Extract ZIP ini ke Desktop
2. Jalankan install-windows.bat
3. Edit config.env (SECRET_KEY sudah terisi)
4. Connect VPN Indonesia
5. Jalankan run-windows.bat

CHANGELOG:
${changelogLines || '- Initial release'}

KONFIGURASI:
- SECRET_KEY: ${vpsSettings?.webhook_secret_encrypted ? '✓ Sudah terisi' : '✗ Belum dikonfigurasi'}
- WEBHOOK_URL: ✓ Sudah terisi

SUPPORT:
Jika ada error, cek console log atau buka config.env
dan set HEADLESS=false untuk debug visual.
`);

      // Generate and download ZIP
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `BCA-Scraper-Windows-v${version}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      
      toast.success(`Windows package v${version} berhasil di-download!`);
    } catch (error) {
      console.error("Error generating Windows package:", error);
      toast.error("Gagal generate Windows package");
    } finally {
      setGeneratingWindowsPackage(false);
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
        {/* Platform Tabs */}
        <Tabs defaultValue="linux" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="linux" className="gap-2">
              <Terminal className="h-4 w-4" />
              Linux VPS
            </TabsTrigger>
            <TabsTrigger value="windows" className="gap-2">
              <Monitor className="h-4 w-4" />
              Windows RDP
            </TabsTrigger>
            <TabsTrigger value="balance-check" className="gap-2">
              <Wallet className="h-4 w-4" />
              Cek Saldo
            </TabsTrigger>
          </TabsList>

          {/* Linux VPS Tab Content */}
          <TabsContent value="linux" className="space-y-4 mt-0">
            {/* VPS Info Banner */}
            <Card className="bg-green-500/10 border-green-500/30">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-full bg-green-500/20">
                    <Server className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-700 dark:text-green-400">Linux VPS Scraper</h3>
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
            {/* File Info Badge */}
            <div className="flex flex-wrap gap-2 items-center p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              {loadingFileInfo ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat info file...
                </div>
              ) : scraperFileInfo?.loaded ? (
                <>
                  <Badge variant="outline" className="border-blue-500/50 text-blue-700 dark:text-blue-400">
                    <Code className="h-3 w-3 mr-1" />
                    v{scraperFileInfo.version}
                  </Badge>
                  <Badge variant="outline" className="border-purple-500/50 text-purple-700 dark:text-purple-400">
                    <FileText className="h-3 w-3 mr-1" />
                    {scraperFileInfo.lineCount} lines
                  </Badge>
                  <Badge variant="outline" className="border-emerald-500/50 text-emerald-700 dark:text-emerald-400">
                    <Calendar className="h-3 w-3 mr-1" />
                    Build: {scraperFileInfo.buildDate}
                  </Badge>
                  <span className="text-xs text-green-600 dark:text-green-400 ml-auto flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    File terbaru siap didownload
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={fetchScraperFileInfo}
                    className="gap-1 h-7 px-2"
                    disabled={loadingFileInfo}
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingFileInfo ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  Gagal memuat info file
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={fetchScraperFileInfo}
                    className="gap-1 h-7 px-2"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Coba Lagi
                  </Button>
                </div>
              )}
            </div>

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
                <div className="flex gap-2">
                  <Button 
                    onClick={handleDownloadSetupPackage} 
                    disabled={generatingPackage}
                    className="gap-2 bg-primary hover:bg-primary/90"
                    size="lg"
                  >
                    {generatingPackage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Package className="h-4 w-4" />
                    )}
                    Download ZIP
                  </Button>
                </div>
              </div>

              {/* Update v4.0.0 Ultra-Robust Package */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-semibold flex items-center gap-2 text-orange-700 dark:text-orange-400">
                    <Zap className="h-4 w-4" />
                    Update v4.0.0 - Ultra-Robust Mode
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Berisi: bca-scraper.js, bca-scraper.service, install.sh, install-service.sh, dan UPDATE-INSTRUCTIONS.txt
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    🛡️ Global Timeout • Safe Frame Ops • Session Recovery • Auto-Restart
                  </p>
                </div>
                <Button 
                  onClick={handleDownloadUpdatePackage} 
                  disabled={downloadingUpdatePackage}
                  className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                  size="lg"
                >
                  {downloadingUpdatePackage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Update Navigation-Logging v4.1.5
                </Button>
              </div>

              {/* Quick Download bca-scraper.js */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-semibold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <Terminal className="h-4 w-4" />
                    Quick Update: bca-scraper.js
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Download hanya file scraper terbaru untuk update VPS yang sudah berjalan
                  </p>
                </div>
                <Button 
                  onClick={handleDownloadScraperOnly} 
                  disabled={downloadingScraperOnly}
                  variant="outline"
                  className="gap-2 border-emerald-500/50 hover:bg-emerald-500/10 hover:border-emerald-500"
                >
                  {downloadingScraperOnly ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  bca-scraper.js
                </Button>
              </div>

              {/* VPS Script Download Dialog */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <Terminal className="h-4 w-4" />
                    VPS Terminal Script
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Copy-paste script ke terminal VPS untuk download semua file langsung dari website
                  </p>
                </div>
                <div className="flex gap-2">
                  <ScraperFileUploader />
                  <VPSScriptDownloadDialog 
                    webhookUrl={vpsWebhookUrl}
                    secretKey={vpsSettings?.webhook_secret_encrypted || undefined}
                  />
                </div>
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
          </CardContent>
        </Card>

        {/* Version History Panel */}
        {user?.id && (
          <VersionHistoryPanel 
            userId={user.id} 
            onVersionChange={fetchData}
          />
        )}

        {/* Individual Files Accordion */}
        <Card>
          <CardContent className="pt-6">
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
            {/* Important Note */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  <strong>Penting:</strong> VPS di luar Indonesia memerlukan VPN split tunneling agar BCA bisa diakses 
                  sambil SSH tetap berjalan. Tutorial ini sudah mencakup setup split tunnel.
                </span>
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {[
                { icon: Download, label: "1. Download", desc: "VPN & Package" },
                { icon: Upload, label: "2. Upload", desc: "Ke VPS via SFTP" },
                { icon: Play, label: "3. Install", desc: "Jalankan install.sh" },
                { icon: Server, label: "4. Split Tunnel", desc: "Setup OpenVPN" },
                { icon: Settings, label: "5. Config", desc: "Edit config.env" },
                { icon: Monitor, label: "6. Test", desc: "Verifikasi" },
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
                    <h4 className="font-medium">Download File .ovpn dari VPN Provider</h4>
                    <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                      <li>Login ke VPN provider (VPNJantit, Surfshark, NordVPN, dll)</li>
                      <li>Pilih server <strong>Indonesia</strong></li>
                      <li>Download file <code className="bg-muted px-1 rounded">.ovpn</code></li>
                    </ol>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>Note:</strong> File .ovpn biasanya sudah berisi credentials lengkap. Tidak perlu catat username/password terpisah.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href="https://vpnjantit.com" target="_blank" rel="noopener noreferrer" className="gap-2">
                          <ExternalLink className="h-3 w-3" /> VPNJantit
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href="https://surfshark.com" target="_blank" rel="noopener noreferrer" className="gap-2">
                          <ExternalLink className="h-3 w-3" /> Surfshark
                        </a>
                      </Button>
                    </div>
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
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-primary mb-1">Core Files:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>✓ <code>install.sh</code> - Installer otomatis</li>
                          <li>✓ <code>config.env</code> - Konfigurasi</li>
                          <li>✓ <code>bca-scraper.js</code> - Script scraper</li>
                          <li>✓ <code>run.sh</code> - Runner script</li>
                          <li>✓ <code>README.txt</code> - Panduan singkat</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">OpenVPN Split Tunnel:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>✓ <code>setup-split-tunnel.sh</code> - Setup VPN</li>
                          <li>✓ <code>vpn-up.sh</code> - Routing script</li>
                          <li>✓ <code>vpn-down.sh</code> - Cleanup script</li>
                          <li>✓ <code>setup-openvpn.sh</code> - Basic setup</li>
                          <li>✓ <code>README-OPENVPN.md</code> - Panduan VPN</li>
                        </ul>
                      </div>
                    </div>
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
                    <p className="text-sm text-muted-foreground">
                      Upload semua file dari ZIP + file <code>.ovpn</code> ke folder <code>/root/bca-scraper/</code>
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
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm">4</div>
                    <span>Setup OpenVPN Split Tunnel</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-11 space-y-4">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      <strong>Penting:</strong> Step ini WAJIB untuk VPS di luar Indonesia. Split tunneling memastikan SSH tetap bisa diakses saat VPN aktif.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Jalankan Setup Script</h4>
                    <div className="p-3 bg-zinc-900 rounded-lg font-mono text-xs text-green-400 overflow-x-auto">
                      <p className="text-zinc-500"># Pastikan file .ovpn sudah di /root/bca-scraper/</p>
                      <p>cd /root/bca-scraper</p>
                      <p>chmod +x setup-split-tunnel.sh</p>
                      <p>sudo ./setup-split-tunnel.sh</p>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm font-medium mb-2">Script akan otomatis:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>✓ Install OpenVPN & dependencies</li>
                      <li>✓ Konfigurasi split tunneling (SSH tetap direct)</li>
                      <li>✓ Setup routing rules via vpn-up.sh & vpn-down.sh</li>
                      <li>✓ Enable OpenVPN service</li>
                      <li>✓ Verifikasi koneksi VPN Indonesia</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="text-sm text-destructive flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>
                        <strong>Jika SSH putus:</strong> Tunggu 2-3 menit, lalu coba reconnect. Jika masih gagal, 
                        reboot VPS via control panel hosting (Contabo/Hetzner dashboard).
                      </span>
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step5">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">5</div>
                    <span>Edit Konfigurasi BCA</span>
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
                  </div>
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-400">
                      ✓ <code>SECRET_KEY</code> dan <code>WEBHOOK_URL</code> sudah otomatis terisi dari download!
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
                <AccordionContent className="pl-11 space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Verifikasi Split Tunnel</h4>
                    <div className="p-3 bg-zinc-900 rounded-lg font-mono text-xs text-green-400 overflow-x-auto">
                      <p className="text-zinc-500"># Cek IP direct (harus IP VPS Eropa)</p>
                      <p>curl https://api.ipify.org && echo</p>
                      <p></p>
                      <p className="text-zinc-500"># Cek IP via VPN (harus IP Indonesia)</p>
                      <p>curl --interface tun0 https://api.ipify.org && echo</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Test Scraper Manual</h4>
                    <div className="p-3 bg-zinc-900 rounded-lg font-mono text-xs text-green-400 overflow-x-auto">
                      <p className="text-zinc-500"># Jalankan scraper sekali untuk test</p>
                      <p>./run.sh</p>
                      <p></p>
                      <p className="text-zinc-500"># Monitor log</p>
                      <p>tail -f /var/log/bca-scraper.log</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Commands Berguna</h4>
                    <div className="p-3 bg-zinc-900 rounded-lg font-mono text-xs text-green-400 overflow-x-auto">
                      <p className="text-zinc-500"># Cek status VPN</p>
                      <p>sudo systemctl status openvpn-client@indonesia</p>
                      <p></p>
                      <p className="text-zinc-500"># Restart VPN jika perlu</p>
                      <p>sudo systemctl restart openvpn-client@indonesia</p>
                      <p></p>
                      <p className="text-zinc-500"># Lihat log split tunnel</p>
                      <p>cat /var/log/vpn-split-tunnel.log</p>
                    </div>
                  </div>

                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                      🎉 Selesai! Scraper akan jalan otomatis setiap 5 menit via cron job.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
          </TabsContent>

          {/* Windows RDP Tab Content */}
          <TabsContent value="windows" className="space-y-4 mt-0">
            {/* Windows Info Banner */}
            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-full bg-blue-500/20">
                    <Monitor className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-700 dark:text-blue-400">Windows RDP Scraper</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Jalankan scraper di Windows RDP untuk <strong>debugging visual</strong> dan cross-checking.
                      Cocok untuk parallel testing dengan VPS Linux.
                    </p>
                  </div>
                  <Badge variant="outline" className="border-blue-500 text-blue-600">Beta</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Shared Config Cards for Windows */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Webhook URL Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="h-5 w-5" />
                    Webhook URL
                  </CardTitle>
                  <CardDescription>
                    URL yang sama dengan Linux VPS
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
                    Key yang sama dengan Linux VPS
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {vpsSettings?.webhook_secret_encrypted ? (
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
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Generate secret key di tab Linux VPS terlebih dahulu
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Windows Download Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Download Windows Scraper
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  Package untuk Windows RDP - 
                  {loadingWindowsInfo ? (
                    <Loader2 className="h-3 w-3 animate-spin inline" />
                  ) : windowsScraperInfo?.loaded ? (
                    <Badge variant="outline" className="font-mono text-xs">
                      v{windowsScraperInfo.version}
                    </Badge>
                  ) : (
                    'loading...'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Version Info Panel */}
                {windowsScraperInfo?.loaded && (
                  <div className="p-3 bg-muted/50 rounded-lg border space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="default" className="font-mono">
                        v{windowsScraperInfo.version}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Build: {windowsScraperInfo.buildDate}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Code className="h-3 w-3" />
                        {windowsScraperInfo.lineCount.toLocaleString()} lines
                      </span>
                    </div>
                    {windowsScraperInfo.changelog.length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer hover:text-primary text-muted-foreground">
                          Lihat Changelog ({windowsScraperInfo.changelog.length} entries)
                        </summary>
                        <ul className="mt-2 space-y-1 text-muted-foreground pl-4">
                          {windowsScraperInfo.changelog.map((line, idx) => (
                            <li key={idx} className="list-disc">{line}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}

                {/* Primary: ZIP Download */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-full bg-blue-500/20">
                      <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-700 dark:text-blue-400">Recommended: Download ZIP Package</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Download semua file dalam 1 ZIP dengan config.env yang sudah terisi SECRET_KEY & WEBHOOK_URL.
                        Termasuk VERSION.txt dengan changelog lengkap.
                      </p>
                      <Button 
                        onClick={handleDownloadWindowsPackage}
                        disabled={generatingWindowsPackage || !vpsSettings?.webhook_secret_encrypted}
                        className="mt-3 gap-2"
                      >
                        {generatingWindowsPackage ? (
                          <><RefreshCw className="h-4 w-4 animate-spin" /> Generating ZIP...</>
                        ) : (
                          <>
                            <Download className="h-4 w-4" /> 
                            Download Windows Package 
                            {windowsScraperInfo?.loaded && ` v${windowsScraperInfo.version}`}
                          </>
                        )}
                      </Button>
                      {!vpsSettings?.webhook_secret_encrypted && (
                        <p className="text-xs text-amber-600 mt-2">
                          ⚠️ Generate secret key di tab Linux VPS terlebih dahulu
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />
                
                {/* Alternative: PowerShell Script */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Alternative: PowerShell Script</h4>
                  <div className="flex flex-wrap gap-3">
                    <WindowsScriptDownloadDialog 
                      secretKey={vpsSettings?.webhook_secret_encrypted || ''} 
                      webhookUrl={vpsWebhookUrl}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Quick Install (PowerShell)</h4>
                  <div className="p-3 bg-zinc-900 rounded-lg font-mono text-xs text-blue-400 overflow-x-auto">
                    <p className="text-zinc-500"># 1. Download package ke folder pilihan</p>
                    <p>cd C:\Users\YourName\Desktop\bca-scraper</p>
                    <p></p>
                    <p className="text-zinc-500"># 2. Jalankan installer</p>
                    <p>.\install-windows.bat</p>
                    <p></p>
                    <p className="text-zinc-500"># 3. Edit config.env dengan credentials</p>
                    <p>notepad config.env</p>
                    <p></p>
                    <p className="text-zinc-500"># 4. Jalankan scraper</p>
                    <p>.\run-windows.bat</p>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      <strong>Penting:</strong> Pastikan Node.js sudah terinstall di Windows RDP. 
                      Download dari <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer" className="underline">nodejs.org</a>
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Windows Tutorial Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Tutorial Setup Windows RDP
                </CardTitle>
                <CardDescription>
                  Panduan step-by-step dari awal sampai selesai
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Step Overview */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    { icon: Server, label: "1. Persiapan", desc: "RDP & VPN" },
                    { icon: Download, label: "2. Download", desc: "Via PowerShell" },
                    { icon: Settings, label: "3. Install", desc: "Dependencies" },
                    { icon: FileText, label: "4. Config", desc: "Edit credentials" },
                    { icon: Play, label: "5. Test", desc: "Run & Auto-start" },
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center p-3 bg-muted/30 rounded-lg text-center">
                      <div className="p-2 rounded-full bg-blue-500/10 mb-2">
                        <item.icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <Separator />

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="win-step1">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">1</div>
                        <span>Persiapan: Windows RDP & VPN</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-11 space-y-3">
                      <div className="space-y-2">
                        <h4 className="font-medium">Requirements</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>✓ Windows 10/11 atau Windows Server</li>
                          <li>✓ Node.js 18+ (<a href="https://nodejs.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Download</a>)</li>
                          <li>✓ Google Chrome atau Microsoft Edge</li>
                          <li>✓ VPN Indonesia (OpenVPN)</li>
                        </ul>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-medium">Setup VPN Indonesia</h4>
                        <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                          <li>Download <a href="https://openvpn.net/client/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">OpenVPN GUI</a></li>
                          <li>Download file .ovpn dari VPN provider (VPNJantit, Surfshark, dll)</li>
                          <li>Pilih server Indonesia</li>
                          <li>Connect VPN <strong>sebelum</strong> menjalankan scraper</li>
                        </ol>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="win-step2">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">2</div>
                        <span>Download Files via PowerShell</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-11 space-y-3">
                      <div className="space-y-2">
                        <h4 className="font-medium">Cara Download</h4>
                        <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                          <li>Buka <strong>PowerShell</strong> sebagai Administrator</li>
                          <li>Klik tombol <strong>"PowerShell Script"</strong> di atas</li>
                          <li>Copy-paste script ke PowerShell</li>
                          <li>Tekan Enter</li>
                        </ol>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm font-medium mb-2">Files yang di-download:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>✓ <code className="bg-zinc-800 text-green-400 px-1 rounded">bca-scraper-windows.js</code> - Main script</li>
                          <li>✓ <code className="bg-zinc-800 text-green-400 px-1 rounded">install-windows.bat</code> - Installer</li>
                          <li>✓ <code className="bg-zinc-800 text-green-400 px-1 rounded">run-windows.bat</code> - Runner</li>
                          <li>✓ <code className="bg-zinc-800 text-green-400 px-1 rounded">setup-autostart.bat</code> - Auto-start</li>
                          <li>✓ <code className="bg-zinc-800 text-green-400 px-1 rounded">config.env</code> - Konfigurasi</li>
                        </ul>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <strong>Lokasi:</strong> <code>C:\Users\[username]\bca-scraper\</code>
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="win-step3">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">3</div>
                        <span>Install Dependencies</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-11 space-y-3">
                      <div className="space-y-2">
                        <h4 className="font-medium">Jalankan Installer</h4>
                        <p className="text-sm text-muted-foreground">
                          Double-click <code className="bg-zinc-800 text-green-400 px-1 rounded">install-windows.bat</code>
                        </p>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm font-medium mb-2">Installer akan:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>✓ Cek Node.js installation</li>
                          <li>✓ Install Puppeteer (browser automation)</li>
                          <li>✓ Buat file config.env</li>
                        </ul>
                      </div>
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <p className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>
                            Jika error <strong>"Node.js not found"</strong>: Install dari <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer" className="underline">nodejs.org</a>, 
                            lalu restart Command Prompt dan coba lagi.
                          </span>
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="win-step4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">4</div>
                        <span>Edit Konfigurasi</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-11 space-y-3">
                      <div className="space-y-2">
                        <h4 className="font-medium">Buka config.env</h4>
                        <div className="p-3 bg-zinc-900 rounded-lg font-mono text-xs text-blue-400">
                          <p>notepad config.env</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium">Isi Kredensial BCA</h4>
                        <div className="p-3 bg-zinc-900 rounded-lg font-mono text-xs text-green-400 overflow-x-auto">
                          <p>BCA_USER_ID=your_klikbca_user_id</p>
                          <p>BCA_PIN=your_klikbca_pin</p>
                          <p>BCA_ACCOUNT_NUMBER=1234567890</p>
                          <p className="text-zinc-500"># Secret key sudah otomatis terisi</p>
                          <p>SECRET_KEY={vpsSettings?.webhook_secret_encrypted || 'vps_xxxxxxxxxxxxx'}</p>
                        </div>
                      </div>
                      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-400 flex items-start gap-2">
                          <Monitor className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>
                            <strong>Visual Debugging:</strong> Set <code className="bg-zinc-800 text-green-400 px-1 rounded">HEADLESS=false</code> untuk lihat browser Chrome saat scraping.
                          </span>
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="win-step5">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">5</div>
                        <span>Test & Auto-Start</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-11 space-y-3">
                      <div className="space-y-2">
                        <h4 className="font-medium">Test Scraper</h4>
                        <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                          <li><strong>Connect VPN Indonesia</strong> terlebih dahulu</li>
                          <li>Double-click <code className="bg-zinc-800 text-green-400 px-1 rounded">run-windows.bat</code></li>
                          <li>Browser Chrome akan terbuka dan mulai scraping</li>
                          <li>Cek halaman ini untuk melihat webhook data</li>
                        </ol>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-medium">Setup Auto-Start (Opsional)</h4>
                        <p className="text-sm text-muted-foreground">
                          Untuk menjalankan scraper otomatis saat login Windows:
                        </p>
                        <div className="p-3 bg-zinc-900 rounded-lg font-mono text-xs text-blue-400">
                          <p className="text-zinc-500"># Jalankan script ini (akan register ke Task Scheduler)</p>
                          <p>.\setup-autostart.bat</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="win-troubleshoot">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm">?</div>
                        <span>Troubleshooting</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-11 space-y-3">
                      <div className="space-y-3">
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <h4 className="font-medium text-sm mb-1">Node.js not found</h4>
                          <p className="text-xs text-muted-foreground">
                            Download & install dari <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">nodejs.org</a>, 
                            lalu restart Command Prompt.
                          </p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <h4 className="font-medium text-sm mb-1">Puppeteer gagal install</h4>
                          <p className="text-xs text-muted-foreground">
                            Pastikan internet stabil, jalankan: <code className="bg-zinc-800 text-green-400 px-1 rounded">npm install puppeteer</code>
                          </p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <h4 className="font-medium text-sm mb-1">Chrome not found</h4>
                          <p className="text-xs text-muted-foreground">
                            Install Google Chrome, atau set path di config.env:<br />
                            <code className="bg-zinc-800 text-green-400 px-1 rounded">CHROMIUM_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe</code>
                          </p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <h4 className="font-medium text-sm mb-1">Login BCA gagal</h4>
                          <p className="text-xs text-muted-foreground">
                            1. Cek VPN Indonesia aktif<br />
                            2. Cek User ID & PIN di config.env<br />
                            3. Coba akses manual ke <a href="https://ibank.klikbca.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">ibank.klikbca.com</a>
                          </p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <h4 className="font-medium text-sm mb-1">Lihat Debug Screenshot</h4>
                          <p className="text-xs text-muted-foreground">
                            Buka folder <code className="bg-zinc-800 text-green-400 px-1 rounded">debug\</code> untuk melihat screenshot error.
                          </p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* Windows Benefits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Keuntungan Windows RDP
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <h4 className="font-medium text-sm mb-1">🔍 Visual Debugging</h4>
                    <p className="text-xs text-muted-foreground">
                      Set HEADLESS=false untuk lihat browser langsung
                    </p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <h4 className="font-medium text-sm mb-1">🔄 Cross-Check</h4>
                    <p className="text-xs text-muted-foreground">
                      Bandingkan hasil dengan Linux VPS
                    </p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <h4 className="font-medium text-sm mb-1">🛡️ Backup</h4>
                    <p className="text-xs text-muted-foreground">
                      Jika VPS down, Windows tetap jalan
                    </p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <h4 className="font-medium text-sm mb-1">⚡ Parallel Testing</h4>
                    <p className="text-xs text-muted-foreground">
                      Test burst mode di kedua environment
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Windows Balance Check Tab Content */}
          <TabsContent value="balance-check" className="space-y-4 mt-0">
            <Card className="bg-emerald-500/10 border-emerald-500/30">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-full bg-emerald-500/20">
                    <Wallet className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-emerald-700 dark:text-emerald-400">Windows RDP - Cek Saldo</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Metode verifikasi pembayaran berbasis perubahan saldo (bukan mutasi). 
                      Lebih cepat (~15 detik) dan lebih aman dari rate limit BCA.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Download Balance Checker
                </CardTitle>
                <CardDescription>
                  Script khusus untuk cek saldo BCA - optimized untuk payment verification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                  <h4 className="font-medium">Cara Kerja:</h4>
                  <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                    <li>User klik <strong>"Generate"</strong> → Script login, grab saldo awal (~15 detik)</li>
                    <li>Angka unik muncul → User transfer ke BCA</li>
                    <li>User klik <strong>"Saya Sudah Transfer"</strong> → Script loop 30x cek saldo</li>
                    <li>Jika saldo bertambah sesuai angka unik → <strong>SUKSES!</strong></li>
                  </ol>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <h4 className="font-medium text-sm text-green-700 dark:text-green-400 mb-1">✓ Keuntungan</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• ~15 detik untuk generate angka unik</li>
                      <li>• Lebih aman (tidak parse tabel mutasi)</li>
                      <li>• Lower rate limit risk</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <h4 className="font-medium text-sm text-amber-700 dark:text-amber-400 mb-1">⚠️ Requirement</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Windows RDP dengan VPN Indonesia</li>
                      <li>• Node.js & Chrome terinstall</li>
                      <li>• Script harus running saat Generate</li>
                    </ul>
                  </div>
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    <strong>Files:</strong> Download dari folder <code className="bg-zinc-800 text-green-400 px-1 rounded">windows-scraper-template/</code>
                    <br />
                    <code className="text-xs">bca-balance-checker.js</code>, <code className="text-xs">run-balance-checker.bat</code>, <code className="text-xs">install-balance-checker.bat</code>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
