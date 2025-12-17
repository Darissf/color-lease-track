import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Truck, MapPin, User, Phone, ExternalLink, Copy, Image } from "lucide-react";
import { useDeliveryTracking } from "@/hooks/useDeliveryTracking";
import { DeliveryMap } from "@/components/delivery/DeliveryMap";
import { DeliveryTimeline } from "@/components/delivery/DeliveryTimeline";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/seo";

const DeliveryTripDetail = () => {
  const { id: tripId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTrip: trip, loading } = useDeliveryTracking(tripId);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (data?.token) {
          setMapboxToken(data.token);
        } else if (error) {
          console.error('Failed to fetch Mapbox token:', error);
        }
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
      }
    };
    fetchMapboxToken();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Dalam Perjalanan</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Selesai</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const copyDriverLink = () => {
    if (trip) {
      const driverUrl = `${SITE_URL}/delivery/driver/${trip.id}`;
      navigator.clipboard.writeText(driverUrl);
      toast.success('Link driver berhasil disalin');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500">Memuat data...</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-slate-500 mb-4">Trip tidak ditemukan</p>
          <Button onClick={() => navigate('/vip/delivery')}>Kembali ke Dashboard</Button>
        </div>
      </div>
    );
  }

  const completedStops = trip.delivery_stops?.filter(s => s.status === 'completed').length || 0;
  const totalStops = trip.delivery_stops?.length || 0;

  const timelineStops = (trip.delivery_stops || []).map(s => ({
    order: s.stop_order,
    status: s.status,
    is_current: s.status === 'in_transit' || s.status === 'arrived',
    label: s.recipient_name || `Stop ${s.stop_order}`,
    estimated_arrival: s.estimated_arrival,
    actual_arrival: s.actual_arrival,
    completed_at: s.completed_at,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/vip/delivery')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">{trip.trip_code}</h1>
              {getStatusBadge(trip.status || 'pending')}
            </div>
            <p className="text-slate-500">
              {trip.created_at && format(new Date(trip.created_at), "dd MMMM yyyy, HH:mm", { locale: id })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={copyDriverLink}>
            <Copy className="h-4 w-4 mr-2" />Salin Link Driver
          </Button>
          <Button variant="outline" onClick={() => window.open(`${SITE_URL}/delivery/driver/${trip.id}`, '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />Buka Halaman Driver
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-500" />Live Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {mapboxToken ? (
                <DeliveryMap
                  mapboxToken={mapboxToken}
                  warehouse={{ lat: trip.warehouse_lat, lng: trip.warehouse_lng }}
                  stops={(trip.delivery_stops || []).map(s => ({
                    lat: s.destination_lat,
                    lng: s.destination_lng,
                    status: s.status,
                    label: s.recipient_name || `Stop ${s.stop_order}`,
                  }))}
                  driverLocation={trip.current_lat && trip.current_lng ? { lat: trip.current_lat, lng: trip.current_lng } : undefined}
                  showRoute={trip.status === 'in_progress'}
                  className="h-[400px]"
                />
              ) : (
                <div className="h-[400px] bg-slate-100 flex items-center justify-center">
                  <p className="text-slate-500">Mapbox token tidak dikonfigurasi</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Progress Pengiriman</span>
                <span className="text-sm font-medium">{completedStops}/{totalStops} Stop</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${totalStops > 0 ? (completedStops / totalStops) * 100 : 0}%` }} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-slate-500" />Informasi Driver
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg"><User className="h-4 w-4 text-slate-600" /></div>
                  <div>
                    <p className="text-xs text-slate-500">Nama Driver</p>
                    <p className="font-medium">{trip.driver_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg"><Phone className="h-4 w-4 text-slate-600" /></div>
                  <div>
                    <p className="text-xs text-slate-500">No. Telepon</p>
                    <p className="font-medium">{trip.driver_phone || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg"><Truck className="h-4 w-4 text-slate-600" /></div>
                  <div>
                    <p className="text-xs text-slate-500">Kendaraan</p>
                    <p className="font-medium">{trip.vehicle_info || '-'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-white">
            <CardHeader><CardTitle className="text-lg">Timeline Pengiriman</CardTitle></CardHeader>
            <CardContent>
              <DeliveryTimeline stops={timelineStops} tripStatus={trip.status || 'pending'} />
            </CardContent>
          </Card>

          {trip.delivery_stops?.some(s => s.proof_photos && s.proof_photos.length > 0) && (
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Image className="h-5 w-5 text-slate-500" />Bukti Pengiriman
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trip.delivery_stops?.filter(s => s.proof_photos && s.proof_photos.length > 0).map((stop) => (
                    <div key={stop.id}>
                      <p className="text-xs text-slate-500 mb-2">Stop #{stop.stop_order} - {stop.recipient_name}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {stop.proof_photos?.map((photo, idx) => (
                          <a key={idx} href={photo} target="_blank" rel="noopener noreferrer" className="block">
                            <img src={photo} alt={`Bukti ${idx + 1}`} className="w-full h-24 object-cover rounded-lg border hover:opacity-80 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryTripDetail;
