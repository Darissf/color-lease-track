import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, MessageSquare, ChevronRight, FileText, Mail, BarChart3, Palette, LayoutDashboard, Edit3, Brain, Users } from "lucide-react";
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
    <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 w-full min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent break-words">
            Pengaturan Admin
          </h1>
          <p className="text-sm text-muted-foreground">Kelola role dan hak akses pengguna</p>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card 
          className="p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
          onClick={() => navigate("/vip/settings/design")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-600 flex items-center justify-center">
              <Palette className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Setting Design VIP
              </h3>
              <p className="text-xs text-muted-foreground">
                Customize brand text, fonts, colors & effects
              </p>
            </div>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary" />
          </div>
        </Card>

        <Card 
          className="p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
          onClick={() => navigate("/vip/settings/whatsapp")}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center",
              activeTheme === 'japanese' ? "gradient-success" : "bg-emerald-600"
            )}>
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                WhatsApp Settings
              </h3>
              <p className="text-xs text-muted-foreground">
                Kelola notifikasi WhatsApp otomatis
              </p>
            </div>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary" />
          </div>
        </Card>

        <Card 
          className="p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
          onClick={() => navigate("/vip/settings/smtp")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                SMTP Email Settings
              </h3>
              <p className="text-xs text-muted-foreground">
                Kelola pengiriman email otomatis
              </p>
            </div>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary" />
          </div>
        </Card>

        <Card 
          className="p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
          onClick={() => navigate("/vip/audit-logs")}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center",
              activeTheme === 'japanese' ? "gradient-primary" : "bg-primary"
            )}>
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Audit Logs
              </h3>
              <p className="text-xs text-muted-foreground">
                Lihat riwayat aktivitas sistem
              </p>
            </div>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary" />
          </div>
        </Card>

        <Card 
          className="p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
          onClick={() => navigate("/vip/cloud-usage")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-600 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Cloud Usage Dashboard
              </h3>
              <p className="text-xs text-muted-foreground">
                Monitor semua resource cloud & biaya
              </p>
            </div>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary" />
          </div>
        </Card>

        <Card 
          className="p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
          onClick={() => navigate("/vip/settings/landing")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Setting Landing Page
              </h3>
              <p className="text-xs text-muted-foreground">
                Kelola blog, portfolio, content & meta ads
              </p>
            </div>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary" />
          </div>
        </Card>

        <Card 
          className="p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
          onClick={() => navigate("/vip/settings/content-editor")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-600 flex items-center justify-center">
              <Edit3 className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Edit Page
              </h3>
              <p className="text-xs text-muted-foreground">
                Kelola konten dengan versi simpel atau pro
              </p>
            </div>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary" />
          </div>
        </Card>

        <Card 
          className="p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
          onClick={() => navigate("/vip/settings/ai")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                AI Management
              </h3>
              <p className="text-xs text-muted-foreground">
                Kelola AI providers & konfigurasi ChatBot/AI Chat
              </p>
            </div>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary" />
          </div>
        </Card>

        <Card 
          className="p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
          onClick={() => navigate("/vip/settings/users")}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center",
              activeTheme === 'japanese' ? "gradient-primary" : "bg-cyan-600"
            )}>
              <Users className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Manajemen User & Role
              </h3>
              <p className="text-xs text-muted-foreground">
                Kelola pengguna, role, dan hak akses
              </p>
            </div>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary" />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
