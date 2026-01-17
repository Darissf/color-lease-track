import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Upload, Database, AlertTriangle, Check, Loader2, FileJson, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BackupPreview {
  version: string;
  exported_at: string;
  exported_by: string;
  table_count: number;
  total_records: number;
  tables: Record<string, { row_count: number; data: unknown[] }>;
}

type ImportStrategy = 'merge' | 'replace' | 'skip';

const ALL_TABLES = [
  'ai_content_suggestions', 'ai_custom_tools', 'ai_feature_config', 'ai_memory', 'ai_personas', 'ai_usage_analytics',
  'alert_history', 'api_access_logs', 'api_docs_public_links', 'api_keys', 'api_rate_limits', 'audit_logs',
  'bank_account_balance_history', 'bank_accounts', 'bank_mutations', 'bca_credentials', 'bca_sync_logs',
  'blog_categories', 'blog_comments', 'blog_posts',
  'budget_alerts', 'budget_automation_rules', 'budget_templates', 'category_budgets',
  'chat_bookmarks', 'chat_conversations', 'chat_documents', 'chat_message_reactions', 'chat_messages',
  'client_groups', 'cloud_usage_snapshots', 'content_analysis', 'content_comments', 'content_file_mapping', 'content_history', 'content_render_stats',
  'contract_line_items', 'contract_payments', 'contract_public_links', 'contract_stock_items', 'conversation_sharing',
  'custom_text_elements', 'database_backups', 'delivery_location_history', 'delivery_stops', 'delivery_trips',
  'document_settings', 'driver_templates', 'editable_content',
  'email_logs', 'email_providers', 'email_signatures', 'email_templates', 'email_verification_tokens',
  'expenses', 'fixed_expense_history', 'fixed_expenses', 'fixed_monthly_income',
  'income_sources', 'inventory_items', 'inventory_movements', 'invoice_receipts',
  'login_sessions', 'mail_inbox', 'manual_invoice_content', 'manual_receipt_content', 'meta_ads_settings', 'meta_events', 'meta_whatsapp_templates',
  'monitored_email_addresses', 'monthly_budgets', 'monthly_reports',
  'notification_preferences', 'password_reset_tokens', 'payment_confirmation_requests', 'payment_edit_requests', 'payment_provider_settings', 'payments_tracking',
  'portfolio_projects', 'profiles',
  'recurring_income', 'recurring_income_payments', 'recurring_transactions', 'rental_contracts',
  'savings_plans', 'savings_settings', 'savings_transactions', 'scraper_versions', 'security_rate_limits', 'short_links', 'smtp_settings', 'stamp_elements',
  'temporary_access_codes', 'two_factor_codes', 'unified_notification_queue', 'user_ai_settings', 'user_roles',
  'vip_design_settings', 'warehouse_settings',
  'whatsapp_analytics', 'whatsapp_conversations', 'whatsapp_customer_tags', 'whatsapp_health_checks',
  'whatsapp_message_templates', 'whatsapp_messages', 'whatsapp_notification_queue', 'whatsapp_notifications_log',
  'whatsapp_numbers', 'whatsapp_scheduled_messages', 'whatsapp_settings', 'whatsapp_tracked_links',
  'windows_balance_check_sessions'
];

