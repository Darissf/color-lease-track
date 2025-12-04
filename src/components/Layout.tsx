import { Home, Building2, Users, DollarSign, ListTodo, Calendar, PiggyBank, FileText, Settings, Shield, LogOut, Bell, ChevronLeft, ChevronRight, User, ChevronDown, TrendingDown, Edit3, Brain, ClipboardList, Bot, User2, LayoutDashboard, Sparkles, Menu, X, Repeat, MessageSquare, Package, Receipt, CalendarClock, Mail } from "lucide-react";
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

import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { ThemeSelector } from "@/components/ThemeSelector";
import { BrandText } from "@/components/BrandText";
import { cn } from "@/lib/utils";
import { AnimatedBackground } from "@/components/AnimatedBackground";

import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useState, useEffect } from "react";

const navItems = [
  { title: "Home", url: "/vip/", icon: Home },
];

// Moved pagesItems inside component to access user roles

  const adminNavItems = [
    { title: "AI Chat", url: "/vip/ai-chat", icon: MessageSquare, badge: "New", badgeVariant: "default" as const, description: "Chat dengan berbagai AI provider (Admin Only)", adminOnly: true },
    { title: "Generate Image", url: "/vip/generate-image", icon: Sparkles, badge: "AI", badgeVariant: "ai" as const, description: "Generate gambar dengan AI (Admin Only)", adminOnly: true },
    { title: "Mail Inbox", url: "/vip/mail", icon: Mail, badge: "New", badgeVariant: "default" as const, description: "Kelola email masuk domain", adminOnly: true },
    { title: "Pengaturan", url: "/vip/settings", icon: Settings, description: "Konfigurasi pengaturan aplikasi" },
    { title: "AI Settings", url: "/vip/settings/ai", icon: Brain, badge: "AI", badgeVariant: "ai" as const, description: "Konfigurasi fitur AI dan model" },
    { title: "Admin Settings", url: "/vip/settings/admin", icon: User2, superAdminOnly: true, badge: "Super", badgeVariant: "destructive" as const, description: "Kelola pengguna dan hak akses sistem" },
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
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
  };

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
    { title: "Pemasukan Tetap", url: "/vip/recurring-income", icon: CalendarClock, description: "Kelola pemasukan berulang setiap bulan" },
    { title: "Pengeluaran Tetap", url: "/vip/fixed-expenses", icon: Receipt, description: "Atur pengeluaran tetap bulanan" },
    { title: "Stok Barang", url: "/vip/inventory", icon: Package, description: "Kelola persediaan scaffolding dan aksesoris" },
    { title: "Savings Plans", url: "/vip/savings", icon: PiggyBank, description: "Rencanakan dan pantau target tabungan" },
    { title: "Monthly Budget", url: "/vip/monthly-budget", icon: Calendar, description: "Kelola anggaran bulanan dan tracking" },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen overflow-hidden bg-background">
      {/* Backdrop overlay for mobile */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Notion-style Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative z-50 h-full transition-all duration-300 ease-in-out flex flex-col border-r relative",
          "bg-gradient-to-b from-sidebar via-sidebar to-sidebar-accent/50",
          "shadow-[4px_0_24px_-2px_hsl(var(--sidebar-primary)/0.3)]",
          "backdrop-blur-sm border-sidebar-border",
          sidebarOpen
            ? "translate-x-0 w-64"
            : "-translate-x-full lg:translate-x-0 w-0 lg:w-16 overflow-hidden"
        )}
      >
        {(sidebarOpen || !isMobile) && (
          <>
            {/* Accent line */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sidebar-primary via-sidebar-primary/50 to-transparent" />
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
                if (item.adminOnly && !isAdmin && !isSuperAdmin) return null;
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
          </>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Notion Style */}
        <header className="h-14 border-b border-border px-4 flex items-center justify-between bg-card">
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
            
            {/* Brand Text */}
            <div className="flex-1 flex items-center">
              <BrandText />
            </div>
          </div>

          <div className="flex items-center gap-2">
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
      <main className="flex-1 overflow-auto p-0 md:p-6 bg-background">
          <AnimatedBackground>
            {children}
          </AnimatedBackground>
        </main>
      </div>
    </div>
    </TooltipProvider>
  );
}
