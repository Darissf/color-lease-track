import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Clock, Trash2, Edit, Loader2, Calendar, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface ScheduledMessage {
  id: string;
  recipient_phone: string;
  recipient_name: string | null;
  message_content: string;
  scheduled_at: string;
  status: string;
  created_at: string;
}

export const WhatsAppScheduledMessages = () => {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ScheduledMessage | null>(null);
  
  const [formData, setFormData] = useState({
    recipient_phone: '',
    recipient_name: '',
    message_content: '',
    scheduled_date: '',
    scheduled_time: '',
  });

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_scheduled_messages')
        .select('*')
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching scheduled messages:', error);
      toast.error('Gagal memuat pesan terjadwal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const resetForm = () => {
    setFormData({
      recipient_phone: '',
      recipient_name: '',
      message_content: '',
      scheduled_date: '',
      scheduled_time: '',
    });
    setEditingMessage(null);
  };

  const handleOpenDialog = (message?: ScheduledMessage) => {
    if (message) {
      const scheduledDate = new Date(message.scheduled_at);
      setEditingMessage(message);
      setFormData({
        recipient_phone: message.recipient_phone,
        recipient_name: message.recipient_name || '',
        message_content: message.message_content,
        scheduled_date: format(scheduledDate, 'yyyy-MM-dd'),
        scheduled_time: format(scheduledDate, 'HH:mm'),
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.recipient_phone || !formData.message_content || !formData.scheduled_date || !formData.scheduled_time) {
        toast.error('Mohon lengkapi semua field');
        return;
      }

      const scheduledAt = new Date(`${formData.scheduled_date}T${formData.scheduled_time}`).toISOString();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingMessage) {
        const { error } = await supabase
          .from('whatsapp_scheduled_messages')
          .update({
            recipient_phone: formData.recipient_phone,
            recipient_name: formData.recipient_name || null,
            message_content: formData.message_content,
            scheduled_at: scheduledAt,
          })
          .eq('id', editingMessage.id);

        if (error) throw error;
        toast.success('Pesan terjadwal berhasil diperbarui');
      } else {
        const { error } = await supabase
          .from('whatsapp_scheduled_messages')
          .insert({
            user_id: user.id,
            recipient_phone: formData.recipient_phone,
            recipient_name: formData.recipient_name || null,
            message_content: formData.message_content,
            scheduled_at: scheduledAt,
            status: 'pending',
          });

        if (error) throw error;
        toast.success('Pesan terjadwal berhasil dibuat');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchMessages();
    } catch (error) {
      console.error('Error saving scheduled message:', error);
      toast.error('Gagal menyimpan pesan terjadwal');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus pesan terjadwal ini?')) return;

    try {
      const { error } = await supabase
        .from('whatsapp_scheduled_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Pesan terjadwal berhasil dihapus');
      fetchMessages();
    } catch (error) {
      console.error('Error deleting scheduled message:', error);
      toast.error('Gagal menghapus pesan terjadwal');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_scheduled_messages')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Pesan terjadwal berhasil dibatalkan');
      fetchMessages();
    } catch (error) {
      console.error('Error cancelling scheduled message:', error);
      toast.error('Gagal membatalkan pesan terjadwal');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Menunggu</Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Terkirim</Badge>;
      case 'failed':
        return <Badge variant="destructive">Gagal</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Dibatalkan</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Pesan Terjadwal</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Jadwalkan Pesan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingMessage ? 'Edit Pesan Terjadwal' : 'Jadwalkan Pesan Baru'}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nomor Telepon</Label>
                  <Input
                    value={formData.recipient_phone}
                    onChange={(e) => setFormData({ ...formData, recipient_phone: e.target.value })}
                    placeholder="628123456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nama (Opsional)</Label>
                  <Input
                    value={formData.recipient_name}
                    onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                    placeholder="Nama Penerima"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Pesan</Label>
                <Textarea
                  value={formData.message_content}
                  onChange={(e) => setFormData({ ...formData, message_content: e.target.value })}
                  placeholder="Tulis pesan..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tanggal</Label>
                  <Input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Waktu</Label>
                  <Input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleSave}>
                {editingMessage ? 'Simpan' : 'Jadwalkan'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {messages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Belum ada pesan terjadwal</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <Card key={msg.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">
                        {msg.recipient_name || msg.recipient_phone}
                      </span>
                      {getStatusBadge(msg.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {msg.recipient_phone}
                    </p>
                    <p className="text-sm line-clamp-2">{msg.message_content}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(msg.scheduled_at), 'dd MMM yyyy HH:mm', { locale: id })}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-4">
                    {msg.status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(msg)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancel(msg.id)}
                        >
                          Batalkan
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(msg.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
