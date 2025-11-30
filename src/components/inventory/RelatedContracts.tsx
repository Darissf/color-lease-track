import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, MapPin } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface RelatedContractsProps {
  items: any[];
}

interface Contract {
  id: string;
  invoice: string;
  client_group_id: string;
  client_groups: {
    nama: string;
  };
  jenis_scaffolding: string;
  jumlah_unit: number;
  start_date: string;
  end_date: string;
  status_pengiriman: string;
  status_pengambilan: string;
  lokasi_proyek?: string;
}

export function RelatedContracts({ items }: RelatedContractsProps) {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<string>("all");

  useEffect(() => {
    fetchContracts();
  }, [selectedItem]);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("rental_contracts")
        .select(`
          *,
          client_groups (nama)
        `)
        .order("start_date", { ascending: false });

      if (selectedItem !== "all") {
        query = query.eq("jenis_scaffolding", selectedItem);
      }

      const { data, error } = await query;

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      belum_kirim: { variant: "outline", label: "Belum Kirim" },
      sudah_kirim: { variant: "default", label: "Sudah Kirim" },
      belum_diambil: { variant: "secondary", label: "Belum Diambil" },
      sudah_diambil: { variant: "destructive", label: "Selesai" },
    };
    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card className="border-border/40">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Kontrak Terkait
          </CardTitle>
          <Select value={selectedItem} onValueChange={setSelectedItem}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Pilih barang..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Barang</SelectItem>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.item_name}>
                  {item.item_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Tidak ada kontrak ditemukan
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Kelompok</TableHead>
                  <TableHead>Jenis Scaffolding</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lokasi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract) => (
                  <TableRow 
                    key={contract.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/vip/contracts/${contract.id}`)}
                  >
                    <TableCell className="font-medium">{contract.invoice}</TableCell>
                    <TableCell>{contract.client_groups?.nama || "-"}</TableCell>
                    <TableCell>{contract.jenis_scaffolding}</TableCell>
                    <TableCell>{contract.jumlah_unit} set</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(contract.start_date), "d MMM", { locale: id })} -{" "}
                      {format(new Date(contract.end_date), "d MMM yyyy", { locale: id })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {getStatusBadge(contract.status_pengiriman)}
                        {contract.status_pengiriman === "sudah_kirim" && getStatusBadge(contract.status_pengambilan)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3" />
                        {contract.lokasi_proyek || "-"}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
