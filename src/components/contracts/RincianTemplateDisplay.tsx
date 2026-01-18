import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Copy, Check, MessageCircle, Download, Loader2, Pencil, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';

interface RincianTemplateDisplayProps {
  template: string;
  className?: string;
  showCopyButton?: boolean;
  showModeToggle?: boolean;
  showSaveImageButton?: boolean;
  isWhatsAppMode?: boolean;
  onToggleMode?: (mode: boolean) => void;
  isTogglingMode?: boolean;
  invoiceNumber?: string;
  contractId?: string;
  isSuperAdmin?: boolean;
  onTemplateUpdated?: () => void;
}

export function RincianTemplateDisplay({ 
  template, 
  className = '',
  showCopyButton = true,
  showModeToggle = false,
  showSaveImageButton = true,
  isWhatsAppMode = false,
  onToggleMode,
  isTogglingMode = false,
  invoiceNumber = 'rincian',
  contractId,
  isSuperAdmin = false,
  onTemplateUpdated,
}: RincianTemplateDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState(template);
  const [isSaving, setIsSaving] = useState(false);
  const templateRef = useRef<HTMLPreElement>(null);

  if (!template) return null;

  const handleCopy = async () => {
    try {
      const textToCopy = isEditing ? editedTemplate : template;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success('Template berhasil disalin');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Gagal menyalin template');
    }
  };

  const handleStartEdit = () => {
    setEditedTemplate(template);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedTemplate(template);
    setIsEditing(false);
  };

  const handleSaveDirectEdit = async () => {
    if (!contractId) {
      toast.error('Contract ID tidak ditemukan');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('rental_contracts')
        .update({ rincian_template: editedTemplate })
        .eq('id', contractId);

      if (error) throw error;

      toast.success('Template berhasil disimpan');
      setIsEditing(false);
      onTemplateUpdated?.();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Gagal menyimpan template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveImage = async () => {
    if (!templateRef.current) {
      toast.error('Element tidak ditemukan');
      return;
    }

    setIsExporting(true);
    
    try {
      const canvas = await html2canvas(templateRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const link = document.createElement('a');
      const cleanInvoice = invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `Rincian_Sewa_${cleanInvoice}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Gambar berhasil disimpan');
    } catch (error) {
      console.error('Error exporting image:', error);
      toast.error('Gagal menyimpan gambar');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Rincian Tagihan
          </CardTitle>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Edit mode buttons */}
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="h-8 gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="text-xs">Batal</span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveDirectEdit}
                  disabled={isSaving}
                  className="h-8 gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-xs">Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span className="text-xs">Simpan</span>
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                {showModeToggle && onToggleMode && !isEditing && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-lg">
                    <MessageCircle className={cn(
                      "w-3.5 h-3.5 transition-colors",
                      isWhatsAppMode ? "text-green-500" : "text-muted-foreground"
                    )} />
                    <Switch
                      id="whatsapp-mode"
                      checked={isWhatsAppMode}
                      onCheckedChange={onToggleMode}
                      disabled={isTogglingMode}
                      className="data-[state=checked]:bg-green-500"
                    />
                    <Label 
                      htmlFor="whatsapp-mode" 
                      className={cn(
                        "text-xs cursor-pointer transition-colors",
                        isWhatsAppMode ? "text-green-600 font-medium" : "text-muted-foreground"
                      )}
                    >
                      WhatsApp
                    </Label>
                  </div>
                )}
                
                {showSaveImageButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveImage}
                    disabled={isExporting}
                    className="h-8 gap-1.5"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span className="text-xs">Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span className="text-xs">💾 Simpan</span>
                      </>
                    )}
                  </Button>
                )}
                
                {showCopyButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="h-8 gap-1.5"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-xs">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-xs">Salin</span>
                      </>
                    )}
                  </Button>
                )}

                {/* Super Admin Only: Edit Button */}
                {isSuperAdmin && contractId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartEdit}
                    className="h-8 gap-1.5 border-amber-500/50 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span className="text-xs">Edit Teks</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {isEditing ? (
          <Textarea
            value={editedTemplate}
            onChange={(e) => setEditedTemplate(e.target.value)}
            className="font-mono text-xs sm:text-sm min-h-[400px] leading-relaxed resize-y"
            placeholder="Edit template..."
          />
        ) : (
          <pre 
            ref={templateRef}
            className="whitespace-pre-wrap font-mono text-xs sm:text-sm p-3 sm:p-4 bg-muted/50 rounded-lg overflow-x-auto leading-relaxed"
          >
            {template}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
