import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, Dna, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const AIAdvisor = () => {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState("");
  const [dnaProfile, setDnaProfile] = useState<any>(null);

  const getInvestmentAdvice = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("ai-investment-advisor");
      
      if (error) throw error;
      
      if (data?.advice) {
        setAdvice(data.advice);
        toast.success("Saran investasi berhasil dibuat!");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Gagal mendapatkan saran investasi");
    } finally {
      setLoading(false);
    }
  };

  const getFinancialDNA = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("ai-financial-dna");
      
      if (error) throw error;
      
      if (data?.profile) {
        setDnaProfile(data.profile);
        toast.success("Financial DNA berhasil dianalisis!");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Gagal menganalisis Financial DNA");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">AI Advisor</h1>
          <p className="text-muted-foreground">Saran investasi, scenario modeling & financial DNA</p>
        </div>
      </div>

      {/* Investment Advisor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Investment Advisor
          </CardTitle>
          <CardDescription>
            AI akan menganalisis portfolio Anda dan memberikan rekomendasi investasi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={getInvestmentAdvice} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menganalisis...
              </>
            ) : (
              "Dapatkan Saran Investasi"
            )}
          </Button>
          
          {advice && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{advice}</ReactMarkdown>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial DNA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dna className="h-5 w-5" />
            Financial DNA Profile
          </CardTitle>
          <CardDescription>
            Discover your unique financial personality & patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={getFinancialDNA} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Analyze My Financial DNA"
            )}
          </Button>
          
          {dnaProfile && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg border border-blue-500/20">
                  <p className="text-sm text-muted-foreground mb-1">Personality Type</p>
                  <p className="text-lg font-bold text-blue-600">{dnaProfile.personality}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-lg border border-green-500/20">
                  <p className="text-sm text-muted-foreground mb-1">Risk Profile</p>
                  <p className="text-lg font-bold text-green-600">{dnaProfile.riskProfile}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-lg border border-purple-500/20">
                  <p className="text-sm text-muted-foreground mb-1">Savings Style</p>
                  <p className="text-lg font-bold text-purple-600">{dnaProfile.savingsStyle}</p>
                </div>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-semibold mb-2">Insights:</p>
                <div className="prose prose-sm dark:prose-invert">
                  <ReactMarkdown>{dnaProfile.insights}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scenario Modeling */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Scenario Modeling
          </CardTitle>
          <CardDescription>
            "What if" analysis untuk berbagai skenario keuangan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Coming soon - Advanced scenario simulation</p>
          <Button variant="outline" disabled>
            Run Scenario Analysis
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIAdvisor;
