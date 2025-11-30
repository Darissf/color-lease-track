import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Package } from "lucide-react";
import { toast } from "sonner";
import { getNowInJakarta } from "@/lib/timezone";

interface IncomeInfo {
  invoice: string;
  client_name: string;
  period_start_month: string;
  period_end_month: string;
  jenis_scaffolding: string | null;
  jumlah_unit: number | null;
  lokasi_proyek: string | null;
  tanggal_pengiriman: string | null;
  tanggal_pengambilan: string | null;
  status_pengiriman: string | null;
  status_pengambilan: string | null;
  ongkos_transport: number | null;
  penanggung_jawab: string | null;
  catatan: string | null;
}

interface InventoryItem {
  id: string;
  item_name: string;
}

export default function RecurringIncomeScaffoldingInput() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [incomeInfo, setIncomeInfo] = useState<IncomeInfo | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  
  const [formData, setFormData] = useState({
    jenis_scaffolding: "",
    jumlah_unit: "",
    lokasi_proyek: "",
    tanggal_pengiriman: "",
    tanggal_pengambilan: "",
    status_pengiriman: "",
    status_pengambilan: "",
    ongkos_transport: "",
    penanggung_jawab: "",
    catatan: "",
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch income info
      const { data: income, error: incomeError } = await supabase
        .from("fixed_monthly_income")
        .select(`
          invoice,
          period_start_month,
          period_end_month,
          jenis_scaffolding,
          jumlah_unit,
          lokasi_proyek,
          tanggal_pengiriman,
          tanggal_pengambilan,
          status_pengiriman,
          status_pengambilan,
          ongkos_transport,
          penanggung_jawab,
          catatan,
          client_groups (nama)
        `)
        .eq("id", id)
        .single();

      if (incomeError) throw incomeError;

      const incomeData: IncomeInfo = {
        ...income,
        client_name: (income.client_groups as any)?.nama || "",
      };
      setIncomeInfo(incomeData);

      // Set form data from existing income data
      setFormData({
        jenis_scaffolding: income.jenis_scaffolding || "",
        jumlah_unit: income.jumlah_unit?.toString() || "",
        lokasi_proyek: income.lokasi_proyek || "",
        tanggal_pengiriman: income.tanggal_pengiriman || "",
        tanggal_pengambilan: income.tanggal_pengambilan || "",
        status_pengiriman: income.status_pengiriman || "",
        status_pengambilan: income.status_pengambilan || "",
        ongkos_transport: income.ongkos_transport?.toString() || "",
        penanggung_jawab: income.penanggung_jawab || "",
        catatan: income.catatan || "",
      });

      // Fetch inventory items
      const { data: items, error: itemsError } = await supabase
        .from("inventory_items")
        .select("id, item_name")
        .eq("is_active", true)
        .order("item_name");

      if (itemsError) throw itemsError;
      setInventoryItems(items || []);
      
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Gagal memuat data pemasukan");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const updateData = {
        jenis_scaffolding: formData.jenis_scaffolding || null,
        jumlah_unit: formData.jumlah_unit ? parseInt(formData.jumlah_unit) : null,
        lokasi_proyek: formData.lokasi_proyek || null,
        tanggal_pengiriman: formData.tanggal_pengiriman || null,
        tanggal_pengambilan: formData.tanggal_pengambilan || null,
        status_pengiriman: formData.status_pengiriman || null,
        status_pengambilan: formData.status_pengambilan || null,
        ongkos_transport: formData.ongkos_transport ? parseFloat(formData.ongkos_transport) : null,
        penanggung_jawab: formData.penanggung_jawab || null,
        catatan: formData.catatan || null,
        updated_at: getNowInJakarta().toISOString(),
      };

      const { error } = await supabase
        .from("fixed_monthly_income")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      toast.success("Data scaffolding berhasil disimpan");
      navigate(`/vip/recurring-income/${id}`);
    } catch (error: any) {
      console.error("Error saving data:", error);
      toast.error("Gagal menyimpan data scaffolding");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!incomeInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Data pemasukan tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-104px)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/vip/recurring-income")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              List Pemasukan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/vip/recurring-income/${id}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Detail Pemasukan
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Menyimpan..." : "Simpan Data"}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Package className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Input Data Scaffolding</h1>
            <p className="text-sm text-muted-foreground">
              {incomeInfo.invoice} • {incomeInfo.client_name} • Periode:{" "}
              {new Date(incomeInfo.period_start_month).toLocaleDateString("id-ID", {
                month: "long",
                year: "numeric",
              })}{" "}
              -{" "}
              {new Date(incomeInfo.period_end_month).toLocaleDateString("id-ID", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Data Scaffolding & Transport</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Row 1: Jenis & Jumlah */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jenis_scaffolding">
                  Jenis Scaffolding <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.jenis_scaffolding}
                  onValueChange={(value) =>
                    setFormData({ ...formData, jenis_scaffolding: value })
                  }
                >
                  <SelectTrigger id="jenis_scaffolding">
                    <SelectValue placeholder="Pilih jenis scaffolding" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryItems.map((item) => (
                      <SelectItem key={item.id} value={item.item_name}>
                        {item.item_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jumlah_unit">
                  Jumlah Unit <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="jumlah_unit"
                  type="number"
                  min="0"
                  value={formData.jumlah_unit}
                  onChange={(e) =>
                    setFormData({ ...formData, jumlah_unit: e.target.value })
                  }
                  placeholder="Masukkan jumlah unit"
                />
              </div>
            </div>

            {/* Row 2: Lokasi */}
            <div className="space-y-2">
              <Label htmlFor="lokasi_proyek">Lokasi Proyek</Label>
              <Textarea
                id="lokasi_proyek"
                value={formData.lokasi_proyek}
                onChange={(e) =>
                  setFormData({ ...formData, lokasi_proyek: e.target.value })
                }
                placeholder="Alamat lengkap lokasi proyek"
                rows={2}
              />
            </div>

            {/* Row 3: Tanggal */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tanggal_pengiriman">Tanggal Pengiriman</Label>
                <Input
                  id="tanggal_pengiriman"
                  type="date"
                  value={formData.tanggal_pengiriman}
                  onChange={(e) =>
                    setFormData({ ...formData, tanggal_pengiriman: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tanggal_pengambilan">Tanggal Pengambilan</Label>
                <Input
                  id="tanggal_pengambilan"
                  type="date"
                  value={formData.tanggal_pengambilan}
                  onChange={(e) =>
                    setFormData({ ...formData, tanggal_pengambilan: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Row 4: Status */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status_pengiriman">Status Pengiriman</Label>
                <Select
                  value={formData.status_pengiriman}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status_pengiriman: value })
                  }
                >
                  <SelectTrigger id="status_pengiriman">
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="belum_kirim">🔴 Belum Kirim</SelectItem>
                    <SelectItem value="sudah_kirim">🟢 Sudah Kirim</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status_pengambilan">Status Pengambilan</Label>
                <Select
                  value={formData.status_pengambilan}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status_pengambilan: value })
                  }
                >
                  <SelectTrigger id="status_pengambilan">
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="belum_diambil">🔴 Belum Diambil</SelectItem>
                    <SelectItem value="sudah_diambil">🟢 Sudah Diambil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 5: Biaya & PIC */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ongkos_transport">Biaya Pengiriman (Transport)</Label>
                <Input
                  id="ongkos_transport"
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.ongkos_transport}
                  onChange={(e) =>
                    setFormData({ ...formData, ongkos_transport: e.target.value })
                  }
                  placeholder="Rp 0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="penanggung_jawab">Penanggung Jawab</Label>
                <Input
                  id="penanggung_jawab"
                  value={formData.penanggung_jawab}
                  onChange={(e) =>
                    setFormData({ ...formData, penanggung_jawab: e.target.value })
                  }
                  placeholder="Nama penanggung jawab"
                />
              </div>
            </div>

            {/* Row 6: Catatan */}
            <div className="space-y-2">
              <Label htmlFor="catatan">Catatan</Label>
              <Textarea
                id="catatan"
                value={formData.catatan}
                onChange={(e) =>
                  setFormData({ ...formData, catatan: e.target.value })
                }
                placeholder="Catatan tambahan (opsional)"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
