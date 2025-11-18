import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, TrendingUp, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { EditableText } from "@/components/editable/EditableText";

export const AIBudgetAdvisor = () => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);

  const handleAnalyze = async () => {
    try {
      setLoading(true);
      setAnalysis(null);
      setSummary(null);

      const { data, error } = await supabase.functions.invoke("ai-budget-advisor");

      if (error) {
        if (error.message?.includes("429")) {
          toast.error("Rate limit tercapai. Silakan coba lagi nanti.");
        } else if (error.message?.includes("402")) {
          toast.error("Kredit AI habis. Silakan tambah kredit di workspace Anda.");
        } else {
          toast.error("Gagal menganalisis budget: " + error.message);
        }
        return;
      }

      if (data?.analysis) {
        setAnalysis(data.analysis);
        setSummary(data.summary);
        toast.success("Analisis AI berhasil!");
      }
    } catch (error) {
      console.error("Error analyzing budget:", error);
      toast.error("Terjadi kesalahan saat menganalisis budget");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <EditableText
                  keyId="/dashboard::ai-budget-advisor.title"
                  defaultValue="AI Budget Advisor"
                  page="/dashboard"
                  category="ui"
                  as="span"
                />
              </CardTitle>
              <EditableText
                keyId="/dashboard::ai-budget-advisor.description"
                defaultValue="Dapatkan prediksi pengeluaran bulan depan dan saran optimasi budget berdasarkan pola historis Anda"
                page="/dashboard"
                category="ui"
                as="p"
                className="text-sm text-muted-foreground"
              />
            </div>
            <Button onClick={handleAnalyze} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menganalisis...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analisis Sekarang
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        
        {summary && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Pengeluaran (6 bulan)</p>
                <p className="text-lg font-bold">Rp {summary.totalExpenses.toLocaleString('id-ID')}</p>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">Rata-rata Bulanan</p>
                <p className="text-lg font-bold">Rp {summary.avgMonthlyExpenses.toLocaleString('id-ID')}</p>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Pemasukan</p>
                <p className="text-lg font-bold">Rp {summary.totalIncome.toLocaleString('id-ID')}</p>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">Tingkat Tabungan</p>
                <p className="text-lg font-bold">{summary.savingsRate}%</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Hasil Analisis AI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                components={{
                  h2: ({ children }) => (
                    <h2 className="text-xl font-bold mt-6 mb-3 flex items-center gap-2">
                      {children?.toString().includes('Prediksi') && <TrendingUp className="h-5 w-5 text-primary" />}
                      {children?.toString().includes('Saran') && <Lightbulb className="h-5 w-5 text-primary" />}
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-6 space-y-2 my-3">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-6 space-y-2 my-3">{children}</ol>
                  ),
                  p: ({ children }) => (
                    <p className="my-2 text-foreground leading-relaxed">{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-primary">{children}</strong>
                  ),
                }}
              >
                {analysis}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
