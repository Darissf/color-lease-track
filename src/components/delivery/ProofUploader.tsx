import React, { useState } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { compressImage } from '@/utils/imageCompressor';
import { getAssetUrl } from '@/lib/assetUrl';

interface ProofUploaderProps {
  onUpload: (photos: string[], notes: string) => void;
  isUploading?: boolean;
  className?: string;
}

export const ProofUploader: React.FC<ProofUploaderProps> = ({
  onUpload,
  isUploading = false,
  className,
}) => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        // Compress image
        const compressed = await compressImage(file, { maxSizeKB: 1024, maxWidth: 1920, maxHeight: 1920 });
        
        const fileName = `delivery-proof/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        
        const { data, error } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, compressed, {
            contentType: 'image/jpeg',
          });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(fileName);

        uploadedUrls.push(getAssetUrl(urlData.publicUrl));
      }

      setPhotos(prev => [...prev, ...uploadedUrls]);
      toast({
        title: 'Foto Berhasil Diupload',
        description: `${uploadedUrls.length} foto ditambahkan`,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Gagal',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    onUpload(photos, notes);
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Photo Upload */}
        <div>
          <Label className="text-sm font-medium text-slate-700">
            Bukti Pengiriman (Foto)
          </Label>
          
          <div className="mt-2 grid grid-cols-3 gap-2">
            {photos.map((url, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                <img src={url} alt={`Proof ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            
            {/* Upload Button */}
            <label className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-slate-50 transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              {uploading ? (
                <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
              ) : (
                <>
                  <Camera className="h-8 w-8 text-slate-400 mb-1" />
                  <span className="text-xs text-slate-500">Ambil Foto</span>
                </>
              )}
            </label>
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="delivery-notes" className="text-sm font-medium text-slate-700">
            Catatan Pengiriman
          </Label>
          <Textarea
            id="delivery-notes"
            placeholder="Catatan tambahan (opsional)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-2"
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isUploading || uploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Selesaikan Pengiriman
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
