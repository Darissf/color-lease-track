import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { EditableContentProvider } from "./contexts/EditableContentContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { HankoNotificationContainer } from "./components/HankoNotificationContainer";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Nabila from "./pages/Nabila";
import MonthlyView from "./pages/MonthlyView";
import Dashboard from "./pages/Dashboard";
import IncomeManagement from "./pages/IncomeManagement";
import ExpenseTracker from "./pages/ExpenseTracker";
import SavingsPlans from "./pages/SavingsPlans";
import Settings from "./pages/Settings";
import AdminSettings from "./pages/AdminSettings";
import AccountSettings from "./pages/AccountSettings";
import IncomeSettings from "./pages/IncomeSettings";
import SavingsSettings from "./pages/SavingsSettings";
import AuditLogs from "./pages/AuditLogs";
import ContentManagement from "./pages/ContentManagement";
import ContentStudio from "./pages/ContentStudio";
import ClientGroups from "./pages/ClientGroups";
import RentalContracts from "./pages/RentalContracts";
import AISettings from "./pages/AISettings";
import DatabaseBackup from "./pages/DatabaseBackup";
import AIUsageAnalytics from "./pages/AIUsageAnalytics";
import ChatBotAI from "./pages/ChatBotAI";
import ClientDashboard from "./pages/ClientDashboard";
import ContractDetail from "./pages/ContractDetail";
import NotFound from "./pages/NotFound";
import BudgetTracker from "./pages/BudgetTracker";
import EditPage from "./pages/EditPage";
import FixedExpenses from "./pages/FixedExpenses";
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <HankoNotificationContainer />
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
                      <Route path="/" element={<Nabila />} />
                      <Route path="/month/:year/:month" element={<MonthlyView />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/income" element={<IncomeManagement />} />
                      <Route path="/expenses" element={<ExpenseTracker />} />
                      <Route path="/fixed-expenses" element={<FixedExpenses />} />
                      <Route path="/savings" element={<SavingsPlans />} />
                      <Route path="/monthly-budget" element={<BudgetTracker />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/settings/admin" element={<AdminSettings />} />
                      <Route path="/settings/accounts" element={<AccountSettings />} />
                      <Route path="/settings/income" element={<IncomeSettings />} />
                      <Route path="/settings/savings" element={<SavingsSettings />} />
                      <Route path="/audit-logs" element={<AuditLogs />} />
                      <Route path="/content-management" element={<ContentManagement />} />
                      <Route path="/edit-page" element={<EditPage />} />
                      <Route path="/content-studio" element={<ContentStudio />} />
                      <Route path="/client-groups" element={<ClientGroups />} />
                      <Route path="/rental-contracts" element={<RentalContracts />} />
                      <Route path="/settings/ai" element={<AISettings />} />
                      <Route path="/database-backup" element={<DatabaseBackup />} />
                      <Route path="/chatbot" element={<ChatBotAI />} />
                      <Route path="/ai-usage" element={<AIUsageAnalytics />} />
                      <Route path="/client-dashboard" element={<ClientDashboard />} />
                      <Route path="/contract/:id" element={<ContractDetail />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
              </Routes>
            </EditableContentProvider>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
