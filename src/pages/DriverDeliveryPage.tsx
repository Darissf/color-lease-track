import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Navigation, CheckCircle, Clock, Camera, Phone, AlertCircle, Loader2 } from "lucide-react";
import { useDeliveryTracking } from "@/hooks/useDeliveryTracking";
import { useDriverLocation } from "@/hooks/useDriverLocation";
import { ProofUploader } from "@/components/delivery/ProofUploader";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";

const DriverDeliveryPage = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const { currentTrip: trip, loading, updateStopStatus } = useDeliveryTracking(tripId);
  const { location, error: locationError, isTracking, startTracking, stopTracking } = useDriverLocation(tripId || '', trip?.status === 'in_progress');
  
  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [driverNotes, setDriverNotes] = useState("");
  const [proofPhotos, setProofPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  // Get current active stop (first pending stop)
  const currentStop = trip?.stops?.find(s => s.status === 'in_progress') || 
    trip?.stops?.find(s => s.status === 'pending');

  const handleArrival = async (stopId: string) => {
    try {
      await updateStopStatus(stopId, 'arrived');
      toast.success('Status diperbarui: Sudah Tiba');
    } catch (error) {
      toast.error('Gagal memperbarui status');
    }
  };

  const handleComplete = async () => {
    if (!selectedStop) return;
    
    if (proofPhotos.length === 0) {
      toast.error('Upload minimal 1 foto bukti pengiriman');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateStopStatus(selectedStop, 'completed', { driver_notes: driverNotes, proof_photos: proofPhotos });
      toast.success('Pengiriman selesai!');
      setShowCompleteDialog(false);
      setSelectedStop(null);
      setDriverNotes("");
      setProofPhotos([]);
    } catch (error) {
      toast.error('Gagal menyelesaikan pengiriman');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCompleteDialog = (stopId: string) => {
    setSelectedStop(stopId);
    setShowCompleteDialog(true);
  };

  const getStopStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Menunggu</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Sudah Tiba</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Selesai</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-slate-500">Memuat data pengiriman...</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Trip Tidak Ditemukan</h2>
            <p className="text-slate-500">Link pengiriman tidak valid atau sudah kedaluwarsa.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (trip.status === 'completed') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Trip Selesai</h2>
            <p className="text-slate-500">Semua pengiriman sudah diselesaikan.</p>
            <p className="text-sm text-slate-400 mt-2">
              Selesai pada: {trip.completed_at && format(new Date(trip.completed_at), "dd MMMM yyyy, HH:mm", { locale: id })}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedStops = trip.stops?.filter(s => s.status === 'completed').length || 0;
  const totalStops = trip.stops?.length || 0;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-slate-800">{trip.trip_code}</h1>
              <p className="text-xs text-slate-500">Driver: {trip.driver_name}</p>
            </div>
            <div className="flex items-center gap-2">
              {isTracking ? (
                <Badge className="bg-green-100 text-green-800">
                  <Navigation className="h-3 w-3 mr-1 animate-pulse" />
                  GPS Aktif
                </Badge>
              ) : (
                <Badge variant="outline" className="text-slate-500">
                  GPS Nonaktif
                </Badge>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Progress</span>
              <span>{completedStops}/{totalStops} Stop</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${totalStops > 0 ? (completedStops / totalStops) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Location Error Alert */}
      {locationError && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{locationError}</p>
          </div>
        </div>
      )}

      {/* Stops List */}
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {trip.stops?.sort((a, b) => a.stop_order - b.stop_order).map((stop) => (
          <Card key={stop.id} className={`bg-white ${stop.status === 'completed' ? 'opacity-60' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    stop.status === 'completed' ? 'bg-green-500 text-white' :
                    stop.status === 'in_progress' ? 'bg-blue-500 text-white' :
                    'bg-slate-200 text-slate-600'
                  }`}>
                    {stop.status === 'completed' ? <CheckCircle className="h-4 w-4" /> : stop.stop_order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-slate-800">{stop.recipient_name || 'Penerima'}</p>
                      {getStopStatusBadge(stop.status || 'pending')}
                    </div>
                    <p className="text-sm text-slate-500 mb-2">{stop.destination_address || 'Alamat tidak tersedia'}</p>
                    
                    {stop.recipient_phone && (
                      <a 
                        href={`tel:${stop.recipient_phone}`}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        <Phone className="h-3 w-3" />
                        {stop.recipient_phone}
                      </a>
                    )}

                    {stop.delivery_notes && (
                      <p className="text-xs text-slate-400 mt-1 italic">{stop.delivery_notes}</p>
                    )}

                    {stop.completed_at && (
                      <p className="text-xs text-green-600 mt-2">
                        Selesai: {format(new Date(stop.completed_at), "HH:mm", { locale: id })}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {stop.status !== 'completed' && (
                <div className="mt-4 flex gap-2">
                  {stop.status === 'pending' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleArrival(stop.id)}
                    >
                      <MapPin className="h-4 w-4 mr-1" />
                      Saya Sudah Tiba
                    </Button>
                  )}
                  {stop.status === 'in_progress' && (
                    <Button 
                      size="sm" 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => openCompleteDialog(stop.id)}
                    >
                      <Camera className="h-4 w-4 mr-1" />
                      Selesai & Upload Bukti
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${stop.destination_lat},${stop.destination_lng}`, '_blank')}
                  >
                    <Navigation className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Proof Photos Display */}
              {stop.proof_photos && stop.proof_photos.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {stop.proof_photos.map((photo, idx) => (
                    <img 
                      key={idx}
                      src={photo}
                      alt={`Bukti ${idx + 1}`}
                      className="w-full h-16 object-cover rounded border"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Complete Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Selesaikan Pengiriman</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Upload Bukti Pengiriman *
              </label>
              <ProofUploader 
                onUpload={(photos, notes) => {
                  setProofPhotos(photos);
                  if (notes) setDriverNotes(notes);
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Catatan Driver (Opsional)
              </label>
              <Textarea
                value={driverNotes}
                onChange={(e) => setDriverNotes(e.target.value)}
                placeholder="Catatan tambahan..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowCompleteDialog(false)}
              >
                Batal
              </Button>
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleComplete}
                disabled={isSubmitting || proofPhotos.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Selesai'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverDeliveryPage;
