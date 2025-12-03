import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import DOMPurify from 'dompurify';

interface EmailTemplate {
  id: string;
  template_type: string;
  template_name: string;
  subject_template: string;
  body_template: string;
  variables: string[];
  usage_count: number;
}

const TEMPLATE_TYPES = {
  password_reset_otp: {
    label: 'Reset Password OTP',
    requiredVars: ['name', 'otp', 'valid_minutes', 'app_name'],
    sampleData: { name: 'John Doe', otp: '123456', valid_minutes: '30', app_name: 'Sewa Scaffolding Bali' }
  },
  email_verification: {
    label: 'Verifikasi Email',
    requiredVars: ['name', 'otp', 'valid_minutes', 'app_name'],
    sampleData: { name: 'John Doe', otp: '654321', valid_minutes: '30', app_name: 'Sewa Scaffolding Bali' }
  },
  email_change_otp: {
    label: 'Ganti Email OTP',
    requiredVars: ['name', 'otp', 'new_email', 'valid_until', 'app_name'],
    sampleData: { name: 'John', otp: '111222', new_email: 'new@email.com', valid_until: '27 Nov 2025, 14:30', app_name: 'Sewa Scaffolding Bali' }
  },
  admin_password_reset: {
    label: 'Password Reset oleh Admin',
    requiredVars: ['name', 'new_password', 'app_name'],
    sampleData: { name: 'John', new_password: 'tempPass123', app_name: 'Sewa Scaffolding Bali' }
  },
  welcome: {
    label: 'Welcome Email',
    requiredVars: ['name', 'app_name', 'dashboard_link'],
    sampleData: { name: 'John', app_name: 'Sewa Scaffolding Bali', dashboard_link: 'https://sewascaffoldingbali.com/vip/' }
  },
  invoice: {
    label: 'Invoice',
    requiredVars: ['customer_name', 'invoice_number', 'amount', 'due_date', 'company_name'],
    sampleData: { customer_name: 'PT ABC', invoice_number: 'INV-001', amount: '5.000.000', due_date: '30 Nov 2025', company_name: 'Sewa Scaffolding Bali' }
  },
  custom: {
    label: 'Custom Template',
    requiredVars: [],
    sampleData: {}
  }
} as const;

const EmailTemplateEditor = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [currentTemplate, setCurrentTemplate] = useState<Partial<EmailTemplate>>({
    template_name: "",
    subject_template: "",
    body_template: "",
    template_type: "",
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find((t) => t.id === selectedTemplate);
      if (template) {
        setCurrentTemplate(template);
      }
    }
  }, [selectedTemplate, templates]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("is_active", true)
        .order("template_type");

      if (error) throw error;
      setTemplates((data || []).map(t => ({
        ...t,
        variables: Array.isArray(t.variables) ? t.variables : []
      })) as EmailTemplate[]);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const variables = extractVariables(
        currentTemplate.subject_template + currentTemplate.body_template
      );

      const templateLabel = TEMPLATE_TYPES[currentTemplate.template_type as keyof typeof TEMPLATE_TYPES]?.label || currentTemplate.template_type;
      
      const { error } = await supabase.from("email_templates").upsert({
        id: selectedTemplate || undefined,
        user_id: user.id,
        template_type: currentTemplate.template_type,
        template_name: templateLabel,
        subject_template: currentTemplate.subject_template,
        body_template: currentTemplate.body_template,
        variables: variables,
        is_active: true,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template saved successfully",
      });

      fetchTemplates();
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map((m) => m.replace(/[{}]/g, "")))];
  };

  const insertVariable = (variable: string) => {
    setCurrentTemplate({
      ...currentTemplate,
      body_template: (currentTemplate.body_template || "") + `{{${variable}}}`,
    });
  };

  const renderPreview = () => {
    let preview = currentTemplate.body_template || "";
    const templateType = currentTemplate.template_type as keyof typeof TEMPLATE_TYPES;
    const sampleData = TEMPLATE_TYPES[templateType]?.sampleData || {};
    
    // Replace variables with sample data
    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      preview = preview.replace(regex, String(value));
    });
    
    // Sanitize HTML to prevent XSS
    return DOMPurify.sanitize(preview, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
        'ul', 'ol', 'li', 'a', 'strong', 'em', 'b', 'i', 'u',
        'blockquote', 'pre', 'code', 'img', 'table', 'thead',
        'tbody', 'tr', 'th', 'td', 'div', 'span', 'center'
      ],
      ALLOWED_ATTR: [
        'href', 'src', 'alt', 'title', 'class', 'id', 'target',
        'rel', 'width', 'height', 'style', 'border', 'cellpadding',
        'cellspacing', 'bgcolor', 'align', 'valign'
      ],
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
    });
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Email Templates</h3>
          <Button size="sm" variant="outline" onClick={() => setSelectedTemplate("")}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>
                        {TEMPLATE_TYPES[template.template_type as keyof typeof TEMPLATE_TYPES]?.label || template.template_name}
                      </span>
                      <Badge variant="secondary" className="ml-2">
                        {template.usage_count} used
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template_type">Template Type</Label>
            <Select 
              value={currentTemplate.template_type} 
              onValueChange={(value) => {
                const label = TEMPLATE_TYPES[value as keyof typeof TEMPLATE_TYPES]?.label || value;
                setCurrentTemplate({ 
                  ...currentTemplate, 
                  template_type: value,
                  template_name: label
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih tipe template..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TEMPLATE_TYPES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentTemplate.template_type && TEMPLATE_TYPES[currentTemplate.template_type as keyof typeof TEMPLATE_TYPES] && (
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-xs text-muted-foreground mr-1">Required variables:</span>
                {TEMPLATE_TYPES[currentTemplate.template_type as keyof typeof TEMPLATE_TYPES].requiredVars.map((v) => (
                  <Badge key={v} variant="outline" className="text-xs">
                    {'{{'}{v}{'}}'}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject Template</Label>
            <Input
              id="subject"
              value={currentTemplate.subject_template}
              onChange={(e) =>
                setCurrentTemplate({
                  ...currentTemplate,
                  subject_template: e.target.value,
                })
              }
              placeholder="Reset Your Password - {{app_name}}"
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <Label htmlFor="body">Body Template (HTML)</Label>
              <div className="flex gap-2 flex-wrap justify-start sm:justify-end">
                {currentTemplate.template_type && 
                 TEMPLATE_TYPES[currentTemplate.template_type as keyof typeof TEMPLATE_TYPES]?.requiredVars.map((v) => (
                  <Button
                    key={v}
                    size="sm"
                    variant="outline"
                    onClick={() => insertVariable(v)}
                    className="text-xs"
                  >
                    {v}
                  </Button>
                ))}
              </div>
            </div>
            <Textarea
              id="body"
              value={currentTemplate.body_template}
              onChange={(e) =>
                setCurrentTemplate({ ...currentTemplate, body_template: e.target.value })
              }
              placeholder="<h1>Hello {{name}}</h1>..."
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {currentTemplate.body_template?.length || 0} characters
            </p>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Template Preview</DialogTitle>
              </DialogHeader>
              <div
                className="border rounded p-4 max-h-96 overflow-auto"
                dangerouslySetInnerHTML={{ __html: renderPreview() }}
              />
            </DialogContent>
          </Dialog>

          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Template
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default EmailTemplateEditor;
