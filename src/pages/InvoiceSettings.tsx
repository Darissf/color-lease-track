import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, FileImage, Hash, Palette, ScrollText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const InvoiceSettings = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/");
      return;
    }
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return null;
  }

  const settingsCards = [
    {
      icon: FileText,
      title: "Template Invoice",
      description: "Custom template design untuk invoice",
      color: "bg-blue-600",
      comingSoon: true,
    },
    {
      icon: FileImage,
      title: "Format PDF",
      description: "Ukuran kertas, margin, orientasi",
      color: "bg-purple-600",
      comingSoon: true,
    },
    {
      icon: Hash,
      title: "Nomor Invoice",
      description: "Format auto-generate nomor invoice",
      color: "bg-emerald-600",
      comingSoon: true,
    },
    {
      icon: Palette,
      title: "Logo & Branding",
      description: "Header invoice, logo perusahaan",
      color: "bg-orange-600",
      comingSoon: true,
    },
    {
      icon: ScrollText,
      title: "Footer & Terms",
      description: "Syarat & ketentuan, catatan kaki",
      color: "bg-indigo-600",
      comingSoon: true,
    },
  ];

  return (
    <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col">
      {/* Header - Fixed */}
      <div className="shrink-0 px-3 py-3 sm:px-4 sm:py-4 md:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/vip/settings/admin")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 w-full min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent break-words">
              Setting Invoice
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Kelola template invoice, format PDF, dan pengaturan lainnya
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-4">
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {settingsCards.map((card, index) => (
            <Card
              key={index}
              className="p-3 sm:p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary relative"
            >
              {card.comingSoon && (
                <div className="absolute top-2 right-2 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                  Coming Soon
                </div>
              )}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg ${card.color} flex items-center justify-center shrink-0`}>
                  <card.icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                    {card.title}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {card.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InvoiceSettings;
