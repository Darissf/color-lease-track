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
import { Plus, Pencil, Trash2, Target, Calendar, TrendingUp, ArrowUpCircle, ArrowDownCircle, History } from "lucide-react";
import { formatRupiah } from "@/lib/currency";
import { format, differenceInDays } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface SavingsPlan {
  id: string;
  plan_name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  notes: string | null;
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

export default function SavingsPlans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<SavingsPlan[]>([]);
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SavingsPlan | null>(null);
  const [editingPlan, setEditingPlan] = useState<SavingsPlan | null>(null);
  const [formData, setFormData] = useState({
    plan_name: "",
    target_amount: "",
    current_amount: "",
    deadline: "",
    notes: "",
  });
  const [transactionFormData, setTransactionFormData] = useState({
    transaction_type: "deposit" as "deposit" | "withdrawal",
    amount: "",
    notes: "",
    transaction_date: format(new Date(), "yyyy-MM-dd"),
  });

  useEffect(() => {
    if (user) {
      fetchPlans();
      fetchTransactions();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const planData = {
        plan_name: formData.plan_name,
        target_amount: parseFloat(formData.target_amount),
        current_amount: parseFloat(formData.current_amount) || 0,
        deadline: formData.deadline || null,
        notes: formData.notes || null,
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

  const openTransactionDialog = (plan: SavingsPlan) => {
    setSelectedPlan(plan);
    setTransactionDialogOpen(true);
  };

  const openEditDialog = (plan: SavingsPlan) => {
    setEditingPlan(plan);
    setFormData({
      plan_name: plan.plan_name,
      target_amount: plan.target_amount.toString(),
      current_amount: plan.current_amount.toString(),
      deadline: plan.deadline || "",
      notes: plan.notes || "",
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
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Rencana Tabungan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola dan pantau progress rencana tabungan Anda
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Rencana
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? "Edit Rencana Tabungan" : "Tambah Rencana Tabungan"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="plan_name">Nama Rencana</Label>
                <Input
                  id="plan_name"
                  value={formData.plan_name}
                  onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                  placeholder="e.g., Liburan Bali, Dana Darurat"
                  required
                />
              </div>
              <div>
                <Label htmlFor="target_amount">Target Amount</Label>
                <Input
                  id="target_amount"
                  type="number"
                  value={formData.target_amount}
                  onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                  placeholder="0"
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
                />
              </div>
              <div>
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Catatan tambahan..."
                />
              </div>
              <Button type="submit" className="w-full">
                {editingPlan ? "Update" : "Simpan"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Saved</CardDescription>
            <CardTitle className="text-2xl">{formatRupiah(totalSaved)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Target</CardDescription>
            <CardTitle className="text-2xl">{formatRupiah(totalTarget)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Overall Progress</CardDescription>
            <CardTitle className="text-2xl">{overallProgress.toFixed(1)}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Overall Progress Bar */}
      {plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={overallProgress} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
              <span>{formatRupiah(totalSaved)}</span>
              <span>{formatRupiah(totalTarget)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Section */}
      {plans.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress Comparison</CardTitle>
              <CardDescription>Current savings vs target for each plan</CardDescription>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Savings Distribution</CardTitle>
              <CardDescription>How your savings are distributed across plans</CardDescription>
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
        <TabsList>
          <TabsTrigger value="plans">Rencana Tabungan</TabsTrigger>
          <TabsTrigger value="transactions">History Transaksi</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          {plans.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Belum ada rencana tabungan</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Mulai dengan menambahkan rencana tabungan pertama Anda
                </p>
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
                  <Card key={plan.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{plan.plan_name}</CardTitle>
                          {plan.notes && (
                            <CardDescription className="mt-1">{plan.notes}</CardDescription>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(plan)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
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
                          <span className="font-medium">{progress.toFixed(1)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex justify-between text-sm text-muted-foreground mt-2">
                          <span>{formatRupiah(plan.current_amount)}</span>
                          <span>{formatRupiah(plan.target_amount)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Remaining</p>
                            <p className="text-sm font-medium">
                              {formatRupiah(plan.target_amount - plan.current_amount)}
                            </p>
                          </div>
                        </div>
                        {plan.deadline && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Deadline</p>
                              <p className={`text-sm font-medium ${isOverdue ? "text-destructive" : ""}`}>
                                {daysRemaining !== null && (
                                  <>
                                    {isOverdue ? "Overdue " : ""}
                                    {Math.abs(daysRemaining)} days
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => openTransactionDialog(plan)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Tambah Transaksi
                        </Button>
                        {planTransactions.length > 0 && (
                          <Badge variant="secondary" className="px-2 py-1">
                            <History className="h-3 w-3 mr-1" />
                            {planTransactions.length}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>History Transaksi</CardTitle>
              <CardDescription>Semua transaksi deposit dan penarikan</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="py-12 text-center">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Belum ada transaksi</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Rencana</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Catatan</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => {
                      const plan = plans.find(p => p.id === transaction.savings_plan_id);
                      return (
                        <TableRow key={transaction.id}>
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
                          <TableCell className="font-medium">
                            {formatRupiah(transaction.amount)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {transaction.notes || "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                            >
                              <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
