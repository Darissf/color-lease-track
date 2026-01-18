import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { generateRincianTemplate, TemplateData, LineItem } from "@/lib/contractTemplateGenerator";
import { 
  ArrowLeft, 
  RefreshCw, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  FileText,
  Clock,
  Loader2,
  Eye,
  EyeOff
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ContractForSync {
  id: string;
  invoice: string;
  status: string;
  rincian_template: string | null;
  start_date: string | null;
  end_date: string | null;
  transport_cost_delivery: number;
  transport_cost_pickup: number;
  discount: number;
  default_price_per_day: number | null;
  default_price_mode: string | null;
  whatsapp_template_mode: boolean;
  keterangan: string | null;
  client_groups: { nama: string } | null;
  line_items?: LineItem[];
}

interface SyncResult {
  id: string;
  invoice: string;
  success: boolean;
  error?: string;
}

const SyncContractDetails = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSuperAdmin, user } = useAuth();
  
  const [contracts, setContracts] = useState<ContractForSync[]>([]);
  const [selectedContracts, setSelectedContracts] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [previewContract, setPreviewContract] = useState<ContractForSync | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [newTemplatePreview, setNewTemplatePreview] = useState<string>("");

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/");
      return;
    }
    fetchContracts();
  }, [isSuperAdmin]);

  const fetchContracts = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch all contracts with client info
      const { data: contractsData, error: contractsError } = await supabase
        .from('rental_contracts')
        .select(`
          id,
          invoice,
          status,
          rincian_template,
          start_date,
          end_date,
          transport_cost_delivery,
          transport_cost_pickup,
          discount,
          default_price_per_day,
          default_price_mode,
          whatsapp_template_mode,
          keterangan,
          client_groups (nama)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (contractsError) throw contractsError;

      // Fetch line items for all contracts
      const { data: lineItemsData, error: lineItemsError } = await supabase
        .from('contract_line_items')
        .select('*')
        .eq('user_id', user.id);

      if (lineItemsError) throw lineItemsError;

      // Map line items to contracts
      const contractsWithItems = (contractsData || []).map(contract => ({
        ...contract,
        line_items: (lineItemsData || [])
          .filter(item => item.contract_id === contract.id)
          .map(item => ({
            id: item.id,
            item_name: item.item_name,
            quantity: item.quantity,
            unit_price_per_day: item.unit_price_per_day,
            duration_days: item.duration_days,
            subtotal: item.subtotal,
            unit_mode: item.unit_mode as 'pcs' | 'set' | undefined,
            pcs_per_set: item.pcs_per_set,
          })),
      }));

      setContracts(contractsWithItems);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data kontrak",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContracts = contracts.filter(contract => {
    if (statusFilter === "all") return true;
    return contract.status?.toLowerCase() === statusFilter.toLowerCase();
  });

  const toggleSelectAll = () => {
    if (selectedContracts.size === filteredContracts.length) {
      setSelectedContracts(new Set());
    } else {
      setSelectedContracts(new Set(filteredContracts.map(c => c.id)));
    }
  };

  const toggleContract = (id: string) => {
    const newSelected = new Set(selectedContracts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedContracts(newSelected);
  };

  const generateNewTemplate = (contract: ContractForSync): string => {
    if (!contract.line_items || contract.line_items.length === 0) {
      return '';
    }

    const templateData: TemplateData = {
      lineItems: contract.line_items,
      transportDelivery: contract.transport_cost_delivery || 0,
      transportPickup: contract.transport_cost_pickup || 0,
      contractTitle: contract.keterangan || undefined,
      discount: contract.discount || 0,
      startDate: contract.start_date || undefined,
      endDate: contract.end_date || undefined,
      priceMode: (contract.default_price_mode as 'pcs' | 'set') || 'pcs',
      pricePerUnit: contract.default_price_per_day || undefined,
    };

    return generateRincianTemplate(templateData, contract.whatsapp_template_mode);
  };

  const handlePreview = (contract: ContractForSync) => {
    setPreviewContract(contract);
    const newTemplate = generateNewTemplate(contract);
    setNewTemplatePreview(newTemplate);
    setShowPreview(true);
  };

  const startSync = async () => {
    setShowConfirmDialog(false);
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncResults([]);

    const contractsToSync = filteredContracts.filter(c => selectedContracts.has(c.id));
    const total = contractsToSync.length;
    const results: SyncResult[] = [];

    for (let i = 0; i < contractsToSync.length; i++) {
      const contract = contractsToSync[i];
      
      try {
        const newTemplate = generateNewTemplate(contract);
        
        if (newTemplate) {
          const { error } = await supabase
            .from('rental_contracts')
            .update({ rincian_template: newTemplate })
            .eq('id', contract.id);

          if (error) throw error;

          results.push({
            id: contract.id,
            invoice: contract.invoice,
            success: true,
          });
        } else {
          results.push({
            id: contract.id,
            invoice: contract.invoice,
            success: false,
            error: 'Tidak ada line items',
          });
        }
      } catch (error) {
        results.push({
          id: contract.id,
          invoice: contract.invoice,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      setSyncProgress(((i + 1) / total) * 100);
      setSyncResults([...results]);
    }

    setIsSyncing(false);
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    toast({
      title: "Sinkronisasi Selesai",
      description: `${successCount} berhasil, ${failCount} gagal`,
      variant: failCount > 0 ? "destructive" : "default",
    });

    // Refresh data
    fetchContracts();
  };

  const contractsWithLineItems = filteredContracts.filter(c => c.line_items && c.line_items.length > 0);
  const contractsWithoutLineItems = filteredContracts.filter(c => !c.line_items || c.line_items.length === 0);

  if (!isSuperAdmin) return null;

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
              Sinkron Detail Kontrak
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Update format rincian template secara massal untuk semua kontrak
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total Kontrak</p>
                <p className="text-xl font-bold">{contracts.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Punya Line Items</p>
                <p className="text-xl font-bold">{contractsWithLineItems.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Tanpa Line Items</p>
                <p className="text-xl font-bold">{contractsWithoutLineItems.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Dipilih</p>
                <p className="text-xl font-bold">{selectedContracts.size}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filter & Actions */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="masa sewa">Masa Sewa</SelectItem>
                  <SelectItem value="selesai">Selesai</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={toggleSelectAll}
              >
                {selectedContracts.size === filteredContracts.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
              </Button>
            </div>
            
            <Button 
              onClick={() => setShowConfirmDialog(true)}
              disabled={selectedContracts.size === 0 || isSyncing}
              className="gap-2"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sinkronisasi...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Jalankan Sinkronisasi ({selectedContracts.size})
                </>
              )}
            </Button>
          </div>

          {/* Progress Bar */}
          {isSyncing && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(syncProgress)}%</span>
              </div>
              <Progress value={syncProgress} className="h-2" />
            </div>
          )}
        </Card>

        {/* Sync Results */}
        {syncResults.length > 0 && !isSyncing && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Hasil Sinkronisasi</h3>
            <div className="grid gap-2 max-h-[200px] overflow-y-auto">
              {syncResults.map((result) => (
                <div key={result.id} className="flex items-center gap-2 text-sm">
                  {result.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  <span className="truncate">{result.invoice}</span>
                  {result.error && (
                    <span className="text-red-500 text-xs truncate">({result.error})</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Contract List */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Daftar Kontrak ({filteredContracts.length})</h3>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredContracts.map((contract) => (
                  <div 
                    key={contract.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedContracts.has(contract.id)}
                      onCheckedChange={() => toggleContract(contract.id)}
                      disabled={isSyncing}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{contract.invoice}</span>
                        <Badge variant={contract.status === 'masa sewa' ? 'default' : 'secondary'} className="text-xs">
                          {contract.status}
                        </Badge>
                        {(!contract.line_items || contract.line_items.length === 0) && (
                          <Badge variant="outline" className="text-xs text-yellow-600">
                            Tanpa Items
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{contract.client_groups?.nama || '-'}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePreview(contract)}
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </Card>
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Sinkronisasi</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan meng-update rincian template untuk <strong>{selectedContracts.size}</strong> kontrak.
              Template lama akan diganti dengan format baru.
              <br /><br />
              Proses ini tidak dapat dibatalkan. Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={startSync}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Ya, Sinkronkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <AlertDialog open={showPreview} onOpenChange={setShowPreview}>
        <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle>Preview Template: {previewContract?.invoice}</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto flex-1">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <EyeOff className="h-4 w-4" />
                Format Lama
              </h4>
              <pre className="text-xs bg-muted p-3 rounded-lg whitespace-pre-wrap overflow-auto max-h-[300px]">
                {previewContract?.rincian_template || '(Kosong)'}
              </pre>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Format Baru
              </h4>
              <pre className="text-xs bg-muted p-3 rounded-lg whitespace-pre-wrap overflow-auto max-h-[300px]">
                {newTemplatePreview || '(Tidak ada line items)'}
              </pre>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Tutup</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SyncContractDetails;
