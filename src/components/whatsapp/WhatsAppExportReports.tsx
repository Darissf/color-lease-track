import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, FileJson, FileSpreadsheet, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';

type ExportType = 'messages' | 'analytics' | 'conversations' | 'scheduled';

export const WhatsAppExportReports = () => {
  const [loading, setLoading] = useState(false);
  const [exportType, setExportType] = useState<ExportType>('messages');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [includeFields, setIncludeFields] = useState({
    messages: true,
    analytics: true,
    metadata: false,
  });

  const handleExport = async () => {
    setLoading(true);
    try {
      let data: any[] = [];
      let filename = '';

      const start = new Date(startDate).toISOString();
      const end = new Date(endDate + 'T23:59:59').toISOString();

      switch (exportType) {
        case 'messages':
          const { data: messages, error: messagesError } = await supabase
            .from('whatsapp_messages')
            .select('*')
            .gte('created_at', start)
            .lte('created_at', end)
            .order('created_at', { ascending: false });

          if (messagesError) throw messagesError;
          data = messages || [];
          filename = `whatsapp_messages_${startDate}_${endDate}`;
          break;

        case 'analytics':
          const { data: analytics, error: analyticsError } = await supabase
            .from('whatsapp_analytics')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false });

          if (analyticsError) throw analyticsError;
          data = analytics || [];
          filename = `whatsapp_analytics_${startDate}_${endDate}`;
          break;

        case 'conversations':
          const { data: conversations, error: convsError } = await supabase
            .from('whatsapp_conversations')
            .select('*')
            .gte('created_at', start)
            .lte('created_at', end)
            .order('last_message_at', { ascending: false });

          if (convsError) throw convsError;
          data = conversations || [];
          filename = `whatsapp_conversations_${startDate}_${endDate}`;
          break;

        case 'scheduled':
          const { data: scheduled, error: scheduledError } = await supabase
            .from('whatsapp_scheduled_messages')
            .select('*')
            .gte('scheduled_at', start)
            .lte('scheduled_at', end)
            .order('scheduled_at', { ascending: false });

          if (scheduledError) throw scheduledError;
          data = scheduled || [];
          filename = `whatsapp_scheduled_${startDate}_${endDate}`;
          break;
      }

      if (data.length === 0) {
        toast.error('Tidak ada data untuk di-export');
        return;
      }

      // Remove metadata if not included
      if (!includeFields.metadata) {
        data = data.map(item => {
          const { metadata, ...rest } = item;
          return rest;
        });
      }

      let content: string;
      let mimeType: string;

      if (exportFormat === 'json') {
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        filename += '.json';
      } else {
        // CSV
        const headers = Object.keys(data[0]);
        const csvRows = [
          headers.join(','),
          ...data.map(row =>
            headers.map(header => {
              const value = row[header];
              if (value === null || value === undefined) return '';
              if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
              if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            }).join(',')
          )
        ];
        content = csvRows.join('\n');
        mimeType = 'text/csv';
        filename += '.csv';
      }

      // Download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Export berhasil: ${data.length} data`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal export data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Export Reports</h3>
        <p className="text-sm text-muted-foreground">
          Export data WhatsApp dalam format CSV atau JSON
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pengaturan Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipe Data</Label>
              <Select value={exportType} onValueChange={(v) => setExportType(v as ExportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="messages">Pesan</SelectItem>
                  <SelectItem value="analytics">Analytics</SelectItem>
                  <SelectItem value="conversations">Percakapan</SelectItem>
                  <SelectItem value="scheduled">Pesan Terjadwal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal Mulai</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Akhir</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Format</Label>
              <div className="flex gap-4">
                <Button
                  variant={exportFormat === 'csv' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportFormat('csv')}
                  className="flex-1"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant={exportFormat === 'json' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportFormat('json')}
                  className="flex-1"
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  JSON
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Opsi Tambahan</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="metadata"
                    checked={includeFields.metadata}
                    onCheckedChange={(checked) => 
                      setIncludeFields({ ...includeFields, metadata: checked as boolean })
                    }
                  />
                  <label htmlFor="metadata" className="text-sm">
                    Sertakan metadata (JSON fields)
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview & Download</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">Detail Export:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Tipe: {
                  exportType === 'messages' ? 'Pesan' :
                  exportType === 'analytics' ? 'Analytics' :
                  exportType === 'conversations' ? 'Percakapan' : 'Pesan Terjadwal'
                }</li>
                <li>• Periode: {startDate} s/d {endDate}</li>
                <li>• Format: {exportFormat.toUpperCase()}</li>
                <li>• Metadata: {includeFields.metadata ? 'Ya' : 'Tidak'}</li>
              </ul>
            </div>

            <Button 
              onClick={handleExport} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Mengexport...' : 'Download Export'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Export Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => {
          setExportType('messages');
          setStartDate(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
          setEndDate(format(new Date(), 'yyyy-MM-dd'));
        }}>
          <CardContent className="p-4 text-center">
            <Download className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="font-medium">Pesan 7 Hari Terakhir</p>
            <p className="text-xs text-muted-foreground">Quick export</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => {
          setExportType('analytics');
          setStartDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
          setEndDate(format(new Date(), 'yyyy-MM-dd'));
        }}>
          <CardContent className="p-4 text-center">
            <Download className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="font-medium">Analytics Bulanan</p>
            <p className="text-xs text-muted-foreground">Quick export</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => {
          setExportType('conversations');
          setStartDate(format(subDays(new Date(), 90), 'yyyy-MM-dd'));
          setEndDate(format(new Date(), 'yyyy-MM-dd'));
        }}>
          <CardContent className="p-4 text-center">
            <Download className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="font-medium">Semua Percakapan</p>
            <p className="text-xs text-muted-foreground">Quick export</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
