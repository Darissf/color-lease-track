import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah } from "@/lib/currency";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Receipt, AlertCircle, CheckCircle, ArrowLeft, Copy, Building2, CreditCard } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Invoice {
  id: string;
  invoice: string | null;
  keterangan: string | null;
  tagihan: number;
  tagihan_belum_bayar: number;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder_name: string | null;
}

export default function MyInvoices() {
  const { activeTheme } = useAppTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    
    // Get client group linked to this user
    const { data: clientGroup, error: clientError } = await supabase
      .from("client_groups")
      .select("id, user_id")
      .eq("linked_user_id", user.id)
      .maybeSingle();

    if (clientError || !clientGroup) {
      console.error("Error fetching client group:", clientError);
      setLoading(false);
      return;
    }

    // Fetch contracts with unpaid balance as invoices
    const { data: contractsData, error: contractsError } = await supabase
      .from("rental_contracts")
      .select("id, invoice, keterangan, tagihan, tagihan_belum_bayar, start_date, end_date, status, created_at")
      .eq("client_group_id", clientGroup.id)
      .order("created_at", { ascending: false });

    if (contractsError) {
      console.error("Error fetching contracts:", contractsError);
    } else {
      setInvoices((contractsData || []) as Invoice[]);
    }

    // Fetch bank accounts for payment info
    const { data: bankData, error: bankError } = await supabase
      .from("bank_accounts")
      .select("id, bank_name, account_number, account_holder_name")
      .eq("user_id", clientGroup.user_id)
      .eq("is_active", true);

    if (bankError) {
      console.error("Error fetching bank accounts:", bankError);
    } else {
      setBankAccounts((bankData || []) as BankAccount[]);
    }

    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Berhasil disalin!");
  };

  const unpaidInvoices = invoices.filter(inv => inv.tagihan_belum_bayar > 0);
  const paidInvoices = invoices.filter(inv => inv.tagihan_belum_bayar <= 0);
  const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + inv.tagihan_belum_bayar, 0);

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
          <div>
            <h1 className={cn(
              "text-3xl font-bold",
              activeTheme === 'japanese' && "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
            )}>
              Tagihan Saya
            </h1>
            <p className="text-muted-foreground mt-1">Daftar tagihan dan instruksi pembayaran</p>
          </div>
        </div>

        {/* Total Unpaid Alert */}
        {totalUnpaid > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Total tagihan belum dibayar: <strong>{formatRupiah(totalUnpaid)}</strong>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoices List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Unpaid Invoices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  Tagihan Belum Lunas ({unpaidInvoices.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {unpaidInvoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>Semua tagihan sudah lunas!</p>
                  </div>
                ) : (
                  unpaidInvoices.map((invoice) => (
                    <div key={invoice.id} className="p-4 border border-red-200 bg-red-50/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{invoice.invoice || "Invoice"}</span>
                        <Badge variant="destructive">Belum Lunas</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{invoice.keterangan || "-"}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Periode: {format(new Date(invoice.start_date), "dd MMM yyyy", { locale: localeId })} - {format(new Date(invoice.end_date), "dd MMM yyyy", { locale: localeId })}
                        </span>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Sisa Tagihan</p>
                          <p className="text-lg font-bold text-red-600">{formatRupiah(invoice.tagihan_belum_bayar)}</p>
                        </div>
                      </div>
                      <Button 
                        className="w-full mt-3"
                        onClick={() => navigate(`/vip/my-contracts/${invoice.id}`)}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Lihat Detail & Bayar
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Paid Invoices */}
            {paidInvoices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    Tagihan Lunas ({paidInvoices.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {paidInvoices.slice(0, 5).map((invoice) => (
                    <div key={invoice.id} className="p-4 border rounded-lg bg-green-50/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{invoice.invoice || "Invoice"}</span>
                        <Badge className="bg-green-500">Lunas</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{invoice.keterangan || "-"}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(invoice.start_date), "dd MMM yyyy", { locale: localeId })} - {format(new Date(invoice.end_date), "dd MMM yyyy", { locale: localeId })}
                        </span>
                        <span className="font-semibold text-green-600">{formatRupiah(invoice.tagihan)}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Payment Instructions */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Instruksi Pembayaran
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Transfer ke salah satu rekening berikut. Pembayaran akan otomatis terverifikasi dalam 1x24 jam.
                </p>
                
                {bankAccounts.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">Hubungi admin untuk informasi rekening.</p>
                  </div>
                ) : (
                  bankAccounts.map((bank) => (
                    <div key={bank.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{bank.bank_name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-mono">{bank.account_number}</span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => copyToClipboard(bank.account_number)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      {bank.account_holder_name && (
                        <p className="text-sm text-muted-foreground">a.n. {bank.account_holder_name}</p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Catatan Penting</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>• Transfer sesuai nominal tagihan</p>
                <p>• Simpan bukti transfer sebagai arsip</p>
                <p>• Pembayaran otomatis terdeteksi via Moota</p>
                <p>• Konfirmasi akan dikirim via WhatsApp</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
