import { format, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Package, ExternalLink, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ContractRecord {
  id: string;
  invoice: string;
  client_name: string;
  quantity: number;
  start_date: string;
  end_date: string;
  status: string;
  location: string | null;
  returned_at: string | null;
}

interface ItemContractHistoryProps {
  contracts: ContractRecord[];
  loading?: boolean;
}

export function ItemContractHistory({ contracts, loading }: ItemContractHistoryProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Belum ada riwayat kontrak untuk barang ini</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string, returnedAt: string | null) => {
    const lowerStatus = status.toLowerCase();
    
    if (lowerStatus === "selesai" || returnedAt) {
      return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">Selesai</Badge>;
    }
    if (lowerStatus === "masa sewa" || lowerStatus === "aktif") {
      return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">Sedang Disewa</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="space-y-3">
      {contracts.map((contract) => {
        const duration = differenceInDays(
          new Date(contract.end_date),
          new Date(contract.start_date)
        ) + 1;

        return (
          <Card key={contract.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* Header */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-primary">
                      {contract.invoice}
                    </span>
                    {getStatusBadge(contract.status, contract.returned_at)}
                  </div>

                  {/* Client */}
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{contract.client_name}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">
                      {contract.quantity} unit
                    </span>
                  </div>

                  {/* Period */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(contract.start_date), "d MMM yyyy", { locale: localeId })}
                      {" → "}
                      {format(new Date(contract.end_date), "d MMM yyyy", { locale: localeId })}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {duration} hari
                    </Badge>
                  </div>

                  {/* Location */}
                  {contract.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate max-w-[300px]">{contract.location}</span>
                    </div>
                  )}

                  {/* Return date */}
                  {contract.returned_at && (
                    <p className="text-xs text-muted-foreground">
                      Dikembalikan: {format(new Date(contract.returned_at), "d MMM yyyy HH:mm", { locale: localeId })}
                    </p>
                  )}
                </div>

                {/* Action */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/vip/contracts/${contract.id}`)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
