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

interface ContractInfo {
  invoice: string;
  client_name: string;
  start_date: string;
  end_date: string;
  jenis_scaffolding: string | null;
  jumlah_unit: number | null;
  lokasi_detail: string | null;
  tanggal_kirim: string | null;
  tanggal_ambil: string | null;
  status_pengiriman: string | null;
  status_pengambilan: string | null;
  biaya_kirim: number | null;
  penanggung_jawab: string | null;
  notes: string | null;
}

interface InventoryItem {
  id: string;
  item_name: string;
}

export default function ContractScaffoldingInput() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  
  const [formData, setFormData] = useState({
    jenis_scaffolding: "",
    jumlah_unit: "",
    lokasi_detail: "",
    tanggal_kirim: "",
    tanggal_ambil: "",
    status_pengiriman: "",
    status_pengambilan: "",
    biaya_kirim: "",
    penanggung_jawab: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch contract info
      const { data: contract, error: contractError } = await supabase
        .from("rental_contracts")
        .select(`
          invoice,
          start_date,
          end_date,
          jenis_scaffolding,
          jumlah_unit,
          lokasi_detail,
          tanggal_kirim,
          tanggal_ambil,
          status_pengiriman,
          status_pengambilan,
          biaya_kirim,
          penanggung_jawab,
          notes,
          client_groups (nama)
        `)
        .eq("id", id)
        .single();

      if (contractError) throw contractError;

      const contractData: ContractInfo = {
        ...contract,
        client_name: (contract.client_groups as any)?.nama || "",
      };
      setContractInfo(contractData);

      // Set form data from existing contract data
      setFormData({
        jenis_scaffolding: contract.jenis_scaffolding || "",
        jumlah_unit: contract.jumlah_unit?.toString() || "",
        lokasi_detail: contract.lokasi_detail || "",
        tanggal_kirim: contract.tanggal_kirim || "",
        tanggal_ambil: contract.tanggal_ambil || "",
        status_pengiriman: contract.status_pengiriman || "",
        status_pengambilan: contract.status_pengambilan || "",
        biaya_kirim: contract.biaya_kirim?.toString() || "",
        penanggung_jawab: contract.penanggung_jawab || "",
        notes: contract.notes || "",
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
      toast.error("Gagal memuat data kontrak");
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
        lokasi_detail: formData.lokasi_detail || null,
        tanggal_kirim: formData.tanggal_kirim || null,
        tanggal_ambil: formData.tanggal_ambil || null,
        status_pengiriman: formData.status_pengiriman || null,
        status_pengambilan: formData.status_pengambilan || null,
        biaya_kirim: formData.biaya_kirim ? parseFloat(formData.biaya_kirim) : null,
        penanggung_jawab: formData.penanggung_jawab || null,
        notes: formData.notes || null,
        updated_at: getNowInJakarta().toISOString(),
      };

      const { error } = await supabase
        .from("rental_contracts")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      toast.success("Data scaffolding berhasil disimpan");
      navigate(`/vip/contracts/${id}`);
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

  if (!contractInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Kontrak tidak ditemukan</p>
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
              onClick={() => navigate("/vip/rental-contracts")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              List Kontrak
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/vip/contracts/${id}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Detail Kontrak
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
              {contractInfo.invoice} • {contractInfo.client_name} • Periode:{" "}
              {new Date(contractInfo.start_date).toLocaleDateString("id-ID")} -{" "}
              {new Date(contractInfo.end_date).toLocaleDateString("id-ID")}
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
              <Label htmlFor="lokasi_detail">Lokasi Proyek</Label>
              <Textarea
                id="lokasi_detail"
                value={formData.lokasi_detail}
                onChange={(e) =>
                  setFormData({ ...formData, lokasi_detail: e.target.value })
                }
                placeholder="Alamat lengkap lokasi proyek"
                rows={2}
              />
            </div>

            {/* Row 3: Tanggal */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tanggal_kirim">Tanggal Pengiriman</Label>
                <Input
                  id="tanggal_kirim"
                  type="date"
                  value={formData.tanggal_kirim}
                  onChange={(e) =>
                    setFormData({ ...formData, tanggal_kirim: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tanggal_ambil">Tanggal Pengambilan</Label>
                <Input
                  id="tanggal_ambil"
                  type="date"
                  value={formData.tanggal_ambil}
                  onChange={(e) =>
                    setFormData({ ...formData, tanggal_ambil: e.target.value })
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
                <Label htmlFor="biaya_kirim">Biaya Pengiriman (Transport)</Label>
                <Input
                  id="biaya_kirim"
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.biaya_kirim}
                  onChange={(e) =>
                    setFormData({ ...formData, biaya_kirim: e.target.value })
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
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
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
