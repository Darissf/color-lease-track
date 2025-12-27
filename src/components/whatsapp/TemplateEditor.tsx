import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save } from 'lucide-react';
import { MessageTemplate, useMessageTemplates } from '@/hooks/useMessageTemplates';

interface TemplateEditorProps {
  template: MessageTemplate;
  onClose: () => void;
  mode: 'edit' | 'preview';
}

export const TemplateEditor = ({ template, onClose, mode }: TemplateEditorProps) => {
  const { updateTemplate } = useMessageTemplates();
  const [content, setContent] = useState(template.template_content);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await updateTemplate(template.template_type, content);
    setIsSaving(false);
    if (success) {
      onClose();
    }
  };

  const sampleData: Record<string, string> = {
    nama: 'Budi Santoso',
    invoice: '000001',
    lokasi: 'Jl. Sunset Road No. 123, Kuta, Bali',
    tanggal_kirim: '15 November 2024',
    tanggal_ambil: '30 November 2024',
    tanggal_mulai: '15 November 2024',
    tanggal_selesai: '30 November 2024',
    jumlah_unit: '50',
    penanggung_jawab: 'Wayan Sujana',
    jumlah_tagihan: '15.000.000',
    jumlah_lunas: '15.000.000',
    tanggal_lunas: '14 November 2024',
    bank_name: 'BCA',
    sisa_tagihan: '5.000.000',
    jatuh_tempo: '20 November 2024',
  };

  const getPreview = () => {
    let preview = content;
    for (const [key, value] of Object.entries(sampleData)) {
      preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return preview;
  };

  const charCount = content.length;
  const maxChars = 4096;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Edit Template' : 'Preview Template'}: {template.template_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Available Variables */}
          <div>
            <p className="text-sm font-medium mb-2">Variabel Tersedia:</p>
            <div className="flex flex-wrap gap-2">
              {template.variables.map((variable) => (
                <Badge
                  key={variable}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  onClick={() => {
                    if (mode === 'edit') {
                      setContent(content + `{{${variable}}}`);
                    }
                  }}
                >
                  {`{{${variable}}}`}
                </Badge>
              ))}
            </div>
            {mode === 'edit' && (
              <p className="text-xs text-muted-foreground mt-2">
                Klik variabel untuk menambahkannya ke template
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Template Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Template:</p>
                <p className="text-xs text-muted-foreground">
                  {charCount} / {maxChars} karakter
                </p>
              </div>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={mode === 'preview'}
                rows={20}
                className="font-mono text-sm"
                placeholder="Masukkan template pesan..."
              />
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Preview (dengan sample data):</p>
              <div className="p-4 bg-muted rounded-lg border min-h-[400px]">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                  <pre className="text-sm whitespace-pre-wrap font-sans">
                    {getPreview()}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {mode === 'edit' ? 'Batal' : 'Tutup'}
          </Button>
          {mode === 'edit' && (
            <Button onClick={handleSave} disabled={isSaving || charCount > maxChars}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Simpan
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
