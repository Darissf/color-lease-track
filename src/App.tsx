import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import QuickActions from "./pages/QuickActions";
import MonthlyDashboard from "./pages/MonthlyDashboard";
import BudgetTracker from "./pages/BudgetTracker";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Properties from "./pages/Properties";
import Tenants from "./pages/Tenants";
import Finances from "./pages/Finances";
import Tasks from "./pages/Tasks";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AuditLogs from "./pages/AuditLogs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/quick-actions" element={<QuickActions />} />
                      <Route path="/monthly" element={<MonthlyDashboard />} />
                      <Route path="/budget" element={<BudgetTracker />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/properties" element={<Properties />} />
                      <Route path="/tenants" element={<Tenants />} />
                      <Route path="/finances" element={<Finances />} />
                      <Route path="/tasks" element={<Tasks />} />
                      <Route path="/audit-logs" element={<AuditLogs />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
