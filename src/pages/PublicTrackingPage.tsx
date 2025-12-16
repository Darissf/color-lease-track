import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, CheckCircle, Truck, Package, AlertCircle, Loader2, Search, Phone, Image } from "lucide-react";
import { usePublicTracking } from "@/hooks/usePublicTracking";
import { DeliveryMap } from "@/components/delivery/DeliveryMap";
import { WaitingScreen } from "@/components/delivery/WaitingScreen";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useState } from "react";

const PublicTrackingPage = () => {
  const { trackingCode: urlTrackingCode } = useParams<{ trackingCode: string }>();
  const [inputCode, setInputCode] = useState(urlTrackingCode || "");
  const [activeCode, setActiveCode] = useState(urlTrackingCode || "");
  
  const { data, loading, error, refetch } = usePublicTracking(activeCode);

  const handleSearch = () => {
    if (inputCode.trim()) {
      setActiveCode(inputCode.trim().toUpperCase());
    }
  };

  const getStatusInfo = () => {
    if (!data) return null;
    
    if (data.is_completed) {
      return {
        icon: CheckCircle,
        color: "text-green-500",
        bgColor: "bg-green-100",
        label: "Pengiriman Selesai",
        description: data.completed_at ? 
          `Diterima pada ${format(new Date(data.completed_at), "dd MMMM yyyy, HH:mm", { locale: id })}` :
          "Barang telah diterima"
      };
    }
    
    if (data.can_see_live_location) {
      return {
        icon: Truck,
        color: "text-blue-500",
        bgColor: "bg-blue-100",
        label: "Dalam Perjalanan",
        description: "Driver sedang menuju lokasi Anda"
      };
    }
    
    return {
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-100",
      label: "Menunggu Giliran",
      description: `${data.stops_ahead} pengiriman sebelum giliran Anda`
    };
  };

  const statusInfo = getStatusInfo();

  // Search Form (when no tracking code or invalid)
  if (!activeCode || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-blue-500" />
            </div>
            <CardTitle className="text-xl">Lacak Pengiriman</CardTitle>
            <p className="text-sm text-slate-500 mt-1">Masukkan kode tracking untuk melihat status pengiriman</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="Masukkan kode tracking"
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} className="bg-blue-500 hover:bg-blue-600">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-slate-500">Memuat data tracking...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Waiting Screen (not yet their turn)
  if (data.is_pending && !data.can_see_live_location) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-4">
        <div className="max-w-lg mx-auto space-y-4">
          {/* Header */}
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Kode Tracking</p>
                  <p className="font-bold text-slate-800">{data.tracking_code}</p>
                </div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <Clock className="h-3 w-3 mr-1" />
                  Menunggu
                </Badge>
              </div>
            </CardContent>
          </Card>

          <WaitingScreen
            stopsAhead={data.stops_ahead}
            waitingMessage={data.waiting_message}
            tripStartedAt={data.trip_started_at}
          />

          {/* Destination Info */}
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Informasi Pengiriman</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">Alamat Tujuan</p>
                  <p className="text-sm font-medium">{data.destination_address || '-'}</p>
                </div>
              </div>
              {data.recipient_name && (
                <div className="flex items-start gap-3">
                  <Package className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Penerima</p>
                    <p className="text-sm font-medium">{data.recipient_name}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Live Tracking or Completed View
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-slate-500">Kode Tracking</p>
                <p className="font-bold text-slate-800">{data.tracking_code}</p>
              </div>
              {statusInfo && (
                <Badge variant="secondary" className={`${statusInfo.bgColor} ${statusInfo.color.replace('text-', 'text-')}`}>
                  <statusInfo.icon className="h-3 w-3 mr-1" />
                  {statusInfo.label}
                </Badge>
              )}
            </div>
            
            {statusInfo && (
              <div className={`p-3 rounded-lg ${statusInfo.bgColor}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 bg-white rounded-full`}>
                    <statusInfo.icon className={`h-5 w-5 ${statusInfo.color}`} />
                  </div>
                  <div>
                    <p className={`font-medium ${statusInfo.color}`}>{statusInfo.label}</p>
                    <p className="text-xs text-slate-600">{statusInfo.description}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Map (only for live tracking) */}
        {data.can_see_live_location && !data.is_completed && data.mapbox_token && (
          <Card className="bg-white overflow-hidden">
            <CardContent className="p-0">
              <DeliveryMap
                mapboxToken={data.mapbox_token}
                warehouse={data.warehouse}
                stops={data.destination ? [{
                  lat: data.destination.lat,
                  lng: data.destination.lng,
                  status: data.status,
                  label: `Stop ${data.stop_order}`,
                }] : []}
                driverLocation={data.driver_location}
                showRoute={true}
                className="h-[300px]"
              />
            </CardContent>
          </Card>
        )}

        {/* Driver Info (for live tracking) */}
        {data.can_see_live_location && !data.is_completed && (
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Informasi Driver</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.driver_name && (
                <div className="flex items-center gap-3">
                  <Truck className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Nama Driver</p>
                    <p className="text-sm font-medium">{data.driver_name}</p>
                  </div>
                </div>
              )}
              {data.driver_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Telepon</p>
                    <a href={`tel:${data.driver_phone}`} className="text-sm font-medium text-blue-600">
                      {data.driver_phone}
                    </a>
                  </div>
                </div>
              )}
              {data.vehicle_info && (
                <p className="text-xs text-slate-500">{data.vehicle_info}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Completed Info */}
        {data.is_completed && (
          <>
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Detail Pengiriman</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Alamat Tujuan</p>
                    <p className="text-sm font-medium">{data.destination_address || '-'}</p>
                  </div>
                </div>
                {data.recipient_name && (
                  <div className="flex items-start gap-3">
                    <Package className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Penerima</p>
                      <p className="text-sm font-medium">{data.recipient_name}</p>
                    </div>
                  </div>
                )}
                {data.actual_arrival && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Waktu Tiba</p>
                      <p className="text-sm font-medium">
                        {format(new Date(data.actual_arrival), "dd MMMM yyyy, HH:mm", { locale: id })}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Proof Photos */}
            {data.proof_photos && data.proof_photos.length > 0 && (
              <Card className="bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Bukti Pengiriman
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {data.proof_photos.map((photo, idx) => (
                      <a 
                        key={idx}
                        href={photo}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img 
                          src={photo}
                          alt={`Bukti ${idx + 1}`}
                          className="w-full h-32 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Driver Notes */}
            {data.delivery_notes && (
              <Card className="bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Catatan Driver</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700">{data.delivery_notes}</p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Timeline */}
        {data.stops_timeline && data.stops_timeline.length > 1 && (
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Progress Pengiriman</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {data.stops_timeline.map((stop, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      stop.status === 'completed' ? 'bg-green-500 text-white' :
                      stop.is_current ? 'bg-blue-500 text-white' :
                      'bg-slate-200 text-slate-500'
                    }`}>
                      {stop.status === 'completed' ? <CheckCircle className="h-4 w-4" /> : stop.order}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{stop.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PublicTrackingPage;
