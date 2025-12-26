import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  QrCode
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addHours, addDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import QRCode from 'react-qr-code';

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
];

export function ContractPublicLinkManager({ contractId }: ContractPublicLinkManagerProps) {
  const { user } = useAuth();
  const [links, setLinks] = useState<PublicLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [selectedExpiration, setSelectedExpiration] = useState('24h');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<PublicLink | null>(null);

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
      const option = EXPIRATION_OPTIONS.find(o => o.value === selectedExpiration);
      const expiresAt = option?.hours 
        ? option.hours >= 24 
          ? addDays(new Date(), option.hours / 24)
          : addHours(new Date(), option.hours)
        : addHours(new Date(), 24);

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
    </Card>
  );
}
