import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Trash2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SignatureUploaderProps {
  currentSignatureUrl: string | null;
  onSignatureChange: (url: string | null) => void;
}

export const SignatureUploader = ({
  currentSignatureUrl,
  onSignatureChange,
}: SignatureUploaderProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentSignatureUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Hanya file gambar yang diperbolehkan");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 10MB");
      return;
    }

    setUploading(true);
    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/signature.${fileExt}`;

      // Delete existing signature first
      if (currentSignatureUrl) {
        const oldPath = currentSignatureUrl.split("/").slice(-2).join("/");
        await supabase.storage.from("signatures").remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from("signatures")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("signatures")
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;
      onSignatureChange(publicUrl);
      toast.success("TTD digital berhasil diupload");
    } catch (error) {
      console.error("Error uploading signature:", error);
      toast.error("Gagal mengupload TTD digital");
      setPreview(currentSignatureUrl);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!user || !currentSignatureUrl) return;

    try {
      const path = currentSignatureUrl.split("/").slice(-2).join("/").split("?")[0];
      await supabase.storage.from("signatures").remove([path]);
      
      setPreview(null);
      onSignatureChange(null);
      toast.success("TTD digital berhasil dihapus");
    } catch (error) {
      console.error("Error removing signature:", error);
      toast.error("Gagal menghapus TTD digital");
    }
  };

  return (
    <div className="space-y-4">
      <Label>Tanda Tangan Digital</Label>
      
      <Card className="p-4">
        {preview ? (
          <div className="space-y-4">
            <div className="flex justify-center bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <img
                src={preview}
                alt="TTD Digital"
                className="max-w-full object-contain"
              />
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Ganti
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemove}
                disabled={uploading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Hapus
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground text-center">
              Klik untuk upload gambar TTD digital
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Format: PNG, JPG (maks. 10MB)
            </p>
          </div>
        )}
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
