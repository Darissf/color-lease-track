import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, TestTube, RefreshCw } from 'lucide-react';
import { useWhatsAppHealth } from '@/hooks/useWhatsAppHealth';
import { useMessageTemplates } from '@/hooks/useMessageTemplates';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export const WhatsAppTester = () => {
  const { latestCheck, runHealthCheck } = useWhatsAppHealth();
  const { templates } = useMessageTemplates();
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleHealthCheck = async () => {
    setIsChecking(true);
    await runHealthCheck();
    setIsChecking(false);
  };

  const handleTemplateSelect = (templateType: string) => {
    const template = templates.find(t => t.template_type === templateType);
    if (template) {
      setMessage(template.template_content);
      setSelectedTemplate(templateType);
    }
  };

  const handleSend = async () => {
    if (!phone || !message) {
      toast({
        title: 'Error',
        description: 'Nomor telepon dan pesan harus diisi',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone,
          message,
          notificationType: 'test',
        },
      });

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Pesan test berhasil dikirim!',
      });

      // Reset form
      setPhone('');
      setMessage('');
      setSelectedTemplate('');
    } catch (error) {
      console.error('Error sending test message:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengirim pesan test',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Health Check Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Connection Health Check</h3>
            <p className="text-sm text-muted-foreground">
              Cek status koneksi WAHA dan WhatsApp session
            </p>
          </div>
          <Button onClick={handleHealthCheck} disabled={isChecking}>
            {isChecking ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Cek Koneksi
          </Button>
        </div>

        {latestCheck && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <p className="font-medium">
                {latestCheck.status === 'healthy' ? '🟢 Healthy' : 
                 latestCheck.status === 'unhealthy' ? '🔴 Unhealthy' : 
                 '⚠️ Error'}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Response Time</p>
              <p className="font-medium">{latestCheck.response_time_ms || 'N/A'}ms</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Last Check</p>
              <p className="font-medium text-sm">
                {format(new Date(latestCheck.checked_at), 'dd MMM HH:mm', { locale: idLocale })}
              </p>
            </div>
            {latestCheck.session_status && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Session Status</p>
                <p className="font-medium">{latestCheck.session_status}</p>
              </div>
            )}
            {latestCheck.waha_version && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">WAHA Version</p>
                <p className="font-medium">{latestCheck.waha_version}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Manual Send Section */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Manual Test Message</h3>
          <p className="text-sm text-muted-foreground">
            Kirim pesan test ke nomor WhatsApp tertentu
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template">Gunakan Template (Optional)</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Kosongkan</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.template_type}>
                    {template.template_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Nomor WhatsApp</Label>
            <Input
              id="phone"
              placeholder="08123456789 atau 628123456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Format: 08xx atau 628xx (tanpa spasi atau tanda hubung)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Pesan</Label>
            <Textarea
              id="message"
              placeholder="Ketik pesan test Anda..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
            />
            <p className="text-xs text-muted-foreground">
              {message.length} / 4096 karakter
            </p>
          </div>

          <Button
            onClick={handleSend}
            disabled={isSending || !phone || !message}
            className="w-full"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Mengirim...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Kirim Test Message
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};
