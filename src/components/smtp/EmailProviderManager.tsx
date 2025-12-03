import { useState, useEffect } from "react";
import { Plus, Trash2, Power, TestTube, GripVertical, AlertCircle, Pencil } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface EmailProvider {
  id: string;
  provider_name: string;
  display_name: string | null;
  sender_email: string;
  sender_name: string | null;
  priority: number;
  daily_limit: number;
  emails_sent_today: number;
  monthly_limit: number;
  emails_sent_month: number;
  is_active: boolean;
  health_status: string;
  last_error: string | null;
  last_success_at: string | null;
  purpose: string;
  api_key_encrypted?: string;
}

// Helper function to mask API key for display
const maskApiKey = (apiKey: string | null | undefined): string => {
  if (!apiKey) return "Tidak ada key tersimpan";
  if (apiKey.length <= 15) return apiKey.slice(0, 8) + "****";
  return apiKey.slice(0, 12) + "****";
};

const EmailProviderManager = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [providers, setProviders] = useState<EmailProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<EmailProvider | null>(null);
  const [newProvider, setNewProvider] = useState({
    provider_name: "resend",
    display_name: "",
    api_key: "",
    api_secret: "",
    sender_email: "",
    sender_name: "",
    daily_limit: 100,
    monthly_limit: 3000,
    purpose: "all",
  });
  const [editForm, setEditForm] = useState({
    display_name: "",
    api_key: "",
    api_secret: "",
    sender_email: "",
    sender_name: "",
    daily_limit: 100,
    monthly_limit: 3000,
    priority: 1,
    purpose: "all",
  });

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from("email_providers")
        .select("*")
        .eq("user_id", user?.id)
        .order("priority", { ascending: true });

      if (error) throw error;
      setProviders(data || []);
    } catch (error: any) {
      console.error("Error fetching providers:", error);
      toast({
        title: "Error",
        description: "Failed to fetch email providers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddProvider = async () => {
    try {
      const { error } = await supabase.from("email_providers").insert({
        user_id: user?.id,
        provider_name: newProvider.provider_name,
        display_name: newProvider.display_name || `${newProvider.provider_name} Provider`,
        api_key_encrypted: newProvider.api_key,
        sender_email: newProvider.sender_email,
        sender_name: newProvider.sender_name,
        daily_limit: newProvider.daily_limit,
        monthly_limit: newProvider.monthly_limit,
        priority: providers.length + 1,
        purpose: newProvider.purpose,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Email provider added successfully",
      });

      setShowAddDialog(false);
      setNewProvider({
        provider_name: "resend",
        display_name: "",
        api_key: "",
        api_secret: "",
        sender_email: "",
        sender_name: "",
        daily_limit: 100,
        monthly_limit: 3000,
        purpose: "all",
      });
      fetchProviders();
    } catch (error: any) {
      console.error("Error adding provider:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add provider",
        variant: "destructive",
      });
    }
  };

  const handleToggleProvider = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("email_providers")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Provider ${!currentStatus ? "enabled" : "disabled"}`,
      });

      fetchProviders();
    } catch (error: any) {
      console.error("Error toggling provider:", error);
      toast({
        title: "Error",
        description: "Failed to update provider status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm("Are you sure you want to delete this provider?")) return;

    try {
      const { error } = await supabase.from("email_providers").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Provider deleted successfully",
      });

      fetchProviders();
    } catch (error: any) {
      console.error("Error deleting provider:", error);
      toast({
        title: "Error",
        description: "Failed to delete provider",
        variant: "destructive",
      });
    }
  };

  const handleTestProvider = async (provider: EmailProvider) => {
    try {
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          to: provider.sender_email,
          subject: "Test Email from Multi-Provider System",
          html: `<p>This is a test email from <strong>${provider.display_name}</strong></p>`,
          provider_id: provider.id,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Test email sent via ${provider.display_name}`,
      });
    } catch (error: any) {
      console.error("Error testing provider:", error);
      toast({
        title: "Error",
        description: `Failed to send test email: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleOpenEdit = (provider: EmailProvider) => {
    setEditingProvider(provider);
    setEditForm({
      display_name: provider.display_name || "",
      api_key: "",
      api_secret: "",
      sender_email: provider.sender_email,
      sender_name: provider.sender_name || "",
      daily_limit: provider.daily_limit,
      monthly_limit: provider.monthly_limit,
      priority: provider.priority,
      purpose: provider.purpose || "all",
    });
    setShowEditDialog(true);
  };

  const handleUpdateProvider = async () => {
    if (!editingProvider) return;

    try {
      const updateData: any = {
        display_name: editForm.display_name,
        sender_email: editForm.sender_email,
        sender_name: editForm.sender_name,
        daily_limit: editForm.daily_limit,
        monthly_limit: editForm.monthly_limit,
        priority: editForm.priority,
        purpose: editForm.purpose,
      };

      // Only update API key if provided
      if (editForm.api_key) {
        updateData.api_key_encrypted = editForm.api_key;
      }

      const { error } = await supabase
        .from("email_providers")
        .update(updateData)
        .eq("id", editingProvider.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Provider updated successfully",
      });

      setShowEditDialog(false);
      setEditingProvider(null);
      fetchProviders();
    } catch (error: any) {
      console.error("Error updating provider:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update provider",
        variant: "destructive",
      });
    }
  };

  const getHealthBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-green-500">🟢 Healthy</Badge>;
      case "degraded":
        return <Badge className="bg-yellow-500">🟡 Degraded</Badge>;
      case "down":
        return <Badge className="bg-red-500">🔴 Down</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getProviderIcon = (name: string) => {
    switch (name) {
      case "resend":
        return "📧";
      case "brevo":
        return "✉️";
      case "mailgun":
        return "📮";
      case "mailjet":
        return "📮";
      default:
        return "📬";
    }
  };

  const totalDailyCapacity = providers.reduce((sum, p) => sum + (p.is_active ? p.daily_limit : 0), 0);
  const totalMonthlyCapacity = providers.reduce((sum, p) => sum + (p.is_active ? p.monthly_limit : 0), 0);
  const totalDailyUsed = providers.reduce((sum, p) => sum + p.emails_sent_today, 0);
  const totalMonthlyUsed = providers.reduce((sum, p) => sum + p.emails_sent_month, 0);

  if (loading) {
    return <div className="text-center py-8">Loading providers...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Email Providers</CardTitle>
              <CardDescription>Manage multiple email service providers for redundancy</CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Provider
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Total Capacity Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-muted rounded-lg">
            <div>
              <div className="text-sm text-muted-foreground">Daily Capacity</div>
              <div className="text-xl md:text-2xl font-bold">
                {totalDailyUsed} / {totalDailyCapacity}
              </div>
              <Progress value={(totalDailyUsed / totalDailyCapacity) * 100} className="mt-2" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Monthly Capacity</div>
              <div className="text-xl md:text-2xl font-bold">
                {totalMonthlyUsed} / {totalMonthlyCapacity}
              </div>
              <Progress value={(totalMonthlyUsed / totalMonthlyCapacity) * 100} className="mt-2" />
            </div>
          </div>

          {/* Providers List */}
          <div className="space-y-4">
            {providers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No email providers configured</p>
                <p className="text-sm">Add your first provider to start sending emails</p>
              </div>
            ) : (
              providers.map((provider) => (
                <Card key={provider.id} className={!provider.is_active ? "opacity-60" : ""}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="text-3xl shrink-0">{getProviderIcon(provider.provider_name)}</div>
                        <div className="flex-1 min-w-0">
                           <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="font-semibold text-sm md:text-base">
                              #{provider.priority} {provider.display_name || provider.provider_name}
                            </h3>
                            {getHealthBadge(provider.health_status)}
                            {provider.purpose === "automated" && <Badge variant="secondary">🤖 Auto</Badge>}
                            {provider.purpose === "compose" && <Badge variant="secondary">📝 Compose</Badge>}
                            {provider.purpose === "all" && <Badge variant="secondary">🔄 All</Badge>}
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground mb-3 truncate">{provider.sender_email}</p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Daily Usage</div>
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={(provider.emails_sent_today / provider.daily_limit) * 100}
                                  className="flex-1"
                                />
                                <span className="text-xs whitespace-nowrap">
                                  {provider.emails_sent_today}/{provider.daily_limit}
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Monthly Usage</div>
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={(provider.emails_sent_month / provider.monthly_limit) * 100}
                                  className="flex-1"
                                />
                                <span className="text-xs whitespace-nowrap">
                                  {provider.emails_sent_month}/{provider.monthly_limit}
                                </span>
                              </div>
                            </div>
                          </div>

                          {provider.last_error && (
                            <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              <span className="truncate">{provider.last_error}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-end md:justify-start">
                        <Button size="sm" variant="outline" onClick={() => handleTestProvider(provider)} className="flex-1 sm:flex-none">
                          <TestTube className="h-4 w-4 sm:mr-0 md:mr-2" />
                          <span className="sm:hidden md:inline">Test</span>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleOpenEdit(provider)} className="flex-1 sm:flex-none">
                          <Pencil className="h-4 w-4 sm:mr-0 md:mr-2" />
                          <span className="sm:hidden md:inline">Edit</span>
                        </Button>
                        <Button
                          size="sm"
                          variant={provider.is_active ? "outline" : "default"}
                          onClick={() => handleToggleProvider(provider.id, provider.is_active)}
                          className="flex-1 sm:flex-none"
                        >
                          <Power className="h-4 w-4 sm:mr-0 md:mr-2" />
                          <span className="sm:hidden md:inline">{provider.is_active ? "On" : "Off"}</span>
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteProvider(provider.id)} className="flex-1 sm:flex-none">
                          <Trash2 className="h-4 w-4 sm:mr-0 md:mr-2" />
                          <span className="sm:hidden md:inline">Delete</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Provider Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Email Provider</DialogTitle>
            <DialogDescription>Configure a new email service provider</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Provider Type</Label>
              <Select value={newProvider.provider_name} onValueChange={(v) => setNewProvider({ ...newProvider, provider_name: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resend">📧 Resend (3,000/month free)</SelectItem>
                  <SelectItem value="brevo">✉️ Brevo (9,000/month free)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Display Name</Label>
              <Input
                placeholder="e.g., Primary Resend"
                value={newProvider.display_name}
                onChange={(e) => setNewProvider({ ...newProvider, display_name: e.target.value })}
              />
            </div>

            <div>
              <Label>Purpose (Tujuan Penggunaan)</Label>
              <Select value={newProvider.purpose} onValueChange={(v) => setNewProvider({ ...newProvider, purpose: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automated">🤖 Automated Only - Email Otomatis</SelectItem>
                  <SelectItem value="compose">📝 Compose Only - Kirim Email Manual</SelectItem>
                  <SelectItem value="all">🔄 All - Semua Fungsi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>API Key</Label>
              <Input
                type="password"
                placeholder="Enter API key"
                value={newProvider.api_key}
                onChange={(e) => setNewProvider({ ...newProvider, api_key: e.target.value })}
              />
            </div>

            <div>
              <Label>Sender Email</Label>
              <Input
                type="email"
                placeholder="noreply@yourdomain.com"
                value={newProvider.sender_email}
                onChange={(e) => setNewProvider({ ...newProvider, sender_email: e.target.value })}
              />
            </div>

            <div>
              <Label>Sender Name</Label>
              <Input
                placeholder="Your Company"
                value={newProvider.sender_name}
                onChange={(e) => setNewProvider({ ...newProvider, sender_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Daily Limit</Label>
                <Input
                  type="number"
                  value={newProvider.daily_limit}
                  onChange={(e) => setNewProvider({ ...newProvider, daily_limit: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Monthly Limit</Label>
                <Input
                  type="number"
                  value={newProvider.monthly_limit}
                  onChange={(e) => setNewProvider({ ...newProvider, monthly_limit: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddProvider} className="flex-1">
                Add Provider
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Provider Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Email Provider</DialogTitle>
            <DialogDescription>Update provider configuration</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Display Name</Label>
              <Input
                placeholder="e.g., Primary Resend"
                value={editForm.display_name}
                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
              />
            </div>

            <div>
              <Label>API Key (leave empty to keep current)</Label>
              {editingProvider?.api_key_encrypted && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-green-50 dark:bg-green-950/50 rounded border border-green-200 dark:border-green-800">
                  <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                    🔑 Tersimpan
                  </Badge>
                  <code className="text-sm font-mono text-green-700 dark:text-green-300">
                    {maskApiKey(editingProvider.api_key_encrypted)}
                  </code>
                </div>
              )}
              <Input
                type="password"
                placeholder="Enter new API key (optional)"
                value={editForm.api_key}
                onChange={(e) => setEditForm({ ...editForm, api_key: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Kosongkan jika tidak ingin mengubah API key
              </p>
            </div>

            <div>
              <Label>Sender Email</Label>
              <Input
                type="email"
                placeholder="noreply@yourdomain.com"
                value={editForm.sender_email}
                onChange={(e) => setEditForm({ ...editForm, sender_email: e.target.value })}
              />
            </div>

            <div>
              <Label>Sender Name</Label>
              <Input
                placeholder="Your Company"
                value={editForm.sender_name}
                onChange={(e) => setEditForm({ ...editForm, sender_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Daily Limit</Label>
                <Input
                  type="number"
                  value={editForm.daily_limit}
                  onChange={(e) => setEditForm({ ...editForm, daily_limit: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Monthly Limit</Label>
                <Input
                  type="number"
                  value={editForm.monthly_limit}
                  onChange={(e) => setEditForm({ ...editForm, monthly_limit: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>Priority (1 = highest)</Label>
              <Input
                type="number"
                min="1"
                value={editForm.priority}
                onChange={(e) => setEditForm({ ...editForm, priority: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lower numbers are tried first in the rotation
              </p>
            </div>

            <div>
              <Label>Purpose (Tujuan Penggunaan)</Label>
              <Select value={editForm.purpose} onValueChange={(v) => setEditForm({ ...editForm, purpose: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automated">🤖 Automated Only - Email Otomatis</SelectItem>
                  <SelectItem value="compose">📝 Compose Only - Kirim Email Manual</SelectItem>
                  <SelectItem value="all">🔄 All - Semua Fungsi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleUpdateProvider} className="flex-1">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailProviderManager;
