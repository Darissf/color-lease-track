import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon, LayoutGrid, Moon, Sun } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FixedExpenseSummary } from "@/components/fixed-expenses/FixedExpenseSummary";
import { cn } from "@/lib/utils";
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
import { getNowInJakarta, getJakartaDateString, getJakartaMonth, getJakartaYear } from "@/lib/timezone";

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
  const { addNotification } = useNotificationContext();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [history, setHistory] = useState<FixedExpenseHistory[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'calendar'>('list');
  const [showConfetti, setShowConfetti] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('fixedExpenses_itemsPerPage');
    return saved ? parseInt(saved) : 10;
  });

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
      const currentMonth = getJakartaMonth();
      const currentYear = getJakartaYear();
      const startDate = getJakartaDateString(new Date(currentYear, currentMonth, 1));
      const endDate = getJakartaDateString(new Date(currentYear, currentMonth + 1, 0));

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
      // Step 1: Insert to fixed_expense_history
      const { error: historyError } = await supabase
        .from('fixed_expense_history')
        .insert({
          fixed_expense_id: expense.id,
          user_id: user.id,
          paid_date: getJakartaDateString(),
          paid_amount: amount,
          status: 'paid',
        });

      if (historyError) throw historyError;

      // Step 2: Auto-create expense entry
      const { error: expenseError } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          transaction_name: expense.expense_name,
          category: 'Pengeluaran Tetap',
          amount: amount,
          date: getJakartaDateString(),
          description: `Pembayaran ${expense.expense_name} - Jatuh tempo tanggal ${expense.due_date_day}`,
          bank_account_id: expense.bank_account_id || null,
          is_fixed: true,
          checked: false,
        });

      if (expenseError) throw expenseError;

      // Trigger sakura confetti explosion
      setShowConfetti(true);

      // Show hanko notification instead of toast
      addNotification({
        type: 'paid',
        title: 'Pembayaran Selesai',
        message: `${expense.expense_name} berhasil dibayar dan tercatat di Pengeluaran!`,
        expenseName: expense.expense_name,
        amount: amount,
      });

      fetchHistory();
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast({
        title: "Error",
        description: "Gagal mencatat pembayaran",
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
      <div className="min-h-screen relative overflow-hidden">
        {/* Main Content */}
        <div className="relative z-10 container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2 text-foreground">
                🏮 Pengeluaran Tetap 🏮
              </h1>
              <p className="text-muted-foreground">
                Kelola tagihan bulanan Anda
              </p>
            </div>
            <div className="flex gap-2">
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
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
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
