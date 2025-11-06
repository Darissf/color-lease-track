import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
