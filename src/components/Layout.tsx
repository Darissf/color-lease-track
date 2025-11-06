import { Home, Building2, Users, DollarSign, ListTodo, Calendar, PiggyBank, FileText, Settings, Shield, LogOut, Bell, Search, Menu } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";

const navItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Aksi Cepat", url: "/quick-actions", icon: ListTodo },
  { title: "Dasbor Bulanan", url: "/monthly", icon: Calendar },
  { title: "Anggaran & Tabungan", url: "/budget", icon: PiggyBank },
  { title: "Laporan Tahunan", url: "/reports", icon: FileText },
  { title: "Properties", url: "/properties", icon: Building2 },
  { title: "Tenants", url: "/tenants", icon: Users },
  { title: "Finances", url: "/finances", icon: DollarSign },
  { title: "Tasks", url: "/tasks", icon: ListTodo },
];

const adminNavItems = [
  { title: "Pengaturan", url: "/settings", icon: Settings },
  { title: "Audit Logs", url: "/audit-logs", icon: Shield, superAdminOnly: true },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut, isSuperAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const getInitials = () => {
    if (!user?.email) return "U";
    return user.email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Dark Sidebar */}
      <aside className={`fixed left-0 top-0 z-40 h-screen transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))]`}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-[hsl(var(--sidebar-border))] px-6 justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              {sidebarOpen && (
                <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Financial Tracker
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            <div className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.url}
                  to={item.url}
                  end={item.url === "/"}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[hsl(var(--sidebar-foreground))] transition-all hover:bg-[hsl(var(--sidebar-accent))]"
                  activeClassName="bg-[hsl(var(--sidebar-primary))] text-white hover:bg-[hsl(var(--sidebar-primary))]/90"
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && <span>{item.title}</span>}
                </NavLink>
              ))}
            </div>

            <div className="pt-4 mt-4 border-t border-[hsl(var(--sidebar-border))] space-y-1">
              {adminNavItems.map((item) => {
                if (item.superAdminOnly && !isSuperAdmin) return null;
                return (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[hsl(var(--sidebar-foreground))] transition-all hover:bg-[hsl(var(--sidebar-accent))]"
                    activeClassName="bg-[hsl(var(--sidebar-primary))] text-white hover:bg-[hsl(var(--sidebar-primary))]/90"
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {sidebarOpen && <span>{item.title}</span>}
                  </NavLink>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t border-[hsl(var(--sidebar-border))] p-4">
            <div className="rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 p-3">
              {sidebarOpen && (
                <>
                  <p className="text-xs font-semibold text-[hsl(var(--sidebar-foreground))]">Financial Planner</p>
                  <p className="text-xs text-[hsl(var(--sidebar-foreground))]/70 mt-1">
                    Metode Kakeibo - Versi 2025
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content with Header */}
      <main className={`transition-all duration-300 ${sidebarOpen ? 'pl-64' : 'pl-20'}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="flex h-full items-center justify-between px-6">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Cari..."
                  className="w-full pl-10 pr-4 py-2 text-sm bg-muted/50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full"></span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {isSuperAdmin ? 'Super Admin' : 'Admin'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      </main>
    </div>
  );
}
