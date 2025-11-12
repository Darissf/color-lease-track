import { Home, Building2, Users, DollarSign, ListTodo, Calendar, PiggyBank, FileText, Settings, Shield, LogOut, Bell, Search, ChevronLeft, ChevronRight, User, ChevronDown, TrendingDown, Edit3, Brain, ClipboardList } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EditModeToggle } from "@/components/EditModeToggle";
import { useState } from "react";

const navItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Meetings", url: "/meetings", icon: Users },
  { title: "Inbox", url: "/inbox", icon: FileText },
];

const pagesItems = [
  { title: "Nabila", url: "/nabila", icon: FileText },
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "List Client", url: "/client-groups", icon: Users },
  { title: "List Kontrak Sewa", url: "/rental-contracts", icon: ClipboardList },
  { title: "Pemasukan", url: "/income", icon: DollarSign },
  { title: "Pengeluaran", url: "/expenses", icon: TrendingDown },
  { title: "Savings Plans", url: "/savings", icon: PiggyBank },
  { title: "Monthly Budget", url: "/monthly-budget", icon: Calendar },
];

const adminNavItems = [
  { title: "Pengaturan", url: "/settings", icon: Settings },
  { title: "AI Settings", url: "/settings/ai", icon: Brain },
  { title: "Content Management", url: "/content-management", icon: Edit3, superAdminOnly: true },
  { title: "Audit Logs", url: "/audit-logs", icon: Shield, superAdminOnly: true },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut, isSuperAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSignOut = async () => {
    await signOut();
  };

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
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors ${!sidebarOpen ? "justify-center" : ""}`}
                  activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {sidebarOpen && <span>{item.title}</span>}
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
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors ${!sidebarOpen ? "justify-center" : ""}`}
                    activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {sidebarOpen && <span>{item.title}</span>}
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
          <EditModeToggle />
        </main>
      </div>
    </div>
  );
}
