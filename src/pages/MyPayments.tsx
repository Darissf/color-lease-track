import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah } from "@/lib/currency";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CreditCard, CheckCircle, ArrowLeft, Calendar, Receipt, TrendingUp } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

interface Payment {
  id: string;
  contract_id: string;
  payment_date: string;
  amount: number;
  payment_number: number;
  notes: string | null;
  created_at: string;
  contract?: {
    invoice: string | null;
    keterangan: string | null;
  };
}

export default function MyPayments() {
  const { activeTheme } = useAppTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user]);

  const fetchPayments = async () => {
    if (!user) return;

    setLoading(true);
    
    // Get client group linked to this user
    const { data: clientGroup, error: clientError } = await supabase
      .from("client_groups")
      .select("id")
      .eq("linked_user_id", user.id)
      .maybeSingle();

    if (clientError || !clientGroup) {
      console.error("Error fetching client group:", clientError);
      setLoading(false);
      return;
    }

    // Get contracts for this client
    const { data: contracts, error: contractsError } = await supabase
      .from("rental_contracts")
      .select("id, invoice, keterangan")
      .eq("client_group_id", clientGroup.id);

    if (contractsError || !contracts?.length) {
      setLoading(false);
      return;
    }

    const contractIds = contracts.map(c => c.id);
    const contractMap = new Map(contracts.map(c => [c.id, { invoice: c.invoice, keterangan: c.keterangan }]));

    // Fetch all payments for these contracts
    const { data: paymentsData, error: paymentsError } = await supabase
      .from("contract_payments")
      .select("*")
      .in("contract_id", contractIds)
      .order("payment_date", { ascending: false });

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError);
    } else {
      const paymentsWithContract = (paymentsData || []).map(p => ({
        ...p,
        contract: contractMap.get(p.contract_id)
      })) as Payment[];
      
      setPayments(paymentsWithContract);

      // Extract available years
      const years = [...new Set(paymentsWithContract.map(p => new Date(p.payment_date).getFullYear()))];
      setAvailableYears(years.sort((a, b) => b - a));
    }

    setLoading(false);
  };

  const filteredPayments = yearFilter === "all" 
    ? payments 
    : payments.filter(p => new Date(p.payment_date).getFullYear().toString() === yearFilter);

  const totalPaid = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  // Group payments by month
  const groupedPayments = filteredPayments.reduce((acc, payment) => {
    const monthKey = format(new Date(payment.payment_date), "MMMM yyyy", { locale: localeId });
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(payment);
    return acc;
  }, {} as Record<string, Payment[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto px-2 py-2 md:px-8 md:py-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/vip/client-dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className={cn(
              "text-3xl font-bold",
              activeTheme === 'japanese' && "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
            )}>
              Riwayat Pembayaran
            </h1>
            <p className="text-muted-foreground mt-1">Timeline semua pembayaran Anda</p>
          </div>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Tahun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Card */}
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Pembayaran</p>
                  <p className="text-2xl font-bold text-green-600">{formatRupiah(totalPaid)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Jumlah Transaksi</p>
                <p className="text-2xl font-bold">{filteredPayments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        {Object.keys(groupedPayments).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">Belum ada riwayat pembayaran</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedPayments).map(([month, monthPayments]) => (
              <div key={month}>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  {month}
                </h3>
                <div className="space-y-3 pl-4 border-l-2 border-muted">
                  {monthPayments.map((payment) => (
                    <div 
                      key={payment.id} 
                      className="relative pl-6 pb-4"
                    >
                      {/* Timeline dot */}
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background" />
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Receipt className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold">{payment.contract?.invoice || "Invoice"}</span>
                                <Badge variant="outline" className="text-xs">#{payment.payment_number}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{payment.contract?.keterangan || "-"}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(payment.payment_date), "EEEE, dd MMMM yyyy", { locale: localeId })}
                              </p>
                              {payment.notes && (
                                <p className="text-xs text-muted-foreground mt-1 italic">"{payment.notes}"</p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span className="font-bold">{formatRupiah(payment.amount)}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
