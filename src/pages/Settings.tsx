import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Book, Settings as SettingsIcon, Wallet, PiggyBank, ChevronRight, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

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

  const settingsMenu = [
    {
      title: "Akun Rekening",
      description: "Kelola rekening bank dan metode pembayaran",
      icon: Wallet,
      path: "/settings/accounts",
      color: "text-blue-500"
    },
    {
      title: "Pengaturan Tabungan",
      description: "Konfigurasi target dan alokasi tabungan",
      icon: PiggyBank,
      path: "/settings/savings",
      color: "text-purple-500"
    },
    {
      title: "WhatsApp Settings",
      description: "Konfigurasi notifikasi WhatsApp otomatis",
      icon: MessageSquare,
      path: "/settings/whatsapp",
      color: "text-green-500",
      adminOnly: true
    }
  ];

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Mulai di sini! Pengaturan
        </h1>
        <p className="text-muted-foreground">Konfigurasikan akun dan preferensi keuangan Anda</p>
      </div>

      {/* Settings Menu */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Pengaturan Akun</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {settingsMenu.map((item) => {
            // Skip admin-only items if not super admin
            if (item.adminOnly && !isSuperAdmin) return null;
            
            return (
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
            );
          })}
        </div>
      </div>

      {/* Learning Section */}
      <Card className="p-6 gradient-card border-0 shadow-md mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-lg gradient-primary flex items-center justify-center">
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

        <Button className="w-full mt-6 gradient-primary text-white border-0 shadow-lg hover:shadow-xl transition-all">
          <Book className="mr-2 h-4 w-4" />
          Lihat Semua Tutorial
        </Button>
      </Card>

      {/* Welcome Card */}
      <Card className="p-6 gradient-card border-0 shadow-md">
        <div className="text-center space-y-4">
          <div className="inline-flex h-20 w-20 rounded-full gradient-success items-center justify-center shadow-lg mx-auto">
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
  );
};

export default Settings;
