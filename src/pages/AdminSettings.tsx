import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, MessageSquare, ChevronRight, FileText, Mail, BarChart3, Palette, LayoutDashboard, Edit3, Brain, Users, Link, Receipt, Banknote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

const AdminSettings = () => {
  const { activeTheme } = useAppTheme();
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

  return (
    <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col">
      {/* Header - Fixed */}
      <div className="shrink-0 px-3 py-3 sm:px-4 sm:py-4 md:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 w-full min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent break-words">
              Pengaturan Admin
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Kelola role dan hak akses pengguna</p>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-4">
        {/* Quick Access Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card 
            className="p-3 sm:p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
            onClick={() => navigate("/vip/settings/design")}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-purple-600 flex items-center justify-center shrink-0">
                <Palette className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                  Setting Design VIP
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  Customize brand text, fonts, colors & effects
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </div>
          </Card>

          <Card 
            className="p-3 sm:p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
            onClick={() => navigate("/vip/settings/whatsapp")}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={cn(
                "h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center shrink-0",
                activeTheme === 'japanese' ? "gradient-success" : "bg-emerald-600"
              )}>
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                  WhatsApp Settings
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  Kelola notifikasi WhatsApp otomatis
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </div>
          </Card>

          <Card 
            className="p-3 sm:p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
            onClick={() => navigate("/vip/settings/smtp")}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                  SMTP Email Settings
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  Kelola pengiriman email otomatis
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </div>
          </Card>

          <Card 
            className="p-3 sm:p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
            onClick={() => navigate("/vip/audit-logs")}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={cn(
                "h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center shrink-0",
                activeTheme === 'japanese' ? "gradient-primary" : "bg-primary"
              )}>
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                  Audit Logs
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  Lihat riwayat aktivitas sistem
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </div>
          </Card>

          <Card 
            className="p-3 sm:p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
            onClick={() => navigate("/vip/cloud-usage")}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-purple-600 flex items-center justify-center shrink-0">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                  Cloud Usage Dashboard
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  Monitor semua resource cloud & biaya
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </div>
          </Card>

          <Card 
            className="p-3 sm:p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
            onClick={() => navigate("/vip/settings/landing")}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
                <LayoutDashboard className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                  Setting Landing Page
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  Kelola blog, portfolio, content & meta ads
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </div>
          </Card>

          <Card 
            className="p-3 sm:p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
            onClick={() => navigate("/vip/settings/content-editor")}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-purple-600 flex items-center justify-center shrink-0">
                <Edit3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                  Edit Page
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  Kelola konten dengan versi simpel atau pro
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </div>
          </Card>

          <Card 
            className="p-3 sm:p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
            onClick={() => navigate("/vip/settings/ai")}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
                <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                  AI Management
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  Kelola AI providers & konfigurasi ChatBot/AI Chat
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </div>
          </Card>

          <Card 
            className="p-3 sm:p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
            onClick={() => navigate("/vip/settings/users")}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={cn(
                "h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center shrink-0",
                activeTheme === 'japanese' ? "gradient-primary" : "bg-cyan-600"
              )}>
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                  Manajemen User & Role
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  Kelola pengguna, role, dan hak akses
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </div>
          </Card>

          <Card 
            className="p-3 sm:p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
            onClick={() => navigate("/vip/settings/short-links")}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-orange-600 flex items-center justify-center shrink-0">
                <Link className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                  Short Link
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  Buat dan kelola custom short links
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </div>
          </Card>

          <Card 
            className="p-3 sm:p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
            onClick={() => navigate("/vip/settings/invoice")}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-teal-600 flex items-center justify-center shrink-0">
                <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                  Setting Invoice
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  Kelola template invoice, format PDF, dan pengaturan lainnya
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </div>
          </Card>

          <Card 
            className="p-3 sm:p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
            onClick={() => navigate("/vip/settings/payment-auto")}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={cn(
                "h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center shrink-0",
                activeTheme === 'japanese' ? "gradient-success" : "bg-green-600"
              )}>
                <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                  Pembayaran Otomatis
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  Verifikasi pembayaran otomatis via Mutasibank.co.id
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
