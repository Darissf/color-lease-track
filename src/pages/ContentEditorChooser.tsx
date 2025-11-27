import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileEdit, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const ContentEditorChooser = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/");
    }
  }, [isSuperAdmin, navigate]);

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="h-[calc(100vh-104px)] overflow-hidden flex flex-col px-2 py-2 md:px-8 md:py-4">
      {/* Header */}
      <div className="shrink-0 mb-3 md:mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/vip/settings/admin")}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 w-full min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent break-words">
            Edit Page
          </h1>
          <p className="text-sm text-muted-foreground">
            Pilih mode pengeditan konten yang sesuai dengan kebutuhan Anda
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid gap-6 md:grid-cols-2 max-w-5xl mx-auto">
          {/* Versi Simpel Card */}
          <Card 
            className="p-6 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary bg-card/95 backdrop-blur-sm"
            onClick={() => navigate("/vip/edit-page")}
          >
            <div className="space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileEdit className="h-8 w-8 text-white" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors mb-2">
                  Versi Simpel
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Interface sederhana untuk quick edit konten dengan UI 2-column layout
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                  <span className="text-muted-foreground">Quick edit dengan search & filter</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                  <span className="text-muted-foreground">UI sederhana & mudah digunakan</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                  <span className="text-muted-foreground">Hapus konten langsung</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                  <span className="text-muted-foreground">Auto-sync & audit checks</span>
                </div>
              </div>

              <Button 
                className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground"
                variant="outline"
              >
                Buka Edit Page
                <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
              </Button>
            </div>
          </Card>

          {/* Versi Pro Card */}
          <Card 
            className="p-6 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-purple-600 bg-gradient-to-br from-purple-600/10 to-pink-600/10 backdrop-blur-sm"
            onClick={() => navigate("/vip/content-studio")}
          >
            <div className="space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-bold text-foreground group-hover:text-purple-600 transition-colors">
                    Versi Pro
                  </h3>
                  <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-semibold rounded-full">
                    PRO
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Professional content management dengan fitur lengkap & advanced tools
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 mt-1.5 shrink-0" />
                  <span className="text-muted-foreground">Version history & restore</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 mt-1.5 shrink-0" />
                  <span className="text-muted-foreground">AI content assistance & suggestions</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 mt-1.5 shrink-0" />
                  <span className="text-muted-foreground">Live preview & analytics dashboard</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 mt-1.5 shrink-0" />
                  <span className="text-muted-foreground">Bulk actions & import/export</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 mt-1.5 shrink-0" />
                  <span className="text-muted-foreground">Multi-panel resizable workspace</span>
                </div>
              </div>

              <Button 
                className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                Buka Content Studio
                <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ContentEditorChooser;
