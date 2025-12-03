import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Loader2, Paperclip, X, FileText, Image as ImageIcon, File } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";

interface MonitoredAddress {
  id: string;
  email_address: string;
  display_name: string;
  badge_color: string;
  can_send_from: boolean;
}

interface AttachmentFile {
  file: File;
  id: string;
  uploading?: boolean;
  url?: string;
}

interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  replyTo?: {
    id: string;
    from_address: string;
    subject: string;
    body_html?: string;
  };
  onEmailSent?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

export function ComposeEmailDialog({ 
  open, 
  onOpenChange, 
  replyTo,
  onEmailSent 
}: ComposeEmailDialogProps) {
  const [addresses, setAddresses] = useState<MonitoredAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [fromAddress, setFromAddress] = useState("");
  const [fromName, setFromName] = useState("");
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saveToSent, setSaveToSent] = useState(true);
  const [addSignature, setAddSignature] = useState(true);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  useEffect(() => {
    if (open) {
      fetchAddresses();
      
      // Pre-fill if replying
      if (replyTo) {
        setTo(replyTo.from_address);
        setSubject(replyTo.subject.startsWith('Re: ') ? replyTo.subject : `Re: ${replyTo.subject}`);
        
        // Quote original message
        if (replyTo.body_html) {
          const quotedBody = `<br><br>---<br><blockquote>${replyTo.body_html}</blockquote>`;
          setBody(quotedBody);
        }
      } else {
        // Reset form for new compose
        setTo("");
        setCc("");
        setSubject("");
        setBody("");
        setAttachments([]);
      }
    }
  }, [open, replyTo]);

  // Update fromName when address changes
  useEffect(() => {
    if (fromAddress && addresses.length > 0) {
      const selectedAddr = addresses.find(a => a.email_address === fromAddress);
      if (selectedAddr && !fromName) {
        setFromName(selectedAddr.display_name);
      }
    }
  }, [fromAddress, addresses]);

  const fetchAddresses = async () => {
    const { data, error } = await supabase
      .from('monitored_email_addresses')
      .select('*')
      .eq('is_active', true)
      .eq('can_send_from', true)
      .order('display_order');

    if (!error && data) {
      setAddresses(data);
      if (data.length > 0 && !fromAddress) {
        setFromAddress(data[0].email_address);
        setFromName(data[0].display_name);
      }
    }
  };

  const handleAddressChange = (email: string) => {
    setFromAddress(email);
    const selectedAddr = addresses.find(a => a.email_address === email);
    if (selectedAddr) {
      setFromName(selectedAddr.display_name);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: AttachmentFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check total count
      if (attachments.length + newFiles.length >= MAX_FILES) {
        toast.error(`Maksimal ${MAX_FILES} file lampiran`);
        break;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File "${file.name}" terlalu besar. Maksimal 10MB per file.`);
        continue;
      }

      newFiles.push({
        file,
        id: crypto.randomUUID(),
      });
    }

    setAttachments(prev => [...prev, ...newFiles]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (type.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSend = async () => {
    if (!fromAddress || !to || !subject || !body) {
      toast.error("Harap isi semua field yang wajib");
      return;
    }

    setLoading(true);

    try {
      // Upload attachments first
      const uploadedAttachments: { filename: string; content: string; contentType: string }[] = [];

      for (const att of attachments) {
        // Convert file to base64
        const base64 = await fileToBase64(att.file);
        uploadedAttachments.push({
          filename: att.file.name,
          content: base64,
          contentType: att.file.type,
        });
      }

      const { data, error } = await supabase.functions.invoke('compose-email', {
        body: {
          from_address: fromAddress,
          from_name: fromName,
          to,
          cc: cc ? cc.split(',').map(e => e.trim()).filter(Boolean) : [],
          subject,
          html: body,
          reply_to_id: replyTo?.id,
          save_to_sent: saveToSent,
          add_signature: addSignature,
          attachments: uploadedAttachments,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Email berhasil dikirim!");
        onOpenChange(false);
        onEmailSent?.();
        
        // Reset form
        setTo("");
        setCc("");
        setSubject("");
        setBody("");
        setFromName("");
        setAttachments([]);
      } else {
        throw new Error(data?.error || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(`Gagal mengirim email: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {replyTo ? "↩️ Balas Email" : "✉️ Tulis Email Baru"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* From Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromEmail">Email Pengirim *</Label>
              <Select value={fromAddress} onValueChange={handleAddressChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih alamat pengirim" />
                </SelectTrigger>
                <SelectContent>
                  {addresses.map((addr) => (
                    <SelectItem key={addr.id} value={addr.email_address}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: addr.badge_color }}
                        />
                        <span>{addr.email_address}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fromName">Nama Pengirim</Label>
              <Input
                id="fromName"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Nama yang ditampilkan"
              />
              <p className="text-xs text-muted-foreground">
                Hasil: {fromName ? `${fromName} <${fromAddress}>` : fromAddress}
              </p>
            </div>
          </div>

          {/* To */}
          <div className="space-y-2">
            <Label htmlFor="to">Kepada *</Label>
            <Input
              id="to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
            />
          </div>

          {/* CC */}
          <div className="space-y-2">
            <Label htmlFor="cc">CC (opsional)</Label>
            <Input
              id="cc"
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subjek *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subjek email"
            />
          </div>

          {/* Rich Text Editor */}
          <div className="space-y-2">
            <Label>Pesan *</Label>
            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder="Tulis pesan Anda di sini..."
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Lampiran</Label>
              <span className="text-xs text-muted-foreground">
                {attachments.length}/{MAX_FILES} file (max 10MB/file)
              </span>
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              onChange={handleFileSelect}
              accept="*/*"
            />
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={attachments.length >= MAX_FILES}
            >
              <Paperclip className="h-4 w-4 mr-2" />
              Lampirkan File
            </Button>

            {attachments.length > 0 && (
              <div className="space-y-2 mt-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2 border rounded-md bg-muted/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {getFileIcon(att.file.type)}
                      <span className="text-sm truncate">{att.file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({formatFileSize(att.file.size)})
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removeAttachment(att.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="saveToSent"
                checked={saveToSent}
                onCheckedChange={(checked) => setSaveToSent(checked as boolean)}
              />
              <label
                htmlFor="saveToSent"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Simpan ke Sent Items
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="addSignature"
                checked={addSignature}
                onCheckedChange={(checked) => setAddSignature(checked as boolean)}
              />
              <label
                htmlFor="addSignature"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Tambahkan signature default
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              onClick={handleSend}
              disabled={loading || !fromAddress || !to || !subject || !body}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Kirim Email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
