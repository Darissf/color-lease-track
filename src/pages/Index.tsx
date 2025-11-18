import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FileText, Calendar, PiggyBank, TrendingUp } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground">
          Selamat Datang di Financial Planner
        </h1>
        <p className="text-lg text-muted-foreground">
          Metode Kakeibo untuk Perencanaan Keuangan yang Lebih Baik
        </p>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card 
          className="p-8 hover:shadow-lg transition-all cursor-pointer group"
          onClick={() => navigate("/nabila")}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">Nabila Financial Planner</h3>
              <p className="text-muted-foreground mb-4">
                Akses halaman utama financial planner dengan metode Kakeibo
              </p>
              <Button variant="ghost" className="px-0 hover:bg-transparent hover:text-primary">
                Buka Halaman →
              </Button>
            </div>
          </div>
        </Card>

        <Card 
          className="p-8 hover:shadow-lg transition-all cursor-pointer group"
          onClick={() => navigate("/dashboard")}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
              <TrendingUp className="h-8 w-8 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">Dashboard</h3>
              <p className="text-muted-foreground mb-4">
                Lihat ringkasan keuangan dan statistik bulanan Anda
              </p>
              <Button variant="ghost" className="px-0 hover:bg-transparent hover:text-accent">
                Lihat Dashboard →
              </Button>
            </div>
          </div>
        </Card>

        <Card 
          className="p-8 hover:shadow-lg transition-all cursor-pointer group"
          onClick={() => navigate("/savings")}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <PiggyBank className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">Savings Plans v.1.01</h3>
              <p className="text-muted-foreground mb-4">
                Kelola rencana tabungan dan target keuangan Anda
              </p>
              <Button variant="ghost" className="px-0 hover:bg-transparent hover:text-primary">
                Kelola Tabungan →
              </Button>
            </div>
          </div>
        </Card>

        <Card 
          className="p-8 hover:shadow-lg transition-all cursor-pointer group"
          onClick={() => navigate("/monthly-budget")}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
              <Calendar className="h-8 w-8 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">Monthly Budget</h3>
              <p className="text-muted-foreground mb-4">
                Buat dan pantau anggaran bulanan Anda
              </p>
              <Button variant="ghost" className="px-0 hover:bg-transparent hover:text-accent">
                Lihat Anggaran →
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Info Section */}
      <Card className="p-8 bg-gradient-to-br from-primary/5 to-accent/5">
        <h2 className="text-2xl font-semibold mb-4">
          Tentang Metode Kakeibo
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Kakeibo adalah metode pencatatan keuangan tradisional Jepang yang membantu Anda mengelola uang dengan lebih bijak. Dengan mencatat setiap pemasukan dan pengeluaran, Anda dapat mengidentifikasi pola pengeluaran dan membuat keputusan finansial yang lebih baik.
        </p>
      </Card>
    </div>
  );
};

export default Index;
