import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon, LayoutGrid, Moon, Sun } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ui/theme-provider";
import { FixedExpenseSummary } from "@/components/fixed-expenses/FixedExpenseSummary";
import { FixedExpenseList } from "@/components/fixed-expenses/FixedExpenseList";
import { FixedExpenseCalendar } from "@/components/fixed-expenses/FixedExpenseCalendar";
import { FixedExpenseForm } from "@/components/fixed-expenses/FixedExpenseForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface FixedExpense {
  id: string;
  user_id: string;
  expense_name: string;
  category: string;
  expense_type: 'fixed' | 'variable';
  fixed_amount?: number;
  estimated_amount?: number;
  due_date_day: number;
  bank_account_id?: string;
  reminder_days_before: number;
  is_active: boolean;
  auto_create_expense: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FixedExpenseHistory {
  id: string;
  fixed_expense_id: string;
  user_id: string;
  paid_date: string;
  paid_amount: number;
  expense_id?: string;
  status: 'paid' | 'pending' | 'overdue';
  notes?: string;
  created_at: string;
}

const FixedExpenses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [history, setHistory] = useState<FixedExpenseHistory[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    if (user) {
      fetchExpenses();
      fetchHistory();
    }
  }, [user]);

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('fixed_expenses')
        .select('*')
        .eq('user_id', user?.id)
        .order('due_date_day', { ascending: true });

      if (error) throw error;
      setExpenses((data || []) as FixedExpense[]);
    } catch (error) {
      console.error('Error fetching fixed expenses:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data pengeluaran tetap",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('fixed_expense_history')
        .select('*')
        .eq('user_id', user?.id)
        .gte('paid_date', startDate)
        .lte('paid_date', endDate);

      if (error) throw error;
      setHistory((data || []) as FixedExpenseHistory[]);
    } catch (error) {
      console.error('Error fetching expense history:', error);
    }
  };

  const handleAddExpense = () => {
    setEditingExpense(null);
    setIsFormOpen(true);
  };

  const handleEditExpense = (expense: FixedExpense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('fixed_expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Pengeluaran tetap berhasil dihapus",
      });

      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus pengeluaran tetap",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsPaid = async (expense: FixedExpense, amount: number) => {
    try {
      const { error } = await supabase
        .from('fixed_expense_history')
        .insert({
          fixed_expense_id: expense.id,
          user_id: user?.id,
          paid_date: new Date().toISOString().split('T')[0],
          paid_amount: amount,
          status: 'paid',
        });

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: `${expense.expense_name} ditandai sudah dibayar`,
      });

      fetchHistory();
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast({
        title: "Error",
        description: "Gagal menandai sebagai sudah dibayar",
        variant: "destructive",
      });
    }
  };

  const handleFormSubmit = () => {
    setIsFormOpen(false);
    fetchExpenses();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* ===== ANIMATED BACKGROUND ELEMENTS ===== */}
      
      {/* Stars (Dark Mode Only) */}
      <div className="stars-background dark:block hidden">
        {[...Array(100)].map((_, i) => (
          <div
            key={`star-${i}`}
            className="star"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${3 + Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      {/* Moon (Dark Mode Only) */}
      <div className="moon-element dark:block hidden" />

      {/* Night Fog (Dark Mode Only) */}
      <div className="night-fog dark:block hidden" />

      {/* Torii Gate Silhouette */}
      <div className="torii-gate-silhouette">
        <svg viewBox="0 0 800 600" className="w-full h-full" fill="currentColor">
          <rect x="150" y="450" width="40" height="150" />
          <rect x="610" y="450" width="40" height="150" />
          <rect x="50" y="420" width="700" height="40" rx="10" />
          <rect x="80" y="380" width="640" height="30" rx="8" />
          <ellipse cx="120" cy="410" rx="20" ry="10" />
          <ellipse cx="680" cy="410" rx="20" ry="10" />
        </svg>
      </div>

      {/* Sakura Petals */}
      <div className="sakura-container pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={`sakura-${i}`}
            className="sakura-petal"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${15 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      {/* Japanese Lanterns */}
      <div className="lantern-container pointer-events-none">
        {[...Array(7)].map((_, i) => (
          <div
            key={`lantern-${i}`}
            className="japanese-lantern fixed"
            style={{
              left: `${20 + i * 12}%`,
              top: `${10 + Math.random() * 20}%`,
              animationDelay: `${i * 0.5}s`
            }}
          />
        ))}
      </div>

      {/* NEW: Floating Origami */}
      <div className="origami-container pointer-events-none">
        {[...Array(18)].map((_, i) => {
          const types = ['crane', 'boat', 'butterfly', 'star', 'heart'];
          const type = types[i % types.length];
          return (
            <div
              key={`origami-${i}`}
              className={`origami-piece origami-${type} fixed`}
              style={{
                left: `${Math.random() * 90}%`,
                top: `${Math.random() * 80}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${20 + Math.random() * 15}s`
              }}
            />
          );
        })}
      </div>

      {/* NEW: Fireflies */}
      <div className="fireflies-container pointer-events-none">
        {[...Array(35)].map((_, i) => (
          <div
            key={`firefly-${i}`}
            className="firefly fixed"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: `${Math.random() * 60}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${3 + Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      {/* NEW: Bamboo Leaves */}
      <div className="bamboo-leaves-container pointer-events-none">
        {[...Array(28)].map((_, i) => (
          <div
            key={`bamboo-${i}`}
            className="bamboo-leaf"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${12 + Math.random() * 13}s`
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4 md:p-6 relative z-10">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold japanese-title mb-2">
              <span className="text-gradient-torii animate-shimmer-text">固定費管理</span>
              <span className="text-gradient-gold"> / </span>
              <span className="text-gradient-indigo">Pengeluaran Tetap</span>
            </h1>
            <p className="text-muted-foreground">Kelola pengeluaran tetap bulanan Anda</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="relative overflow-hidden transition-all hover:scale-110"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            <Button
              onClick={handleAddExpense}
              className="gradient-torii-gold hover:scale-105 transition-all shadow-lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Tambah Tagihan
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <FixedExpenseSummary expenses={expenses} history={history} />

        {/* Tabs */}
        <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as 'list' | 'calendar')} className="mt-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Daftar
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Kalender
            </TabsTrigger>
          </TabsList>
          <TabsContent value="list" className="mt-4">
            <FixedExpenseList
              expenses={expenses}
              history={history}
              loading={loading}
              onEdit={handleEditExpense}
              onDelete={handleDeleteExpense}
              onMarkAsPaid={handleMarkAsPaid}
            />
          </TabsContent>
          <TabsContent value="calendar" className="mt-4">
            <FixedExpenseCalendar
              expenses={expenses}
              history={history}
              onMarkAsPaid={handleMarkAsPaid}
            />
          </TabsContent>
        </Tabs>

        {/* Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <FixedExpenseForm
              expense={editingExpense}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default FixedExpenses;
