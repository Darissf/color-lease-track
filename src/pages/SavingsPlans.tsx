import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Target, Calendar, TrendingUp, ArrowUpCircle, ArrowDownCircle, History, Repeat, Wallet, Loader2 } from "lucide-react";
import { formatRupiah } from "@/lib/currency";
import { format, differenceInDays } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { ColoredProgressBar } from "@/components/ColoredProgressBar";
import { GradientButton } from "@/components/GradientButton";
import { ColoredStatCard } from "@/components/ColoredStatCard";
import { cn } from "@/lib/utils";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { useAppTheme } from "@/contexts/AppThemeContext";

interface SavingsPlan {
  id: string;
  plan_name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  notes: string | null;
  category: string;
  created_at: string;
}

interface SavingsTransaction {
  id: string;
  savings_plan_id: string;
  transaction_type: "deposit" | "withdrawal";
  amount: number;
  notes: string | null;
  transaction_date: string;
  created_at: string;
}

interface RecurringTransaction {
  id: string;
  savings_plan_id: string;
  amount: number;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  start_date: string;
  end_date: string | null;
  next_execution_date: string;
  is_active: boolean;
  notes: string | null;
}

export default function SavingsPlans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { activeTheme, themeColors } = useAppTheme();
  const [plans, setPlans] = useState<SavingsPlan[]>([]);
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SavingsPlan | null>(null);
  const [editingPlan, setEditingPlan] = useState<SavingsPlan | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('savingsPlans_itemsPerPage');
    return saved ? parseInt(saved) : 10;
  });

  const getCategoryInfo = (category: string) => {
    const categories = {
      darurat: { 
        emoji: "🚨", 
        label: "Dana Darurat", 
        gradient: "bg-gradient-to-br from-red-500 via-orange-500 to-red-600",
        shadow: "shadow-xl shadow-red-500/50"
      },
      liburan: { 
        emoji: "✈️", 
        label: "Liburan", 
        gradient: "bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600",
        shadow: "shadow-xl shadow-blue-500/50"
      },
      investasi: { 
        emoji: "📈", 
        label: "Investasi", 
        gradient: "bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600",
        shadow: "shadow-xl shadow-emerald-500/50"
      },
      pendidikan: { 
        emoji: "🎓", 
        label: "Pendidikan", 
        gradient: "bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600",
        shadow: "shadow-xl shadow-purple-500/50"
      },
      kendaraan: { 
        emoji: "🚗", 
        label: "Kendaraan", 
        gradient: "bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-600",
        shadow: "shadow-xl shadow-yellow-500/50"
      },
      properti: { 
        emoji: "🏠", 
        label: "Properti", 
        gradient: "bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-600",
        shadow: "shadow-xl shadow-indigo-500/50"
      },
      pernikahan: { 
        emoji: "💒", 
        label: "Pernikahan", 
        gradient: "bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600",
        shadow: "shadow-xl shadow-pink-500/50"
      },
      lainnya: { 
        emoji: "📦", 
        label: "Lainnya", 
        gradient: "bg-gradient-to-br from-gray-500 via-slate-500 to-gray-600",
        shadow: "shadow-xl shadow-gray-500/50"
      },
    };
    return categories[category as keyof typeof categories] || categories.lainnya;
  };
  const [formData, setFormData] = useState({
    plan_name: "",
    target_amount: "",
    current_amount: "",
    deadline: "",
    notes: "",
    category: "lainnya",
  });
  const [transactionFormData, setTransactionFormData] = useState({
    transaction_type: "deposit" as "deposit" | "withdrawal",
    amount: "",
    notes: "",
    transaction_date: format(new Date(), "yyyy-MM-dd"),
  });
  const [recurringFormData, setRecurringFormData] = useState({
    amount: "",
    frequency: "monthly" as "daily" | "weekly" | "monthly" | "yearly",
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: "",
    notes: "",
  });

  useEffect(() => {
    if (user) {
      fetchPlans();
      fetchTransactions();
      fetchRecurringTransactions();
    }
  }, [user]);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("savings_plans")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast({
        title: "Error",
        description: "Failed to load savings plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("savings_transactions")
        .select("*")
        .eq("user_id", user?.id)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      setTransactions((data || []) as SavingsTransaction[]);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const fetchRecurringTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("recurring_transactions")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecurringTransactions((data || []) as RecurringTransaction[]);
    } catch (error) {
      console.error("Error fetching recurring transactions:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const planData = {
        plan_name: formData.plan_name,
        target_amount: parseFloat(formData.target_amount),
        current_amount: parseFloat(formData.current_amount) || 0,
        deadline: formData.deadline || null,
        notes: formData.notes || null,
        category: formData.category,
        user_id: user?.id,
      };

      if (editingPlan) {
        const { error } = await supabase
          .from("savings_plans")
          .update(planData)
          .eq("id", editingPlan.id);
        if (error) throw error;
        toast({ title: "Success", description: "Savings plan updated successfully" });
      } else {
        const { error } = await supabase.from("savings_plans").insert([planData]);
        if (error) throw error;
        toast({ title: "Success", description: "Savings plan created successfully" });
      }

      setDialogOpen(false);
      resetForm();
      fetchPlans();
    } catch (error) {
      console.error("Error saving plan:", error);
      toast({
        title: "Error",
        description: "Failed to save savings plan",
        variant: "destructive",
      });
    }
  };

  const handleRecurringSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    try {
      const recurringData = {
        savings_plan_id: selectedPlan.id,
        user_id: user?.id,
        amount: parseFloat(recurringFormData.amount),
        frequency: recurringFormData.frequency,
        start_date: recurringFormData.start_date,
        end_date: recurringFormData.end_date || null,
        next_execution_date: recurringFormData.start_date,
        notes: recurringFormData.notes || null,
        is_active: true,
      };

      const { error } = await supabase
        .from("recurring_transactions")
        .insert([recurringData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Recurring transaction berhasil dibuat",
      });

      setRecurringDialogOpen(false);
      resetRecurringForm();
      fetchRecurringTransactions();
    } catch (error) {
      console.error("Error saving recurring transaction:", error);
      toast({
        title: "Error",
        description: "Failed to save recurring transaction",
        variant: "destructive",
      });
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    try {
      const transactionData = {
        savings_plan_id: selectedPlan.id,
        user_id: user?.id,
        transaction_type: transactionFormData.transaction_type,
        amount: parseFloat(transactionFormData.amount),
        notes: transactionFormData.notes || null,
        transaction_date: transactionFormData.transaction_date,
      };

      const { error } = await supabase
        .from("savings_transactions")
        .insert([transactionData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${transactionFormData.transaction_type === "deposit" ? "Deposit" : "Withdrawal"} berhasil ditambahkan`,
      });

      setTransactionDialogOpen(false);
      resetTransactionForm();
      fetchPlans();
      fetchTransactions();
    } catch (error) {
      console.error("Error saving transaction:", error);
      toast({
        title: "Error",
        description: "Failed to save transaction",
        variant: "destructive",
      });
    }
  };

  const toggleRecurringStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("recurring_transactions")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Recurring transaction ${!currentStatus ? "activated" : "deactivated"}`,
      });

      fetchRecurringTransactions();
    } catch (error) {
      console.error("Error toggling recurring status:", error);
      toast({
        title: "Error",
        description: "Failed to update recurring transaction",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    if (!confirm("Hapus recurring transaction ini?")) return;
    try {
      const { error } = await supabase
        .from("recurring_transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Success", description: "Recurring transaction berhasil dihapus" });
      fetchRecurringTransactions();
    } catch (error) {
      console.error("Error deleting recurring transaction:", error);
      toast({
        title: "Error",
        description: "Failed to delete recurring transaction",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("Hapus transaksi ini?")) return;
    try {
      const { error } = await supabase
        .from("savings_transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Success", description: "Transaksi berhasil dihapus" });
      fetchPlans();
      fetchTransactions();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this savings plan?")) return;
    try {
      const { error } = await supabase.from("savings_plans").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Savings plan deleted successfully" });
      fetchPlans();
      fetchTransactions();
      fetchRecurringTransactions();
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast({
        title: "Error",
        description: "Failed to delete savings plan",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      plan_name: "",
      target_amount: "",
      current_amount: "",
      deadline: "",
      notes: "",
      category: "lainnya",
    });
    setEditingPlan(null);
  };

  const resetTransactionForm = () => {
    setTransactionFormData({
      transaction_type: "deposit",
      amount: "",
      notes: "",
      transaction_date: format(new Date(), "yyyy-MM-dd"),
    });
    setSelectedPlan(null);
  };

  const resetRecurringForm = () => {
    setRecurringFormData({
      amount: "",
      frequency: "monthly",
      start_date: format(new Date(), "yyyy-MM-dd"),
      end_date: "",
      notes: "",
    });
    setSelectedPlan(null);
  };

  const openTransactionDialog = (plan: SavingsPlan) => {
    setSelectedPlan(plan);
    setTransactionDialogOpen(true);
  };

  const openRecurringDialog = (plan: SavingsPlan) => {
    setSelectedPlan(plan);
    setRecurringDialogOpen(true);
  };

  const openEditDialog = (plan: SavingsPlan) => {
    setEditingPlan(plan);
    setFormData({
      plan_name: plan.plan_name,
      target_amount: plan.target_amount.toString(),
      current_amount: plan.current_amount.toString(),
      deadline: plan.deadline || "",
      notes: plan.notes || "",
      category: plan.category || "lainnya",
    });
    setDialogOpen(true);
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getDaysRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    return differenceInDays(new Date(deadline), new Date());
  };

  const totalSaved = plans.reduce((sum, plan) => sum + plan.current_amount, 0);
  const totalTarget = plans.reduce((sum, plan) => sum + plan.target_amount, 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  // Prepare chart data
  const chartData = plans.map(plan => ({
    name: plan.plan_name.length > 15 ? plan.plan_name.substring(0, 15) + "..." : plan.plan_name,
    current: Number(plan.current_amount),
    target: Number(plan.target_amount),
    progress: ((plan.current_amount / plan.target_amount) * 100).toFixed(1),
  }));

  const pieChartData = plans.map(plan => ({
    name: plan.plan_name,
    value: Number(plan.current_amount),
  }));

  const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-1">{payload[0].payload.name}</p>
          <p className="text-sm text-muted-foreground">
            Current: {formatRupiah(payload[0].value)}
          </p>
          {payload[1] && (
            <p className="text-sm text-muted-foreground">
              Target: {formatRupiah(payload[1].value)}
            </p>
          )}
          <p className="text-sm font-medium mt-1">
            Progress: {payload[0].payload.progress}%
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <AnimatedBackground theme="savings">
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Target className="h-12 w-12 mx-auto mb-4 animate-spin bg-gradient-to-r from-blue-600 via-cyan-600 to-purple-600 bg-clip-text text-transparent" />
            <p className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Memuat rencana tabungan...
            </p>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground theme="savings">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/50">
              <Target className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-purple-600 bg-clip-text text-transparent">
                Rencana Tabungan
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Kelola dan pantau progress rencana tabungan Anda menuju target finansial
              </p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <GradientButton variant="savings" size="default" icon={Plus}>
                Tambah Rencana
              </GradientButton>
            </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader className="bg-gradient-to-r from-blue-600 via-cyan-600 to-purple-600 -m-6 mb-6 p-6 rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <DialogTitle className="text-2xl font-bold text-white">
                  {editingPlan ? "Edit Rencana Tabungan" : "Tambah Rencana Tabungan"}
                </DialogTitle>
              </div>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="plan_name">Nama Rencana</Label>
                <Input
                  id="plan_name"
                  value={formData.plan_name}
                  onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                  placeholder="e.g., Liburan Bali, Dana Darurat"
                  className="border-2 border-blue-500/20 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">Kategori</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="border-2 border-cyan-500/20 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="darurat">🚨 Dana Darurat</SelectItem>
                    <SelectItem value="liburan">✈️ Liburan</SelectItem>
                    <SelectItem value="investasi">📈 Investasi</SelectItem>
                    <SelectItem value="pendidikan">🎓 Pendidikan</SelectItem>
                    <SelectItem value="kendaraan">🚗 Kendaraan</SelectItem>
                    <SelectItem value="properti">🏠 Properti</SelectItem>
                    <SelectItem value="pernikahan">💒 Pernikahan</SelectItem>
                    <SelectItem value="lainnya">📦 Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="target_amount">Target Amount</Label>
                <Input
                  id="target_amount"
                  type="number"
                  value={formData.target_amount}
                  onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                  placeholder="0"
                  className="border-2 border-blue-500/20 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                  required
                />
              </div>
              <div>
                <Label htmlFor="current_amount">Current Amount</Label>
                <Input
                  id="current_amount"
                  type="number"
                  value={formData.current_amount}
                  onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                  placeholder="0"
                  className="border-2 border-blue-500/20 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
              <div>
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="border-2 border-purple-500/20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Catatan tambahan..."
                  className="border-2 border-blue-500/20 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 border-2 border-blue-500/20 hover:bg-blue-500/10"
                  onClick={() => setDialogOpen(false)}
                >
                  Batal
                </Button>
                <GradientButton 
                  type="submit" 
                  variant="savings" 
                  icon={Target}
                  className="flex-1"
                >
                  {editingPlan ? "Update" : "Simpan"}
                </GradientButton>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ColoredStatCard
          title="Total Tabungan"
          value={formatRupiah(totalSaved)}
          icon={Wallet}
          gradient="income"
          trend={{ value: "+15%", isPositive: true }}
          subtitle="Total yang sudah dikumpulkan"
        />
        <ColoredStatCard
          title="Total Target"
          value={formatRupiah(totalTarget)}
          icon={Target}
          gradient="budget"
          subtitle={`${plans.length} rencana aktif`}
        />
        <ColoredStatCard
          title="Progress Keseluruhan"
          value={`${overallProgress.toFixed(1)}%`}
          icon={TrendingUp}
          gradient="savings"
          trend={{ value: `${plans.length} rencana`, isPositive: true }}
        />
        <ColoredStatCard
          title="Sisa Kebutuhan"
          value={formatRupiah(totalTarget - totalSaved)}
          icon={ArrowDownCircle}
          gradient="expense"
          subtitle={plans.length > 0 && plans[0].deadline ? `Target: ${format(new Date(plans[0].deadline), 'dd MMM yyyy')}` : 'Tidak ada deadline'}
        />
      </div>

      {/* Overall Progress Bar */}
      {plans.length > 0 && (
        <Card className={cn(
          "border-2 border-blue-500/20 shadow-xl",
          activeTheme === 'japanese' && "bg-slate-900/90 border-slate-700"
        )}>
          <CardHeader className="bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-purple-500/10 border-b-2 border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <CardTitle className={cn(
                "text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent",
                activeTheme === 'japanese' && 'text-white'
              )}>
                Progress Keseluruhan
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ColoredProgressBar value={overallProgress} showLabel={true} height="h-4" animated={true} />
            <div className="flex justify-between text-sm mt-3">
              <span className="font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-lg">{formatRupiah(totalSaved)}</span>
              <span className="font-bold text-blue-600 bg-blue-500/10 px-3 py-1 rounded-lg">{formatRupiah(totalTarget)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Section */}
      {plans.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Bar Chart */}
          <Card className={cn(
            activeTheme === 'japanese' && "bg-slate-900/90 border-slate-700"
          )}>
            <CardHeader>
              <CardTitle className={cn(
                "text-base",
                activeTheme === 'japanese' && 'text-white'
              )}>Progress Comparison</CardTitle>
              <CardDescription className={activeTheme === 'japanese' ? 'text-slate-300' : ''}>
                Current savings vs target for each plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="current" fill="hsl(var(--primary))" name="Current" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="target" fill="hsl(var(--muted))" name="Target" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card className={cn(
            activeTheme === 'japanese' && "bg-slate-900/90 border-slate-700"
          )}>
            <CardHeader>
              <CardTitle className={cn(
                "text-base",
                activeTheme === 'japanese' && 'text-white'
              )}>Savings Distribution</CardTitle>
              <CardDescription className={activeTheme === 'japanese' ? 'text-slate-300' : ''}>
                How your savings are distributed across plans
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatRupiah(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Savings Plans List with Tabs */}
      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList className="border-2 border-blue-500/20 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 p-1">
          <TabsTrigger 
            value="plans"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/50"
          >
            <Target className="h-4 w-4 mr-2" />
            Rencana Tabungan
          </TabsTrigger>
          <TabsTrigger 
            value="transactions"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/50"
          >
            <History className="h-4 w-4 mr-2" />
            History Transaksi
          </TabsTrigger>
          <TabsTrigger 
            value="recurring"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/50"
          >
            <Repeat className="h-4 w-4 mr-2" />
            Auto-Deposit
          </TabsTrigger>
          <TabsTrigger 
            value="analytics"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/50"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          {plans.length === 0 ? (
            <Card className={cn(
              "border-2 border-blue-500/20",
              activeTheme === 'japanese' && "bg-slate-900/90 border-slate-700"
            )}>
              <CardContent className="py-12 text-center">
                <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 via-cyan-500 to-purple-600 flex items-center justify-center shadow-xl shadow-blue-500/50">
                  <Target className="h-10 w-10 text-white" />
                </div>
                <p className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  Belum ada rencana tabungan
                </p>
                <p className={cn(
                  "text-sm mb-4",
                  activeTheme === 'japanese' ? 'text-slate-300' : 'text-muted-foreground'
                )}>
                  Mulai dengan menambahkan rencana tabungan pertama Anda
                </p>
                <GradientButton variant="savings" icon={Plus} onClick={() => setDialogOpen(true)}>
                  Buat Rencana Pertama
                </GradientButton>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map((plan) => {
                const progress = calculateProgress(plan.current_amount, plan.target_amount);
                const daysRemaining = getDaysRemaining(plan.deadline);
                const isOverdue = daysRemaining !== null && daysRemaining < 0;
                const planTransactions = transactions.filter(t => t.savings_plan_id === plan.id);

                return (
                  <Card 
                    key={plan.id}
                    className={cn(
                      "border-2 hover:scale-[1.02] transition-all duration-300",
                      getCategoryInfo(plan.category).shadow,
                      activeTheme === 'japanese' && "bg-slate-900/90 border-slate-700"
                    )}
                  >
                    <CardHeader className={cn("pb-3", getCategoryInfo(plan.category).gradient)}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
                              {getCategoryInfo(plan.category).emoji}
                            </div>
                            <div>
                              <CardTitle className="text-lg text-white drop-shadow-lg">{plan.plan_name}</CardTitle>
                              <p className="text-xs text-white/80">{getCategoryInfo(plan.category).label}</p>
                            </div>
                          </div>
                          {plan.notes && (
                            <p className="text-sm text-white/90 mt-2 italic">{plan.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-white/20 text-white"
                            onClick={() => openEditDialog(plan)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-white/20 text-white"
                            onClick={() => handleDelete(plan.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-bold text-lg">{progress.toFixed(1)}%</span>
                        </div>
                        <ColoredProgressBar value={progress} showLabel={false} height="h-4" animated={true} />
                        <div className="flex justify-between text-sm mt-3">
                          <span className="font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-lg">
                            {formatRupiah(plan.current_amount)}
                          </span>
                          <span className="font-bold text-blue-600 bg-blue-500/10 px-3 py-1 rounded-lg">
                            {formatRupiah(plan.target_amount)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-rose-600" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Remaining</p>
                            <p className="text-sm font-bold text-rose-600">
                              {formatRupiah(plan.target_amount - plan.current_amount)}
                            </p>
                          </div>
                        </div>
                        {plan.deadline && (
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "h-8 w-8 rounded-lg flex items-center justify-center",
                              daysRemaining !== null && daysRemaining < 30 
                                ? "bg-gradient-to-br from-red-500 to-rose-600 animate-pulse" 
                                : daysRemaining !== null && daysRemaining < 90
                                ? "bg-gradient-to-br from-orange-500 to-amber-600"
                                : "bg-gradient-to-br from-emerald-500 to-green-600"
                            )}>
                              <Calendar className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {isOverdue ? "Overdue" : "Deadline"}
                              </p>
                              <p className={cn(
                                "text-sm font-medium",
                                isOverdue ? "text-red-600" :
                                daysRemaining !== null && daysRemaining < 30 ? "text-red-600" :
                                daysRemaining !== null && daysRemaining < 90 ? "text-orange-600" :
                                "text-emerald-600"
                              )}>
                                {daysRemaining === null ? (
                                  format(new Date(plan.deadline), 'dd MMM yyyy')
                                ) : (
                                  <>
                                    {isOverdue && '-'}
                                    {Math.abs(daysRemaining)} days
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t space-y-2">
                        <div className="flex gap-2">
                          <GradientButton
                            variant="income"
                            size="sm"
                            icon={ArrowUpCircle}
                            className="flex-1"
                            onClick={() => openTransactionDialog(plan)}
                          >
                            Tambah Dana
                          </GradientButton>
                          <GradientButton
                            variant="budget"
                            size="sm"
                            icon={Repeat}
                            className="flex-1"
                            onClick={() => openRecurringDialog(plan)}
                          >
                            Auto-Deposit
                          </GradientButton>
                        </div>
                        <div className="flex gap-2">
                          {planTransactions.length > 0 && (
                            <Badge className="px-2 py-1 bg-gradient-to-r from-blue-500 to-cyan-600 text-white border-none">
                              <History className="h-3 w-3 mr-1" />
                              {planTransactions.length} transaksi
                            </Badge>
                          )}
                          {recurringTransactions.filter(r => r.savings_plan_id === plan.id && r.is_active).length > 0 && (
                            <Badge className="px-2 py-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white border-none">
                              <Repeat className="h-3 w-3 mr-1" />
                              Auto aktif
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions">
          <Card className="border-2 border-emerald-500/20 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-teal-500/10 border-b-2 border-emerald-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
                    <History className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                      History Transaksi
                    </CardTitle>
                    <CardDescription>Semua transaksi deposit dan penarikan</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {transactions.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-xl">
                    <History className="h-10 w-10 text-white" />
                  </div>
                  <p className="text-lg font-semibold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-2">
                    Belum ada transaksi
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Transaksi Anda akan muncul di sini
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-gradient-to-r from-emerald-500/10 to-green-500/10">
                    <TableRow className="border-b-2 border-emerald-500/20">
                      <TableHead className="font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">Tanggal</TableHead>
                      <TableHead className="font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">Rencana</TableHead>
                      <TableHead className="font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">Tipe</TableHead>
                      <TableHead className="font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">Jumlah</TableHead>
                      <TableHead className="font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">Catatan</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => {
                      const plan = plans.find(p => p.id === transaction.savings_plan_id);
                      return (
                        <TableRow 
                          key={transaction.id}
                          className="hover:bg-gradient-to-r hover:from-emerald-500/5 hover:to-green-500/5 transition-all duration-300"
                        >
                          <TableCell className="text-sm">
                            {format(new Date(transaction.transaction_date), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell className="font-medium">{plan?.plan_name}</TableCell>
                          <TableCell>
                            <Badge
                              variant={transaction.transaction_type === "deposit" ? "default" : "destructive"}
                              className="gap-1"
                            >
                              {transaction.transaction_type === "deposit" ? (
                                <ArrowUpCircle className="h-3 w-3" />
                              ) : (
                                <ArrowDownCircle className="h-3 w-3" />
                              )}
                              {transaction.transaction_type === "deposit" ? "Deposit" : "Penarikan"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "font-bold px-3 py-1 rounded-lg",
                              transaction.transaction_type === "deposit"
                                ? "text-emerald-600 bg-emerald-500/10"
                                : "text-rose-600 bg-rose-500/10"
                            )}>
                              {formatRupiah(transaction.amount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {transaction.notes || "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-gradient-to-r hover:from-rose-500 hover:to-red-600 hover:text-white transition-all group"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                            >
                              <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recurring">
          <Card className="border-2 border-purple-500/20 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 border-b-2 border-purple-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <Repeat className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      Auto-Deposit Bulanan
                    </CardTitle>
                    <CardDescription>Kelola recurring transactions untuk deposit otomatis</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {recurringTransactions.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-xl">
                    <Repeat className="h-10 w-10 text-white" />
                  </div>
                  <p className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                    Belum ada auto-deposit
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Buat recurring transaction untuk deposit otomatis berkala
                  </p>
                  <GradientButton variant="budget" icon={Plus} onClick={() => setRecurringDialogOpen(true)}>
                    Setup Auto-Deposit
                  </GradientButton>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                    <TableRow className="border-b-2 border-purple-500/20">
                      <TableHead className="font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Rencana</TableHead>
                      <TableHead className="font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Jumlah</TableHead>
                      <TableHead className="font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Frekuensi</TableHead>
                      <TableHead className="font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Tanggal Mulai</TableHead>
                      <TableHead className="font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Tanggal Berakhir</TableHead>
                      <TableHead className="font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Eksekusi Berikutnya</TableHead>
                      <TableHead className="font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recurringTransactions.map((recurring) => {
                      const plan = plans.find(p => p.id === recurring.savings_plan_id);
                      return (
                        <TableRow key={recurring.id} className="hover:bg-gradient-to-r hover:from-purple-500/5 hover:to-blue-500/5 transition-all duration-300">
                          <TableCell className="font-medium">{plan?.plan_name}</TableCell>
                          <TableCell><span className="font-bold text-purple-600 bg-purple-500/10 px-3 py-1 rounded-lg">{formatRupiah(recurring.amount)}</span></TableCell>
                          <TableCell><Badge className={cn("text-white border-none shadow-lg bg-gradient-to-r", recurring.frequency === "daily" ? "from-blue-500 to-cyan-600" : recurring.frequency === "weekly" ? "from-cyan-500 to-teal-600" : recurring.frequency === "monthly" ? "from-purple-500 to-blue-600" : "from-pink-500 to-purple-600")}>{recurring.frequency}</Badge></TableCell>
                          <TableCell className="text-sm">{format(new Date(recurring.start_date), "dd MMM yyyy")}</TableCell>
                          <TableCell className="text-sm">{recurring.end_date ? format(new Date(recurring.end_date), "dd MMM yyyy") : "Tidak ada"}</TableCell>
                          <TableCell className="text-sm font-medium text-blue-600">{format(new Date(recurring.next_execution_date), "dd MMM yyyy")}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch checked={recurring.is_active} onCheckedChange={() => toggleRecurringStatus(recurring.id, recurring.is_active)} className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-emerald-500 data-[state=checked]:to-green-600" />
                              <span className={cn("text-sm font-medium", recurring.is_active ? "text-emerald-600" : "text-muted-foreground")}>{recurring.is_active ? "Aktif" : "Nonaktif"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gradient-to-r hover:from-rose-500 hover:to-red-600 hover:text-white transition-all group" onClick={() => handleDeleteRecurring(recurring.id)}>
                              <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-4">
            {/* Progress Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Progress Overview</CardTitle>
                <CardDescription>Detailed progress for each savings plan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {plans.map((plan) => {
                    const progress = calculateProgress(plan.current_amount, plan.target_amount);
                    const remaining = plan.target_amount - plan.current_amount;
                    const daysRemaining = getDaysRemaining(plan.deadline);
                    const dailyRequired = daysRemaining && daysRemaining > 0 
                      ? remaining / daysRemaining 
                      : 0;

                    return (
                      <div key={plan.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">{plan.plan_name}</h4>
                          <span className="text-sm text-muted-foreground">
                            {progress.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={progress} className="h-3" />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Current</p>
                            <p className="font-medium">{formatRupiah(plan.current_amount)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Target</p>
                            <p className="font-medium">{formatRupiah(plan.target_amount)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Remaining</p>
                            <p className="font-medium">{formatRupiah(remaining)}</p>
                          </div>
                          {daysRemaining && daysRemaining > 0 && (
                            <div>
                              <p className="text-muted-foreground">Daily Target</p>
                              <p className="font-medium">{formatRupiah(dailyRequired)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Transaction Summary by Plan */}
            <Card>
              <CardHeader>
                <CardTitle>Transaction Summary</CardTitle>
                <CardDescription>Total deposits and withdrawals per plan</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rencana</TableHead>
                      <TableHead className="text-right">Deposits</TableHead>
                      <TableHead className="text-right">Withdrawals</TableHead>
                      <TableHead className="text-right">Transactions</TableHead>
                      <TableHead className="text-right">Net Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan) => {
                      const planTransactions = transactions.filter(t => t.savings_plan_id === plan.id);
                      const deposits = planTransactions.filter(t => t.transaction_type === "deposit");
                      const withdrawals = planTransactions.filter(t => t.transaction_type === "withdrawal");
                      const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0);
                      const totalWithdrawals = withdrawals.reduce((sum, t) => sum + t.amount, 0);
                      const netAmount = totalDeposits - totalWithdrawals;

                      return (
                        <TableRow key={plan.id}>
                          <TableCell className="font-medium">{plan.plan_name}</TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatRupiah(totalDeposits)}
                            <span className="text-muted-foreground ml-1">({deposits.length})</span>
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatRupiah(totalWithdrawals)}
                            <span className="text-muted-foreground ml-1">({withdrawals.length})</span>
                          </TableCell>
                          <TableCell className="text-right">
                            {planTransactions.length}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatRupiah(netAmount)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Transaction Dialog */}
      <Dialog open={transactionDialogOpen} onOpenChange={(open) => {
        setTransactionDialogOpen(open);
        if (!open) resetTransactionForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Transaksi - {selectedPlan?.plan_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTransactionSubmit} className="space-y-4">
            <div>
              <Label htmlFor="transaction_type">Tipe Transaksi</Label>
              <Select
                value={transactionFormData.transaction_type}
                onValueChange={(value: "deposit" | "withdrawal") =>
                  setTransactionFormData({ ...transactionFormData, transaction_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit (Menabung)</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal (Penarikan)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">Jumlah</Label>
              <Input
                id="amount"
                type="number"
                value={transactionFormData.amount}
                onChange={(e) =>
                  setTransactionFormData({ ...transactionFormData, amount: e.target.value })
                }
                placeholder="0"
                required
              />
            </div>
            <div>
              <Label htmlFor="transaction_date">Tanggal</Label>
              <Input
                id="transaction_date"
                type="date"
                value={transactionFormData.transaction_date}
                onChange={(e) =>
                  setTransactionFormData({ ...transactionFormData, transaction_date: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="transaction_notes">Catatan</Label>
              <Textarea
                id="transaction_notes"
                value={transactionFormData.notes}
                onChange={(e) =>
                  setTransactionFormData({ ...transactionFormData, notes: e.target.value })
                }
                placeholder="Catatan transaksi..."
              />
            </div>
            <Button type="submit" className="w-full">
              Simpan Transaksi
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Recurring Transaction Dialog */}
      <Dialog open={recurringDialogOpen} onOpenChange={(open) => {
        setRecurringDialogOpen(open);
        if (!open) resetRecurringForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setup Auto-Deposit - {selectedPlan?.plan_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecurringSubmit} className="space-y-4">
            <div>
              <Label htmlFor="recurring_amount">Jumlah Deposit</Label>
              <Input
                id="recurring_amount"
                type="number"
                value={recurringFormData.amount}
                onChange={(e) =>
                  setRecurringFormData({ ...recurringFormData, amount: e.target.value })
                }
                placeholder="0"
                required
              />
            </div>
            <div>
              <Label htmlFor="frequency">Frekuensi</Label>
              <Select
                value={recurringFormData.frequency}
                onValueChange={(value: "daily" | "weekly" | "monthly" | "yearly") =>
                  setRecurringFormData({ ...recurringFormData, frequency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Harian</SelectItem>
                  <SelectItem value="weekly">Mingguan</SelectItem>
                  <SelectItem value="monthly">Bulanan</SelectItem>
                  <SelectItem value="yearly">Tahunan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="start_date">Tanggal Mulai</Label>
              <Input
                id="start_date"
                type="date"
                value={recurringFormData.start_date}
                onChange={(e) =>
                  setRecurringFormData({ ...recurringFormData, start_date: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="end_date">Tanggal Berakhir (Opsional)</Label>
              <Input
                id="end_date"
                type="date"
                value={recurringFormData.end_date}
                onChange={(e) =>
                  setRecurringFormData({ ...recurringFormData, end_date: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Kosongkan jika tidak ada batas waktu
              </p>
            </div>
            <div>
              <Label htmlFor="recurring_notes">Catatan</Label>
              <Textarea
                id="recurring_notes"
                value={recurringFormData.notes}
                onChange={(e) =>
                  setRecurringFormData({ ...recurringFormData, notes: e.target.value })
                }
                placeholder="Catatan untuk auto-deposit..."
              />
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium mb-1">ℹ️ Info</p>
              <p className="text-xs text-muted-foreground">
                Recurring transaction akan diproses otomatis setiap hari pukul 00:00 WIB. 
                Saldo akan otomatis bertambah sesuai jadwal yang Anda tetapkan.
              </p>
            </div>
            <Button type="submit" className="w-full">
              Aktifkan Auto-Deposit
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </AnimatedBackground>
  );
}
