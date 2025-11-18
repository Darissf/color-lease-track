import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ContentAnalysisProps {
  contentKey: string;
  content: string;
}

interface AnalysisResult {
  readability: {
    score: number;
    grade_level: string;
    suggestions: string[];
  };
  seo: {
    score: number;
    suggestions: string[];
  };
  tone: {
    detected_tone: string;
    emotion: string;
    confidence: number;
  };
}

export function ContentAnalysis({ contentKey, content }: ContentAnalysisProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-content-analyzer", {
        body: { content }
      });

      if (error) throw error;
      setAnalysis(data);

      // Save to database
      await supabase.from("content_analysis").upsert({
        content_key: contentKey,
        readability_score: data.readability.score,
        seo_score: data.seo.score,
        tone: data.tone.detected_tone,
        suggestions: data.readability.suggestions,
        analyzed_by: (await supabase.auth.getUser()).data.user?.id
      });

    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error(error.message || "Failed to analyze content");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Content Analysis</h3>
          <Button onClick={runAnalysis} disabled={loading} size="sm">
            <Sparkles className="h-4 w-4 mr-2" />
            {loading ? "Analyzing..." : "Analyze"}
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && !analysis && (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Click "Analyze" to get AI-powered insights
            </p>
          </div>
        )}

        {analysis && (
          <div className="space-y-4">
            {/* Readability */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Readability</h4>
                <Badge variant={analysis.readability.score >= 70 ? "default" : "destructive"}>
                  {analysis.readability.score}/100
                </Badge>
              </div>
              <Progress value={analysis.readability.score} className="mb-3" />
              <p className="text-sm text-muted-foreground mb-2">
                Grade Level: {analysis.readability.grade_level}
              </p>
              {analysis.readability.suggestions.length > 0 && (
                <div className="space-y-1">
                  {analysis.readability.suggestions.map((s, i) => (
                    <p key={i} className="text-sm flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 text-amber-500" />
                      {s}
                    </p>
                  ))}
                </div>
              )}
            </Card>

            {/* SEO */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">SEO Score</h4>
                <Badge variant={analysis.seo.score >= 70 ? "default" : "destructive"}>
                  {analysis.seo.score}/100
                </Badge>
              </div>
              <Progress value={analysis.seo.score} className="mb-3" />
              {analysis.seo.suggestions.length > 0 && (
                <div className="space-y-1">
                  {analysis.seo.suggestions.map((s, i) => (
                    <p key={i} className="text-sm flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 text-amber-500" />
                      {s}
                    </p>
                  ))}
                </div>
              )}
            </Card>

            {/* Tone */}
            <Card className="p-4">
              <h4 className="font-medium mb-3">Tone Analysis</h4>
              <div className="flex gap-2 mb-2">
                <Badge variant="secondary" className="capitalize">
                  {analysis.tone.detected_tone}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {analysis.tone.emotion}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Confidence: {Math.round(analysis.tone.confidence * 100)}%
              </p>
            </Card>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
