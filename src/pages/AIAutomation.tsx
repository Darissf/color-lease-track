import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, Upload, Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AIAutomation = () => {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);

  const handleCategorize = async () => {
    if (!description.trim()) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("ai-smart-categorization", {
        body: { description }
      });

      if (error) throw error;

      if (data?.category) {
        setCategory(data.category);
        toast.success(`Kategori: ${data.category}`);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Gagal mengkategorikan");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setOcrLoading(true);
      
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        const { data, error } = await supabase.functions.invoke("ai-document-intelligence", {
          body: { image: base64 }
        });

        if (error) throw error;

        if (data) {
          setOcrResult(data);
          toast.success("Dokumen berhasil dianalisis!");
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Gagal memproses dokumen");
    } finally {
      setOcrLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">AI Automation</h1>
          <p className="text-muted-foreground">Otomasi cerdas untuk categorization & document processing</p>
        </div>
      </div>

      {/* Smart Categorization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Smart Categorization
          </CardTitle>
          <CardDescription>
            AI akan otomatis kategorisasi expense berdasarkan deskripsi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Contoh: Beli nasi goreng di warteg..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleCategorize()}
            />
            <Button onClick={handleCategorize} disabled={loading || !description.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kategorikan"}
            </Button>
          </div>
          {category && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Kategori yang direkomendasikan:</p>
              <p className="text-lg font-semibold text-primary">{category}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Intelligence (OCR)
          </CardTitle>
          <CardDescription>
            Upload struk/invoice, AI akan extract semua data penting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to upload receipt, invoice, or contract
              </p>
            </label>
          </div>

          {ocrLoading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-3">Menganalisis dokumen...</p>
            </div>
          )}

          {ocrResult && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="font-semibold">Hasil Analisis:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Jumlah:</span>
                  <span className="ml-2 font-semibold">{ocrResult.amount || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tanggal:</span>
                  <span className="ml-2 font-semibold">{ocrResult.date || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Kategori:</span>
                  <span className="ml-2 font-semibold">{ocrResult.category || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Merchant:</span>
                  <span className="ml-2 font-semibold">{ocrResult.merchant || "N/A"}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AIAutomation;
