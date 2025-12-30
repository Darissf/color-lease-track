import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, FileSignature, ChevronRight, Stamp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ReceiptSettings = () => {
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
      icon: FileSignature,
      title: "TTD Digital & Stempel",
      description: "Upload tanda tangan untuk kwitansi",
      color: "bg-emerald-600",
      href: "/vip/settings/invoice/signature",
    },
    {
      icon: FileText,
      title: "Template Kwitansi",
      description: "Custom template design untuk kwitansi",
      color: "bg-blue-600",
      href: "/vip/settings/receipt/template",
    },
    {
      icon: Stamp,
      title: "Custom Stempel LUNAS",
      description: "Kustomisasi stempel LUNAS",
      color: "bg-rose-600",
      href: "/vip/settings/custom-stamp",
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
              Setting Kwitansi
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Kelola template kwitansi, stempel LUNAS, dan pengaturan lainnya
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
              className="p-3 sm:p-4 transition-all border-2 relative cursor-pointer hover:shadow-lg group hover:border-primary"
              onClick={() => {
                if (card.href) {
                  navigate(card.href);
                }
              }}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg ${card.color} flex items-center justify-center shrink-0`}>
                  <card.icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {card.description}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReceiptSettings;
