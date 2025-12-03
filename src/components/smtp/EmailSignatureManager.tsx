import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Eye, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import DOMPurify from 'dompurify';

interface EmailSignature {
  id: string;
  signature_name: string;
  signature_html: string;
  is_default: boolean;
}

const EmailSignatureManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [selectedSignature, setSelectedSignature] = useState<string>("");
  const [currentSignature, setCurrentSignature] = useState<Partial<EmailSignature>>({
    signature_name: "",
    signature_html: "",
    is_default: false,
  });

  useEffect(() => {
    fetchSignatures();
  }, []);

  useEffect(() => {
    if (selectedSignature) {
      const signature = signatures.find((s) => s.id === selectedSignature);
      if (signature) {
        setCurrentSignature(signature);
      }
    }
  }, [selectedSignature, signatures]);

  const fetchSignatures = async () => {
    try {
      const { data, error } = await supabase
        .from("email_signatures")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSignatures(data || []);
    } catch (error: any) {
      console.error("Error fetching signatures:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // If setting as default, unset other defaults first
      if (currentSignature.is_default) {
        await supabase
          .from("email_signatures")
          .update({ is_default: false })
          .neq("id", selectedSignature || "");
      }

      const { error } = await supabase.from("email_signatures").upsert({
        id: selectedSignature || undefined,
        user_id: user.id,
        signature_name: currentSignature.signature_name,
        signature_html: currentSignature.signature_html,
        is_default: currentSignature.is_default,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Signature saved successfully",
      });

      fetchSignatures();
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

  const insertPlaceholder = (placeholder: string) => {
    setCurrentSignature({
      ...currentSignature,
      signature_html:
        (currentSignature.signature_html || "") + `<p>${placeholder}</p>`,
    });
  };

  // Sanitize HTML for preview to prevent XSS
  const getSanitizedPreview = () => {
    return DOMPurify.sanitize(currentSignature.signature_html || "", {
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
          <h3 className="text-lg font-semibold">Email Signatures</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedSignature("")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Signature
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Signature</Label>
            <Select value={selectedSignature} onValueChange={setSelectedSignature}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a signature..." />
              </SelectTrigger>
              <SelectContent>
                {signatures.map((signature) => (
                  <SelectItem key={signature.id} value={signature.id}>
                    <div className="flex items-center gap-2">
                      <span>{signature.signature_name}</span>
                      {signature.is_default && (
                        <Badge variant="default">Default</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signature_name">Signature Name</Label>
            <Input
              id="signature_name"
              value={currentSignature.signature_name}
              onChange={(e) =>
                setCurrentSignature({
                  ...currentSignature,
                  signature_name: e.target.value,
                })
              }
              placeholder="Company Signature"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="signature_html">Signature HTML</Label>
              <div className="flex gap-2">
                {["📞 Phone", "📧 Email", "🌐 Website", "📍 Address"].map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant="outline"
                    onClick={() => insertPlaceholder(p)}
                  >
                    {p.split(" ")[0]}
                  </Button>
                ))}
              </div>
            </div>
            <Textarea
              id="signature_html"
              value={currentSignature.signature_html}
              onChange={(e) =>
                setCurrentSignature({
                  ...currentSignature,
                  signature_html: e.target.value,
                })
              }
              placeholder="<div>...</div>"
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Use HTML for custom styling. This will be appended to all emails.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_default"
              checked={currentSignature.is_default}
              onCheckedChange={(checked) =>
                setCurrentSignature({ ...currentSignature, is_default: checked })
              }
            />
            <Label htmlFor="is_default">Set as default signature</Label>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Signature
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Signature Preview</DialogTitle>
                </DialogHeader>
                <div
                  className="border rounded p-4"
                  dangerouslySetInnerHTML={{
                    __html: getSanitizedPreview(),
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EmailSignatureManager;
