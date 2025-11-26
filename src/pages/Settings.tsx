import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Book, Settings as SettingsIcon, Wallet, PiggyBank, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

const learningResources = [
  {
    id: 1,
    title: "Metode Kakeibo",
    description: "Pelajari teknik budgeting Jepang untuk mengatur keuangan dengan bijak"
  },
  {
    id: 2,
    title: "Cara Mencatat Keuangan",
    description: "Panduan lengkap mencatat transaksi harian dan bulanan"
  },
  {
    id: 3,
    title: "Tips Menabung Efektif",
    description: "Strategi menabung yang terbukti efektif untuk mencapai tujuan finansial"
  },
];

const Settings = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const { activeTheme } = useAppTheme();

  const settingsMenu = [
    {
      title: "Akun Rekening",
      description: "Kelola rekening bank dan metode pembayaran",
      icon: Wallet,
      path: "/vip/settings/accounts",
      color: "text-blue-500"
    },
    {
      title: "Pengaturan Tabungan",
      description: "Konfigurasi target dan alokasi tabungan",
      icon: PiggyBank,
      path: "/vip/settings/savings",
      color: "text-purple-500"
    }
  ];

  return (
    <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-2 py-2 md:px-8 md:py-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Mulai di sini! Pengaturan
        </h1>
        <p className="text-muted-foreground">Konfigurasikan akun dan preferensi keuangan Anda</p>
      </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-2 md:px-8 pb-4 space-y-8">
      {/* Settings Menu */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Pengaturan Akun</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {settingsMenu.map((item) => (
            <Card 
              key={item.path}
              className="p-6 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
              onClick={() => navigate(item.path)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`h-12 w-12 rounded-lg bg-muted flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <item.icon className={`h-6 w-6 ${item.color}`} />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {item.description}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Learning Section */}
      <Card className={cn(
        "p-6 border-0 shadow-md mb-8",
        activeTheme === 'japanese' ? "gradient-card" : "bg-card border border-border"
      )}>
        <div className="flex items-center gap-3 mb-6">
          <div className={cn(
            "h-12 w-12 rounded-lg flex items-center justify-center",
            activeTheme === 'japanese' ? "gradient-primary" : "bg-primary"
          )}>
            <Book className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Pembelajaran</h2>
            <p className="text-sm text-muted-foreground">Tingkatkan literasi keuangan Anda</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {learningResources.map((resource) => (
            <div 
              key={resource.id}
              className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
            >
              <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                {resource.title}
              </h3>
              <p className="text-sm text-muted-foreground">{resource.description}</p>
            </div>
          ))}
        </div>

        <Button className={cn(
          "w-full mt-6 text-white border-0 shadow-lg hover:shadow-xl transition-all",
          activeTheme === 'japanese' ? "gradient-primary" : "bg-primary hover:bg-primary/90"
        )}>
          <Book className="mr-2 h-4 w-4" />
          Lihat Semua Tutorial
        </Button>
      </Card>

      {/* Welcome Card */}
      <Card className={cn(
        "p-6 border-0 shadow-md",
        activeTheme === 'japanese' ? "gradient-card" : "bg-card border border-border"
      )}>
        <div className="text-center space-y-4">
          <div className={cn(
            "inline-flex h-20 w-20 rounded-full items-center justify-center shadow-lg mx-auto",
            activeTheme === 'japanese' ? "gradient-success" : "bg-emerald-600"
          )}>
            <SettingsIcon className="h-10 w-10 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground mb-2">Selamat Datang di Financial Tracker!</h3>
            <p className="text-muted-foreground">
              Mulai dengan mengatur akun rekening dan sumber pemasukan Anda. 
              Kemudian lanjutkan dengan mencatat transaksi harian untuk mendapatkan gambaran keuangan yang jelas.
            </p>
          </div>
        </div>
      </Card>
      </div>
    </div>
  );
};

export default Settings;
