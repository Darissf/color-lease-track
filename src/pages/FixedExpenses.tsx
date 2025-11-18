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
import { NotificationProvider } from "@/contexts/NotificationContext";
import { HankoNotificationContainer } from "@/components/HankoNotificationContainer";
import { SakuraConfetti } from "@/components/SakuraConfetti";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { useExpenseNotifications } from "@/hooks/useExpenseNotifications";

export interface FixedExpense {
  id: string;
  user_id: string;
  expense_name: string;
  category: string;
  expense_type: 'fixed' | 'variable';
  fixed_amount: number | null;
  estimated_amount: number | null;
  due_date_day: number;
  bank_account_id: string | null;
  reminder_days_before: number | null;
  is_active: boolean | null;
  auto_create_expense: boolean | null;
  notes: string | null;
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

const FixedExpensesContent = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { addNotification } = useNotificationContext();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [history, setHistory] = useState<FixedExpenseHistory[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'calendar'>('list');
  const [showConfetti, setShowConfetti] = useState(false);

  // Auto-check for due dates and trigger notifications
  useExpenseNotifications(expenses, history);

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
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('fixed_expense_history')
        .insert({
          fixed_expense_id: expense.id,
          user_id: user.id,
          paid_date: new Date().toISOString().split('T')[0],
          paid_amount: amount,
          status: 'paid',
        });

      if (error) throw error;

      // Trigger sakura confetti explosion
      setShowConfetti(true);

      // Show hanko notification instead of toast
      addNotification({
        type: 'paid',
        title: '支払完了',
        message: `${expense.expense_name} berhasil dibayar!`,
        expenseName: expense.expense_name,
        amount: amount,
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

  const handleFormSubmit = async () => {
    setIsFormOpen(false);
    await fetchExpenses();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/20">
        {/* Animated Background Elements */}
        
        {/* Stars */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(100)].map((_, i) => (
            <div
              key={`star-${i}`}
              className="absolute w-1 h-1 bg-white rounded-full animate-[star-twinkle_3s_ease-in-out_infinite]"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                opacity: Math.random() * 0.7 + 0.3,
              }}
            />
          ))}
        </div>

        {/* Moon */}
        <div className="absolute top-20 right-20 w-32 h-32 rounded-full bg-gradient-to-br from-[hsl(var(--moon-gold))] to-yellow-200 opacity-80 blur-sm animate-[moon-pulse_6s_ease-in-out_infinite] pointer-events-none" />

        {/* Night Fog */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <div
              key={`fog-${i}`}
              className="absolute w-96 h-96 rounded-full bg-[hsl(var(--fog-mist))] opacity-10 blur-3xl animate-[fog-drift_20s_ease-in-out_infinite]"
              style={{
                left: `${Math.random() * 80}%`,
                top: `${Math.random() * 80}%`,
                animationDelay: `${i * 4}s`,
              }}
            />
          ))}
        </div>

        {/* Torii Gate Silhouette */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-64 opacity-20 pointer-events-none">
          <svg viewBox="0 0 200 200" className="w-full h-full animate-[torii-glow_4s_ease-in-out_infinite]">
            <rect x="40" y="40" width="12" height="140" fill="currentColor" className="text-[hsl(var(--torii-red))]" />
            <rect x="148" y="40" width="12" height="140" fill="currentColor" className="text-[hsl(var(--torii-red))]" />
            <rect x="20" y="50" width="160" height="16" rx="4" fill="currentColor" className="text-[hsl(var(--torii-red))]" />
            <rect x="30" y="80" width="140" height="12" rx="3" fill="currentColor" className="text-[hsl(var(--torii-red))]" />
          </svg>
        </div>

        {/* Floating Origami */}
        {[...Array(18)].map((_, i) => (
          <div
            key={`origami-${i}`}
            className="absolute animate-[origami-float_15s_ease-in-out_infinite] opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${12 + Math.random() * 8}s`,
            }}
          >
            <svg width="30" height="30" viewBox="0 0 50 50">
              <polygon points="25,5 45,45 5,45" fill={`hsl(${Math.random() * 360}, 70%, 60%)`} opacity="0.6" />
            </svg>
          </div>
        ))}

        {/* Fireflies */}
        {[...Array(35)].map((_, i) => (
          <div
            key={`firefly-${i}`}
            className="absolute w-2 h-2 rounded-full bg-[hsl(var(--firefly-glow-green))] animate-[firefly-glow_2s_ease-in-out_infinite] pointer-events-none"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              boxShadow: '0 0 10px hsl(var(--firefly-glow-green))',
            }}
          >
            <div className="animate-[firefly-drift_8s_ease-in-out_infinite]" />
          </div>
        ))}

        {/* Falling Bamboo Leaves */}
        {[...Array(28)].map((_, i) => (
          <div
            key={`bamboo-${i}`}
            className="absolute animate-[bamboo-fall_12s_linear_infinite] opacity-40"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-10%`,
              animationDelay: `${i * 0.4}s`,
            }}
          >
            <div className="w-8 h-16 bg-gradient-to-b from-[hsl(var(--bamboo-night-green))] to-emerald-800 rounded-full animate-[bamboo-sway_2s_ease-in-out_infinite]" />
          </div>
        ))}

        {/* Sakura Petals */}
        {[...Array(20)].map((_, i) => (
          <div
            key={`petal-${i}`}
            className="absolute animate-[sakura-fall_15s_linear_infinite] opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-10%`,
              animationDelay: `${i * 0.7}s`,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 50 50">
              <circle cx="25" cy="25" r="8" fill="hsl(var(--sakura-pink))" opacity="0.8" />
              <ellipse cx="25" cy="15" rx="5" ry="10" fill="hsl(var(--cherry-glow-pink))" opacity="0.6" />
              <ellipse cx="35" cy="25" rx="10" ry="5" fill="hsl(var(--cherry-glow-pink))" opacity="0.6" />
              <ellipse cx="25" cy="35" rx="5" ry="10" fill="hsl(var(--cherry-glow-pink))" opacity="0.6" />
              <ellipse cx="15" cy="25" rx="10" ry="5" fill="hsl(var(--cherry-glow-pink))" opacity="0.6" />
            </svg>
          </div>
        ))}

        {/* Floating Lanterns */}
        {[...Array(8)].map((_, i) => (
          <div
            key={`lantern-${i}`}
            className="absolute animate-[lantern-float_20s_ease-in-out_infinite]"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 80}%`,
              animationDelay: `${i * 2.5}s`,
            }}
          >
            <div className="w-16 h-20 bg-gradient-to-b from-[hsl(var(--lantern-glow-orange))] to-red-600 rounded-lg opacity-40 shadow-[0_0_30px_hsl(var(--lantern-glow-orange))]" />
          </div>
        ))}

        {/* Main Content */}
        <div className="relative z-10 container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[hsl(var(--torii-red))] via-[hsl(var(--sakura-pink))] to-[hsl(var(--gold-kin))] bg-clip-text text-transparent">
                🏮 Pengeluaran Tetap 🏮
              </h1>
              <p className="text-muted-foreground">
                Kelola tagihan bulanan Anda
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-full"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Button onClick={handleAddExpense} className="gap-2">
                <Plus className="w-5 h-5" />
                Tambah Pengeluaran
              </Button>
            </div>
          </div>

          {/* Summary */}
          <FixedExpenseSummary expenses={expenses} history={history} />

          {/* Tabs */}
          <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as 'list' | 'calendar')} className="mt-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="list" className="gap-2">
                <LayoutGrid className="w-4 h-4" />
                List View
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                Calendar View
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-6">
              <FixedExpenseList
                expenses={expenses}
                history={history}
                loading={loading}
                onEdit={handleEditExpense}
                onDelete={handleDeleteExpense}
                onMarkAsPaid={handleMarkAsPaid}
              />
            </TabsContent>

            <TabsContent value="calendar" className="mt-6">
              <FixedExpenseCalendar
                expenses={expenses}
                history={history}
                onMarkAsPaid={handleMarkAsPaid}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <FixedExpenseForm
              expense={editingExpense || undefined}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Hanko Notification Container */}
      <HankoNotificationContainer />

      {/* Sakura Confetti Effect */}
      {showConfetti && (
        <SakuraConfetti
          trigger={showConfetti}
          onComplete={() => setShowConfetti(false)}
          particleCount={60}
          duration={3000}
        />
      )}
    </>
  );
};

const FixedExpenses = () => {
  return (
    <NotificationProvider>
      <FixedExpensesContent />
    </NotificationProvider>
  );
};

export default FixedExpenses;
