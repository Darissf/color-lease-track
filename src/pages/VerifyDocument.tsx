import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/currency";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Search, 
  Calendar, 
  User, 
  Receipt,
  Shield,
  Eye
} from "lucide-react";

interface VerificationResult {
  isValid: boolean;
  document?: {
    id: string;
    document_type: string;
    document_number: string;
    verification_code: string;
    status: string;
    amount: number;
    amount_text: string | null;
    client_name: string | null;
    description: string | null;
    issued_at: string;
    verified_count: number;
  };
}

const VerifyDocument = () => {
  const { verificationCode: codeFromUrl } = useParams<{ verificationCode: string }>();
  const navigate = useNavigate();
  const [code, setCode] = useState(codeFromUrl || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (codeFromUrl) {
      verifyDocument(codeFromUrl);
    }
  }, [codeFromUrl]);

  const verifyDocument = async (verificationCode: string) => {
    if (!verificationCode.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-document", {
        body: { verificationCode: verificationCode.toUpperCase() },
      });

      if (error) throw error;

      setResult(data);
    } catch (error) {
      console.error("Error verifying document:", error);
      setResult({ isValid: false });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      verifyDocument(code.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Verifikasi Dokumen
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Pastikan keaslian invoice atau kwitansi Anda
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                placeholder="Masukkan kode verifikasi (misal: ABC12345)"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="font-mono text-lg tracking-wider"
                maxLength={10}
              />
              <Button type="submit" disabled={loading || !code.trim()} className="gap-2">
                <Search className="h-4 w-4" />
                {loading ? "Mencari..." : "Verifikasi"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Result */}
        {searched && result && (
          <Card className={result.isValid ? "border-emerald-500" : "border-red-500"}>
            <CardHeader className={result.isValid ? "bg-emerald-50 dark:bg-emerald-950" : "bg-red-50 dark:bg-red-950"}>
              <CardTitle className="flex items-center gap-3">
                {result.isValid ? (
                  <>
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    <div>
                      <span className="text-emerald-700 dark:text-emerald-400">Dokumen Valid</span>
                      <p className="text-sm font-normal text-emerald-600 dark:text-emerald-500">
                        Dokumen ini asli dan terdaftar dalam sistem kami
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-8 w-8 text-red-600" />
                    <div>
                      <span className="text-red-700 dark:text-red-400">Dokumen Tidak Valid</span>
                      <p className="text-sm font-normal text-red-600 dark:text-red-500">
                        Kode verifikasi tidak ditemukan dalam sistem
                      </p>
                    </div>
                  </>
                )}
              </CardTitle>
            </CardHeader>

            {result.isValid && result.document && (
              <CardContent className="pt-6 space-y-4">
                {/* Document Type Badge */}
                <div className="flex items-center justify-between">
                  <Badge variant={result.document.document_type === "kwitansi" ? "default" : "secondary"} className="text-sm">
                    {result.document.document_type === "kwitansi" ? (
                      <>
                        <Receipt className="h-3 w-3 mr-1" />
                        Kwitansi
                      </>
                    ) : (
                      <>
                        <FileText className="h-3 w-3 mr-1" />
                        Invoice
                      </>
                    )}
                  </Badge>
                  <Badge variant={result.document.status === "LUNAS" ? "default" : "outline"} className={result.document.status === "LUNAS" ? "bg-emerald-500" : "border-orange-500 text-orange-600"}>
                    {result.document.status === "LUNAS" ? "✓ LUNAS" : "⏳ BELUM LUNAS"}
                  </Badge>
                </div>

                {/* Document Details */}
                <div className="grid gap-3">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Nomor Dokumen</p>
                      <p className="font-mono font-semibold">{result.document.document_number}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <User className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Nama Klien</p>
                      <p className="font-semibold">{result.document.client_name || "-"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Tanggal Terbit</p>
                      <p className="font-semibold">
                        {format(new Date(result.document.issued_at), "dd MMMM yyyy", { locale: localeId })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                    <Receipt className="h-5 w-5 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-emerald-600">Jumlah</p>
                      <p className="font-bold text-lg text-emerald-700">{formatRupiah(result.document.amount)}</p>
                      {result.document.amount_text && (
                        <p className="text-sm italic text-gray-600">{result.document.amount_text}</p>
                      )}
                    </div>
                  </div>

                  {result.document.description && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-500">Keterangan</p>
                      <p className="text-sm">{result.document.description}</p>
                    </div>
                  )}
                </div>

                {/* Verification Count */}
                <div className="flex items-center gap-2 text-sm text-gray-500 pt-2 border-t">
                  <Eye className="h-4 w-4" />
                  Dokumen ini telah diverifikasi {result.document.verified_count} kali
                </div>
              </CardContent>
            )}

            {!result.isValid && (
              <CardContent className="pt-6">
                <div className="text-center py-4">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Pastikan kode yang Anda masukkan sudah benar.
                  </p>
                  <p className="text-sm text-gray-500">
                    Jika Anda yakin kode tersebut valid, silakan hubungi kami untuk bantuan lebih lanjut.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Sewa Scaffolding Bali</p>
          <Button variant="link" size="sm" onClick={() => navigate("/")}>
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VerifyDocument;
