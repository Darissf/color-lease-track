import { Home, Building2, Users, DollarSign, ListTodo, Calendar, PiggyBank, FileText, Settings, Shield, LogOut, Bell, Search, ChevronLeft, ChevronRight, User, ChevronDown } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";

const navItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Meetings", url: "/meetings", icon: Users },
  { title: "Inbox", url: "/inbox", icon: FileText },
];

const pagesItems = [
  { title: "Nabila", url: "/nabila", icon: FileText },
  { title: "Nabila ya keudia", url: "/nabila-keudia", icon: DollarSign },
  { title: "Savings Plans v.1.01", url: "/savings", icon: PiggyBank },
  { title: "Weekly 70-30 List", url: "/weekly", icon: ListTodo },
  { title: "Monthly Budget", url: "/monthly-budget", icon: Calendar },
];

const adminNavItems = [
  { title: "Pengaturan", url: "/settings", icon: Settings },
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
      {/* White Sidebar - Velvet Style */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-sidebar-background border-r border-sidebar-border transition-all duration-300 flex flex-col shadow-sm`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-sidebar-border px-4">
          {sidebarOpen ? (
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Financial Tracker
            </h1>
          ) : (
            <Home className="h-6 w-6 text-primary" />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/"}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
              activeClassName="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">{item.title}</span>}
            </NavLink>
          ))}

          {/* Pages Section */}
          <div className="h-px bg-sidebar-border my-3" />
          {sidebarOpen && (
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pages
            </p>
          )}
          {pagesItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
              activeClassName="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">{item.title}</span>}
            </NavLink>
          ))}

          {/* Admin Section */}
          {(isSuperAdmin || user) && adminNavItems.length > 0 && (
            <>
              <div className="h-px bg-sidebar-border my-3" />
              {sidebarOpen && (
                <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Admin
                </p>
              )}
              {adminNavItems.map((item) => {
                if (item.superAdminOnly && !isSuperAdmin) return null;
                return (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
                    activeClassName="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {sidebarOpen && <span className="text-sm font-medium">{item.title}</span>}
                  </NavLink>
                );
              })}
            </>
          )}
        </nav>

        {/* Sidebar Toggle Button */}
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
            aria-label="Toggle Sidebar"
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-5 w-5 text-sidebar-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-sidebar-foreground" />
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Velvet Style */}
        <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4 flex-1">
            {/* Search Bar */}
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-accent/10 transition-colors">
              <Bell className="h-5 w-5 text-foreground" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
            </button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/10 transition-colors">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left hidden md:block">
                    <p className="text-sm font-medium text-foreground">
                      {user?.email?.split("@")[0] || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isSuperAdmin ? "Super Admin" : "Admin"}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover">
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
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
