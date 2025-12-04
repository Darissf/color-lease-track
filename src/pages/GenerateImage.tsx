import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ImageIcon, Download, Loader2, Sparkles, AlertCircle, Settings } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

const IMAGE_MODELS = [
  { id: "imagen-3.0-generate-002", name: "Imagen 3", description: "Google's dedicated image generation model" },
  { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash (Experimental)", description: "Fast multimodal with image output" },
];

const GenerateImage = () => {
  const { isAdmin, isSuperAdmin, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const { activeTheme } = useAppTheme();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("imagen-3.0-generate-002");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  // Check admin access
  useEffect(() => {
    if (!authLoading && !isAdmin && !isSuperAdmin) {
      toast.error("Akses ditolak. Halaman ini hanya untuk Admin.");
      navigate("/vip/");
    }
  }, [isAdmin, isSuperAdmin, authLoading, navigate]);

  // Check if user has Gemini API key configured
  useEffect(() => {
    const checkApiKey = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("user_ai_settings")
        .select("id")
        .eq("user_id", user.id)
        .eq("ai_provider", "gemini")
        .maybeSingle();
      
      setHasApiKey(!!data);
    };
    
    checkApiKey();
  }, [user]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Masukkan deskripsi gambar terlebih dahulu");
      return;
    }

    setIsLoading(true);
    setGeneratedImage(null);

    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-image", {
        body: {
          prompt: prompt.trim(),
          model,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.imageBase64) {
        setGeneratedImage(data.imageBase64);
        toast.success("Gambar berhasil digenerate!");
      } else {
        throw new Error("Tidak ada gambar yang dihasilkan");
      }
    } catch (error: any) {
      console.error("Generate error:", error);
      toast.error("Gagal generate gambar: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;

    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Gambar berhasil didownload!");
  };

  if (authLoading) {
    return (
      <div className="h-[calc(100vh-104px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col p-4 md:p-6">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-primary" />
            <h1 className={cn(
              "text-xl md:text-2xl font-bold",
              activeTheme === 'japanese' && "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
            )}>
              AI Image Generator
            </h1>
          </div>
          
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMAGE_MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Generate gambar menggunakan Google AI (Imagen 3 / Gemini)
        </p>
      </div>

      {/* API Key Warning */}
      {hasApiKey === false && (
        <Alert className="mb-4 shrink-0" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Gemini API key belum dikonfigurasi. Silakan tambahkan di AI Settings.</span>
            <Button size="sm" variant="outline" onClick={() => navigate("/vip/settings/ai")}>
              <Settings className="w-4 h-4 mr-2" />
              Konfigurasi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0 overflow-hidden">
        {/* Left: Preview */}
        <Card className="flex flex-col min-h-0">
          <CardHeader className="shrink-0">
            <CardTitle className="text-lg">Preview</CardTitle>
            <CardDescription>
              {IMAGE_MODELS.find(m => m.id === model)?.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center overflow-auto">
            {isLoading ? (
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p>Sedang membuat gambar...</p>
                <p className="text-xs">Proses ini membutuhkan waktu beberapa detik</p>
              </div>
            ) : generatedImage ? (
              <div className="relative group">
                <img
                  src={generatedImage}
                  alt="Generated"
                  className="max-w-full max-h-[400px] rounded-lg shadow-lg object-contain"
                />
                <Button
                  size="sm"
                  onClick={handleDownload}
                  className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <ImageIcon className="w-16 h-16 opacity-30" />
                <p className="text-center">
                  Masukkan deskripsi gambar dan klik Generate
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Input */}
        <Card className="flex flex-col min-h-0">
          <CardHeader className="shrink-0">
            <CardTitle className="text-lg">Prompt</CardTitle>
            <CardDescription>
              Deskripsikan gambar yang ingin Anda buat dengan detail
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Contoh: A beautiful sunset over Indonesian rice terraces, with a traditional Balinese temple in the background, photorealistic, 4k quality"
              className="flex-1 min-h-[150px] resize-none"
              disabled={isLoading}
            />

            <div className="shrink-0 space-y-3">
              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isLoading || hasApiKey === false}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Image
                  </>
                )}
              </Button>

              {generatedImage && (
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Image
                </Button>
              )}
            </div>

            <Alert className="shrink-0">
              <Sparkles className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Tips:</strong> Semakin detail deskripsi, semakin baik hasilnya. 
                Tambahkan gaya (photorealistic, anime, watercolor), pencahayaan (sunset, studio light), 
                dan kualitas (4k, high detail).
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GenerateImage;
