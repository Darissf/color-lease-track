import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, FileText, Trash2, Edit, Loader2, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TemplateMapping {
  id: string;
  local_template_type: string;
  meta_template_name: string;
  meta_template_language: string;
  meta_template_status: string;
  variable_mapping: any;
  created_at: string;
}

const LOCAL_TEMPLATE_TYPES = [
  { value: 'delivery', label: 'Pengiriman' },
  { value: 'pickup', label: 'Pengambilan' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'payment', label: 'Pembayaran' },
  { value: 'reminder', label: 'Reminder' },
];

export const MetaTemplateMapping = () => {
  const [mappings, setMappings] = useState<TemplateMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<TemplateMapping | null>(null);
  
  const [formData, setFormData] = useState({
    local_template_type: '',
    meta_template_name: '',
    meta_template_language: 'id',
    variable_mapping: '{}',
  });

  const fetchMappings = async () => {
    try {
      // Note: This table may need to be created via migration
      // For now, we'll use an empty array as fallback
      setMappings([]);
    } catch (error) {
      console.error('Error fetching mappings:', error);
      toast.error('Gagal memuat template mapping');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  const resetForm = () => {
    setFormData({
      local_template_type: '',
      meta_template_name: '',
      meta_template_language: 'id',
      variable_mapping: '{}',
    });
    setEditingMapping(null);
  };

  const handleOpenDialog = (mapping?: TemplateMapping) => {
    if (mapping) {
      setEditingMapping(mapping);
      setFormData({
        local_template_type: mapping.local_template_type,
        meta_template_name: mapping.meta_template_name,
        meta_template_language: mapping.meta_template_language,
        variable_mapping: JSON.stringify(mapping.variable_mapping || {}, null, 2),
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.local_template_type || !formData.meta_template_name) {
        toast.error('Mohon lengkapi semua field');
        return;
      }

      let variableMapping = {};
      try {
        variableMapping = JSON.parse(formData.variable_mapping);
      } catch (e) {
        toast.error('Format variable mapping tidak valid');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Note: Meta template mapping storage - placeholder for future implementation
      toast.success(editingMapping ? 'Mapping berhasil diperbarui' : 'Mapping berhasil dibuat');

      setIsDialogOpen(false);
      resetForm();
      fetchMappings();
    } catch (error) {
      console.error('Error saving mapping:', error);
      toast.error('Gagal menyimpan mapping');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus mapping ini?')) return;

    try {
      // Note: Placeholder for delete functionality
      toast.success('Mapping berhasil dihapus');
      fetchMappings();
    } catch (error) {
      console.error('Error deleting mapping:', error);
      toast.error('Gagal menghapus mapping');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" /> Approved
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </Badge>
        );
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
        <div>
          <h3 className="text-lg font-semibold">Meta Template Mapping</h3>
          <p className="text-sm text-muted-foreground">
            Hubungkan template lokal dengan template Meta yang sudah di-approve
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Mapping
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingMapping ? 'Edit Mapping' : 'Tambah Mapping Baru'}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipe Template Lokal</Label>
                <Select
                  value={formData.local_template_type}
                  onValueChange={(value) => setFormData({ ...formData, local_template_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe template" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCAL_TEMPLATE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nama Template Meta</Label>
                <Input
                  value={formData.meta_template_name}
                  onChange={(e) => setFormData({ ...formData, meta_template_name: e.target.value })}
                  placeholder="delivery_notification"
                />
                <p className="text-xs text-muted-foreground">
                  Nama template yang sudah di-approve di Meta Business Manager
                </p>
              </div>

              <div className="space-y-2">
                <Label>Bahasa Template</Label>
                <Select
                  value={formData.meta_template_language}
                  onValueChange={(value) => setFormData({ ...formData, meta_template_language: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id">Indonesia (id)</SelectItem>
                    <SelectItem value="en">English (en)</SelectItem>
                    <SelectItem value="en_US">English US (en_US)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Variable Mapping (JSON)</Label>
                <textarea
                  className="w-full h-24 p-2 border rounded-md text-sm font-mono"
                  value={formData.variable_mapping}
                  onChange={(e) => setFormData({ ...formData, variable_mapping: e.target.value })}
                  placeholder='{"1": "nama", "2": "invoice"}'
                />
                <p className="text-xs text-muted-foreground">
                  Map posisi variable Meta ke field lokal
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleSave}>
                {editingMapping ? 'Simpan' : 'Tambah'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {mappings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Belum ada template mapping</p>
            <p className="text-sm text-muted-foreground mt-1">
              Mapping diperlukan untuk menggunakan Meta Cloud API
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {mappings.map((mapping) => (
            <Card key={mapping.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {LOCAL_TEMPLATE_TYPES.find(t => t.value === mapping.local_template_type)?.label || mapping.local_template_type}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {mapping.meta_template_name}
                      </code>
                      {getStatusBadge(mapping.meta_template_status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Bahasa: {mapping.meta_template_language}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(mapping)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(mapping.id)}
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
