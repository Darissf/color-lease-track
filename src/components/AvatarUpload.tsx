import { useState, useRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Trash2, Loader2, User } from "lucide-react";
import { ImageCropper } from "./ImageCropper";
import { SakuraConfetti } from "./SakuraConfetti";
import { getAssetUrl } from "@/lib/assetUrl";

interface AvatarUploadProps {
  currentAvatarUrl: string | null;
  userId: string;
  onUploadSuccess: (url: string) => void;
}

export function AvatarUpload({ currentAvatarUrl, userId, onUploadSuccess }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    const maxSize = 2 * 1024 * 1024; // 2MB
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (file.size > maxSize) {
      toast({
        title: "File terlalu besar",
        description: "Maksimal ukuran file adalah 2MB",
        variant: "destructive",
      });
      return false;
    }

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Format tidak didukung",
        description: "Gunakan format JPG, PNG, atau WebP",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      setShowCropper(true);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      setShowCropper(true);
    }
  };

  const handleUpload = async (croppedBlob: Blob) => {
    setUploading(true);
    setShowCropper(false);

    try {
      const fileExt = "jpg";
      const fileName = `${userId}/avatar.${fileExt}`;

      // Delete old avatar if exists
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split("/").pop();
        if (oldPath) {
          await supabase.storage.from("avatars").remove([`${userId}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, croppedBlob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL and convert to asset URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const assetUrl = getAssetUrl(data.publicUrl);

      // Update profile with proxied URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: assetUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      // Trigger confetti
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);

      toast({
        title: "Berhasil! 🎊",
        description: "Avatar telah diperbarui",
      });

      onUploadSuccess(assetUrl);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Gagal upload",
        description: "Terjadi kesalahan saat mengupload avatar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

  const handleRemove = async () => {
    if (!currentAvatarUrl) return;

    setDeleting(true);

    try {
      const path = currentAvatarUrl.split("/").slice(-2).join("/");
      
      const { error: storageError } = await supabase.storage
        .from("avatars")
        .remove([path]);

      if (storageError) throw storageError;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);

      if (updateError) throw updateError;

      toast({
        title: "Avatar dihapus",
        description: "Avatar telah berhasil dihapus",
      });

      onUploadSuccess("");
    } catch (error) {
      console.error("Error removing avatar:", error);
      toast({
        title: "Gagal menghapus",
        description: "Terjadi kesalahan saat menghapus avatar",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="avatar-frame">
        <Avatar className="h-full w-full">
          <AvatarImage src={currentAvatarUrl || undefined} alt="Avatar" />
          <AvatarFallback className="text-4xl">
            <User className="h-20 w-20" />
          </AvatarFallback>
        </Avatar>
      </div>

      <div
        className="w-full max-w-md border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-2">
          Drag & drop foto atau klik untuk upload
        </p>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, WebP (Max 2MB)
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="flex gap-2">
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Avatar
            </>
          )}
        </Button>

        {currentAvatarUrl && (
          <Button variant="destructive" onClick={handleRemove} disabled={deleting}>
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menghapus...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus
              </>
            )}
          </Button>
        )}
      </div>

      {selectedFile && showCropper && (
        <ImageCropper
          file={selectedFile}
          onCrop={handleUpload}
          onCancel={() => {
            setShowCropper(false);
            setSelectedFile(null);
          }}
        />
      )}

      {showConfetti && <SakuraConfetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />}
    </div>
  );
}
