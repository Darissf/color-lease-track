import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FileText, Calendar, PiggyBank, TrendingUp } from "lucide-react";
import { EditableText } from "@/components/EditableText";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <EditableText 
          contentKey="home.title"
          defaultValue="Selamat Datang di Financial Planner"
          as="h1"
          category="heading"
          className="text-4xl md:text-5xl font-bold text-foreground"
        />
        <EditableText
          contentKey="home.subtitle"
          defaultValue="Metode Kakeibo untuk Perencanaan Keuangan yang Lebih Baik"
          as="p"
          category="heading"
          className="text-lg text-muted-foreground"
        />
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
              <EditableText
                contentKey="home.card.nabila.title"
                defaultValue="Nabila Financial Planner"
                as="h3"
                category="card-title"
                className="text-xl font-semibold mb-2"
              />
              <EditableText
                contentKey="home.card.nabila.description"
                defaultValue="Akses halaman utama financial planner dengan metode Kakeibo"
                as="p"
                category="card-description"
                className="text-muted-foreground mb-4"
              />
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
        <EditableText
          contentKey="home.info.title"
          defaultValue="Tentang Metode Kakeibo"
          as="h2"
          category="section-title"
          className="text-2xl font-semibold mb-4"
        />
        <EditableText
          contentKey="home.info.description"
          defaultValue="Kakeibo adalah metode pencatatan keuangan tradisional Jepang yang membantu Anda mengelola uang dengan lebih bijak. Dengan mencatat setiap pemasukan dan pengeluaran, Anda dapat mengidentifikasi pola pengeluaran dan membuat keputusan finansial yang lebih baik."
          as="p"
          category="section-description"
          className="text-muted-foreground leading-relaxed"
        />
      </Card>
    </div>
  );
};

export default Index;
