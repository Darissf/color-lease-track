import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Link2, 
  Copy, 
  Check, 
  Clock, 
  Eye, 
  Trash2, 
  Plus,
  ExternalLink,
  QrCode,
  Pencil,
  TimerReset
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addHours, addDays, subHours, subDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import QRCode from 'react-qr-code';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface PublicLink {
  id: string;
  access_code: string;
  expires_at: string;
  created_at: string;
  view_count: number;
  is_active: boolean;
}

interface ContractPublicLinkManagerProps {
  contractId: string;
}

const EXPIRATION_OPTIONS = [
  { value: '1h', label: '1 Jam', hours: 1 },
  { value: '24h', label: '24 Jam', hours: 24 },
  { value: '7d', label: '7 Hari', hours: 24 * 7 },
  { value: '30d', label: '30 Hari', hours: 24 * 30 },
  { value: 'custom', label: 'Custom', hours: null },
];

export function ContractPublicLinkManager({ contractId }: ContractPublicLinkManagerProps) {
  const { user } = useAuth();
  const [links, setLinks] = useState<PublicLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [selectedExpiration, setSelectedExpiration] = useState('24h');
  const [customValue, setCustomValue] = useState<number>(1);
  const [customUnit, setCustomUnit] = useState<'hours' | 'days'>('hours');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<PublicLink | null>(null);
  
  // Edit Link Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<PublicLink | null>(null);
  const [customAccessCode, setCustomAccessCode] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Adjust Duration Dialog states
  const [isDurationDialogOpen, setIsDurationDialogOpen] = useState(false);
  const [durationLink, setDurationLink] = useState<PublicLink | null>(null);
  const [durationAdjustment, setDurationAdjustment] = useState<number>(1);
  const [adjustmentUnit, setAdjustmentUnit] = useState<'hours' | 'days'>('days');
  const [adjustmentMode, setAdjustmentMode] = useState<'add' | 'subtract'>('add');

  useEffect(() => {
    if (user && contractId) {
      fetchLinks();
    }
  }, [user, contractId]);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contract_public_links')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Error fetching links:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateLink = async () => {
    if (!user) return;

    setIsCreating(true);
    try {
      // Generate access code using database function
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_contract_access_code');

      if (codeError) throw codeError;

      const accessCode = codeData as string;
      
      let expiresAt: Date;
      if (selectedExpiration === 'custom') {
        const validValue = Math.max(1, Math.min(999, customValue || 1));
        expiresAt = customUnit === 'days' 
          ? addDays(new Date(), validValue) 
          : addHours(new Date(), validValue);
      } else {
        const option = EXPIRATION_OPTIONS.find(o => o.value === selectedExpiration);
        expiresAt = option?.hours 
          ? option.hours >= 24 
            ? addDays(new Date(), option.hours / 24)
            : addHours(new Date(), option.hours)
          : addHours(new Date(), 24);
      }

      const { error: insertError } = await supabase
        .from('contract_public_links')
        .insert({
          user_id: user.id,
          contract_id: contractId,
          access_code: accessCode,
          expires_at: expiresAt.toISOString(),
          created_by: user.id,
        });

      if (insertError) throw insertError;

      toast.success('Link public berhasil dibuat');
      setIsDialogOpen(false);
      fetchLinks();
    } catch (error) {
      console.error('Error generating link:', error);
      toast.error('Gagal membuat link public');
    } finally {
      setIsCreating(false);
    }
  };

  const revokeLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('contract_public_links')
        .update({ is_active: false })
        .eq('id', linkId);

      if (error) throw error;

      toast.success('Link berhasil dinonaktifkan');
      fetchLinks();
    } catch (error) {
      console.error('Error revoking link:', error);
      toast.error('Gagal menonaktifkan link');
    }
  };

  const deleteLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('contract_public_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      toast.success('Link berhasil dihapus');
      fetchLinks();
    } catch (error) {
      console.error('Error deleting link:', error);
      toast.error('Gagal menghapus link');
    }
  };

  const getPublicUrl = (accessCode: string) => {
    return `${window.location.origin}/contract/${accessCode}`;
  };

  const copyToClipboard = async (accessCode: string) => {
    try {
      await navigator.clipboard.writeText(getPublicUrl(accessCode));
      setCopiedId(accessCode);
      toast.success('Link berhasil disalin');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Gagal menyalin link');
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  // Update access code (custom link)
  const updateAccessCode = async () => {
    if (!editingLink || !customAccessCode.trim()) return;
    
    // Validasi: 4-30 karakter, alphanumeric + dash + underscore
    const isValid = /^[a-zA-Z0-9_-]{4,30}$/.test(customAccessCode);
    if (!isValid) {
      toast.error("Kode harus 4-30 karakter (huruf, angka, dash, underscore)");
      return;
    }
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('contract_public_links')
        .update({ access_code: customAccessCode })
        .eq('id', editingLink.id);
      
      if (error) {
        if (error.code === '23505') {
          toast.error("Kode sudah digunakan, pilih kode lain");
        } else {
          throw error;
        }
        return;
      }
      
      toast.success("Link berhasil diubah");
      setIsEditDialogOpen(false);
      setCustomAccessCode('');
      fetchLinks();
    } catch (error) {
      console.error('Error updating link:', error);
      toast.error("Gagal mengubah link");
    } finally {
      setIsUpdating(false);
    }
  };

  // Adjust expiration
  const adjustExpiration = async () => {
    if (!durationLink) return;
    
    const currentExpires = new Date(durationLink.expires_at);
    let newExpires: Date;
    
    if (adjustmentMode === 'add') {
      newExpires = adjustmentUnit === 'days'
        ? addDays(currentExpires, durationAdjustment)
        : addHours(currentExpires, durationAdjustment);
    } else {
      newExpires = adjustmentUnit === 'days'
        ? subDays(currentExpires, durationAdjustment)
        : subHours(currentExpires, durationAdjustment);
      
      // Validasi tidak boleh kurang dari sekarang
      if (newExpires < new Date()) {
        toast.error("Durasi tidak boleh kurang dari waktu sekarang");
        return;
      }
    }
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('contract_public_links')
        .update({ expires_at: newExpires.toISOString() })
        .eq('id', durationLink.id);
      
      if (error) throw error;
      
      toast.success("Durasi berhasil diubah");
      setIsDurationDialogOpen(false);
      setDurationAdjustment(1);
      fetchLinks();
    } catch (error) {
      console.error('Error adjusting duration:', error);
      toast.error("Gagal mengubah durasi");
    } finally {
      setIsUpdating(false);
    }
  };

  // Calculate new expiration for preview
  const getNewExpirationPreview = () => {
    if (!durationLink) return null;
    
    const currentExpires = new Date(durationLink.expires_at);
    
    if (adjustmentMode === 'add') {
      return adjustmentUnit === 'days'
        ? addDays(currentExpires, durationAdjustment)
        : addHours(currentExpires, durationAdjustment);
    } else {
      return adjustmentUnit === 'days'
        ? subDays(currentExpires, durationAdjustment)
        : subHours(currentExpires, durationAdjustment);
    }
  };

  const activeLinks = links.filter(l => l.is_active && !isExpired(l.expires_at));
  const expiredLinks = links.filter(l => !l.is_active || isExpired(l.expires_at));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Link Public
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Generate Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Link Public</DialogTitle>
              <DialogDescription>
                Buat link yang bisa diakses tanpa login untuk melihat detail kontrak ini.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Masa Berlaku</label>
                <Select value={selectedExpiration} onValueChange={setSelectedExpiration}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih masa berlaku" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedExpiration === 'custom' && (
                  <div className="flex gap-2 mt-3">
                    <Input
                      type="number"
                      min={1}
                      max={999}
                      value={customValue}
                      onChange={(e) => setCustomValue(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24"
                      placeholder="1"
                    />
                    <Select value={customUnit} onValueChange={(v) => setCustomUnit(v as 'hours' | 'days')}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hours">Jam</SelectItem>
                        <SelectItem value="days">Hari</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={generateLink} disabled={isCreating}>
                {isCreating ? 'Membuat...' : 'Generate Link'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Memuat...
          </div>
        ) : links.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Belum ada link public. Klik "Generate Link" untuk membuat.
          </div>
        ) : (
          <>
            {/* Active Links */}
            {activeLinks.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Link Aktif</p>
                {activeLinks.map((link) => (
                  <div 
                    key={link.id} 
                    className="p-3 border rounded-lg space-y-2 bg-green-500/5 border-green-500/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                          Aktif
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          {link.access_code}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(link.access_code)}
                        >
                          {copiedId === link.access_code ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => window.open(getPublicUrl(link.access_code), '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedLink(link);
                            setIsQRDialogOpen(true);
                          }}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingLink(link);
                            setCustomAccessCode(link.access_code);
                            setIsEditDialogOpen(true);
                          }}
                          title="Edit Link"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => {
                            setDurationLink(link);
                            setDurationAdjustment(1);
                            setAdjustmentUnit('days');
                            setAdjustmentMode('add');
                            setIsDurationDialogOpen(true);
                          }}
                          title="Ubah Durasi"
                        >
                          <TimerReset className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => revokeLink(link.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Berlaku hingga {format(new Date(link.expires_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {link.view_count} views
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Expired/Inactive Links */}
            {expiredLinks.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Link Tidak Aktif</p>
                {expiredLinks.map((link) => (
                  <div 
                    key={link.id} 
                    className="p-3 border rounded-lg space-y-2 bg-muted/50 opacity-60"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {isExpired(link.expires_at) ? 'Expired' : 'Nonaktif'}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          {link.access_code}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteLink(link.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {isExpired(link.expires_at) ? 'Expired' : 'Dinonaktifkan'} {format(new Date(link.expires_at), 'dd MMM yyyy', { locale: localeId })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {link.view_count} views
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* QR Code Dialog */}
      <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code</DialogTitle>
            <DialogDescription>
              Scan QR code ini untuk membuka link public kontrak
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-4 space-y-4">
            {selectedLink && (
              <>
                <div className="bg-white p-4 rounded-lg">
                  <QRCode 
                    value={getPublicUrl(selectedLink.access_code)} 
                    size={200}
                  />
                </div>
                <p className="text-xs text-muted-foreground font-mono text-center break-all">
                  {getPublicUrl(selectedLink.access_code)}
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => copyToClipboard(selectedLink.access_code)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Salin Link
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Link Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Edit Link
            </DialogTitle>
            <DialogDescription>
              Ubah kode akses link menjadi custom
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingLink && (
              <>
                <div className="text-sm">
                  <span className="text-muted-foreground">Kode saat ini: </span>
                  <span className="font-mono font-semibold">{editingLink.access_code}</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-code">Kode Baru</Label>
                  <Input
                    id="custom-code"
                    value={customAccessCode}
                    onChange={(e) => setCustomAccessCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                    placeholder="Contoh: INV-000251-BUDI"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    4-30 karakter (huruf, angka, dash -, underscore _)
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditDialogOpen(false);
                setCustomAccessCode('');
              }}
            >
              Batal
            </Button>
            <Button 
              onClick={updateAccessCode} 
              disabled={isUpdating || !customAccessCode.trim() || customAccessCode === editingLink?.access_code}
            >
              {isUpdating ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Duration Dialog */}
      <Dialog open={isDurationDialogOpen} onOpenChange={setIsDurationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TimerReset className="h-4 w-4" />
              Ubah Durasi
            </DialogTitle>
            <DialogDescription>
              Tambah atau kurangi masa berlaku link
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {durationLink && (
              <>
                <div className="text-sm bg-muted/50 p-3 rounded-lg">
                  <span className="text-muted-foreground">Berlaku saat ini: </span>
                  <span className="font-semibold">
                    {format(new Date(durationLink.expires_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <RadioGroup 
                    value={adjustmentMode} 
                    onValueChange={(v) => setAdjustmentMode(v as 'add' | 'subtract')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="add" id="mode-add" />
                      <Label htmlFor="mode-add" className="cursor-pointer">Tambah</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="subtract" id="mode-subtract" />
                      <Label htmlFor="mode-subtract" className="cursor-pointer">Kurangi</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={999}
                    value={durationAdjustment}
                    onChange={(e) => setDurationAdjustment(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24"
                  />
                  <Select value={adjustmentUnit} onValueChange={(v) => setAdjustmentUnit(v as 'hours' | 'days')}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hours">Jam</SelectItem>
                      <SelectItem value="days">Hari</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {getNewExpirationPreview() && (
                  <div className={`text-sm p-3 rounded-lg ${
                    getNewExpirationPreview()! < new Date() 
                      ? 'bg-destructive/10 text-destructive' 
                      : 'bg-green-500/10 text-green-600'
                  }`}>
                    <span className="text-muted-foreground">Hasil baru: </span>
                    <span className="font-semibold">
                      {format(getNewExpirationPreview()!, 'dd MMM yyyy HH:mm', { locale: localeId })}
                    </span>
                    {getNewExpirationPreview()! < new Date() && (
                      <p className="text-xs mt-1">⚠️ Tanggal tidak valid (sudah lewat)</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDurationDialogOpen(false);
                setDurationAdjustment(1);
              }}
            >
              Batal
            </Button>
            <Button 
              onClick={adjustExpiration} 
              disabled={isUpdating || (getNewExpirationPreview() && getNewExpirationPreview()! < new Date())}
            >
              {isUpdating ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
