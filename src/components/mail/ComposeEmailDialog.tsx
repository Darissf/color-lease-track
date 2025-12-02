import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";

interface MonitoredAddress {
  id: string;
  email_address: string;
  display_name: string;
  badge_color: string;
  can_send_from: boolean;
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

export function ComposeEmailDialog({ 
  open, 
  onOpenChange, 
  replyTo,
  onEmailSent 
}: ComposeEmailDialogProps) {
  const [addresses, setAddresses] = useState<MonitoredAddress[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [fromAddress, setFromAddress] = useState("");
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saveToSent, setSaveToSent] = useState(true);
  const [addSignature, setAddSignature] = useState(true);

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
      }
    }
  }, [open, replyTo]);

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
      }
    }
  };

  const handleSend = async () => {
    if (!fromAddress || !to || !subject || !body) {
      toast.error("Harap isi semua field yang wajib");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('compose-email', {
        body: {
          from_address: fromAddress,
          from_name: addresses.find(a => a.email_address === fromAddress)?.display_name,
          to,
          cc: cc ? cc.split(',').map(e => e.trim()).filter(Boolean) : [],
          subject,
          html: body,
          reply_to_id: replyTo?.id,
          save_to_sent: saveToSent,
          add_signature: addSignature,
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
          <div className="space-y-2">
            <Label htmlFor="from">Dari *</Label>
            <Select value={fromAddress} onValueChange={setFromAddress}>
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
                      <span className="font-medium">{addr.display_name}</span>
                      <span className="text-muted-foreground text-sm">
                        - {addr.email_address}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Pesan *</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tulis pesan Anda di sini..."
              className="min-h-[300px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Tips: Gunakan HTML untuk formatting (misal: &lt;b&gt;tebal&lt;/b&gt;, &lt;br&gt; untuk baris baru)
            </p>
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