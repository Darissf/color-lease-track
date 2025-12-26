import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/currency";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
  ArrowLeft, Key, Activity, FileText, RefreshCw, 
  CheckCircle, XCircle, Clock, Zap, Copy, Eye, EyeOff,
  Loader2, AlertCircle, TrendingUp, ExternalLink, Webhook
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MutasibankSettings {
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

interface BankMutation {
  id: string;
  transaction_date: string;
  transaction_time: string | null;
  description: string;
  amount: number;
  transaction_type: string;
  balance_after: number | null;
  is_processed: boolean;
  matched_contract_id: string | null;
  created_at: string;
  source: string;
}

interface PendingRequest {
  id: string;
  customer_name: string;
  amount_expected: number;
  requested_at: string;
  burst_expires_at: string;
  seconds_remaining: number;
}

export default function PaymentAutoSettings() {
  const { isSuperAdmin, user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<MutasibankSettings | null>(null);
  const [mutations, setMutations] = useState<BankMutation[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    api_key: "",
    webhook_secret: "",
  });

  // Generate webhook URL
  const webhookUrl = `https://uqzzpxfmwhmhiqniiyjk.supabase.co/functions/v1/mutasibank-webhook`;

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
      // Fetch Mutasibank settings
      const { data: settingsData } = await supabase
        .from("payment_provider_settings")
        .select("*")
        .eq("provider", "mutasibank")
        .limit(1)
        .maybeSingle();
      
      if (settingsData) {
        setSettings(settingsData as MutasibankSettings);
      }

      // Fetch mutations
      const { data: mutData } = await supabase
        .from("bank_mutations")
        .select("*")
        .order("transaction_date", { ascending: false })
        .limit(50);
      
      setMutations((mutData || []) as BankMutation[]);

      // Fetch pending requests
      const { data: pendingData } = await supabase.rpc("get_pending_burst_requests");
      setPendingRequests((pendingData || []) as PendingRequest[]);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.api_key && !settings) {
      toast.error("API Key wajib diisi");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        provider: "mutasibank",
        user_id: user?.id,
      };

      if (form.api_key) {
        payload.api_key_encrypted = form.api_key;
      }
      if (form.webhook_secret) {
        payload.webhook_secret_encrypted = form.webhook_secret;
      }

      if (settings) {
        // Update
        const { error } = await supabase
          .from("payment_provider_settings")
          .update({
            ...(form.api_key && { api_key_encrypted: form.api_key }),
            ...(form.webhook_secret && { webhook_secret_encrypted: form.webhook_secret }),
          })
          .eq("id", settings.id);
        
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from("payment_provider_settings")
          .insert({
            provider: "mutasibank",
            user_id: user?.id,
            api_key_encrypted: form.api_key || null,
            webhook_secret_encrypted: form.webhook_secret || null,
          });
        
        if (error) throw error;
      }
      
      toast.success("Pengaturan Mutasibank berhasil disimpan!");
      setForm({ api_key: "", webhook_secret: "" });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan pengaturan");
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
      toast.success(settings.is_active ? "Mutasibank dinonaktifkan" : "Mutasibank diaktifkan");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Gagal mengubah status");
    }
  };

  const handleTestWebhook = async () => {
    setTesting(true);
    try {
      // Send a test webhook
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Signature": form.webhook_secret || settings?.webhook_secret_encrypted || "",
        },
        body: JSON.stringify({
          data: {
            id: "test-" + Date.now(),
            bank_id: "bca",
            account_number: "1234567890",
            date: new Date().toISOString().split("T")[0],
            time: new Date().toTimeString().split(" ")[0],
            type: "CR",
            amount: 1,
            description: "TEST WEBHOOK - IGNORE",
            balance: 0,
          }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success("Webhook test berhasil! Koneksi OK.");
      } else {
        toast.error(`Webhook test gagal: ${result.error}`);
      }
    } catch (error: any) {
      toast.error(`Test gagal: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("Webhook URL berhasil disalin!");
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
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Pembayaran Otomatis
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Verifikasi pembayaran otomatis via Mutasibank.co.id (interval 5 menit)
            </p>
          </div>
          {settings && (
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.is_active}
                onCheckedChange={handleToggleActive}
              />
              <Badge variant={settings.is_active ? "default" : "secondary"}>
                {settings.is_active ? "Aktif" : "Nonaktif"}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-4">
        <Tabs defaultValue="config" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="config" className="gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">Konfigurasi</span>
            </TabsTrigger>
            <TabsTrigger value="status" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Status</span>
            </TabsTrigger>
            <TabsTrigger value="mutations" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Mutasi</span>
            </TabsTrigger>
            <TabsTrigger value="guide" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Panduan</span>
            </TabsTrigger>
          </TabsList>

          {/* Configuration Tab */}
          <TabsContent value="config" className="space-y-4">
            {/* Info Banner */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-full bg-primary/20">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Mutasibank.co.id Integration</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Interval cek mutasi: <strong>setiap 5 menit</strong> untuk BCA Advanced. 
                      Tidak perlu VPS atau maintenance. Cukup daftar, tambah rekening, dan copy webhook URL.
                    </p>
                    <Button variant="link" className="h-auto p-0 mt-2" asChild>
                      <a href="https://app.mutasibank.co.id/login" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Daftar Mutasibank
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {/* API Credentials */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    API Credentials
                  </CardTitle>
                  <CardDescription>
                    Dapatkan dari dashboard Mutasibank → Settings → API
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <div className="relative">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        placeholder={settings?.api_key_encrypted ? "••••••••••••" : "Masukkan API Key"}
                        value={form.api_key}
                        onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {settings?.api_key_encrypted && (
                      <p className="text-xs text-green-600">✓ API Key sudah tersimpan</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Webhook Secret (Opsional)</Label>
                    <div className="relative">
                      <Input
                        type={showWebhookSecret ? "text" : "password"}
                        placeholder={settings?.webhook_secret_encrypted ? "••••••••••••" : "Masukkan Webhook Secret"}
                        value={form.webhook_secret}
                        onChange={(e) => setForm({ ...form, webhook_secret: e.target.value })}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0"
                        onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                      >
                        {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Untuk keamanan tambahan, atur di Mutasibank → Webhook → Secret
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Webhook URL */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="h-5 w-5" />
                    Webhook URL
                  </CardTitle>
                  <CardDescription>
                    Copy URL ini ke dashboard Mutasibank → Webhook
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={webhookUrl}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label>Langkah Setup di Mutasibank:</Label>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Masuk ke dashboard Mutasibank</li>
                      <li>Pilih menu Webhook</li>
                      <li>Klik "Tambah Webhook"</li>
                      <li>Paste URL di atas</li>
                      <li>Centang event: "Mutasi Masuk"</li>
                      <li>Simpan</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Simpan Pengaturan
              </Button>
              <Button variant="outline" onClick={handleTestWebhook} disabled={testing || !settings}>
                {testing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Test Webhook
              </Button>
            </div>
          </TabsContent>

          {/* Status Tab */}
          <TabsContent value="status" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-full",
                      settings?.is_active ? "bg-green-500/20" : "bg-red-500/20"
                    )}>
                      {settings?.is_active ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-semibold">
                        {settings?.is_active ? "Aktif" : settings ? "Nonaktif" : "Belum Dikonfigurasi"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/20">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Webhook</p>
                      <p className="font-semibold">
                        {settings?.last_webhook_at 
                          ? format(new Date(settings.last_webhook_at), "dd MMM HH:mm", { locale: localeId })
                          : "Belum pernah"
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-full",
                      pendingRequests.length > 0 ? "bg-amber-500/20" : "bg-muted"
                    )}>
                      <Zap className={cn(
                        "h-6 w-6",
                        pendingRequests.length > 0 ? "text-amber-500" : "text-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Verifikasi</p>
                      <p className="font-semibold">
                        {pendingRequests.length} request
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" />
                    Menunggu Verifikasi
                  </CardTitle>
                  <CardDescription>
                    Pembayaran akan auto-match saat webhook diterima dari Mutasibank
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingRequests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg bg-amber-50/50 dark:bg-amber-950/20">
                        <div>
                          <p className="font-medium">{req.customer_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Menunggu: {formatRupiah(req.amount_expected)}
                          </p>
                        </div>
                        <Badge variant="outline" className="font-mono">
                          {Math.floor(req.seconds_remaining / 60)}:{(req.seconds_remaining % 60).toString().padStart(2, '0')}
                        </Badge>
                      </div>
                    ))}
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
          </TabsContent>

          {/* Mutations Tab */}
          <TabsContent value="mutations">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Riwayat Mutasi</CardTitle>
                  <Button variant="outline" size="sm" onClick={fetchData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Nominal</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mutations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Belum ada data mutasi
                          </TableCell>
                        </TableRow>
                      ) : (
                        mutations.map((mut) => (
                          <TableRow key={mut.id}>
                            <TableCell className="font-mono text-sm">
                              {format(new Date(mut.transaction_date), "dd/MM/yy", { locale: localeId })}
                              {mut.transaction_time && ` ${mut.transaction_time}`}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {mut.description}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn(
                                mut.source === "mutasibank" ? "bg-blue-50 text-blue-700" : ""
                              )}>
                                {mut.source || "manual"}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn(
                              "text-right font-medium",
                              mut.transaction_type === "kredit" ? "text-green-600" : "text-red-600"
                            )}>
                              {mut.transaction_type === "kredit" ? "+" : "-"}{formatRupiah(mut.amount)}
                            </TableCell>
                            <TableCell>
                              {mut.matched_contract_id ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  Matched
                                </Badge>
                              ) : (
                                <Badge variant="outline">Unmatched</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Guide Tab */}
          <TabsContent value="guide">
            <Card>
              <CardHeader>
                <CardTitle>Panduan Setup Mutasibank.co.id</CardTitle>
                <CardDescription>
                  Ikuti langkah-langkah berikut untuk mengaktifkan auto-verifikasi pembayaran
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold">Daftar Akun Mutasibank</h4>
                      <p className="text-sm text-muted-foreground">
                        Kunjungi <a href="https://app.mutasibank.co.id/login" target="_blank" rel="noopener noreferrer" className="text-primary underline">app.mutasibank.co.id</a> dan buat akun baru. 
                        Ada trial gratis 7 hari.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold">Tambahkan Rekening BCA</h4>
                      <p className="text-sm text-muted-foreground">
                        Di dashboard Mutasibank, tambahkan rekening BCA Anda dengan paket <strong>"BCA Advanced"</strong> (interval 5 menit). 
                        Ikuti instruksi untuk verifikasi rekening.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold">Copy API Key</h4>
                      <p className="text-sm text-muted-foreground">
                        Buka menu <strong>Settings → API</strong> di Mutasibank, copy API Key dan paste di form Konfigurasi di atas.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      4
                    </div>
                    <div>
                      <h4 className="font-semibold">Setup Webhook</h4>
                      <p className="text-sm text-muted-foreground">
                        Di Mutasibank, buka menu <strong>Webhook</strong>, klik "Tambah Webhook", paste URL berikut:
                      </p>
                      <div className="flex gap-2 mt-2">
                        <code className="flex-1 p-2 bg-muted rounded text-xs break-all">{webhookUrl}</code>
                        <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Pilih event: <strong>"Mutasi Masuk"</strong> lalu simpan.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      5
                    </div>
                    <div>
                      <h4 className="font-semibold">Aktifkan</h4>
                      <p className="text-sm text-muted-foreground">
                        Kembali ke halaman ini, aktifkan toggle di header. Selesai! 
                        Setiap ada transfer masuk ke BCA, sistem akan otomatis menerima notifikasi dan mencocokkan dengan pembayaran customer.
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">💡 Cara Kerja</h4>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Customer klik "Sudah Transfer" di halaman kontrak mereka</li>
                    <li>Sistem menyimpan request dengan nominal yang diharapkan</li>
                    <li>Mutasibank cek mutasi BCA setiap 5 menit</li>
                    <li>Saat ada mutasi masuk, Mutasibank kirim ke webhook kita</li>
                    <li>Sistem otomatis cocokkan nominal dan konfirmasi pembayaran</li>
                    <li>Customer terima notifikasi WhatsApp bahwa pembayaran sudah dikonfirmasi</li>
                  </ol>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                  <h4 className="font-semibold mb-2 text-amber-800 dark:text-amber-200">💰 Biaya</h4>
                  <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                    <li>• Trial gratis 7 hari</li>
                    <li>• BCA Advanced (5 menit): Rp 3.500/hari</li>
                    <li>• BCA Standard (15 menit): Rp 2.000/hari</li>
                    <li>• Tanpa VPS, tanpa maintenance</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
