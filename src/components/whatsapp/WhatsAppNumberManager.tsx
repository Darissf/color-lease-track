import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Phone, Settings, Trash2, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { useWhatsAppNumbers } from '@/hooks/useWhatsAppNumbers';
import { toast } from 'sonner';

const NOTIFICATION_TYPES = [
  { value: 'delivery', label: 'Pengiriman' },
  { value: 'pickup', label: 'Pengambilan' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'payment', label: 'Pembayaran' },
  { value: 'reminder', label: 'Reminder' },
];

export const WhatsAppNumberManager = () => {
  const { numbers, loading, createNumber, updateNumber, deleteNumber, setAsDefault, testConnection } = useWhatsAppNumbers();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNumber, setEditingNumber] = useState<any>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    provider: 'waha' as 'waha' | 'meta_cloud',
    waha_api_url: '',
    waha_api_key: '',
    waha_session_name: 'default',
    meta_phone_number_id: '',
    meta_access_token: '',
    meta_business_account_id: '',
    notification_types: ['delivery', 'pickup', 'invoice', 'payment', 'reminder'],
    business_hours_enabled: false,
    business_hours_start: '08:00',
    business_hours_end: '17:00',
    business_days: [1, 2, 3, 4, 5],
    rate_limit_per_minute: 20,
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      phone_number: '',
      provider: 'waha',
      waha_api_url: '',
      waha_api_key: '',
      waha_session_name: 'default',
      meta_phone_number_id: '',
      meta_access_token: '',
      meta_business_account_id: '',
      notification_types: ['delivery', 'pickup', 'invoice', 'payment', 'reminder'],
      business_hours_enabled: false,
      business_hours_start: '08:00',
      business_hours_end: '17:00',
      business_days: [1, 2, 3, 4, 5],
      rate_limit_per_minute: 20,
      is_active: true,
    });
    setEditingNumber(null);
  };

  const handleOpenDialog = (number?: any) => {
    if (number) {
      setEditingNumber(number);
      setFormData({
        name: number.name || '',
        phone_number: number.phone_number || '',
        provider: number.provider || 'waha',
        waha_api_url: number.waha_api_url || '',
        waha_api_key: number.waha_api_key || '',
        waha_session_name: number.waha_session_name || 'default',
        meta_phone_number_id: number.meta_phone_number_id || '',
        meta_access_token: number.meta_access_token || '',
        meta_business_account_id: number.meta_business_account_id || '',
        notification_types: number.notification_types || ['delivery', 'pickup', 'invoice', 'payment', 'reminder'],
        business_hours_enabled: number.business_hours_enabled || false,
        business_hours_start: number.business_hours_start || '08:00',
        business_hours_end: number.business_hours_end || '17:00',
        business_days: number.business_days || [1, 2, 3, 4, 5],
        rate_limit_per_minute: number.rate_limit_per_minute || 20,
        is_active: number.is_active !== false,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingNumber) {
        await updateNumber(editingNumber.id, formData);
      } else {
        await createNumber(formData);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving number:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus nomor ini?')) {
      await deleteNumber(id);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    await testConnection(id);
    setTestingId(null);
  };

  const toggleNotificationType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      notification_types: prev.notification_types.includes(type)
        ? prev.notification_types.filter(t => t !== type)
        : [...prev.notification_types, type]
    }));
  };

  const toggleBusinessDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      business_days: prev.business_days.includes(day)
        ? prev.business_days.filter(d => d !== day)
        : [...prev.business_days, day].sort()
    }));
  };

  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

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
        <h3 className="text-lg font-semibold">Nomor WhatsApp</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Nomor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingNumber ? 'Edit Nomor' : 'Tambah Nomor Baru'}</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Dasar</TabsTrigger>
                <TabsTrigger value="provider">Provider</TabsTrigger>
                <TabsTrigger value="settings">Pengaturan</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nama</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nomor Utama"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nomor Telepon</Label>
                    <Input
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      placeholder="628123456789"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select
                    value={formData.provider}
                    onValueChange={(value: 'waha' | 'meta_cloud') => setFormData({ ...formData, provider: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="waha">WAHA (Self-Hosted)</SelectItem>
                      <SelectItem value="meta_cloud">Meta Cloud API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipe Notifikasi</Label>
                  <div className="flex flex-wrap gap-2">
                    {NOTIFICATION_TYPES.map(type => (
                      <Badge
                        key={type.value}
                        variant={formData.notification_types.includes(type.value) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleNotificationType(type.value)}
                      >
                        {type.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Status Aktif</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="provider" className="space-y-4 mt-4">
                {formData.provider === 'waha' ? (
                  <>
                    <div className="space-y-2">
                      <Label>WAHA API URL</Label>
                      <Input
                        value={formData.waha_api_url}
                        onChange={(e) => setFormData({ ...formData, waha_api_url: e.target.value })}
                        placeholder="http://your-vps-ip:3000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>WAHA API Key</Label>
                      <Input
                        type="password"
                        value={formData.waha_api_key}
                        onChange={(e) => setFormData({ ...formData, waha_api_key: e.target.value })}
                        placeholder="API Key"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Session Name</Label>
                      <Input
                        value={formData.waha_session_name}
                        onChange={(e) => setFormData({ ...formData, waha_session_name: e.target.value })}
                        placeholder="default"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Phone Number ID</Label>
                      <Input
                        value={formData.meta_phone_number_id}
                        onChange={(e) => setFormData({ ...formData, meta_phone_number_id: e.target.value })}
                        placeholder="Phone Number ID dari Meta"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Access Token</Label>
                      <Input
                        type="password"
                        value={formData.meta_access_token}
                        onChange={(e) => setFormData({ ...formData, meta_access_token: e.target.value })}
                        placeholder="Access Token"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Business Account ID</Label>
                      <Input
                        value={formData.meta_business_account_id}
                        onChange={(e) => setFormData({ ...formData, meta_business_account_id: e.target.value })}
                        placeholder="Business Account ID"
                      />
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <Label>Business Hours</Label>
                  <Switch
                    checked={formData.business_hours_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, business_hours_enabled: checked })}
                  />
                </div>

                {formData.business_hours_enabled && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Jam Mulai</Label>
                        <Input
                          type="time"
                          value={formData.business_hours_start}
                          onChange={(e) => setFormData({ ...formData, business_hours_start: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Jam Selesai</Label>
                        <Input
                          type="time"
                          value={formData.business_hours_end}
                          onChange={(e) => setFormData({ ...formData, business_hours_end: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Hari Kerja</Label>
                      <div className="flex gap-2">
                        {dayNames.map((day, index) => (
                          <Badge
                            key={index}
                            variant={formData.business_days.includes(index) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => toggleBusinessDay(index)}
                          >
                            {day}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Rate Limit (per menit)</Label>
                  <Input
                    type="number"
                    value={formData.rate_limit_per_minute}
                    onChange={(e) => setFormData({ ...formData, rate_limit_per_minute: parseInt(e.target.value) || 20 })}
                    min={1}
                    max={100}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleSave}>
                {editingNumber ? 'Simpan' : 'Tambah'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {numbers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Phone className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Belum ada nomor WhatsApp terdaftar</p>
            <Button className="mt-4" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Nomor Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {numbers.map((number) => (
            <Card key={number.id} className={!number.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{number.name}</CardTitle>
                    {number.is_default && (
                      <Badge variant="secondary" className="text-xs">Default</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {number.connection_status === 'connected' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {number.phone_number}
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline">{number.provider === 'waha' ? 'WAHA' : 'Meta Cloud'}</Badge>
                  {!number.is_active && <Badge variant="destructive">Nonaktif</Badge>}
                </div>

                <div className="flex flex-wrap gap-1">
                  {(number.notification_types || []).map((type: string) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {NOTIFICATION_TYPES.find(t => t.value === type)?.label || type}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(number.id)}
                    disabled={testingId === number.id}
                  >
                    {testingId === number.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(number)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  {!number.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAsDefault(number.id)}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(number.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
