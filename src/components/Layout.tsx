import { Home, Building2, Users, DollarSign, ListTodo, Calendar, PiggyBank, FileText, Settings, Shield, LogOut, Bell, Search, ChevronLeft, ChevronRight, User, ChevronDown, TrendingDown, Edit3, Brain, ClipboardList, Bot, User2, LayoutDashboard, Sparkles, Menu, X } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";
import { useContentAutoApply } from "@/hooks/useContentAutoApply";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { AppThemeProvider } from "@/contexts/AppThemeContext";
import { ThemeSelector } from "@/components/ThemeSelector";

import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useState, useEffect } from "react";

const navItems = [
  { title: "Home", url: "/vip/", icon: Home },
];

// Moved pagesItems inside component to access user roles

  const adminNavItems = [
    { title: "Pengaturan", url: "/vip/settings", icon: Settings, description: "Konfigurasi pengaturan aplikasi" },
    { title: "AI Settings", url: "/vip/settings/ai", icon: Brain, badge: "AI", badgeVariant: "ai" as const, description: "Konfigurasi fitur AI dan model" },
    { title: "Admin Settings", url: "/vip/settings/admin", icon: User2, superAdminOnly: true, badge: "Super", badgeVariant: "destructive" as const, description: "Kelola pengguna dan hak akses sistem" },
    { title: "Setting Landing Page", url: "/vip/landing-settings", icon: LayoutDashboard, superAdminOnly: true, badge: "Pro", badgeVariant: "default" as const, description: "Kelola semua aspek landing page: blog, portfolio, content & tracking" },
    { title: "Edit Page", url: "/vip/edit-page", icon: Edit3, superAdminOnly: true, badge: "Quick", badgeVariant: "secondary" as const, description: "Edit konten cepat dengan UI sederhana" },
    { title: "Content Studio", url: "/vip/content-studio", icon: Sparkles, superAdminOnly: true, badge: "Pro", badgeVariant: "default" as const, description: "Professional content management dengan preview, bulk operations & analytics" },
    { title: "Content Management", url: "/vip/content-management", icon: Edit3, superAdminOnly: true, badge: "Super", badgeVariant: "destructive" as const, description: "Kelola konten editable di seluruh aplikasi" },
    { title: "Audit Logs", url: "/vip/audit-logs", icon: Shield, superAdminOnly: true, badge: "Super", badgeVariant: "destructive" as const, description: "Lihat log aktivitas dan perubahan sistem" },
  ];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut, isSuperAdmin, isAdmin, isUser } = useAuth();
  const { profile } = useProfile();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const notifications = useAdminNotifications(isAdmin || isSuperAdmin);
  
  // Close sidebar on mobile by default
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);
  
  // Helper function to get user initials
  const getUserInitials = () => {
    if (profile?.full_name) {
      const names = profile.full_name.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    if (profile?.username) {
      return profile.username[0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };
  const location = useLocation();
  const { applyForPage } = useContentAutoApply();
  const [applying, setApplying] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
  };

  const handleAutoApply = async () => {
    if (!isSuperAdmin) return;
    setApplying(true);
    try {
      const res = await applyForPage(location.pathname);
      if (!res) {
        toast.message("Tidak ada konten untuk halaman ini");
        return;
      }
      const { applied, skipped, notFound } = res;
      if (applied > 0) {
        toast.success(`Terapkan: ${applied} | Sama: ${skipped} | Tidak ditemukan: ${notFound}`);
      } else if (skipped > 0 && notFound === 0) {
        toast.success(`Semua sudah sesuai (${skipped})`);
      } else {
        toast.warning(`Tidak ditemukan: ${notFound}, sama: ${skipped}`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Gagal menerapkan konten");
    } finally {
      setApplying(false);
    }
  };

  // Auto-apply on route change for super admin OR when autoApply param is present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldAutoApply = isSuperAdmin || params.get('autoApply') === 'true';
    
    if (!shouldAutoApply) return;
    
    // Run twice to catch late-mounted components
    const t1 = setTimeout(() => {
      applyForPage(location.pathname);
    }, 60);
    const t2 = setTimeout(() => {
      applyForPage(location.pathname);
    }, 900);
    
    // Show toast notification when triggered by URL param
    if (params.get('autoApply') === 'true') {
      setTimeout(async () => {
        const res = await applyForPage(location.pathname);
        if (res) {
          const { applied, skipped, notFound } = res;
          if (applied > 0) {
            toast.success(`Auto-apply selesai! Terapkan: ${applied} | Sama: ${skipped} | Tidak ditemukan: ${notFound}`);
          } else {
            toast.info(`Semua sudah sesuai (${skipped})`);
          }
        }
      }, 1200);
    }
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isSuperAdmin, location.pathname, applyForPage]);

  // Different menu for regular users vs admins
  const pagesItems = (isUser && !isAdmin && !isSuperAdmin) ? [
    { title: "Home", url: "/vip/", icon: Home, description: "Kembali ke halaman utama" },
    { title: "Dashboard Saya", url: "/vip/client-dashboard", icon: LayoutDashboard, description: "Lihat ringkasan dan statistik akun Anda" },
    { title: "Kontrak Saya", url: "/vip/rental-contracts", icon: ClipboardList, description: "Kelola kontrak sewa properti Anda" },
  ] : [
    { title: "Home", url: "/vip/", icon: FileText, description: "Halaman utama aplikasi" },
    { title: "Dashboard", url: "/vip/dashboard", icon: Home, description: "Lihat ringkasan keuangan dan aktivitas terkini" },
    { title: "ChatBot AI", url: "/vip/chatbot", icon: Bot, badge: "AI", badgeVariant: "ai" as const, description: "Chat dengan asisten AI untuk bantuan keuangan" },
    { title: "List Client", url: "/vip/client-groups", icon: Users, description: "Kelola data klien dan grup klien" },
    { title: "List Kontrak Sewa", url: "/vip/rental-contracts", icon: ClipboardList, badge: notifications.total > 0 ? `${notifications.total}` : undefined, badgeVariant: notifications.total > 0 ? "destructive" as const : undefined, description: "Kelola kontrak sewa properti dan pembayaran" },
    { title: "Pemasukan", url: "/vip/income", icon: DollarSign, description: "Catat dan kelola sumber pemasukan" },
    { title: "Pengeluaran", url: "/vip/expenses", icon: TrendingDown, description: "Catat dan pantau pengeluaran harian" },
    { title: "Pengeluaran Tetap", url: "/vip/fixed-expenses", icon: Calendar, description: "Atur pengeluaran tetap bulanan" },
    { title: "Savings Plans", url: "/vip/savings", icon: PiggyBank, description: "Rencanakan dan pantau target tabungan" },
    { title: "Monthly Budget", url: "/vip/monthly-budget", icon: Calendar, description: "Kelola anggaran bulanan dan tracking" },
  ];

  return (
    <AppThemeProvider>
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen bg-background overflow-hidden">
      {/* Backdrop overlay for mobile */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Notion-style Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-sidebar-background border-r border-sidebar-border transition-all duration-300 flex flex-col
        ${isMobile ? 'fixed inset-y-0 left-0 z-50 transform ' + (sidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'relative'}
        lg:relative lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-center px-4 border-b border-sidebar-border">
          {sidebarOpen ? (
            <h1 className="text-sm font-semibold text-sidebar-foreground">
              Financial Planner
            </h1>
          ) : (
            <Home className="h-5 w-5 text-sidebar-foreground" />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5" data-editable-ignore>
          {/* Pages Section */}
          {pagesItems.length > 0 && (
            <>
              <div className="h-px bg-sidebar-border my-2" />
              {sidebarOpen && (
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  Pages
                </p>
              )}
              {pagesItems.map((item) => (
                <Tooltip key={item.url}>
                  <TooltipTrigger asChild>
                     <NavLink
                      to={item.url}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors ${!sidebarOpen ? "justify-center" : "justify-between"}`}
                      activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
                      onClick={() => isMobile && setSidebarOpen(false)}
                    >
                      <div className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {sidebarOpen && <span>{item.title}</span>}
                      </div>
                      {sidebarOpen && item.badge && (
                        <Badge 
                          variant={item.badgeVariant} 
                          className="text-[10px] px-1.5 py-0 h-5 font-semibold uppercase tracking-wider"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </NavLink>
                  </TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {item.description || item.title}
                      </TooltipContent>
                </Tooltip>
              ))}
            </>
          )}

          {/* Admin Section */}
          {(isSuperAdmin || user) && adminNavItems.length > 0 && (
            <>
              <div className="h-px bg-sidebar-border my-2" />
              {sidebarOpen && (
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  Admin
                </p>
              )}
              {adminNavItems.map((item) => {
                if (item.superAdminOnly && !isSuperAdmin) return null;
                return (
                  <Tooltip key={item.url}>
                    <TooltipTrigger asChild>
                       <NavLink
                        to={item.url}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors ${!sidebarOpen ? "justify-center" : "justify-between"}`}
                        activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
                        onClick={() => isMobile && setSidebarOpen(false)}
                      >
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          {sidebarOpen && <span>{item.title}</span>}
                        </div>
                        {sidebarOpen && item.badge && (
                          <Badge 
                            variant={item.badgeVariant} 
                            className="text-[10px] px-1.5 py-0 h-5 font-semibold uppercase tracking-wider"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </NavLink>
                    </TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">
                          {item.description || item.title}
                        </TooltipContent>
                  </Tooltip>
                );
              })}
            </>
          )}
        </nav>

        {/* Sidebar Toggle Button */}
        <div className="border-t border-sidebar-border p-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded hover:bg-sidebar-accent transition-colors group"
            aria-label={sidebarOpen ? "Sembunyikan Menu" : "Tampilkan Menu"}
            title={sidebarOpen ? "Sembunyikan Menu" : "Tampilkan Menu"}
          >
            {sidebarOpen ? (
              <>
                <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                <span className="ml-2 text-xs text-muted-foreground group-hover:text-foreground">Sembunyikan</span>
              </>
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Notion Style */}
        <header className="h-14 bg-card border-b border-border px-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {/* Hamburger Menu for Mobile */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden mr-2"
                aria-label="Toggle Menu"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}
            
            {/* Search Bar */}
            <div className="relative w-full max-w-md">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAutoApply}
                disabled={applying}
                className="mr-1"
                aria-label="Terapkan konten otomatis untuk halaman ini"
                title="Terapkan konten otomatis untuk halaman ini"
              >
                {applying ? "Menerapkan..." : "Terapkan Otomatis"}
              </Button>
            )}
            {/* Notifications */}
            <button className="relative p-2 rounded hover:bg-accent transition-colors">
              <Bell className="h-4 w-4 text-foreground" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-destructive rounded-full"></span>
            </button>

            {/* Theme Selector */}
            <ThemeSelector />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1.5 rounded hover:bg-accent transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarImage 
                      src={profile?.avatar_url || undefined} 
                      alt={profile?.full_name || profile?.username || 'User'} 
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm">
                  <div className="font-medium text-foreground">
                    {profile?.full_name || profile?.username || user?.email?.split("@")[0] || "User"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </div>
                </div>
                <DropdownMenuItem onClick={() => navigate('/vip/profile')} className="cursor-pointer text-sm">
                  <User className="mr-2 h-3.5 w-3.5" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-sm">
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
    </TooltipProvider>
    </AppThemeProvider>
  );
}
