import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, Eye, TrendingUp, Send, XCircle, Clock, RotateCcw } from 'lucide-react';
import { useNotificationLogs } from '@/hooks/useNotificationLogs';
import { NotificationDetailDialog } from './NotificationDetailDialog';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { PaginationControls } from "@/components/shared/PaginationControls";
import { useToast } from '@/hooks/use-toast';

export const NotificationHistory = () => {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    type: 'all',
    status: 'all',
  });
  const { logs, stats, loading, fetchLogs, retryNotification } = useNotificationLogs(filters);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('notificationHistory_itemsPerPage');
    return saved ? parseInt(saved) : 10;
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRetrying, setBulkRetrying] = useState(false);
  const { toast } = useToast();

  // Calculate paginated data
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return logs.slice(startIndex, endIndex);
  }, [logs, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(logs.length / itemsPerPage);

  // Failed logs for bulk retry
  const failedLogs = useMemo(() => 
    logs.filter(l => l.status === 'failed'),
    [logs]
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
    localStorage.setItem('notificationHistory_itemsPerPage', value.toString());
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pageFailedIds = paginatedLogs
        .filter(l => l.status === 'failed')
        .map(l => l.id);
      setSelectedIds(new Set(pageFailedIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkRetry = async () => {
    if (selectedIds.size === 0) return;
    
    setBulkRetrying(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      const result = await retryNotification(id);
      if (result) {
        successCount++;
      } else {
        failCount++;
      }
    }

    setBulkRetrying(false);
    setSelectedIds(new Set());
    
    toast({
      title: 'Bulk Retry Selesai',
      description: `${successCount} berhasil, ${failCount} gagal`,
      variant: failCount > 0 ? 'destructive' : 'default',
    });

    fetchLogs();
  };

  const handleRetryAllFailed = async () => {
    if (failedLogs.length === 0) return;
    
    setBulkRetrying(true);
    let successCount = 0;
    let failCount = 0;

    for (const log of failedLogs) {
      const result = await retryNotification(log.id);
      if (result) {
        successCount++;
      } else {
        failCount++;
      }
    }

    setBulkRetrying(false);
    
    toast({
      title: 'Retry Semua Gagal Selesai',
      description: `${successCount} berhasil, ${failCount} tetap gagal`,
      variant: failCount > 0 ? 'destructive' : 'default',
    });

    fetchLogs();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Terkirim</Badge>;
      case 'failed':
        return <Badge variant="destructive">Gagal</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'retrying':
        return <Badge variant="secondary">Mencoba Ulang</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      delivery: 'Pengiriman',
      pickup: 'Pengambilan',
      invoice: 'Invoice',
      payment: 'Pembayaran',
      reminder: 'Reminder',
      manual: 'Manual',
      test: 'Test',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Dikirim</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.sent}</p>
              <p className="text-xs text-muted-foreground">Berhasil</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.failed}</p>
              <p className="text-xs text-muted-foreground">Gagal</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Dari Tanggal</label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Sampai Tanggal</label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Tipe</label>
            <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="delivery">Pengiriman</SelectItem>
                <SelectItem value="pickup">Pengambilan</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="payment">Pembayaran</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="sent">Terkirim</SelectItem>
                <SelectItem value="failed">Gagal</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-between items-center mt-4">
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleBulkRetry}
                disabled={bulkRetrying}
              >
                {bulkRetrying ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Retry Terpilih ({selectedIds.size})
              </Button>
            )}
            {failedLogs.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetryAllFailed}
                disabled={bulkRetrying}
              >
                {bulkRetrying ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Retry Semua Gagal ({failedLogs.length})
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    paginatedLogs.filter(l => l.status === 'failed').length > 0 &&
                    paginatedLogs
                      .filter(l => l.status === 'failed')
                      .every(l => selectedIds.has(l.id))
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Waktu</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Penerima</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : paginatedLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Tidak ada data
                </TableCell>
              </TableRow>
            ) : (
              paginatedLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {log.status === 'failed' && (
                      <Checkbox
                        checked={selectedIds.has(log.id)}
                        onCheckedChange={(checked) => handleSelectOne(log.id, !!checked)}
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: idLocale })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getTypeLabel(log.notification_type)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{log.recipient_name || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{log.recipient_phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell className="text-sm">{log.contract_id ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {log.status === 'failed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => retryNotification(log.id)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {logs.length > 0 && (
          <div className="p-4 border-t">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={logs.length}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </div>
        )}
      </Card>

      {/* Detail Dialog */}
      {selectedLog && (
        <NotificationDetailDialog
          logId={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
};
