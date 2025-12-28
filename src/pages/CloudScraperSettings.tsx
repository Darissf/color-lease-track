import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
  ArrowLeft, Cloud, Eye, EyeOff,
  Loader2, Play, RefreshCw, CheckCircle, 
  AlertCircle, Zap, Clock, Database, Rocket, Timer, Globe, Shield
} from "lucide-react";

interface ProxyConfig {
  enabled: boolean;
  type: string;
  host: string;
  port: number;
  username: string;
  password: string;
  country: string;
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
  // Burst mode fields
  burst_enabled: boolean;
  burst_interval_seconds: number;
  burst_duration_seconds: number;
  burst_in_progress: boolean;
  burst_started_at: string | null;
  burst_check_count: number;
  burst_last_match_found: boolean;
  // Proxy config
  proxy_config: ProxyConfig | null;
}

// Cooldown duration in seconds
const COOLDOWN_SECONDS = 30;

export default function CloudScraperSettings() {
  const { isSuperAdmin, user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<CloudScraperSettings | null>(null);
  
  // Cooldown state
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  
  // Form state
  const [bcaUserId, setBcaUserId] = useState("");
  const [bcaPin, setBcaPin] = useState("");
  const [bcaAccountNumber, setBcaAccountNumber] = useState("");
  const [scrapeInterval, setScrapeInterval] = useState("10");
  const [showPin, setShowPin] = useState(false);
  
  // Burst mode state
  const [burstEnabled, setBurstEnabled] = useState(true);
  const [burstInterval, setBurstInterval] = useState("5");
  
  // Proxy state
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyHost, setProxyHost] = useState("dc.pr.oxylabs.io");
  const [proxyPort, setProxyPort] = useState("10000");
  const [proxyUsername, setProxyUsername] = useState("");
  const [proxyPassword, setProxyPassword] = useState("");
  const [proxyCountry, setProxyCountry] = useState("ID");
  const [showProxyPassword, setShowProxyPassword] = useState(false);
  const [burstDuration, setBurstDuration] = useState("120");

  // Calculate cooldown based on last_scrape_at
  const updateCooldown = useCallback(() => {
    if (!settings?.last_scrape_at) {
      setCooldownRemaining(0);
      return;
    }
    
    const lastScrape = new Date(settings.last_scrape_at).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - lastScrape) / 1000);
    const remaining = Math.max(0, COOLDOWN_SECONDS - elapsed);
    setCooldownRemaining(remaining);
  }, [settings?.last_scrape_at]);

  // Cooldown timer
  useEffect(() => {
    updateCooldown();
    
    if (cooldownRemaining > 0) {
      const timer = setInterval(() => {
        setCooldownRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownRemaining, updateCooldown]);

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
      const { data } = await supabase
        .from("payment_provider_settings")
        .select("*")
        .eq("provider", "cloud_scraper")
        .limit(1)
        .maybeSingle();
      
      if (data) {
        const typedData = data as unknown as CloudScraperSettings;
        setSettings(typedData);
        setBcaUserId(typedData.bank_credentials?.user_id || "");
        setBcaPin(typedData.bank_credentials?.pin || "");
        setBcaAccountNumber(typedData.bank_credentials?.account_number || "");
        setScrapeInterval(String(typedData.scrape_interval_minutes || 10));
        setBurstEnabled(typedData.burst_enabled ?? true);
        setBurstInterval(String(typedData.burst_interval_seconds || 5));
        setBurstDuration(String(typedData.burst_duration_seconds || 120));
        // Load proxy config
        if (typedData.proxy_config) {
          setProxyEnabled(typedData.proxy_config.enabled ?? false);
          setProxyHost(typedData.proxy_config.host || "dc.pr.oxylabs.io");
          setProxyPort(String(typedData.proxy_config.port || 10000));
          setProxyUsername(typedData.proxy_config.username || "");
          setProxyPassword(typedData.proxy_config.password || "");
          setProxyCountry(typedData.proxy_config.country || "ID");
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Auto-refresh when burst is in progress
  useEffect(() => {
    if (settings?.burst_in_progress) {
      const interval = setInterval(() => {
        fetchData();
      }, 3000); // Refresh every 3 seconds
      return () => clearInterval(interval);
    }
  }, [settings?.burst_in_progress]);

  // Update cooldown when settings change
  useEffect(() => {
    updateCooldown();
  }, [settings?.last_scrape_at, updateCooldown]);

  const handleSave = async () => {
    if (!bcaUserId || !bcaPin || !bcaAccountNumber) {
      toast.error("Semua field BCA harus diisi");
      return;
    }

    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const credentials: any = {
        user_id: bcaUserId,
        pin: bcaPin,
        account_number: bcaAccountNumber,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proxyConfig: any = {
        enabled: proxyEnabled,
        type: "http",
        host: proxyHost,
        port: parseInt(proxyPort),
        username: proxyUsername,
        password: proxyPassword,
        country: proxyCountry,
      };

      if (settings) {
        const { error } = await supabase
          .from("payment_provider_settings")
          .update({
            bank_credentials: credentials,
            scrape_interval_minutes: parseInt(scrapeInterval),
            burst_enabled: burstEnabled,
            burst_interval_seconds: parseInt(burstInterval),
            burst_duration_seconds: parseInt(burstDuration),
            proxy_config: proxyConfig,
            is_active: true,
          })
          .eq("id", settings.id);
        
        if (error) throw error;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const insertData: any = {
          provider: "cloud_scraper",
          user_id: user?.id,
          bank_credentials: credentials,
          scrape_interval_minutes: parseInt(scrapeInterval),
          burst_enabled: burstEnabled,
          burst_interval_seconds: parseInt(burstInterval),
          burst_duration_seconds: parseInt(burstDuration),
          proxy_config: proxyConfig,
          is_active: true,
        };
        const { error } = await supabase
          .from("payment_provider_settings")
          .insert([insertData]);
        
        if (error) throw error;
      }
      
      toast.success("Cloud Scraper berhasil dikonfigurasi!");
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!settings) return;
    
    try {
      const { error } = await supabase
        .from("payment_provider_settings")
        .update({ is_active: !settings.is_active })
        .eq("id", settings.id);

      if (error) throw error;
      toast.success(settings.is_active ? "Cloud Scraper dinonaktifkan" : "Cloud Scraper diaktifkan");
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Gagal mengubah status");
    }
  };

  const handleRunNow = async () => {
    if (!settings?.is_active) {
      toast.error("Aktifkan Cloud Scraper terlebih dahulu");
      return;
    }

    // Check cooldown
    if (cooldownRemaining > 0) {
      toast.error(`Tunggu ${cooldownRemaining} detik sebelum menjalankan lagi`);
      return;
    }

    setTesting(true);
    // Start cooldown immediately for UI feedback
    setCooldownRemaining(COOLDOWN_SECONDS);
    
    try {
      const { data, error } = await supabase.functions.invoke("cloud-bank-scraper", {
        body: {},
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Scraping selesai! ${data.mutations_found} mutasi ditemukan, ${data.matched} matched`);
      } else {
        // Check for rate limit error
        if (data?.cooldown_remaining) {
          setCooldownRemaining(data.cooldown_remaining);
          toast.error(data.error || "Rate limit tercapai");
        } else {
          toast.error(`Scraping gagal: ${data?.error || "Unknown error"}`);
        }
      }
      
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(`Gagal menjalankan scraper: ${err.message}`);
    } finally {
      setTesting(false);
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

  const isOnCooldown = cooldownRemaining > 0;
  const isRunning = settings?.scrape_status === 'running';

  return (
    <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-3 py-3 sm:px-4 sm:py-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/vip/settings/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Cloud Bank Scraper
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Verifikasi pembayaran otomatis via Cloud (tanpa VPS)
            </p>
          </div>
          <div className="flex items-center gap-2">
            {settings?.is_active && (
              <Badge variant="default" className="bg-blue-500">
                <Cloud className="h-3 w-3 mr-1" />
                Aktif
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-4 space-y-4">
        {/* Info Banner */}
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-blue-500/20">
                <Cloud className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-700 dark:text-blue-400">Cloud Bank Scraper</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Scraper berjalan di cloud secara otomatis. <strong>Tidak perlu VPS!</strong> 
                  Cukup masukkan kredensial BCA dan sistem akan berjalan otomatis.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cooldown Banner */}
        {isOnCooldown && (
          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-amber-500/20">
                  <Timer className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    Cooldown Aktif
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tunggu {cooldownRemaining} detik untuk mencegah rate limit dari Browserless
                  </p>
                </div>
                <Badge variant="outline" className="border-amber-500 text-amber-600">
                  {cooldownRemaining}s
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Credentials Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Kredensial BCA Internet Banking
            </CardTitle>
            <CardDescription>
              Masukkan kredensial KlikBCA untuk scraping mutasi otomatis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bca-user-id">KlikBCA User ID</Label>
                <Input
                  id="bca-user-id"
                  value={bcaUserId}
                  onChange={(e) => setBcaUserId(e.target.value)}
                  placeholder="Masukkan User ID KlikBCA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bca-pin">PIN KlikBCA</Label>
                <div className="flex gap-2">
                  <Input
                    id="bca-pin"
                    type={showPin ? "text" : "password"}
                    value={bcaPin}
                    onChange={(e) => setBcaPin(e.target.value)}
                    placeholder="Masukkan PIN"
                  />
                  <Button variant="ghost" size="icon" onClick={() => setShowPin(!showPin)}>
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bca-account">Nomor Rekening BCA</Label>
                <Input
                  id="bca-account"
                  value={bcaAccountNumber}
                  onChange={(e) => setBcaAccountNumber(e.target.value)}
                  placeholder="Contoh: 1234567890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interval">Interval Scraping</Label>
                <Select value={scrapeInterval} onValueChange={setScrapeInterval}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Setiap 5 menit</SelectItem>
                    <SelectItem value="10">Setiap 10 menit</SelectItem>
                    <SelectItem value="15">Setiap 15 menit</SelectItem>
                    <SelectItem value="30">Setiap 30 menit</SelectItem>
                    <SelectItem value="60">Setiap 1 jam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Simpan Pengaturan
              </Button>
              {settings?.is_active && (
                <Button 
                  variant="outline" 
                  onClick={handleRunNow} 
                  disabled={testing || isOnCooldown || isRunning}
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : isOnCooldown ? (
                    <Timer className="h-4 w-4 mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {isOnCooldown 
                    ? `Tunggu ${cooldownRemaining}s` 
                    : isRunning 
                      ? "Sedang Berjalan..." 
                      : "Jalankan Sekarang"
                  }
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Burst Mode Settings */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Burst Mode Settings
            </CardTitle>
            <CardDescription>
              Mode cepat: 1x login, cek mutasi berulang setiap 5 detik selama 2 menit saat user konfirmasi transfer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Aktifkan Burst Mode</p>
                  <p className="text-xs text-muted-foreground">
                    Auto-trigger saat customer konfirmasi pembayaran
                  </p>
                </div>
              </div>
              <Switch
                checked={burstEnabled}
                onCheckedChange={setBurstEnabled}
              />
            </div>

            {burstEnabled && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="burst-interval">Interval Cek (detik)</Label>
                  <Select value={burstInterval} onValueChange={setBurstInterval}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 detik</SelectItem>
                      <SelectItem value="5">5 detik (recommended)</SelectItem>
                      <SelectItem value="10">10 detik</SelectItem>
                      <SelectItem value="15">15 detik</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="burst-duration">Durasi Burst (detik)</Label>
                  <Select value={burstDuration} onValueChange={setBurstDuration}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih durasi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">1 menit (12 cek)</SelectItem>
                      <SelectItem value="120">2 menit (24 cek) - recommended</SelectItem>
                      <SelectItem value="180">3 menit (36 cek)</SelectItem>
                      <SelectItem value="300">5 menit (60 cek)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Cara kerja:</strong> Saat customer klik "Saya Sudah Transfer", sistem akan login BCA 1x, 
                lalu cek mutasi setiap {burstInterval} detik selama {Math.floor(parseInt(burstDuration) / 60)} menit 
                ({Math.floor(parseInt(burstDuration) / parseInt(burstInterval))} pengecekan) tanpa login ulang.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Proxy Configuration */}
        <Card className="border-green-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-green-600" />
              Proxy Configuration (Oxylabs)
            </CardTitle>
            <CardDescription>
              Gunakan proxy untuk akses lebih cepat dan stabil dari Indonesia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-500/5 rounded-lg border border-green-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/10">
                  <Shield className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Aktifkan Proxy</p>
                  <p className="text-xs text-muted-foreground">
                    Koneksi via Oxylabs Datacenter Proxy untuk kecepatan maksimal
                  </p>
                </div>
              </div>
              <Switch
                checked={proxyEnabled}
                onCheckedChange={setProxyEnabled}
              />
            </div>

            {proxyEnabled && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="proxy-host">Proxy Host</Label>
                    <Input
                      id="proxy-host"
                      value={proxyHost}
                      onChange={(e) => setProxyHost(e.target.value)}
                      placeholder="dc.pr.oxylabs.io"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proxy-port">Proxy Port</Label>
                    <Input
                      id="proxy-port"
                      value={proxyPort}
                      onChange={(e) => setProxyPort(e.target.value)}
                      placeholder="10000"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="proxy-username">Username</Label>
                    <Input
                      id="proxy-username"
                      value={proxyUsername}
                      onChange={(e) => setProxyUsername(e.target.value)}
                      placeholder="username_oxylabs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proxy-password">Password</Label>
                    <div className="flex gap-2">
                      <Input
                        id="proxy-password"
                        type={showProxyPassword ? "text" : "password"}
                        value={proxyPassword}
                        onChange={(e) => setProxyPassword(e.target.value)}
                        placeholder="password"
                      />
                      <Button variant="ghost" size="icon" onClick={() => setShowProxyPassword(!showProxyPassword)}>
                        {showProxyPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proxy-country">Lokasi Proxy</Label>
                  <Select value={proxyCountry} onValueChange={setProxyCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih negara" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ID">🇮🇩 Indonesia (ID) - Recommended</SelectItem>
                      <SelectItem value="SG">🇸🇬 Singapore (SG)</SelectItem>
                      <SelectItem value="MY">🇲🇾 Malaysia (MY)</SelectItem>
                      <SelectItem value="US">🇺🇸 United States (US)</SelectItem>
                      <SelectItem value="JP">🇯🇵 Japan (JP)</SelectItem>
                      <SelectItem value="AU">🇦🇺 Australia (AU)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    <strong>Username yang akan digunakan:</strong>{" "}
                    <code className="bg-background/50 px-2 py-0.5 rounded text-xs">
                      {proxyUsername ? `${proxyUsername}-country-${proxyCountry}` : "username-country-ID"}
                    </code>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Oxylabs akan routing koneksi melalui datacenter di {proxyCountry === "ID" ? "Indonesia" : proxyCountry}
                  </p>
                </div>
              </>
            )}

            {!proxyEnabled && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Tanpa proxy:</strong> Koneksi langsung dari server Browserless (US). 
                  Mungkin lebih lambat dan timeout untuk akses KlikBCA.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Burst Status - Show when burst is in progress */}
        {settings?.burst_in_progress && (
          <Card className="border-2 border-primary bg-primary/5 animate-pulse">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/20 animate-bounce">
                      <Rocket className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">Burst Mode Aktif</p>
                      <p className="text-sm text-muted-foreground">
                        Mengecek mutasi setiap {settings.burst_interval_seconds || 5} detik...
                      </p>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-primary animate-pulse">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Running
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-medium">
                      Check #{settings.burst_check_count || 0} / {Math.floor((settings.burst_duration_seconds || 120) / (settings.burst_interval_seconds || 5))}
                    </span>
                  </div>
                  <Progress 
                    value={(settings.burst_check_count || 0) / Math.floor((settings.burst_duration_seconds || 120) / (settings.burst_interval_seconds || 5)) * 100} 
                    className="h-3"
                  />
                </div>

                {settings.burst_started_at && (
                  <p className="text-xs text-muted-foreground text-center">
                    Dimulai: {format(new Date(settings.burst_started_at), "HH:mm:ss", { locale: localeId })}
                  </p>
                )}

                {settings.burst_last_match_found && (
                  <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-300">
                      Pembayaran ditemukan dan diverifikasi!
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Card */}
        {settings && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Status Cloud Scraper
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Cloud Scraper</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.is_active}
                    onCheckedChange={handleToggleActive}
                  />
                  <Badge variant={settings.is_active ? "default" : "secondary"}>
                    {settings.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">Status</span>
                  </div>
                  <p className="font-semibold capitalize">
                    {settings.scrape_status === 'idle' && '⚪ Idle'}
                    {settings.scrape_status === 'running' && '🔵 Running'}
                    {settings.scrape_status === 'error' && '🔴 Error'}
                  </p>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <RefreshCw className="h-4 w-4" />
                    <span className="text-xs">Total Scrapes</span>
                  </div>
                  <p className="font-semibold">{settings.total_scrapes || 0}</p>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Database className="h-4 w-4" />
                    <span className="text-xs">Mutasi Ditemukan</span>
                  </div>
                  <p className="font-semibold">{settings.total_mutations_found || 0}</p>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">Last Scrape</span>
                  </div>
                  <p className="font-semibold text-sm">
                    {settings.last_scrape_at 
                      ? format(new Date(settings.last_scrape_at), "dd MMM HH:mm", { locale: localeId })
                      : "Belum pernah"
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success indicator */}
        {settings?.last_scrape_at && !settings?.last_error && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/20">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="font-semibold">Scraper berjalan dengan baik</p>
                  <p className="text-sm text-muted-foreground">
                    Terakhir scrape: {format(new Date(settings.last_scrape_at), "dd MMM yyyy HH:mm:ss", { locale: localeId })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {settings?.last_error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Error Terakhir
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{settings.last_error}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Error count: {settings.error_count}
              </p>
            </CardContent>
          </Card>
        )}

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle>Cara Kerja</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">1</div>
                <div>
                  <h4 className="font-semibold">Masukkan Kredensial</h4>
                  <p className="text-sm text-muted-foreground">
                    Masukkan User ID dan PIN KlikBCA Anda. Data disimpan dengan aman.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">2</div>
                <div>
                  <h4 className="font-semibold">Aktifkan Scraper</h4>
                  <p className="text-sm text-muted-foreground">
                    Klik tombol "Simpan" dan aktifkan scraper. Sistem akan berjalan otomatis.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">3</div>
                <div>
                  <h4 className="font-semibold">Verifikasi Otomatis</h4>
                  <p className="text-sm text-muted-foreground">
                    Setiap mutasi masuk akan dicocokkan dengan payment request. 
                    Jika cocok, pembayaran otomatis terverifikasi + notifikasi WhatsApp.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-amber-500/20">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-700 dark:text-amber-400">Keamanan</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Kredensial BCA Anda disimpan dengan aman di database. 
                  Pastikan hanya super admin yang memiliki akses ke halaman ini.
                  Kami menyarankan menggunakan akun KlikBCA khusus untuk monitoring.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
