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
  ArrowLeft, Server, Key, Activity, FileText, RefreshCw, 
  CheckCircle, XCircle, Clock, Zap, Copy, Download, Eye, EyeOff,
  Loader2, AlertCircle, TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BCACredential {
  id: string;
  vps_host: string;
  vps_port: number;
  vps_username: string;
  is_active: boolean;
  status: string;
  last_sync_at: string | null;
  error_message: string | null;
  error_count: number;
  default_interval_minutes: number;
  burst_interval_seconds: number;
  burst_duration_seconds: number;
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
}

interface SyncLog {
  id: string;
  status: string;
  mutations_found: number;
  mutations_new: number;
  mutations_matched: number;
  mode: string;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
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
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<BCACredential | null>(null);
  const [mutations, setMutations] = useState<BankMutation[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  
  // Form state
  const [form, setForm] = useState({
    vps_host: "",
    vps_port: 22,
    vps_username: "",
    vps_password: "",
    klikbca_user_id: "",
    klikbca_pin: "",
    default_interval_minutes: 15,
    burst_interval_seconds: 60,
    burst_duration_seconds: 180,
  });

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
      // Fetch credentials
      const { data: credData } = await supabase
        .from("bca_credentials")
        .select("*")
        .limit(1)
        .maybeSingle();
      
      if (credData) {
        setCredentials(credData as BCACredential);
        setForm({
          vps_host: credData.vps_host || "",
          vps_port: credData.vps_port || 22,
          vps_username: credData.vps_username || "",
          vps_password: "",
          klikbca_user_id: "",
          klikbca_pin: "",
          default_interval_minutes: credData.default_interval_minutes || 15,
          burst_interval_seconds: credData.burst_interval_seconds || 60,
          burst_duration_seconds: credData.burst_duration_seconds || 180,
        });
      }

      // Fetch mutations
      const { data: mutData } = await supabase
        .from("bank_mutations")
        .select("*")
        .order("transaction_date", { ascending: false })
        .limit(50);
      
      setMutations((mutData || []) as BankMutation[]);

      // Fetch sync logs
      const { data: logData } = await supabase
        .from("bca_sync_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);
      
      setSyncLogs((logData || []) as SyncLog[]);

      // Fetch pending burst requests
      const { data: pendingData } = await supabase.rpc("get_pending_burst_requests");
      setPendingRequests((pendingData || []) as PendingRequest[]);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("bca-credentials-manager", {
        body: {
          action: credentials ? "update" : "create",
          ...form,
        }
      });

      if (error) throw error;
      toast.success("Credentials berhasil disimpan!");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan credentials");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateScript = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("bca-vps-setup", {
        body: { action: "generate-script" }
      });

