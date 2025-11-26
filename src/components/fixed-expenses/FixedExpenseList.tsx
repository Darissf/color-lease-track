import { useState } from "react";
import { FixedExpense, FixedExpenseHistory } from "@/pages/FixedExpenses";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, CheckCircle, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControls } from "@/components/shared/PaginationControls";

interface FixedExpenseListProps {
  expenses: FixedExpense[];
  history: FixedExpenseHistory[];
  loading: boolean;
  onEdit: (expense: FixedExpense) => void;
  onDelete: (expenseId: string) => void;
  onMarkAsPaid: (expense: FixedExpense, amount: number) => void;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
}

export const FixedExpenseList = ({ 
  expenses, 
  history, 
  loading, 
  onEdit, 
  onDelete, 
  onMarkAsPaid,
  currentPage,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange
}: FixedExpenseListProps) => {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<FixedExpense | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const isPaid = (expenseId: string) => history.some(h => h.fixed_expense_id === expenseId && h.status === 'paid');
  
  const handlePayClick = (expense: FixedExpense) => {
    const amount = expense.expense_type === 'fixed' ? expense.fixed_amount || 0 : expense.estimated_amount || 0;
    
    if (expense.expense_type === 'variable') {
      setSelectedExpense(expense);
      setPaymentAmount(amount.toString());
      setPaymentDialogOpen(true);
    } else {
      onMarkAsPaid(expense, amount);
    }
  };

  const handleConfirmPayment = () => {
    if (selectedExpense && paymentAmount) {
      onMarkAsPaid(selectedExpense, parseFloat(paymentAmount));
      setPaymentDialogOpen(false);
      setSelectedExpense(null);
      setPaymentAmount("");
    }
  };
  
  const getStatus = (expense: FixedExpense) => {
    const today = new Date().getDate();
    const paid = isPaid(expense.id);
    
    if (paid) return { label: 'Sudah Dibayar', variant: 'default' as const };
    if (expense.due_date_day < today) return { label: 'Terlambat', variant: 'destructive' as const };
    if (expense.due_date_day === today) return { label: 'Jatuh Tempo Hari Ini', variant: 'secondary' as const };
    if (expense.due_date_day <= today + expense.reminder_days_before) return { label: 'Segera Jatuh Tempo', variant: 'outline' as const };
    return { label: 'Belum Jatuh Tempo', variant: 'outline' as const };
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (expenses.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Belum ada pengeluaran tetap</h3>
        <p className="text-muted-foreground">Tambahkan pengeluaran tetap untuk mulai melacak tagihan bulanan Anda</p>
      </Card>
    );
  }

  // Calculate pagination
  const totalPages = Math.ceil(expenses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedExpenses = expenses.slice(startIndex, startIndex + itemsPerPage);

  return (
    <>
      <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">No</TableHead>
            <TableHead>Nama Tagihan</TableHead>
            <TableHead>Keterangan</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Tipe</TableHead>
            <TableHead>Jumlah</TableHead>
            <TableHead>Jatuh Tempo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedExpenses.map((expense, index) => {
            const status = getStatus(expense);
            const paid = isPaid(expense.id);
            const amount = expense.expense_type === 'fixed' ? expense.fixed_amount || 0 : expense.estimated_amount || 0;

            return (
              <TableRow key={expense.id}>
                <TableCell className="text-center font-medium text-muted-foreground">
                  {startIndex + index + 1}
                </TableCell>
                <TableCell className="font-medium">{expense.expense_name}</TableCell>
                <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                  {expense.notes || '-'}
                </TableCell>
                <TableCell>{expense.category}</TableCell>
                <TableCell>
                  <Badge variant={expense.expense_type === 'fixed' ? 'default' : 'secondary'}>
                    {expense.expense_type === 'fixed' ? 'Tetap' : 'Variabel'}
                  </Badge>
                </TableCell>
                <TableCell className="font-bold">{formatCurrency(amount)}</TableCell>
                <TableCell>Tanggal {expense.due_date_day}</TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {!paid && (
                      <Button size="sm" variant="outline" onClick={() => handlePayClick(expense)}>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Bayar
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => onEdit(expense)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Pengeluaran</AlertDialogTitle>
                          <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus {expense.expense_name}?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(expense.id)}>Hapus</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={expenses.length}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        onItemsPerPageChange={onItemsPerPageChange}
        storageKey="fixedExpenses"
      />
    </Card>

    <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bayar {selectedExpense?.expense_name}</DialogTitle>
          <DialogDescription>
            Masukkan jumlah pembayaran aktual untuk pengeluaran variabel ini
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Estimasi: {formatCurrency(selectedExpense?.estimated_amount || 0)}</Label>
            <Input 
              type="number" 
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Masukkan jumlah pembayaran"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
            Batal
          </Button>
          <Button onClick={handleConfirmPayment}>
            Konfirmasi Pembayaran
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};
