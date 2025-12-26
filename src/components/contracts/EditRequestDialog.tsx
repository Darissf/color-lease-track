import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarIcon, FileEdit, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/currency";
import { Separator } from "@/components/ui/separator";

interface EditRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: {
    id: string;
    payment_date: string;
    amount: number;
    payment_number: number;
    notes: string | null;
  } | null;
  onSubmit: (data: {
    new_amount: number;
    new_payment_date: string;
    new_notes: string;
    request_reason: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function EditRequestDialog({
  open,
  onOpenChange,
  payment,
  onSubmit,
  isLoading = false,
}: EditRequestDialogProps) {
  const [newAmount, setNewAmount] = useState("");
  const [newPaymentDate, setNewPaymentDate] = useState<Date | undefined>();
  const [newNotes, setNewNotes] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (payment) {
      setNewAmount(payment.amount.toString());
      setNewPaymentDate(payment.payment_date ? new Date(payment.payment_date) : undefined);
      setNewNotes(payment.notes || "");
      setRequestReason("");
    }
  }, [payment]);

  const handleSubmit = async () => {
    if (!newPaymentDate || !newAmount || !requestReason.trim()) return;
    
    await onSubmit({
      new_amount: parseFloat(newAmount),
      new_payment_date: format(newPaymentDate, "yyyy-MM-dd"),
      new_notes: newNotes,
      request_reason: requestReason.trim(),
    });
  };

  const formatInputValue = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    return numericValue;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            Ajukan Perubahan Pembayaran {payment?.payment_number}
          </DialogTitle>
          <DialogDescription>
            Perubahan memerlukan approval dari Super Admin
          </DialogDescription>
        </DialogHeader>

        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            Request ini akan dikirim ke Super Admin untuk di-review
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-2">
          {/* Current Values */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Nilai Saat Ini:</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Tanggal:</span>
                <span className="ml-2 font-medium">
                  {payment?.payment_date 
                    ? format(new Date(payment.payment_date), "dd MMM yyyy", { locale: localeId })
                    : "-"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Jumlah:</span>
                <span className="ml-2 font-medium text-green-600">
                  {formatRupiah(payment?.amount || 0)}
                </span>
              </div>
            </div>
            {payment?.notes && (
              <div className="text-sm">
                <span className="text-muted-foreground">Catatan:</span>
                <span className="ml-2">{payment.notes}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* New Values */}
          <div className="space-y-4">
            <p className="text-sm font-medium">Nilai Baru yang Diajukan:</p>

            <div className="space-y-2">
              <Label htmlFor="new-payment-date">Tanggal Baru</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="new-payment-date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newPaymentDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newPaymentDate ? (
                      format(newPaymentDate, "dd MMMM yyyy", { locale: localeId })
                    ) : (
                      <span>Pilih tanggal</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newPaymentDate}
                    onSelect={(date) => {
                      setNewPaymentDate(date);
                      setCalendarOpen(false);
                    }}
                    initialFocus
                    locale={localeId}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-amount">Jumlah Baru</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  Rp
                </span>
                <Input
                  id="new-amount"
                  type="text"
                  value={newAmount ? parseInt(newAmount).toLocaleString("id-ID") : ""}
                  onChange={(e) => setNewAmount(formatInputValue(e.target.value))}
                  className="pl-10"
                  placeholder="0"
                />
              </div>
              {newAmount && (
                <p className="text-xs text-muted-foreground">
                  = {formatRupiah(parseFloat(newAmount) || 0)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-notes">Catatan Baru (Opsional)</Label>
              <Textarea
                id="new-notes"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Tambahkan catatan..."
                rows={2}
              />
            </div>
          </div>

          <Separator />

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="request-reason" className="text-red-500">
              Alasan Perubahan *
            </Label>
            <Textarea
              id="request-reason"
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              placeholder="Jelaskan alasan mengapa data ini perlu diubah..."
              rows={3}
              required
            />
            <p className="text-xs text-muted-foreground">
              Wajib diisi. Jelaskan dengan detail agar mudah di-approve.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !newAmount || !newPaymentDate || !requestReason.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mengirim...
              </>
            ) : (
              "Ajukan Perubahan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
