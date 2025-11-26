import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Landmark, Save, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/currency";
import { Switch } from "@/components/ui/switch";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

interface SavingsSettings {
  id?: string;
  default_allocation_percentage: number;
  auto_save_enabled: boolean;
  emergency_fund_target: number;
  emergency_fund_current: number;
  notes: string;
}

const SavingsSettings = () => {
  const { activeTheme } = useAppTheme();
  const [settings, setSettings] = useState<SavingsSettings>({
    default_allocation_percentage: 10,
    auto_save_enabled: false,
    emergency_fund_target: 0,
    emergency_fund_current: 0,
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("savings_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setSettings({
          id: data.id,
          default_allocation_percentage: data.default_allocation_percentage,
          auto_save_enabled: data.auto_save_enabled,
          emergency_fund_target: data.emergency_fund_target || 0,
          emergency_fund_current: data.emergency_fund_current || 0,
          notes: data.notes || "",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        ...settings,
        user_id: user.id,
      };

      if (settings.id) {
        const { error } = await supabase
          .from("savings_settings")
          .update(payload)
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("savings_settings")
          .insert(payload);

        if (error) throw error;
      }

      toast({
        title: "Berhasil",
        description: "Pengaturan tabungan berhasil disimpan",
      });

      fetchSettings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const emergencyFundProgress =
    settings.emergency_fund_target > 0
      ? (settings.emergency_fund_current / settings.emergency_fund_target) * 100
      : 0;

  return (
    <div className="min-h-screen p-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className={cn(
            "text-3xl font-bold",
            activeTheme === 'japanese'
              ? "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
              : "text-foreground"
          )}>
            Pengaturan Tabungan
          </h1>
          <p className="text-muted-foreground">Atur target dan alokasi tabungan Anda</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Memuat data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className={cn(
            "p-6 shadow-lg",
            activeTheme === 'japanese' ? 'gradient-card border-0' : ''
          )}>
            <div className="flex items-center gap-3 mb-6">
              <div className={cn(
                "h-12 w-12 rounded-lg flex items-center justify-center",
                activeTheme === 'japanese' ? 'gradient-primary' : 'bg-primary'
              )}>
                <Landmark className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Dana Darurat</h2>
                <p className="text-sm text-muted-foreground">
                  Progress: {emergencyFundProgress.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    activeTheme === 'japanese' ? 'gradient-success' : 'bg-green-500'
                  )}
                  style={{ width: `${Math.min(emergencyFundProgress, 100)}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Target</p>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(settings.emergency_fund_target)}
                  </p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Terkumpul</p>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(settings.emergency_fund_current)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-6">Pengaturan Umum</h2>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="allocation">
                  Alokasi Tabungan Default (%)
                </Label>
                <Input
                  id="allocation"
                  type="number"
                  min="0"
                  max="100"
                  value={settings.default_allocation_percentage}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      default_allocation_percentage: Number(e.target.value),
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Persentase otomatis untuk menabung dari setiap pemasukan
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label htmlFor="auto_save">Auto-Save</Label>
                  <p className="text-sm text-muted-foreground">
                    Otomatis pindahkan ke tabungan
                  </p>
                </div>
                <Switch
                  id="auto_save"
                  checked={settings.auto_save_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, auto_save_enabled: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target">Target Dana Darurat</Label>
                <Input
                  id="target"
                  type="number"
                  placeholder="0"
                  value={settings.emergency_fund_target}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      emergency_fund_target: Number(e.target.value),
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Ideal: 3-6 bulan pengeluaran bulanan
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="current">Dana Darurat Saat Ini</Label>
                <Input
                  id="current"
                  type="number"
                  placeholder="0"
                  value={settings.emergency_fund_current}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      emergency_fund_current: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Catatan</Label>
                <Textarea
                  id="notes"
                  placeholder="Catatan pribadi tentang rencana tabungan Anda"
                  rows={4}
                  value={settings.notes}
                  onChange={(e) =>
                    setSettings({ ...settings, notes: e.target.value })
                  }
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  "w-full",
                  activeTheme === 'japanese' ? 'gradient-primary' : ''
                )}
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Menyimpan..." : "Simpan Pengaturan"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SavingsSettings;
