import { Home, Building2, Users, DollarSign, ListTodo, Calendar, PiggyBank, FileText, Settings, Shield, LogOut, Bell, ChevronLeft, ChevronRight, User, ChevronDown, TrendingDown, Edit3, Brain, ClipboardList, Bot, User2, LayoutDashboard, Sparkles, Menu, X, Repeat, MessageSquare, Package, Receipt, CalendarClock, Mail, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useBrandSettings } from "@/hooks/useBrandSettings";

const navItems = [
  { title: "Home", url: "/vip/", icon: Home },
];

// Moved pagesItems inside component to access user roles

  const adminNavItems = [
    { title: "AI Chat", url: "/vip/ai-chat", icon: MessageSquare, badge: "New", badgeVariant: "default" as const, description: "Chat dengan berbagai AI provider & Generate Image (Admin Only)", adminOnly: true },
    { title: "Mail Inbox", url: "/vip/mail", icon: Mail, badge: "New", badgeVariant: "default" as const, description: "Kelola email masuk domain", adminOnly: true },
    { title: "Pengaturan", url: "/vip/settings", icon: Settings, description: "Konfigurasi pengaturan aplikasi" },
    { title: "AI Settings", url: "/vip/settings/ai", icon: Brain, badge: "AI", badgeVariant: "ai" as const, description: "Konfigurasi fitur AI dan model" },
    { title: "Admin Settings", url: "/vip/settings/admin", icon: User2, superAdminOnly: true, badge: "Super", badgeVariant: "destructive" as const, description: "Kelola pengguna dan hak akses sistem" },
    { title: "Audit Logs", url: "/vip/audit-logs", icon: Shield, superAdminOnly: true, badge: "Super", badgeVariant: "destructive" as const, description: "Lihat log aktivitas dan perubahan sistem" },
  ];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut, isSuperAdmin, isAdmin, isUser } = useAuth();
  const { profile } = useProfile();
  const { settings: brandSettings } = useBrandSettings();
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
      <div className="flex h-screen overflow-hidden bg-[#F5F6FA]">
      {/* Backdrop overlay for mobile */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Clean White Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative z-50 h-full transition-all duration-300 ease-in-out flex flex-col",
          "bg-white shadow-[2px_0_8px_rgba(0,0,0,0.04)]",
          sidebarOpen
            ? "translate-x-0 w-[250px]"
            : "-translate-x-full lg:translate-x-0 w-0 lg:w-16 overflow-hidden"
        )}
      >
        {(sidebarOpen || !isMobile) && (
          <>
            {/* Logo */}
            <div className={cn(
              "h-16 flex items-center border-b border-slate-100",
              sidebarOpen ? "px-5" : "px-2 justify-center"
            )}>
              {sidebarOpen ? (
                <div className="flex items-center gap-3">
                  {/* Show Logo if mode is 'logo' or 'both' */}
                  {(brandSettings?.sidebar_display_mode === 'logo' || brandSettings?.sidebar_display_mode === 'both') && brandSettings?.sidebar_logo_url ? (
                    <img
                      src={brandSettings.sidebar_logo_url}
                      alt="Logo"
                      style={{
                        height: `${brandSettings.sidebar_logo_height || 32}px`,
                        maxWidth: `${brandSettings.sidebar_logo_max_width || 150}px`,
                      }}
                      className="object-contain"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-[#487FFF] flex items-center justify-center">
                      <Home className="h-4 w-4 text-white" />
                    </div>
                  )}
                  {/* Show Text if mode is 'text' or 'both' */}
                  {(brandSettings?.sidebar_display_mode === 'text' || brandSettings?.sidebar_display_mode === 'both' || !brandSettings?.sidebar_display_mode) && (
                    <h1 className="text-base font-semibold text-slate-800">
                      {brandSettings?.sidebar_text || 'Admin Area'}
                    </h1>
                  )}
                </div>
              ) : (
                // Collapsed state - show only logo or icon
                (brandSettings?.sidebar_display_mode !== 'text' && brandSettings?.sidebar_logo_url) ? (
                  <img
                    src={brandSettings.sidebar_logo_url}
                    alt="Logo"
                    style={{
                      height: `${Math.min(brandSettings.sidebar_logo_height || 32, 32)}px`,
                      maxWidth: '32px',
                    }}
                    className="object-contain mx-auto"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-[#487FFF] flex items-center justify-center mx-auto">
                    <Home className="h-4 w-4 text-white" />
                  </div>
                )
              )}
            </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1" data-editable-ignore>
          {/* Pages Section */}
          {pagesItems.length > 0 && (
            <>
              {sidebarOpen && (
                <p className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Pages
                </p>
              )}
              {pagesItems.map((item) => (
                <Tooltip key={item.url}>
                  <TooltipTrigger asChild>
                     <NavLink
                      to={item.url}
                      end={item.url === "/vip/"}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-all ${!sidebarOpen ? "justify-center" : "justify-between"}`}
                      activeClassName="bg-[#487FFF] text-white hover:bg-[#487FFF] shadow-sm shadow-blue-200"
                      onClick={() => isMobile && setSidebarOpen(false)}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                        {sidebarOpen && <span className="font-medium">{item.title}</span>}
                      </div>
                      {sidebarOpen && item.badge && (
                        <Badge 
                          variant={item.badgeVariant} 
                          className="text-[10px] px-1.5 py-0 h-5 font-semibold uppercase tracking-wider rounded-full"
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
              <div className="h-px bg-slate-100 my-3" />
              {sidebarOpen && (
                <p className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
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
                        end={item.url === "/vip/"}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-all ${!sidebarOpen ? "justify-center" : "justify-between"}`}
                        activeClassName="bg-[#487FFF] text-white hover:bg-[#487FFF] shadow-sm shadow-blue-200"
                        onClick={() => isMobile && setSidebarOpen(false)}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                          {sidebarOpen && <span className="font-medium">{item.title}</span>}
                        </div>
                        {sidebarOpen && item.badge && (
                          <Badge 
                            variant={item.badgeVariant} 
                            className="text-[10px] px-1.5 py-0 h-5 font-semibold uppercase tracking-wider rounded-full"
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
        <div className="border-t border-slate-100 p-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
            aria-label={sidebarOpen ? "Sembunyikan Menu" : "Tampilkan Menu"}
            title={sidebarOpen ? "Sembunyikan Menu" : "Tampilkan Menu"}
          >
            {sidebarOpen ? (
              <>
                <ChevronLeft className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                <span className="ml-2 text-xs text-slate-400 group-hover:text-slate-600">Sembunyikan</span>
              </>
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
            )}
          </button>
        </div>
          </>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Clean White Style */}
        <header className="h-16 border-b border-slate-100 px-4 md:px-6 flex items-center justify-between bg-white shadow-sm">
          <div className="flex items-center gap-4 flex-1">
            {/* Hamburger Menu for Mobile */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
                aria-label="Toggle Menu"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}
            
            {/* Search Bar */}
            <div className="hidden md:flex relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search..." 
                className="pl-10 bg-slate-50 border-slate-200 rounded-full h-10 text-sm focus:ring-2 focus:ring-[#487FFF]/20 focus:border-[#487FFF]"
              />
            </div>
            
            {/* Mobile: Brand Text */}
            {isMobile && (
              <div className="flex-1">
                <BrandText />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            {/* Theme Selector */}
            <ThemeSelector />

            {/* Notifications */}
            <button className="relative p-2.5 rounded-full hover:bg-slate-100 transition-colors">
              <Bell className="h-5 w-5 text-slate-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            </button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 transition-colors ml-1">
                  <Avatar className="h-9 w-9 ring-2 ring-slate-100">
                    <AvatarImage 
                      src={profile?.avatar_url || undefined} 
                      alt={profile?.full_name || profile?.username || 'User'} 
                    />
                    <AvatarFallback className="bg-[#487FFF] text-white text-sm font-medium">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-slate-400 hidden md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2">
                <div className="px-3 py-2 mb-1">
                  <div className="font-semibold text-slate-800">
                    {profile?.full_name || profile?.username || user?.email?.split("@")[0] || "User"}
                  </div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">
                    {user?.email}
                  </div>
                </div>
                <DropdownMenuItem onClick={() => navigate('/vip/profile')} className="cursor-pointer rounded-lg py-2.5">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer rounded-lg py-2.5 text-red-600 focus:text-red-600 focus:bg-red-50">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-[#F5F6FA]">
          <AnimatedBackground>
            {children}
          </AnimatedBackground>
        </main>
      </div>
    </div>
    </TooltipProvider>
  );
}
