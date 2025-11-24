import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Edit, Eye, Truck, Package, FileText, CheckCircle, Bell } from 'lucide-react';
import { useMessageTemplates, TemplateType } from '@/hooks/useMessageTemplates';
import { TemplateEditor } from './TemplateEditor';

const templateIcons: Record<TemplateType, any> = {
  delivery: Truck,
  pickup: Package,
  invoice: FileText,
  payment: CheckCircle,
  reminder: Bell,
  custom: FileText,
};

const templateLabels: Record<TemplateType, string> = {
  delivery: 'Pengiriman',
  pickup: 'Pengambilan',
  invoice: 'Invoice',
  payment: 'Pembayaran',
  reminder: 'Reminder',
  custom: 'Custom',
};

export const MessageTemplates = () => {
  const { templates, loading } = useMessageTemplates();
  const [editingTemplate, setEditingTemplate] = useState<TemplateType | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateType | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(['delivery', 'pickup', 'invoice', 'payment', 'reminder'] as TemplateType[]).map((type) => {
          const template = templates.find(t => t.template_type === type);
          const Icon = templateIcons[type];

          return (
            <Card key={type} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{templateLabels[type]}</h3>
                    <p className="text-xs text-muted-foreground">
                      {template?.template_name || 'Template tidak ditemukan'}
                    </p>
                  </div>
                </div>
                {template?.is_active && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                    Aktif
                  </Badge>
                )}
              </div>

              {template && (
                <>
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg max-h-32 overflow-y-auto">
                    <p className="text-xs whitespace-pre-wrap line-clamp-4">
                      {template.template_content.slice(0, 200)}
                      {template.template_content.length > 200 && '...'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setPreviewTemplate(type)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditingTemplate(type)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </div>

      {/* Template Editor Dialog */}
      {editingTemplate && (
        <TemplateEditor
          template={templates.find(t => t.template_type === editingTemplate)!}
          onClose={() => setEditingTemplate(null)}
          mode="edit"
        />
      )}

      {/* Template Preview Dialog */}
      {previewTemplate && (
        <TemplateEditor
          template={templates.find(t => t.template_type === previewTemplate)!}
          onClose={() => setPreviewTemplate(null)}
          mode="preview"
        />
      )}
    </div>
  );
};
