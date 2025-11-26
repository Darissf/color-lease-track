import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowUpRight, ArrowDownRight, Repeat, PiggyBank, CreditCard, Receipt, Wallet } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

const quickActions = [
  { 
    id: 1, 
    title: "Tambah Pengeluaran Variabel", 
    icon: ArrowDownRight, 
    color: "gradient-secondary",
    description: "Catat pengeluaran tidak tetap"
  },
  { 
    id: 2, 
    title: "Tambah Transfer Uang", 
    icon: Repeat, 
    color: "gradient-primary",
    description: "Transfer antar rekening"
  },
  { 
    id: 3, 
    title: "Tambah Pemasukan", 
    icon: ArrowUpRight, 
    color: "gradient-success",
    description: "Catat pendapatan masuk"
  },
  { 
    id: 4, 
    title: "Tambah Pengeluaran Tetap", 
    icon: Receipt, 
    color: "gradient-secondary",
    description: "Catat pengeluaran rutin"
  },
  { 
    id: 5, 
    title: "Tambah Tabungan", 
    icon: PiggyBank, 
    color: "bg-gradient-to-br from-accent to-primary",
    description: "Simpan uang ke tabungan"
  },
  { 
    id: 6, 
    title: "Bayar Paket Langganan", 
    icon: CreditCard, 
    color: "bg-gradient-to-br from-warning to-secondary",
    description: "Bayar subscription bulanan"
  },
  { 
    id: 7, 
    title: "Bayar Hutang", 
    icon: Wallet, 
    color: "bg-gradient-to-br from-destructive to-secondary",
    description: "Catat pembayaran hutang"
  },
  { 
    id: 8, 
    title: "Bayar Cicilan", 
    icon: CreditCard, 
    color: "bg-gradient-to-br from-info to-primary",
    description: "Bayar cicilan bulanan"
  },
];

const QuickActions = () => {
  const { activeTheme } = useAppTheme();
  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Aksi Cepat Transaksi
        </h1>
        <p className="text-muted-foreground">Tambahkan transaksi dengan cepat dan mudah</p>
      </div>

      {/* Quick Action Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Card 
            key={action.id} 
            className={cn(
              "p-6 shadow-md card-hover cursor-pointer group",
              activeTheme === 'japanese' ? 'gradient-card border-0' : ''
            )}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={cn(
                "h-20 w-20 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-110",
                activeTheme === 'japanese' ? action.color : 'bg-primary'
              )}>
                <action.icon className="h-10 w-10 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-1">{action.title}</h3>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full border-primary/20 text-primary hover:bg-primary/10 group-hover:border-primary/40"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tambah
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Info Card */}
      <Card className={cn(
        "mt-8 p-6 shadow-md",
        activeTheme === 'japanese' ? 'gradient-card border-0' : ''
      )}>
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Tips Penggunaan</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Catat transaksi sesegera mungkin agar tidak lupa</li>
              <li>• Kategorikan pengeluaran dengan benar untuk analisis yang akurat</li>
              <li>• Gunakan fitur transfer untuk memindahkan dana antar rekening</li>
              <li>• Sisihkan tabungan setiap kali mendapat pemasukan</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default QuickActions;
