import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DeliveryTrip {
  id: string;
  trip_code: string;
  driver_name: string;
  driver_phone?: string;
  vehicle_info?: string;
  warehouse_lat: number;
  warehouse_lng: number;
  warehouse_address?: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  current_lat?: number;
  current_lng?: number;
  current_location_updated_at?: string;
  notes?: string;
  created_at: string;
  delivery_stops?: DeliveryStop[];
}

export interface DeliveryStop {
  id: string;
  trip_id: string;
  contract_id?: string;
  stop_order: number;
  tracking_code: string;
  destination_lat: number;
  destination_lng: number;
  destination_address?: string;
  recipient_name?: string;
  recipient_phone?: string;
  status: string;
  estimated_arrival?: string;
  actual_arrival?: string;
  completed_at?: string;
  proof_photos?: string[];
  delivery_notes?: string;
  driver_notes?: string;
}

export const useDeliveryTracking = (tripId?: string) => {
  const [trips, setTrips] = useState<DeliveryTrip[]>([]);
  const [currentTrip, setCurrentTrip] = useState<DeliveryTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('delivery_trips')
        .select(`
          *,
          delivery_stops (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTrips = (data || []).map(trip => ({
        ...trip,
        warehouse_lat: Number(trip.warehouse_lat),
        warehouse_lng: Number(trip.warehouse_lng),
        current_lat: trip.current_lat ? Number(trip.current_lat) : undefined,
        current_lng: trip.current_lng ? Number(trip.current_lng) : undefined,
        delivery_stops: trip.delivery_stops?.map((stop: any) => ({
          ...stop,
          destination_lat: Number(stop.destination_lat),
          destination_lng: Number(stop.destination_lng),
        })).sort((a: DeliveryStop, b: DeliveryStop) => a.stop_order - b.stop_order),
      }));

      setTrips(formattedTrips);
    } catch (error: any) {
      console.error('Error fetching trips:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchTrip = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('delivery_trips')
        .select(`
          *,
          delivery_stops (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const formattedTrip = {
        ...data,
        warehouse_lat: Number(data.warehouse_lat),
        warehouse_lng: Number(data.warehouse_lng),
        current_lat: data.current_lat ? Number(data.current_lat) : undefined,
        current_lng: data.current_lng ? Number(data.current_lng) : undefined,
        delivery_stops: data.delivery_stops?.map((stop: any) => ({
          ...stop,
          destination_lat: Number(stop.destination_lat),
          destination_lng: Number(stop.destination_lng),
        })).sort((a: DeliveryStop, b: DeliveryStop) => a.stop_order - b.stop_order),
      };

      setCurrentTrip(formattedTrip);
      return formattedTrip;
    } catch (error: any) {
      console.error('Error fetching trip:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createTrip = async (tripData: {
    driver_name: string;
    driver_phone?: string;
    vehicle_info?: string;
    warehouse_lat: number;
    warehouse_lng: number;
    warehouse_address?: string;
    notes?: string;
    stops: {
      contract_id?: string;
      destination_lat: number;
      destination_lng: number;
      destination_address?: string;
      recipient_name?: string;
      recipient_phone?: string;
      delivery_notes?: string;
    }[];
  }) => {
    try {
      // Generate trip code
      const { data: tripCodeData } = await supabase.rpc('generate_trip_code');
      const tripCode = tripCodeData || `TRP-${Date.now()}`;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create trip
      const { data: trip, error: tripError } = await supabase
        .from('delivery_trips')
        .insert({
          user_id: user.id,
          trip_code: tripCode,
          driver_name: tripData.driver_name,
          driver_phone: tripData.driver_phone,
          vehicle_info: tripData.vehicle_info,
          warehouse_lat: tripData.warehouse_lat,
          warehouse_lng: tripData.warehouse_lng,
          warehouse_address: tripData.warehouse_address,
          notes: tripData.notes,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Create stops
      const stopsToInsert = await Promise.all(
        tripData.stops.map(async (stop, index) => {
          const { data: trackingCode } = await supabase.rpc('generate_tracking_code');
          return {
            trip_id: trip.id,
            stop_order: index + 1,
            tracking_code: trackingCode || `DLV-${Date.now()}-${index}`,
            contract_id: stop.contract_id,
            destination_lat: stop.destination_lat,
            destination_lng: stop.destination_lng,
            destination_address: stop.destination_address,
            recipient_name: stop.recipient_name,
            recipient_phone: stop.recipient_phone,
            delivery_notes: stop.delivery_notes,
          };
        })
      );

      const { error: stopsError } = await supabase
        .from('delivery_stops')
        .insert(stopsToInsert);

      if (stopsError) throw stopsError;

      toast({
        title: 'Trip Berhasil Dibuat',
        description: `Kode trip: ${tripCode}`,
      });

      await fetchTrips();
      return trip;
    } catch (error: any) {
      console.error('Error creating trip:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const startTrip = async (id: string) => {
    try {
      const response = await supabase.functions.invoke('delivery-tracking', {
        body: { action: 'start_trip', data: { trip_id: id } },
      });

      if (response.error) throw response.error;

      toast({
        title: 'Trip Dimulai',
        description: 'Notifikasi telah dikirim ke semua penerima',
      });

      if (tripId) {
        await fetchTrip(tripId);
      } else {
        await fetchTrips();
      }
    } catch (error: any) {
      console.error('Error starting trip:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateStopStatus = async (
    stopId: string,
    status: 'in_transit' | 'arrived' | 'completed',
    data?: { driver_notes?: string; proof_photos?: string[] }
  ) => {
    try {
      const response = await supabase.functions.invoke('delivery-tracking', {
        body: {
          action: 'update_stop_status',
          data: { stop_id: stopId, status, ...data },
        },
      });

      if (response.error) throw response.error;

      toast({
        title: 'Status Diupdate',
        description: `Status berhasil diubah menjadi ${status}`,
      });

      if (tripId) {
        await fetchTrip(tripId);
      }
    } catch (error: any) {
      console.error('Error updating stop status:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Setup realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('delivery-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_trips',
        },
        (payload) => {
          console.log('[Realtime] Trip update:', payload);
          if (tripId) {
            fetchTrip(tripId);
          } else {
            fetchTrips();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_stops',
        },
        (payload) => {
          console.log('[Realtime] Stop update:', payload);
          if (tripId) {
            fetchTrip(tripId);
          } else {
            fetchTrips();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, fetchTrip, fetchTrips]);

  // Initial fetch
  useEffect(() => {
    if (tripId) {
      fetchTrip(tripId);
    } else {
      fetchTrips();
    }
  }, [tripId, fetchTrip, fetchTrips]);

  return {
    trips,
    currentTrip,
    loading,
    fetchTrips,
    fetchTrip,
    createTrip,
    startTrip,
    updateStopStatus,
  };
};
