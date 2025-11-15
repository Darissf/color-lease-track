import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Heart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const AIInsights = () => {
  const [loading, setLoading] = useState(false);
  const [behavioralInsights, setBehavioralInsights] = useState("");
  const [emotionalAnalysis, setEmotionalAnalysis] = useState<any>(null);

  const getBehavioralInsights = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("ai-behavioral-insights");
      
      if (error) throw error;
      
      if (data?.insights) {
        setBehavioralInsights(data.insights);
        toast.success("Behavioral insights berhasil dibuat!");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Gagal mendapatkan behavioral insights");
    } finally {
      setLoading(false);
    }
  };

  const getEmotionalAnalysis = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("ai-emotional-finance");
      
      if (error) throw error;
      
      if (data?.analysis) {
        setEmotionalAnalysis(data.analysis);
        toast.success("Emotional analysis berhasil!");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Gagal menganalisis emotional patterns");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">AI Insights</h1>
          <p className="text-muted-foreground">Behavioral analysis & emotional finance intelligence</p>
        </div>
      </div>

      {/* Behavioral Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Behavioral Finance Insights
          </CardTitle>
          <CardDescription>
            Analisis mendalam tentang pola spending behavior & psychological triggers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={getBehavioralInsights} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Behavior...
              </>
            ) : (
              "Analyze My Behavior"
            )}
          </Button>
          
          {behavioralInsights && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{behavioralInsights}</ReactMarkdown>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emotional Finance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Emotional Finance Analysis
          </CardTitle>
          <CardDescription>
            Detect emotional spending patterns & stress-based recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={getEmotionalAnalysis} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Emotions...
              </>
            ) : (
              "Analyze Emotional Patterns"
            )}
          </Button>
          
          {emotionalAnalysis && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gradient-to-br from-red-500/10 to-red-600/10 rounded-lg border border-red-500/20">
                  <p className="text-sm text-muted-foreground mb-1">Stress Level</p>
                  <p className="text-lg font-bold text-red-600">{emotionalAnalysis.stressLevel || "Low"}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 rounded-lg border border-yellow-500/20">
                  <p className="text-sm text-muted-foreground mb-1">Emotional Triggers</p>
                  <p className="text-lg font-bold text-yellow-600">{emotionalAnalysis.triggers || "0"}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-lg border border-green-500/20">
                  <p className="text-sm text-muted-foreground mb-1">Health Score</p>
                  <p className="text-lg font-bold text-green-600">{emotionalAnalysis.healthScore || "85"}</p>
                </div>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-semibold mb-2">Recommendations:</p>
                <div className="prose prose-sm dark:prose-invert">
                  <ReactMarkdown>{emotionalAnalysis.recommendations}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AIInsights;
