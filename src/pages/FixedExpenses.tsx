import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
    <div className="japanese-background relative min-h-screen">
      {/* Animated Background Patterns */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {/* Seigaiha Wave Pattern */}
        <div 
          className="absolute inset-0 opacity-5 animate-wave-flow"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='100' viewBox='0 0 200 100'%3E%3Cpath d='M0 50 Q25 25 50 50 T100 50 T150 50 T200 50' stroke='%23003A70' fill='none' stroke-width='2'/%3E%3Cpath d='M0 75 Q25 50 50 75 T100 75 T150 75 T200 75' stroke='%23003A70' fill='none' stroke-width='2'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 100px',
          }}
        />
        
        {/* Floating Sakura Petals */}
        <div className="sakura-container absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="sakura-petal absolute animate-sakura-fall"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${15 + Math.random() * 10}s`,
                width: '20px',
                height: '20px',
                background: 'radial-gradient(circle, hsl(var(--sakura-pink)) 0%, hsl(340 100% 75%) 100%)',
                clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                filter: 'blur(0.5px)',
                opacity: 0.8,
              }}
            />
          ))}
        </div>

        {/* Floating Japanese Lanterns */}
        <div className="lantern-container absolute inset-0">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="japanese-lantern absolute animate-lantern-float"
              style={{
                left: `${20 + i * 15}%`,
                top: `${10 + (i % 3) * 20}%`,
                animationDelay: `${i * 0.5}s`,
                width: '40px',
                height: '60px',
                background: 'linear-gradient(135deg, hsl(var(--torii-red)), hsl(14 91% 56%))',
                borderRadius: '10px 10px 20px 20px',
                boxShadow: '0 0 30px hsl(var(--torii-red) / 0.6)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-6 space-y-6 relative" style={{ zIndex: 1 }}>
        {/* Japanese Header */}
        <div className="japanese-header flex justify-between items-center mb-8 animate-slide-down">
          <div>
            <h1 className="text-4xl font-bold japanese-title mb-2">
              <span className="text-gradient-torii animate-shimmer-text">
                固定費管理
              </span>
              <span className="text-gradient-gold"> / </span>
              <span className="text-gradient-indigo">
                Pengeluaran Tetap
              </span>
            </h1>
            <p className="text-muted-foreground japanese-text">
              Kelola tagihan bulanan Anda dengan gaya Jepang
            </p>
          </div>
          
          <Button 
            onClick={handleAddExpense}
            className="japanese-button relative overflow-hidden group"
            style={{
              background: 'var(--gradient-torii-gold)',
              color: 'white',
              boxShadow: 'var(--shadow-glow-gold)',
            }}
          >
            <Plus className="mr-2 h-4 w-4 animate-icon-rotate" />
            <span>Tambah Pengeluaran Tetap</span>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          </Button>
        </div>

        <FixedExpenseSummary expenses={expenses} history={history} />

        <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as 'list' | 'calendar')} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 p-1 bg-muted/50 backdrop-blur">
            <TabsTrigger 
              value="list" 
              className="japanese-tab data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-teal-500 data-[state=active]:text-white transition-all"
            >
              <LayoutGrid className="mr-2 h-4 w-4 animate-icon-bounce" />
              Daftar
            </TabsTrigger>
            <TabsTrigger 
              value="calendar"
              className="japanese-tab data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white transition-all"
            >
              <CalendarIcon className="mr-2 h-4 w-4 animate-icon-bounce" />
              Kalender
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6 animate-fade-in-up">
            <FixedExpenseList
              expenses={expenses}
              history={history}
              loading={loading}
              onEdit={handleEditExpense}
              onDelete={handleDeleteExpense}
              onMarkAsPaid={handleMarkAsPaid}
            />
          </TabsContent>

          <TabsContent value="calendar" className="mt-6 animate-fade-in-up">
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
    </div>
  );
};

export default FixedExpenses;
