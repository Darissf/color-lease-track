import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { EditableContentProvider } from "./contexts/EditableContentContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { AppThemeProvider } from "./contexts/AppThemeContext";
import { HankoNotificationContainer } from "./components/HankoNotificationContainer";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import PageLoadingSkeleton from "./components/PageLoadingSkeleton";

// Public pages - loaded immediately (critical path)
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

// Lazy-loaded public pages
const AboutUs = lazy(() => import("./pages/AboutUs"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogDetail = lazy(() => import("./pages/BlogDetail"));
const InstallApp = lazy(() => import("./pages/InstallApp"));
const EmailVerification = lazy(() => import("./pages/EmailVerification"));

// Lazy-loaded protected pages
const Nabila = lazy(() => import("./pages/Nabila"));
const MonthlyView = lazy(() => import("./pages/MonthlyView"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const IncomeManagement = lazy(() => import("./pages/IncomeManagement"));
const ExpenseTracker = lazy(() => import("./pages/ExpenseTracker"));
const RecurringIncome = lazy(() => import("./pages/RecurringIncome"));
const InventoryStock = lazy(() => import("./pages/InventoryStock"));
const SavingsPlans = lazy(() => import("./pages/SavingsPlans"));
const Settings = lazy(() => import("./pages/Settings"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const IncomeSettings = lazy(() => import("./pages/IncomeSettings"));
const SavingsSettings = lazy(() => import("./pages/SavingsSettings"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const ContentStudio = lazy(() => import("./pages/ContentStudio"));
const ContentEditorChooser = lazy(() => import("./pages/ContentEditorChooser"));
const BlogPosts = lazy(() => import("./pages/admin/BlogPosts"));
const BlogPostEditor = lazy(() => import("./pages/admin/BlogPostEditor"));
const BlogCategories = lazy(() => import("./pages/admin/BlogCategories"));
const ClientGroups = lazy(() => import("./pages/ClientGroups"));
const RentalContracts = lazy(() => import("./pages/RentalContracts"));
const AISettings = lazy(() => import("./pages/AISettings"));
const DatabaseBackup = lazy(() => import("./pages/DatabaseBackup"));
const CloudUsageDashboard = lazy(() => import("./pages/CloudUsageDashboard"));
const ChatBotAI = lazy(() => import("./pages/ChatBotAI"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const ContractDetail = lazy(() => import("./pages/ContractDetail"));
const ContractScaffoldingInput = lazy(() => import("./pages/ContractScaffoldingInput"));
const RecurringIncomeDetail = lazy(() => import("./pages/RecurringIncomeDetail"));
const RecurringIncomeScaffoldingInput = lazy(() => import("./pages/RecurringIncomeScaffoldingInput"));
const BudgetTracker = lazy(() => import("./pages/BudgetTracker"));
const EditPage = lazy(() => import("./pages/EditPage"));
const FixedExpenses = lazy(() => import("./pages/FixedExpenses"));
const Profile = lazy(() => import("./pages/Profile"));
const PortfolioManager = lazy(() => import("./pages/PortfolioManager"));
const MetaAdsDashboard = lazy(() => import("./pages/MetaAdsDashboard"));
const LandingSettings = lazy(() => import("./pages/LandingSettings"));
const WhatsAppSettings = lazy(() => import("./pages/WhatsAppSettings"));
const SMTPSettings = lazy(() => import("./pages/SMTPSettings"));
const VIPDesignSettings = lazy(() => import("./pages/VIPDesignSettings"));
const AIChat = lazy(() => import("./pages/AIChat"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const Mail = lazy(() => import("./pages/Mail"));
const TransactionHistory = lazy(() => import("./pages/TransactionHistory"));
const ShortLinkManager = lazy(() => import("./pages/ShortLinkManager"));
const InvoiceSettings = lazy(() => import("./pages/InvoiceSettings"));
const InvoiceTemplateSettings = lazy(() => import("./pages/InvoiceTemplateSettings"));
const InvoiceApiDocs = lazy(() => import("./pages/InvoiceApiDocs"));

const PaymentAutoSettings = lazy(() => import("./pages/PaymentAutoSettings"));
const BankScraperSettings = lazy(() => import("./pages/CloudScraperSettings"));
const ScraperMonitoring = lazy(() => import("./pages/ScraperMonitoring"));
const CustomStampSettings = lazy(() => import("./pages/CustomStampSettings"));
const ManualInvoice = lazy(() => import("./pages/ManualInvoice"));
const ManualReceipt = lazy(() => import("./pages/ManualReceipt"));

// Client Portal Pages
const MyContracts = lazy(() => import("./pages/MyContracts"));
const MyInvoices = lazy(() => import("./pages/MyInvoices"));
const MyPayments = lazy(() => import("./pages/MyPayments"));
const MyContractDetail = lazy(() => import("./pages/MyContractDetail"));
const MyDeliveries = lazy(() => import("./pages/MyDeliveries"));

// Delivery Tracking Pages
const DeliveryDashboard = lazy(() => import("./pages/DeliveryDashboard"));
const CreateDeliveryTrip = lazy(() => import("./pages/CreateDeliveryTrip"));
const DeliveryTripDetail = lazy(() => import("./pages/DeliveryTripDetail"));
const DriverDeliveryPage = lazy(() => import("./pages/DriverDeliveryPage"));
const PublicTrackingPage = lazy(() => import("./pages/PublicTrackingPage"));
const PublicContractPage = lazy(() => import("./pages/PublicContractPage"));
const PublicApiDocsPage = lazy(() => import("./pages/PublicApiDocsPage"));
const ScaffoldingConfigurator = lazy(() => import("./pages/ScaffoldingConfigurator"));
const DocumentSignatureSettings = lazy(() => import("./pages/DocumentSignatureSettings"));
const VerifyDocument = lazy(() => import("./pages/VerifyDocument"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache data for 30 minutes
      gcTime: 30 * 60 * 1000,
      // Retry failed requests 2 times
      retry: 2,
      // Don't refetch on window focus by default (reduces unnecessary requests)
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <NotificationProvider>
              <HankoNotificationContainer />
              <EditableContentProvider>
                <Suspense fallback={<PageLoadingSkeleton />}>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/about" element={<AboutUs />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/blog/:slug" element={<BlogDetail />} />
                    <Route path="/install" element={<InstallApp />} />
                    
                    {/* Public Delivery Tracking Routes */}
                    <Route path="/delivery/driver/:tripId" element={<DriverDeliveryPage />} />
                    <Route path="/track/:trackingCode" element={<PublicTrackingPage />} />
                    
                    {/* Public Contract View Route */}
                    <Route path="/contract/:accessCode" element={<PublicContractPage />} />
                    
                    {/* Public API Docs View Route */}
                    <Route path="/api-docs/:accessCode" element={<PublicApiDocsPage />} />
                    
                    {/* Public Document Verification Route */}
                    <Route path="/verify/:verificationCode" element={<VerifyDocument />} />
                    
                    {/* VIP Auth Routes */}
                    <Route path="/vip/login" element={<Login />} />
                    <Route path="/vip/register" element={<Register />} />
                    <Route path="/vip/verify-email" element={<ProtectedRoute><EmailVerification /></ProtectedRoute>} />
                    
                    {/* Protected VIP Routes */}
                    <Route
                      path="/vip/*"
                      element={
                        <ProtectedRoute>
                          <AppThemeProvider>
                            <Layout>
                              <Suspense fallback={<PageLoadingSkeleton variant="content" />}>
                                <Routes>
                                  <Route path="/" element={<Nabila />} />
                                  <Route path="/month/:year/:month" element={<MonthlyView />} />
                                  <Route path="/dashboard" element={<Dashboard />} />
                                  <Route path="/income" element={<IncomeManagement />} />
                                  <Route path="/expenses" element={<ExpenseTracker />} />
                                  <Route path="/recurring-income" element={<RecurringIncome />} />
                                  <Route path="/fixed-expenses" element={<FixedExpenses />} />
                                  <Route path="/inventory" element={<InventoryStock />} />
                                  <Route path="/savings" element={<SavingsPlans />} />
                                  <Route path="/monthly-budget" element={<BudgetTracker />} />
                                  <Route path="/profile" element={<Profile />} />
                                  <Route path="/settings" element={<Settings />} />
                                  <Route path="/settings/admin" element={<AdminSettings />} />
                                  <Route path="/settings/whatsapp" element={<WhatsAppSettings />} />
                                  <Route path="/settings/smtp" element={<SMTPSettings />} />
                                  <Route path="/settings/design" element={<VIPDesignSettings />} />
                                  <Route path="/settings/users" element={<UserManagement />} />
                                  <Route path="/settings/accounts" element={<AccountSettings />} />
                                  <Route path="/settings/income" element={<IncomeSettings />} />
                                  <Route path="/settings/savings" element={<SavingsSettings />} />
                                  <Route path="/settings/ai" element={<AISettings />} />
                                  <Route path="/audit-logs" element={<AuditLogs />} />
                                  <Route path="/edit-page" element={<EditPage />} />
                                  <Route path="/content-studio" element={<ContentStudio />} />
                                  <Route path="/settings/content-editor" element={<ContentEditorChooser />} />
                                  <Route path="/blog-posts" element={<BlogPosts />} />
                                  <Route path="/blog-posts/new" element={<BlogPostEditor />} />
                                  <Route path="/blog-posts/:id/edit" element={<BlogPostEditor />} />
                                  <Route path="/blog-categories" element={<BlogCategories />} />
                                  <Route path="/client-groups" element={<ClientGroups />} />
                                  <Route path="/rental-contracts" element={<RentalContracts />} />
                                  <Route path="/contracts/:id" element={<ContractDetail />} />
                                  <Route path="/contracts/:id/scaffolding" element={<ContractScaffoldingInput />} />
                                  <Route path="/recurring-income/:id" element={<RecurringIncomeDetail />} />
                                  <Route path="/recurring-income/:id/scaffolding" element={<RecurringIncomeScaffoldingInput />} />
                                  <Route path="/settings/landing" element={<LandingSettings />} />
                                  <Route path="/portfolio-manager" element={<PortfolioManager />} />
                                  <Route path="/meta-ads-dashboard" element={<MetaAdsDashboard />} />
                                  <Route path="/database-backup" element={<DatabaseBackup />} />
                                  <Route path="/chatbot" element={<ChatBotAI />} />
                                  <Route path="/ai-chat" element={<AIChat />} />
                                  <Route path="/mail" element={<Mail />} />
                                  <Route path="/cloud-usage" element={<CloudUsageDashboard />} />
                                  <Route path="/transaction-history" element={<TransactionHistory />} />
                                  <Route path="/settings/short-links" element={<ShortLinkManager />} />
                                  <Route path="/settings/invoice" element={<InvoiceSettings />} />
                                  <Route path="/settings/invoice/signature" element={<DocumentSignatureSettings />} />
                                  <Route path="/settings/invoice/template" element={<InvoiceTemplateSettings />} />
                                  <Route path="/settings/invoice/api-docs" element={<InvoiceApiDocs />} />
                                  
                                  <Route path="/settings/payment-auto" element={<PaymentAutoSettings />} />
                                  <Route path="/settings/bank-scraper" element={<BankScraperSettings />} />
                                  <Route path="/scraper-monitoring" element={<ScraperMonitoring />} />
                                  <Route path="/settings/custom-stamp" element={<CustomStampSettings />} />
                                  <Route path="/settings/invoice/manual" element={<ManualInvoice />} />
                                  <Route path="/settings/receipt/manual" element={<ManualReceipt />} />
                                  {/* Client Portal Routes */}
                                  <Route path="/client-dashboard" element={<ClientDashboard />} />
                                  <Route path="/my-contracts" element={<MyContracts />} />
                                  <Route path="/my-contracts/:id" element={<MyContractDetail />} />
                                  <Route path="/my-invoices" element={<MyInvoices />} />
                                  <Route path="/my-payments" element={<MyPayments />} />
                                  <Route path="/my-deliveries" element={<MyDeliveries />} />
                                  {/* Delivery Management Routes (Admin) */}
                                  <Route path="/delivery" element={<DeliveryDashboard />} />
                                  <Route path="/delivery/create" element={<CreateDeliveryTrip />} />
                                  <Route path="/delivery/trip/:id" element={<DeliveryTripDetail />} />
                                  {/* Scaffolding Configurator */}
                                  <Route path="/scaffolding-configurator" element={<ScaffoldingConfigurator />} />
                                  <Route path="*" element={<NotFound />} />
                                </Routes>
                              </Suspense>
                            </Layout>
                          </AppThemeProvider>
                        </ProtectedRoute>
                      }
                    />
                    
                    {/* Fallback */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </EditableContentProvider>
            </NotificationProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
