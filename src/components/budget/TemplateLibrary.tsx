import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BudgetTemplate } from "@/types/budgetTypes";
import { useAuth } from "@/contexts/AuthContext";

interface TemplateLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyTemplate: (templateId: string) => void;
}

export const TemplateLibrary = ({ open, onOpenChange, onApplyTemplate }: TemplateLibraryProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<BudgetTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('budget_templates')
      .select('*')
      .or(`user_id.eq.${user?.id},is_public.eq.true`)
      .order('usage_count', { ascending: false });
    
    setTemplates((data || []).map(t => ({
      ...t,
      category_allocations: t.category_allocations as unknown as Record<string, number>
    })));
    setLoading(false);
  };

  const handleApply = (templateId: string) => {
    onApplyTemplate(templateId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Template Budget</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Memuat template...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Tidak ada template tersedia</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(template => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{template.template_name}</CardTitle>
                    {template.is_public && <Badge variant="secondary">Public</Badge>}
                  </div>
                  {template.description && (
                    <CardDescription>{template.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {Object.entries(template.category_allocations).map(([category, percentage]) => (
                      <div key={category} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{category}:</span>
                        <span className="font-medium">{percentage}%</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      Digunakan {template.usage_count}x
                    </span>
                    <Button size="sm" onClick={() => handleApply(template.id)}>
                      Gunakan Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
