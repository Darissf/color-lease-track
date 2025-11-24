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

interface EmailTemplate {
  id: string;
  template_type: string;
  template_name: string;
  subject_template: string;
  body_template: string;
  variables: string[];
  usage_count: number;
}

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

      const { error } = await supabase.from("email_templates").upsert({
        id: selectedTemplate || undefined,
        user_id: user.id,
        template_type: currentTemplate.template_type,
        template_name: currentTemplate.template_name,
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
    const variables = extractVariables(preview);
    variables.forEach((v) => {
      preview = preview.replace(
        new RegExp(`\\{\\{${v}\\}\\}`, "g"),
        `<span style="background-color: #fbbf24; padding: 2px 4px; border-radius: 2px;">${v}</span>`
      );
    });
    return preview;
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
                      <span>{template.template_name}</span>
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
            <Input
              id="template_type"
              value={currentTemplate.template_type}
              onChange={(e) =>
                setCurrentTemplate({ ...currentTemplate, template_type: e.target.value })
              }
              placeholder="reset_password, welcome, invoice..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template_name">Template Name</Label>
            <Input
              id="template_name"
              value={currentTemplate.template_name}
              onChange={(e) =>
                setCurrentTemplate({ ...currentTemplate, template_name: e.target.value })
              }
              placeholder="Reset Password Email"
            />
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
            <div className="flex items-center justify-between">
              <Label htmlFor="body">Body Template (HTML)</Label>
              <div className="flex gap-2">
                {["name", "link", "amount", "date"].map((v) => (
                  <Button
                    key={v}
                    size="sm"
                    variant="outline"
                    onClick={() => insertVariable(v)}
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
