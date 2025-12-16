import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Clock, 
  Check, 
  X, 
  User, 
  ArrowRight, 
  Loader2,
  FileEdit
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatRupiah } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface EditRequest {
  id: string;
  user_id: string;
  payment_id: string;
  contract_id: string;
  current_amount: number;
  current_payment_date: string;
  current_notes: string | null;
  new_amount: number;
  new_payment_date: string;
  new_notes: string | null;
  request_reason: string;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
  };
}

interface PendingEditRequestsProps {
  requests: EditRequest[];
  onApprove: (requestId: string) => Promise<void>;
  onReject: (requestId: string, reason: string) => Promise<void>;
  isLoading?: boolean;
}

export function PendingEditRequests({
  requests,
  onApprove,
  onReject,
  isLoading = false,
}: PendingEditRequestsProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingRequests = requests.filter(r => r.status === 'pending');

  if (pendingRequests.length === 0) {
    return null;
  }

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await onApprove(requestId);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectClick = (requestId: string) => {
    setSelectedRequestId(requestId);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedRequestId || !rejectionReason.trim()) return;
    
    setProcessingId(selectedRequestId);
    try {
      await onReject(selectedRequestId, rejectionReason.trim());
      setRejectDialogOpen(false);
      setSelectedRequestId(null);
      setRejectionReason("");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-amber-600">
            <Clock className="h-5 w-5" />
            Permintaan Edit Menunggu Approval
            <Badge variant="secondary" className="ml-2">
              {pendingRequests.length} pending
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingRequests.map((request) => (
            <div 
              key={request.id}
              className="rounded-lg border bg-background p-4 space-y-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Request dari:</span>
                  <span className="font-medium text-foreground">
                    {request.profiles?.full_name || 'Admin'}
                  </span>
                </div>
                <Badge variant="outline" className="text-amber-600 border-amber-500">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              </div>

              {/* Changes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {/* Amount Change */}
                <div className="space-y-1">
                  <p className="text-muted-foreground">Jumlah:</p>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-medium",
                      request.current_amount !== request.new_amount && "line-through text-muted-foreground"
                    )}>
                      {formatRupiah(request.current_amount)}
                    </span>
                    {request.current_amount !== request.new_amount && (
                      <>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium text-green-600">
                          {formatRupiah(request.new_amount)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Date Change */}
                <div className="space-y-1">
                  <p className="text-muted-foreground">Tanggal:</p>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-medium",
                      request.current_payment_date !== request.new_payment_date && "line-through text-muted-foreground"
                    )}>
                      {format(new Date(request.current_payment_date), "dd MMM yyyy", { locale: localeId })}
                    </span>
                    {request.current_payment_date !== request.new_payment_date && (
                      <>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium text-blue-600">
                          {format(new Date(request.new_payment_date), "dd MMM yyyy", { locale: localeId })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes Change */}
              {(request.current_notes !== request.new_notes) && (
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">Catatan:</p>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground line-through">
                      {request.current_notes || "(kosong)"}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">
                      {request.new_notes || "(kosong)"}
                    </span>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Alasan perubahan:</p>
                <p className="text-sm">{request.request_reason}</p>
              </div>

              {/* Timestamp */}
              <p className="text-xs text-muted-foreground">
                Diajukan: {format(new Date(request.created_at), "dd MMM yyyy HH:mm", { locale: localeId })}
              </p>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRejectClick(request.id)}
                  disabled={isLoading || processingId === request.id}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {processingId === request.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Tolak
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprove(request.id)}
                  disabled={isLoading || processingId === request.id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processingId === request.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Setujui
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tolak Permintaan Edit?</AlertDialogTitle>
            <AlertDialogDescription>
              Berikan alasan penolakan agar admin yang mengajukan dapat memahami.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Alasan penolakan..."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setRejectDialogOpen(false);
              setSelectedRequestId(null);
              setRejectionReason("");
            }}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim() || processingId !== null}
              className="bg-red-600 hover:bg-red-700"
            >
              {processingId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Tolak Permintaan"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
