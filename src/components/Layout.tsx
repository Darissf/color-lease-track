import { Home, Building2, Users, DollarSign, ListTodo, Calendar, PiggyBank, FileText, Settings, Shield, LogOut, Bell, Search, ChevronLeft, ChevronRight, User, ChevronDown, TrendingDown, Edit3, Brain, ClipboardList, Bot, User2, LayoutDashboard, Sparkles } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useState } from "react";

const navItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Meetings", url: "/meetings", icon: Users },
  { title: "Inbox", url: "/inbox", icon: FileText },
];

// Moved pagesItems inside component to access user roles

const adminNavItems = [
  { title: "Pengaturan", url: "/settings", icon: Settings },
  { title: "AI Settings", url: "/settings/ai", icon: Brain, badge: "AI", badgeVariant: "ai" as const },
  { title: "Admin Settings", url: "/settings/admin", icon: User2, superAdminOnly: true, badge: "Super", badgeVariant: "destructive" as const },
  { title: "Edit Page", url: "/edit-page", icon: Edit3, superAdminOnly: true, badge: "AI", badgeVariant: "secondary" as const },
  { title: "Content Management", url: "/content-management", icon: Edit3, superAdminOnly: true, badge: "Super", badgeVariant: "destructive" as const },
  { title: "Audit Logs", url: "/audit-logs", icon: Shield, superAdminOnly: true, badge: "Super", badgeVariant: "destructive" as const },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut, isSuperAdmin, isAdmin, isUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const notifications = useAdminNotifications(isAdmin || isSuperAdmin);

  const handleSignOut = async () => {
    await signOut();
  };

  // Different menu for regular users vs admins
  const pagesItems = (isUser && !isAdmin && !isSuperAdmin) ? [
    { title: "Home", url: "/", icon: Home },
    { title: "Dashboard Saya", url: "/client-dashboard", icon: LayoutDashboard },
    { title: "Kontrak Saya", url: "/rental-contracts", icon: ClipboardList },
  ] : [
    { title: "Nabila", url: "/nabila", icon: FileText },
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "AI Hub", url: "/ai-hub", icon: Sparkles, badge: "NEW", badgeVariant: "ai" as const },
    { title: "ChatBot AI", url: "/chatbot", icon: Bot, badge: "AI", badgeVariant: "ai" as const },
    { title: "List Client", url: "/client-groups", icon: Users },
    { title: "List Kontrak Sewa", url: "/rental-contracts", icon: ClipboardList, badge: notifications.total > 0 ? `${notifications.total}` : undefined, badgeVariant: notifications.total > 0 ? "destructive" as const : undefined },
    { title: "Pemasukan", url: "/income", icon: DollarSign },
    { title: "Pengeluaran", url: "/expenses", icon: TrendingDown },
    { title: "Savings Plans", url: "/savings", icon: PiggyBank },
    { title: "Monthly Budget", url: "/monthly-budget", icon: Calendar },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Notion-style Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-sidebar-background border-r border-sidebar-border transition-all duration-300 flex flex-col`}
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
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/"}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors ${!sidebarOpen ? "justify-center" : ""}`}
              activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {sidebarOpen && <span>{item.title}</span>}
            </NavLink>
          ))}

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
                <NavLink
                  key={item.url}
                  to={item.url}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors ${!sidebarOpen ? "justify-center" : "justify-between"}`}
                  activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
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
                  <NavLink
                    key={item.url}
                    to={item.url}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors ${!sidebarOpen ? "justify-center" : "justify-between"}`}
                    activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
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
            {/* Notifications */}
            <button className="relative p-2 rounded hover:bg-accent transition-colors">
              <Bell className="h-4 w-4 text-foreground" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-destructive rounded-full"></span>
            </button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1.5 rounded hover:bg-accent transition-colors">
                  <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-foreground" />
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  {user?.email?.split("@")[0] || "User"}
                </div>
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
  );
}
