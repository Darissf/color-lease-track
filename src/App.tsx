import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { EditableContentProvider } from "./contexts/EditableContentContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Nabila from "./pages/Nabila";
import MonthlyView from "./pages/MonthlyView";
import Dashboard from "./pages/Dashboard";
import IncomeManagement from "./pages/IncomeManagement";
import ExpenseTracker from "./pages/ExpenseTracker";
import SavingsPlans from "./pages/SavingsPlans";
import Settings from "./pages/Settings";
import AuditLogs from "./pages/AuditLogs";
import ContentManagement from "./pages/ContentManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <EditableContentProvider>
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/nabila" element={<Nabila />} />
                      <Route path="/month/:month" element={<MonthlyView />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/income" element={<IncomeManagement />} />
                      <Route path="/expenses" element={<ExpenseTracker />} />
                      <Route path="/savings" element={<SavingsPlans />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/audit-logs" element={<AuditLogs />} />
                      <Route path="/content-management" element={<ContentManagement />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
            </Routes>
          </EditableContentProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
