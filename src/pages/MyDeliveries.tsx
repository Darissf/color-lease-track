import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Truck, MapPin, Clock, CheckCircle, Search, ExternalLink, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface MyDelivery {
  id: string;
  tracking_code: string;
  status: string;
  stop_order: number;
  recipient_name: string;
  destination_address: string;
  completed_at: string | null;
  trip_status: string;
  trip_code: string;
  driver_name: string;
  created_at: string;
}

const MyDeliveries = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<MyDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user) {
      fetchMyDeliveries();
    }
  }, [user]);

  const fetchMyDeliveries = async () => {
    try {
      setLoading(true);
      
      // Get client group linked to this user
      const { data: clientGroup } = await supabase
        .from('client_groups')
        .select('id')
        .eq('linked_user_id', user?.id)
        .single();

      if (!clientGroup) {
        setDeliveries([]);
        return;
      }

      // Get contracts for this client
      const { data: contracts } = await supabase
        .from('rental_contracts')
        .select('id')
        .eq('client_group_id', clientGroup.id);

      if (!contracts || contracts.length === 0) {
        setDeliveries([]);
        return;
      }

      const contractIds = contracts.map(c => c.id);

      // Get delivery stops for these contracts
      const { data: stops, error } = await supabase
        .from('delivery_stops')
        .select(`
          id,
          tracking_code,
          status,
          stop_order,
          recipient_name,
          destination_address,
          completed_at,
          created_at,
          trip:delivery_trips(
            id,
            trip_code,
            status,
            driver_name
          )
        `)
        .in('contract_id', contractIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedDeliveries: MyDelivery[] = (stops || []).map(stop => ({
        id: stop.id,
        tracking_code: stop.tracking_code,
        status: stop.status || 'pending',
        stop_order: stop.stop_order,
        recipient_name: stop.recipient_name || '',
        destination_address: stop.destination_address || '',
        completed_at: stop.completed_at,
        trip_status: (stop.trip as any)?.status || 'pending',
        trip_code: (stop.trip as any)?.trip_code || '',
        driver_name: (stop.trip as any)?.driver_name || '',
        created_at: stop.created_at || '',
      }));

      setDeliveries(formattedDeliveries);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDeliveries = deliveries.filter(d => 
    !searchQuery || 
    d.tracking_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.destination_address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (stopStatus: string, tripStatus: string) => {
    if (stopStatus === 'completed') {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Selesai</Badge>;
    }
    if (tripStatus === 'in_progress') {
      if (stopStatus === 'in_progress') {
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Driver Tiba</Badge>;
      }
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Dalam Perjalanan</Badge>;
    }
    return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Menunggu</Badge>;
  };

  const stats = {
    total: deliveries.length,
    pending: deliveries.filter(d => d.status === 'pending' && d.trip_status !== 'in_progress').length,
    in_progress: deliveries.filter(d => d.trip_status === 'in_progress' && d.status !== 'completed').length,
    completed: deliveries.filter(d => d.status === 'completed').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Pengiriman Saya</h1>
        <p className="text-slate-500">Lacak status pengiriman barang Anda</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Package className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                <p className="text-xs text-slate-500">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.pending}</p>
                <p className="text-xs text-slate-500">Menunggu</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.in_progress}</p>
                <p className="text-xs text-slate-500">Dalam Perjalanan</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.completed}</p>
                <p className="text-xs text-slate-500">Selesai</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Cari kode tracking atau alamat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Deliveries List */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Daftar Pengiriman</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Memuat data...</div>
          ) : filteredDeliveries.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {deliveries.length === 0 ? 'Belum ada pengiriman' : 'Tidak ada hasil pencarian'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDeliveries.map((delivery) => (
                <div 
                  key={delivery.id}
                  className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-bold text-slate-800">{delivery.tracking_code}</p>
                        {getStatusBadge(delivery.status, delivery.trip_status)}
                      </div>
                      <div className="flex items-start gap-2 text-sm text-slate-500 mb-1">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span className="truncate">{delivery.destination_address || 'Alamat tidak tersedia'}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>Trip: {delivery.trip_code}</span>
                        <span>Driver: {delivery.driver_name}</span>
                      </div>
                      {delivery.completed_at && (
                        <p className="text-xs text-green-600 mt-2">
                          Selesai: {format(new Date(delivery.completed_at), "dd MMM yyyy, HH:mm", { locale: id })}
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(`/track/${delivery.tracking_code}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Lacak
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyDeliveries;
