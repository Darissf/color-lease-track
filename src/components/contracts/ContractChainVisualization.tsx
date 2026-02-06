import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Link2, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/currency";
import { format, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ContractInChain {
  id: string;
  invoice: string | null;
  start_date: string;
  end_date: string;
  status: string;
  tagihan: number;
  tagihan_belum_bayar: number;
  is_flexible_duration: boolean;
  extension_number: number;
  parent_contract_id: string | null;
}

interface ContractChainVisualizationProps {
  contractId: string;
  currentContractId: string;
}

export function ContractChainVisualization({ 
  contractId, 
  currentContractId 
}: ContractChainVisualizationProps) {
  const navigate = useNavigate();
  const [chain, setChain] = useState<ContractInChain[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchContractChain();
  }, [contractId]);

  const fetchContractChain = async () => {
    setLoading(true);
    try {
      // First, find the root contract by walking up the parent chain
      let currentId = contractId;
      let rootContract: ContractInChain | null = null;

      // Walk up to find root
      while (currentId) {
        const { data: contract } = await supabase
          .from('rental_contracts')
          .select('id, invoice, start_date, end_date, status, tagihan, tagihan_belum_bayar, is_flexible_duration, extension_number, parent_contract_id')
          .eq('id', currentId)
          .single();

        if (!contract) break;

        rootContract = contract as unknown as ContractInChain;
        
        if (!contract.parent_contract_id) {
          break; // Found root
        }
        currentId = contract.parent_contract_id;
      }

      if (!rootContract) {
        setChain([]);
        setLoading(false);
        return;
      }

      // Now walk down from root to collect all contracts in chain
      const chainContracts: ContractInChain[] = [rootContract];
      let lastId = rootContract.id;

      while (true) {
        const { data: childContract } = await supabase
          .from('rental_contracts')
          .select('id, invoice, start_date, end_date, status, tagihan, tagihan_belum_bayar, is_flexible_duration, extension_number, parent_contract_id')
          .eq('parent_contract_id', lastId)
          .single();

        if (!childContract) break;

        chainContracts.push(childContract as unknown as ContractInChain);
        lastId = childContract.id;
      }

      setChain(chainContracts);
    } catch (error) {
      console.error("Error fetching contract chain:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Skeleton className="h-16 w-32" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-16 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show if there's only one contract (no extensions)
  if (chain.length <= 1) {
    return null;
  }

  const totalDuration = chain.reduce((total, c) => {
    const days = differenceInDays(new Date(c.end_date), new Date(c.start_date));
    return total + days;
  }, 0);

  const totalValue = chain.reduce((total, c) => total + (c.tagihan || 0), 0);
  const hasOngoing = chain.some(c => c.status === 'masa sewa');

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Riwayat Kontrak ({chain.length} kontrak)
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Summary */}
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Durasi:</span>{" "}
            <span className="font-medium">{totalDuration} hari{hasOngoing && "+"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Value:</span>{" "}
            <span className="font-medium">{formatRupiah(totalValue)}{hasOngoing && "+"}</span>
          </div>
        </div>

        {/* Chain visualization */}
        {isExpanded && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {chain.map((contract, index) => {
              const isCurrent = contract.id === currentContractId;
              const duration = differenceInDays(new Date(contract.end_date), new Date(contract.start_date));
              
              return (
                <div key={contract.id} className="flex items-center gap-2">
                  <button
                    onClick={() => !isCurrent && navigate(`/vip/contracts/${contract.id}`)}
                    disabled={isCurrent}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-all min-w-[140px]",
                      isCurrent 
                        ? "border-primary bg-primary/5 cursor-default" 
                        : "hover:border-primary/50 hover:bg-muted/50 cursor-pointer"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-medium">
                        {contract.invoice || `#${index + 1}`}
                      </span>
                      {isCurrent && (
                        <Badge variant="outline" className="text-[10px] h-4">Ini</Badge>
                      )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {contract.is_flexible_duration ? (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Clock className="h-3 w-3" />
                          Fleksibel
                        </span>
                      ) : (
                        <span>{duration} hari</span>
                      )}
                    </div>
                    
                    <div className="text-xs mt-1">
                      {contract.is_flexible_duration && contract.status === 'masa sewa' ? (
                        <span className="text-muted-foreground">Belum dihitung</span>
                      ) : (
                        <span className="font-medium">{formatRupiah(contract.tagihan)}</span>
                      )}
                    </div>
                    
                    <Badge 
                      variant={contract.status === 'masa sewa' ? 'default' : 'secondary'}
                      className="mt-1 text-[10px] h-4"
                    >
                      {contract.status === 'masa sewa' ? 'Aktif' : 'Selesai'}
                    </Badge>
                  </button>
                  
                  {index < chain.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!isExpanded && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {chain.map((contract, index) => {
              const isCurrent = contract.id === currentContractId;
              
              return (
                <span key={contract.id} className="flex items-center gap-1">
                  {isCurrent ? (
                    <span className="font-mono text-primary font-medium">
                      {contract.invoice || `#${index + 1}`}
                    </span>
                  ) : (
                    <button
                      onClick={() => navigate(`/vip/contracts/${contract.id}`)}
                      className="font-mono text-blue-600 underline hover:text-blue-800 cursor-pointer"
                    >
                      {contract.invoice || `#${index + 1}`}
                    </button>
                  )}
                  {isCurrent && (
                    <Badge variant="outline" className="text-[10px] h-4">Ini</Badge>
                  )}
                  {index < chain.length - 1 && (
                    <ArrowRight className="h-3 w-3 mx-1" />
                  )}
                </span>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
