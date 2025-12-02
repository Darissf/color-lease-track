import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileSpreadsheet, FileText, File } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import type { Transaction, TransactionStats } from "@/pages/TransactionHistory";

interface TransactionExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: Transaction[];
  stats: TransactionStats;
  period: string;
  selectedYear: number;
  selectedMonth: number;
}

export function TransactionExport({
  open,
  onOpenChange,
  transactions,
  stats,
  period,
  selectedYear,
  selectedMonth,
}: TransactionExportProps) {
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeTransactions, setIncludeTransactions] = useState(true);
  const [exporting, setExporting] = useState(false);

  const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const getPeriodLabel = () => {
    if (period === 'month') {
      return `${MONTHS[selectedMonth - 1]} ${selectedYear}`;
    } else if (period === 'year') {
      return `Tahun ${selectedYear}`;
    }
    return 'All Time';
  };

  const handleExport = async () => {
    setExporting(true);
    
    try {
      const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
      const filename = `transaksi_${period}_${timestamp}`;

      if (exportFormat === 'csv') {
        let csvContent = '';
        
        // Add summary section
        if (includeSummary) {
          csvContent += 'RINGKASAN TRANSAKSI\n';
          csvContent += `Periode,${getPeriodLabel()}\n`;
          csvContent += `Total Transaksi,${stats.transactionCount}\n`;
          csvContent += `Total Pemasukan,"${formatCurrency(stats.totalIncome)}"\n`;
          csvContent += `Total Pengeluaran,"${formatCurrency(stats.totalExpense)}"\n`;
          csvContent += `Saldo Bersih,"${formatCurrency(stats.netBalance)}"\n`;
          csvContent += `Savings Rate,${stats.savingsRate.toFixed(1)}%\n`;
          csvContent += '\n';
        }

        // Add transactions section
        if (includeTransactions) {
          csvContent += 'DETAIL TRANSAKSI\n';
          csvContent += 'No,Tanggal,Tipe,Sumber/Kategori,Keterangan,Nominal\n';
          
          transactions.forEach((t, index) => {
            const date = t.date ? format(parseISO(t.date), 'd MMM yyyy', { locale: id }) : '-';
            const type = t.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
            const category = t.type === 'income' ? (t.source || 'Lainnya') : t.category;
            const description = t.description?.replace(/"/g, '""') || '-';
            const amount = t.type === 'income' ? t.amount : -t.amount;
            
            csvContent += `${index + 1},"${date}","${type}","${category}","${description}","${formatCurrency(amount)}"\n`;
          });
        }

        // Download CSV
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
      } else {
        // JSON Export
        const exportData: any = {};
        
        if (includeSummary) {
          exportData.summary = {
            periode: getPeriodLabel(),
            totalTransaksi: stats.transactionCount,
            totalPemasukan: stats.totalIncome,
            totalPengeluaran: stats.totalExpense,
            saldoBersih: stats.netBalance,
            savingsRate: stats.savingsRate,
          };
        }

        if (includeTransactions) {
          exportData.transactions = transactions.map((t, index) => ({
            no: index + 1,
            tanggal: t.date,
            tipe: t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
            kategori: t.type === 'income' ? (t.source || 'Lainnya') : t.category,
            keterangan: t.description || '-',
            nominal: t.amount,
          }));
        }

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
      }

      toast.success('Export berhasil!', {
        description: `File ${filename}.${exportFormat} telah diunduh`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal mengekspor data');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Riwayat Transaksi
          </DialogTitle>
          <DialogDescription>
            Pilih format dan data yang ingin diekspor
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Format File</Label>
            <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as 'csv' | 'json')}>
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer flex-1">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="font-medium">CSV (.csv)</div>
                    <div className="text-xs text-muted-foreground">Untuk Excel/Google Sheets</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="flex items-center gap-2 cursor-pointer flex-1">
                  <File className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-medium">JSON (.json)</div>
                    <div className="text-xs text-muted-foreground">Untuk pengolahan data/backup</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Data to Include */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Data yang Disertakan</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includeSummary" 
                  checked={includeSummary}
                  onCheckedChange={(checked) => setIncludeSummary(checked as boolean)}
                />
                <Label htmlFor="includeSummary" className="text-sm cursor-pointer">
                  Ringkasan (Total, Savings Rate, dll)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includeTransactions" 
                  checked={includeTransactions}
                  onCheckedChange={(checked) => setIncludeTransactions(checked as boolean)}
                />
                <Label htmlFor="includeTransactions" className="text-sm cursor-pointer">
                  Detail Transaksi ({transactions.length} transaksi)
                </Label>
              </div>
            </div>
          </div>

          {/* Period Info */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="text-sm text-muted-foreground">Periode Export</div>
            <div className="font-medium">{getPeriodLabel()}</div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={exporting || (!includeSummary && !includeTransactions)}
          >
            {exporting ? (
              <>Mengekspor...</>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
