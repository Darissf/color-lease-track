import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Loader2, Building2, FileText } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface RelatedIncomeProps {
  items: any[];
}

interface Income {
  id: string;
  date: string;
  source_name: string;
  amount: number;
  bank_name: string;
  contract_id: string;
  rental_contracts: {
    invoice: string;
    jenis_scaffolding: string;
    client_groups: {
      nama: string;
    };
  };
}

export function RelatedIncome({ items }: RelatedIncomeProps) {
  const [incomeList, setIncomeList] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<string>("all");

  useEffect(() => {
    fetchIncome();
  }, [selectedItem]);

  const fetchIncome = async () => {
    try {
      setLoading(true);
      
      // First get contracts related to selected item
      let contractQuery = supabase
        .from("rental_contracts")
        .select("id, jenis_scaffolding");

      if (selectedItem !== "all") {
        contractQuery = contractQuery.eq("jenis_scaffolding", selectedItem);
      }

      const { data: contractData, error: contractError } = await contractQuery;
      if (contractError) throw contractError;

      const contractIds = contractData?.map(c => c.id) || [];

      if (contractIds.length === 0) {
        setIncomeList([]);
        setLoading(false);
        return;
      }

      // Then get income from those contracts
      const { data: incomeData, error: incomeError } = await supabase
        .from("income_sources")
        .select(`
          *,
          rental_contracts (
            invoice,
            jenis_scaffolding,
            client_groups (nama)
          )
        `)
        .in("contract_id", contractIds)
        .order("date", { ascending: false });

      if (incomeError) throw incomeError;
      setIncomeList(incomeData || []);
    } catch (error) {
      console.error("Error fetching income:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = incomeList.reduce((sum, income) => sum + (income.amount || 0), 0);

  return (
    <Card className="border-border/40">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Pemasukan
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
        {incomeList.length > 0 && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-sm text-muted-foreground">Total Pemasukan</div>
            <div className="text-2xl font-bold text-foreground">
              Rp {totalIncome.toLocaleString("id-ID")}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : incomeList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Tidak ada pemasukan ditemukan
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Sumber</TableHead>
                  <TableHead>Kelompok</TableHead>
                  <TableHead>Jenis Scaffolding</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeList.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell>
                      {income.date ? format(new Date(income.date), "d MMM yyyy", { locale: id }) : "-"}
                    </TableCell>
                    <TableCell>{income.source_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {income.rental_contracts?.client_groups?.nama || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {income.rental_contracts?.jenis_scaffolding || "-"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      Rp {(income.amount || 0).toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {income.bank_name || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {income.rental_contracts?.invoice || "-"}
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
