import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon, LayoutGrid } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
        description: "Gagal menandai sebagai dibayar",
        variant: "destructive",
      });
    }
  };

  const handleFormSubmit = async () => {
    setIsFormOpen(false);
    fetchExpenses();
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pengeluaran Tetap</h1>
            <p className="text-muted-foreground">Kelola tagihan bulanan Anda</p>
          </div>
          <Button onClick={handleAddExpense}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Pengeluaran Tetap
          </Button>
        </div>

        <FixedExpenseSummary expenses={expenses} history={history} />

        <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as 'list' | 'calendar')} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="list">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Daftar
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Kalender
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
    </Layout>
  );
};

export default FixedExpenses;