      if (error) throw error;
      setGeneratedScript(data.script);
      toast.success("Script berhasil digenerate!");
    } catch (error: any) {
      toast.error(error.message || "Gagal generate script");
    }
  };

  const handleToggleActive = async () => {
    if (!credentials) return;
    
    try {
      const { error } = await supabase.functions.invoke("bca-credentials-manager", {
        body: {
          action: "toggle",
          is_active: !credentials.is_active,
        }
      });

      if (error) throw error;
      toast.success(credentials.is_active ? "Payment otomatis dinonaktifkan" : "Payment otomatis diaktifkan");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Gagal mengubah status");
    }
  };

  const copyScript = () => {
    if (generatedScript) {
      navigator.clipboard.writeText(generatedScript);
      toast.success("Script berhasil disalin!");
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
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Payment Otomatis
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Verifikasi pembayaran BCA otomatis dengan Burst Mode
            </p>
          </div>
          {credentials && (
            <div className="flex items-center gap-2">
              <Switch
                checked={credentials.is_active}
                onCheckedChange={handleToggleActive}
              />
              <Badge variant={credentials.is_active ? "default" : "secondary"}>
                {credentials.is_active ? "Aktif" : "Nonaktif"}
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
            <TabsTrigger value="logs" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
          </TabsList>

          {/* Configuration Tab */}
          <TabsContent value="config" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* VPS Credentials */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    VPS Credentials
                  </CardTitle>
                  <CardDescription>
                    Kredensial untuk mengakses VPS scraper
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Host</Label>
                    <Input
                      placeholder="192.168.1.1 atau domain.com"
                      value={form.vps_host}
                      onChange={(e) => setForm({ ...form, vps_host: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Port SSH</Label>
                      <Input
                        type="number"
                        value={form.vps_port}
                        onChange={(e) => setForm({ ...form, vps_port: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input
                        placeholder="root"
                        value={form.vps_username}
                        onChange={(e) => setForm({ ...form, vps_username: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={form.vps_password}
                        onChange={(e) => setForm({ ...form, vps_password: e.target.value })}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Password akan dienkripsi dengan AES-256
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* KlikBCA Credentials */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    KlikBCA Credentials
                  </CardTitle>
                  <CardDescription>
                    Kredensial untuk login ke KlikBCA Individual
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>User ID</Label>
                    <Input
                      placeholder="KlikBCA User ID"
                      value={form.klikbca_user_id}
                      onChange={(e) => setForm({ ...form, klikbca_user_id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>PIN</Label>
                    <div className="relative">
                      <Input
                        type={showPin ? "text" : "password"}
                        placeholder="••••••"
                        maxLength={6}
                        value={form.klikbca_pin}
                        onChange={(e) => setForm({ ...form, klikbca_pin: e.target.value })}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0"
                        onClick={() => setShowPin(!showPin)}
                      >
                        {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PIN akan dienkripsi dengan AES-256-GCM
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Interval Normal (menit)</Label>
                    <Input
                      type="number"
                      value={form.default_interval_minutes}
                      onChange={(e) => setForm({ ...form, default_interval_minutes: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Burst Interval (detik)</Label>
                      <Input
                        type="number"
                        value={form.burst_interval_seconds}
                        onChange={(e) => setForm({ ...form, burst_interval_seconds: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Burst Duration (detik)</Label>
                      <Input
                        type="number"
                        value={form.burst_duration_seconds}
                        onChange={(e) => setForm({ ...form, burst_duration_seconds: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Simpan Credentials
              </Button>
              <Button variant="outline" onClick={handleGenerateScript}>
                <Download className="h-4 w-4 mr-2" />
                Generate VPS Script
              </Button>
            </div>

            {/* Generated Script */}
            {generatedScript && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>VPS Install Script</CardTitle>
                    <Button variant="outline" size="sm" onClick={copyScript}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                  <CardDescription>
                    Jalankan script ini di VPS Anda untuk menginstall scraper
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-muted/50">
                    <pre className="text-xs font-mono whitespace-pre-wrap">{generatedScript}</pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Status Tab */}
          <TabsContent value="status" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-full",
                      credentials?.status === "connected" ? "bg-green-500/20" : "bg-red-500/20"
                    )}>
                      {credentials?.status === "connected" ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status Koneksi</p>
                      <p className="font-semibold">
                        {credentials?.status === "connected" ? "Terhubung" : 
                         credentials?.status === "error" ? "Error" : "Belum Dikonfigurasi"}
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
                      <p className="text-sm text-muted-foreground">Last Sync</p>
                      <p className="font-semibold">
                        {credentials?.last_sync_at 
                          ? format(new Date(credentials.last_sync_at), "dd MMM HH:mm", { locale: localeId })
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
                      <p className="text-sm text-muted-foreground">Mode</p>
                      <p className="font-semibold">
                        {pendingRequests.length > 0 ? "🔥 BURST MODE" : "Normal (15 menit)"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pending Burst Requests */}
            {pendingRequests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" />
                    Active Burst Requests
                  </CardTitle>
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
            {credentials?.error_message && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    Error Terakhir
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{credentials.error_message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Error count: {credentials.error_count}
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
                  <CardTitle>Riwayat Mutasi BCA</CardTitle>
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
                        <TableHead>Tipe</TableHead>
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
                              <Badge variant={mut.transaction_type === "CR" ? "default" : "secondary"}>
                                {mut.transaction_type}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn(
                              "text-right font-medium",
                              mut.transaction_type === "CR" ? "text-green-600" : "text-red-600"
                            )}>
                              {mut.transaction_type === "CR" ? "+" : "-"}{formatRupiah(mut.amount)}
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

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Sync Logs</CardTitle>
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
                        <TableHead>Waktu</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead className="text-center">Found</TableHead>
                        <TableHead className="text-center">New</TableHead>
                        <TableHead className="text-center">Matched</TableHead>
                        <TableHead className="text-right">Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Belum ada sync logs
                          </TableCell>
                        </TableRow>
                      ) : (
                        syncLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-sm">
                              {format(new Date(log.started_at), "dd/MM HH:mm:ss", { locale: localeId })}
                            </TableCell>
                            <TableCell>
                              <Badge variant={log.status === "success" ? "default" : "destructive"}>
                                {log.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={log.mode === "burst" ? "outline" : "secondary"} 
                                className={log.mode === "burst" ? "bg-amber-50 text-amber-700" : ""}>
                                {log.mode === "burst" ? "🔥 Burst" : "Normal"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">{log.mutations_found}</TableCell>
                            <TableCell className="text-center">{log.mutations_new}</TableCell>
                            <TableCell className="text-center font-medium text-green-600">
                              {log.mutations_matched}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {log.duration_ms ? `${log.duration_ms}ms` : "-"}
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
        </Tabs>
      </div>
    </div>
  );
}
