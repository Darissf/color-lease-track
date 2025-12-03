import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Tag, Trash2, Edit, Loader2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CustomerTag {
  id: string;
  name: string;
  color: string;
  description: string | null;
  created_at: string;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
];

export const WhatsAppCustomerTags = () => {
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<CustomerTag | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    color: PRESET_COLORS[0],
    description: '',
  });

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_customer_tags')
        .select('*')
        .order('name');

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast.error('Gagal memuat tags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      color: PRESET_COLORS[0],
      description: '',
    });
    setEditingTag(null);
  };

  const handleOpenDialog = (tag?: CustomerTag) => {
    if (tag) {
      setEditingTag(tag);
      setFormData({
        name: tag.name,
        color: tag.color,
        description: tag.description || '',
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.name) {
        toast.error('Nama tag wajib diisi');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingTag) {
        const { error } = await supabase
          .from('whatsapp_customer_tags')
          .update({
            name: formData.name,
            color: formData.color,
            description: formData.description || null,
          })
          .eq('id', editingTag.id);

        if (error) throw error;
        toast.success('Tag berhasil diperbarui');
      } else {
        const { error } = await supabase
          .from('whatsapp_customer_tags')
          .insert([{
            user_id: user.id,
            name: formData.name,
            color: formData.color,
            description: formData.description || null,
          }]);

        if (error) throw error;
        toast.success('Tag berhasil dibuat');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchTags();
    } catch (error) {
      console.error('Error saving tag:', error);
      toast.error('Gagal menyimpan tag');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus tag ini?')) return;

    try {
      const { error } = await supabase
        .from('whatsapp_customer_tags')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Tag berhasil dihapus');
      fetchTags();
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast.error('Gagal menghapus tag');
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
        <h3 className="text-lg font-semibold">Customer Tags</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTag ? 'Edit Tag' : 'Tambah Tag Baru'}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Tag</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VIP Customer"
                />
              </div>

              <div className="space-y-2">
                <Label>Warna</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-foreground' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color: color })}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Deskripsi (Opsional)</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi tag..."
                />
              </div>

              <div className="space-y-2">
                <Label>Preview</Label>
                <Badge style={{ backgroundColor: formData.color, color: 'white' }}>
                  {formData.name || 'Tag Name'}
                </Badge>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleSave}>
                {editingTag ? 'Simpan' : 'Tambah'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {tags.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tag className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Belum ada tag</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tags.map((tag) => (
            <Card key={tag.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <Badge style={{ backgroundColor: tag.color, color: 'white' }}>
                      {tag.name}
                    </Badge>
                    {tag.description && (
                      <p className="text-sm text-muted-foreground">{tag.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(tag)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(tag.id)}
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