const BackupRestore = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [importStrategy, setImportStrategy] = useState<ImportStrategy>('merge');
  const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(null);
  const [showTableList, setShowTableList] = useState(false);
  const [lastExportTime, setLastExportTime] = useState<string | null>(() => {
    return localStorage.getItem('lastDatabaseExport');
  });

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Akses Ditolak</h2>
          <p className="text-muted-foreground mb-4">Hanya Super Admin yang dapat mengakses halaman ini.</p>
          <Button onClick={() => navigate("/vip/settings/admin")}>Kembali</Button>
        </Card>
      </div>
    );
  }

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Tidak terautentikasi");
      }

      const response = await supabase.functions.invoke('export-database', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Export gagal');
      }

      const backupData = response.data;
      
      // Create downloadable file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Save last export time
      const now = new Date().toISOString();
      setLastExportTime(now);
      localStorage.setItem('lastDatabaseExport', now);

      toast({
        title: "Export Berhasil",
        description: `${backupData.table_count} tabel dengan ${backupData.total_records} records telah di-export.`,
      });
      setExportProgress(100);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Gagal",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat export",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as BackupPreview;
        
        if (!data.version || !data.tables) {
          throw new Error("Format file tidak valid");
        }
        
        setBackupPreview(data);
        toast({
          title: "File Diterima",
          description: `${data.table_count} tabel, ${data.total_records} records siap di-import.`,
        });
      } catch (error) {
        toast({
          title: "File Tidak Valid",
          description: "File harus berupa JSON backup yang valid.",
          variant: "destructive",
        });
        setBackupPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!backupPreview) return;
    
    setIsImporting(true);
    setImportProgress(0);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Tidak terautentikasi");
      }

      const response = await supabase.functions.invoke('import-database', {
        body: {
          backup_data: backupPreview,
          strategy: importStrategy,
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Import gagal');
      }

      const result = response.data;
      
      toast({
        title: "Import Berhasil",
        description: `${result.tables_imported} tabel, ${result.records_imported} records berhasil di-import.`,
      });
      setImportProgress(100);
      setBackupPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Gagal",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat import",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-3 py-3 sm:px-4 sm:py-4 md:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/vip/settings/admin")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 w-full min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent break-words">
              Backup & Restore
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Export dan import SELURUH database ({ALL_TABLES.length} tabel)
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-4 space-y-4">
        {/* Export Section */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Download className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Export Database</h2>
              <p className="text-sm text-muted-foreground">Download seluruh data sebagai file JSON</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Tabel:</span>
              <Badge variant="secondary">{ALL_TABLES.length} tabel</Badge>
            </div>

            {lastExportTime && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Terakhir export:</span>
                <span className="font-medium text-green-600">
                  {new Date(lastExportTime).toLocaleString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZoneName: 'short'
                  })}
                </span>
              </div>
            )}

            <Collapsible open={showTableList} onOpenChange={setShowTableList}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  {showTableList ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {showTableList ? 'Sembunyikan' : 'Lihat'} daftar tabel
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ScrollArea className="h-48 mt-2 border rounded-lg p-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs">
                    {ALL_TABLES.map((table, i) => (
                      <span key={table} className="text-muted-foreground">
                        {i + 1}. {table}
                      </span>
                    ))}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>

            {isExporting && (
              <div className="space-y-2">
                <Progress value={exportProgress} />
                <p className="text-sm text-muted-foreground">Mengexport data...</p>
              </div>
            )}

            <Button onClick={handleExport} disabled={isExporting} className="w-full sm:w-auto">
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export & Download JSON
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Import Section */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-green-600 flex items-center justify-center">
              <Upload className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Import Database</h2>
              <p className="text-sm text-muted-foreground">Upload file JSON backup untuk restore data</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* File Upload */}
            <div 
              className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileSelect}
              />
              <FileJson className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Klik atau drag & drop file JSON</p>
              <p className="text-xs text-muted-foreground mt-1">Format: backup-YYYY-MM-DD.json</p>
            </div>

            {/* Preview */}
            {backupPreview && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="font-medium">File Valid</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tabel:</span>{' '}
                    <span className="font-medium">{backupPreview.table_count}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Records:</span>{' '}
                    <span className="font-medium">{backupPreview.total_records.toLocaleString()}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Exported:</span>{' '}
                    <span className="font-medium">
                      {new Date(backupPreview.exported_at).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Import Strategy */}
            {backupPreview && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Import Strategy</Label>
                <RadioGroup value={importStrategy} onValueChange={(v) => setImportStrategy(v as ImportStrategy)}>
                  <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value="merge" id="merge" className="mt-0.5" />
                    <div>
                      <Label htmlFor="merge" className="font-medium cursor-pointer">Merge</Label>
                      <p className="text-xs text-muted-foreground">
                        Update data jika ID sama, insert jika baru. Data existing yang tidak ada di backup tetap ada.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value="replace" id="replace" className="mt-0.5" />
                    <div>
                      <Label htmlFor="replace" className="font-medium cursor-pointer text-destructive">Replace (Hati-hati!)</Label>
                      <p className="text-xs text-muted-foreground">
                        Hapus SEMUA data existing lalu import fresh dari backup. Data yang tidak ada di backup akan hilang!
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value="skip" id="skip" className="mt-0.5" />
                    <div>
                      <Label htmlFor="skip" className="font-medium cursor-pointer">Skip Existing</Label>
                      <p className="text-xs text-muted-foreground">
                        Hanya insert record dengan ID baru. Record yang sudah ada tidak diubah.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            )}

            {isImporting && (
              <div className="space-y-2">
                <Progress value={importProgress} />
                <p className="text-sm text-muted-foreground">Mengimport data...</p>
              </div>
            )}

            <Button 
              onClick={handleImport} 
              disabled={isImporting || !backupPreview}
              variant={importStrategy === 'replace' ? 'destructive' : 'default'}
              className="w-full sm:w-auto"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Data
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Important Notes */}
        <Card className="p-4 sm:p-6 border-amber-500/50 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-semibold text-amber-700 dark:text-amber-400">Catatan Penting</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Backup berisi <strong>SEMUA {ALL_TABLES.length} tabel</strong> beserta data di dalamnya</li>
                <li>File hanya berisi DATA, bukan struktur tabel</li>
                <li>Project tujuan harus punya struktur tabel yang sama</li>
                <li>Akun login (email/password) <strong>TIDAK</strong> di-backup</li>
                <li>File di Storage (gambar/dokumen) <strong>TIDAK</strong> di-backup</li>
                <li>Mode <strong>Replace</strong> akan HAPUS semua data existing!</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BackupRestore;
