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
import { Plus, Pencil, Trash2, Target, Calendar, TrendingUp } from "lucide-react";
import { formatRupiah } from "@/lib/currency";
import { format, differenceInDays } from "date-fns";

interface SavingsPlan {
  id: string;
  plan_name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  notes: string | null;
  created_at: string;
}

export default function SavingsPlans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<SavingsPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SavingsPlan | null>(null);
  const [formData, setFormData] = useState({
    plan_name: "",
    target_amount: "",
    current_amount: "",
    deadline: "",
    notes: "",
  });

  useEffect(() => {
    if (user) {
      fetchPlans();
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this savings plan?")) return;
    try {
      const { error } = await supabase.from("savings_plans").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Savings plan deleted successfully" });
      fetchPlans();
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

      {/* Savings Plans List */}
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
