import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Link, Plus, Copy, Pencil, Trash2, ExternalLink, ToggleLeft, ToggleRight, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAppTheme } from '@/contexts/AppThemeContext';

interface ShortLink {
  id: string;
  slug: string;
  destination_url: string;
  title: string | null;
  is_active: boolean;
  click_count: number;
  created_at: string;
}

const ShortLinkManager = () => {
  const navigate = useNavigate();
  const { activeTheme } = useAppTheme();
  const isJapaneseTheme = activeTheme === 'japanese';

  const [links, setLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ShortLink | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [formSlug, setFormSlug] = useState('');
  const [formDestination, setFormDestination] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const baseUrl = `https://uqzzpxfmwhmhiqniiyjk.supabase.co/functions/v1/redirect-short-link`;

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('short_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error: any) {
      toast.error('Gagal memuat data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = async () => {
    if (!formSlug.trim() || !formDestination.trim()) {
      toast.error('Slug dan URL tujuan wajib diisi');
      return;
    }

    // Validate slug format
    if (!/^[a-zA-Z0-9-_]+$/.test(formSlug)) {
      toast.error('Slug hanya boleh mengandung huruf, angka, dash, dan underscore');
      return;
    }

    setFormSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('short_links').insert({
        slug: formSlug.toLowerCase(),
        destination_url: formDestination,
        title: formTitle || null,
        user_id: user.user?.id,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('Slug sudah digunakan, pilih yang lain');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Short link berhasil dibuat');
      setIsAddDialogOpen(false);
      resetForm();
      fetchLinks();
    } catch (error: any) {
      toast.error('Gagal membuat link: ' + error.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditLink = async () => {
    if (!editingLink || !formDestination.trim()) {
      toast.error('URL tujuan wajib diisi');
      return;
    }

    setFormSubmitting(true);
    try {
      const { error } = await supabase
        .from('short_links')
        .update({
          destination_url: formDestination,
          title: formTitle || null,
        })
        .eq('id', editingLink.id);

      if (error) throw error;

      toast.success('Short link berhasil diupdate');
      setIsEditDialogOpen(false);
      setEditingLink(null);
      resetForm();
      fetchLinks();
    } catch (error: any) {
      toast.error('Gagal update link: ' + error.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleActive = async (link: ShortLink) => {
    try {
      const { error } = await supabase
        .from('short_links')
        .update({ is_active: !link.is_active })
        .eq('id', link.id);

      if (error) throw error;

      toast.success(link.is_active ? 'Link dinonaktifkan' : 'Link diaktifkan');
      fetchLinks();
    } catch (error: any) {
      toast.error('Gagal update status: ' + error.message);
    }
  };

  const handleDeleteLink = async (link: ShortLink) => {
    if (!confirm(`Yakin hapus link "${link.slug}"?`)) return;

    try {
      const { error } = await supabase
        .from('short_links')
        .delete()
        .eq('id', link.id);

      if (error) throw error;

      toast.success('Link berhasil dihapus');
      fetchLinks();
    } catch (error: any) {
      toast.error('Gagal hapus link: ' + error.message);
    }
  };

  const copyToClipboard = async (link: ShortLink) => {
    const fullUrl = `${baseUrl}/${link.slug}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopiedId(link.id);
    toast.success('Link disalin ke clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openEditDialog = (link: ShortLink) => {
    setEditingLink(link);
    setFormSlug(link.slug);
    setFormDestination(link.destination_url);
    setFormTitle(link.title || '');
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormSlug('');
    setFormDestination('');
    setFormTitle('');
  };

  const filteredLinks = links.filter(link => 
    link.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.destination_url.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (link.title && link.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className={`min-h-screen p-4 md:p-6 ${isJapaneseTheme ? 'bg-slate-950 text-white' : 'bg-background text-foreground'}`}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/vip/settings/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className={`text-2xl font-bold ${isJapaneseTheme ? 'text-white' : ''}`}>Short Link Manager</h1>
            <p className={`text-sm ${isJapaneseTheme ? 'text-slate-400' : 'text-muted-foreground'}`}>
              Buat dan kelola custom short links
            </p>
          </div>
        </div>

        {/* Actions Bar */}
        <Card className={isJapaneseTheme ? 'bg-slate-900/50 border-slate-800' : ''}>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari link..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-10 ${isJapaneseTheme ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                />
              </div>
              
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Buat Short Link
                  </Button>
                </DialogTrigger>
                <DialogContent className={isJapaneseTheme ? 'bg-slate-900 border-slate-800 text-white' : ''}>
                  <DialogHeader>
                    <DialogTitle>Buat Short Link Baru</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Slug (URL pendek)</Label>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${isJapaneseTheme ? 'text-slate-400' : 'text-muted-foreground'}`}>
                          .../
                        </span>
                        <Input
                          placeholder="promo"
                          value={formSlug}
                          onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                          className={isJapaneseTheme ? 'bg-slate-800 border-slate-700' : ''}
                        />
                      </div>
                      <p className={`text-xs ${isJapaneseTheme ? 'text-slate-500' : 'text-muted-foreground'}`}>
                        Hanya huruf kecil, angka, dash, dan underscore
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>URL Tujuan</Label>
                      <Input
                        placeholder="https://wa.me/628123456789"
                        value={formDestination}
                        onChange={(e) => setFormDestination(e.target.value)}
                        className={isJapaneseTheme ? 'bg-slate-800 border-slate-700' : ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Judul (opsional)</Label>
                      <Input
                        placeholder="Link WhatsApp"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className={isJapaneseTheme ? 'bg-slate-800 border-slate-700' : ''}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Batal
                    </Button>
                    <Button onClick={handleAddLink} disabled={formSubmitting}>
                      {formSubmitting ? 'Menyimpan...' : 'Simpan'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Links Table */}
        <Card className={isJapaneseTheme ? 'bg-slate-900/50 border-slate-800' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Daftar Short Links ({filteredLinks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Memuat...</div>
            ) : filteredLinks.length === 0 ? (
              <div className={`text-center py-8 ${isJapaneseTheme ? 'text-slate-400' : 'text-muted-foreground'}`}>
                {searchQuery ? 'Tidak ada link yang cocok' : 'Belum ada short link. Buat yang pertama!'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className={isJapaneseTheme ? 'border-slate-800' : ''}>
                      <TableHead>Slug</TableHead>
                      <TableHead>Tujuan</TableHead>
                      <TableHead>Judul</TableHead>
                      <TableHead className="text-center">Klik</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLinks.map((link) => (
                      <TableRow key={link.id} className={isJapaneseTheme ? 'border-slate-800' : ''}>
                        <TableCell>
                          <code className={`text-sm px-2 py-1 rounded ${isJapaneseTheme ? 'bg-slate-800 text-cyan-400' : 'bg-muted'}`}>
                            /{link.slug}
                          </code>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <a
                            href={link.destination_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-sm truncate block hover:underline ${isJapaneseTheme ? 'text-blue-400' : 'text-primary'}`}
                          >
                            {link.destination_url}
                          </a>
                        </TableCell>
                        <TableCell>
                          <span className={isJapaneseTheme ? 'text-slate-300' : ''}>
                            {link.title || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{link.click_count}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={link.is_active ? 'default' : 'outline'}>
                            {link.is_active ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyToClipboard(link)}
                              title="Salin link"
                            >
                              {copiedId === link.id ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(`${baseUrl}/${link.slug}`, '_blank')}
                              title="Buka link"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleActive(link)}
                              title={link.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            >
                              {link.is_active ? (
                                <ToggleRight className="h-4 w-4 text-green-500" />
                              ) : (
                                <ToggleLeft className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(link)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteLink(link)}
                              title="Hapus"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className={isJapaneseTheme ? 'bg-slate-900/50 border-slate-800' : ''}>
          <CardContent className="p-4">
            <p className={`text-sm ${isJapaneseTheme ? 'text-slate-400' : 'text-muted-foreground'}`}>
              <strong>Format URL:</strong> {baseUrl}/[slug]
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className={isJapaneseTheme ? 'bg-slate-900 border-slate-800 text-white' : ''}>
          <DialogHeader>
            <DialogTitle>Edit Short Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={formSlug}
                disabled
                className={`${isJapaneseTheme ? 'bg-slate-800 border-slate-700' : ''} opacity-50`}
              />
              <p className={`text-xs ${isJapaneseTheme ? 'text-slate-500' : 'text-muted-foreground'}`}>
                Slug tidak dapat diubah
              </p>
            </div>
            <div className="space-y-2">
              <Label>URL Tujuan</Label>
              <Input
                placeholder="https://wa.me/628123456789"
                value={formDestination}
                onChange={(e) => setFormDestination(e.target.value)}
                className={isJapaneseTheme ? 'bg-slate-800 border-slate-700' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Judul (opsional)</Label>
              <Input
                placeholder="Link WhatsApp"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className={isJapaneseTheme ? 'bg-slate-800 border-slate-700' : ''}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleEditLink} disabled={formSubmitting}>
              {formSubmitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShortLinkManager;
