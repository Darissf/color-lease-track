import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { StampDesigner } from "@/components/stamp-designer/StampDesigner";

const CustomStampSettings = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/");
    }
  }, [isSuperAdmin, navigate]);

  if (!isSuperAdmin) return null;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/vip/settings/invoice")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Custom Stempel Designer</h1>
          <p className="text-sm text-muted-foreground">
            Drag & drop teks, atur font, ukuran, dan posisi
          </p>
        </div>
      </div>

      {/* Stamp Designer */}
      <StampDesigner />
    </div>
  );
};

export default CustomStampSettings;
