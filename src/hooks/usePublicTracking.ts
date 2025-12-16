import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PublicTrackingData {
  tracking_code: string;
  status: string;
  stop_order: number;
  total_stops: number;
  recipient_name?: string;
  destination_address?: string;
  estimated_arrival?: string;
  actual_arrival?: string;
  completed_at?: string;
  proof_photos?: string[];
  delivery_notes?: string;
  
  trip_status: string;
  trip_started_at?: string;
  driver_name?: string;
  driver_phone?: string;
  vehicle_info?: string;
  
  can_see_live_location: boolean;
  is_completed: boolean;
  is_pending: boolean;
  stops_ahead: number;
  waiting_message?: string;
  
  driver_location?: {
    lat: number;
    lng: number;
    updated_at: string;
  };
  
  destination?: {
    lat: number;
    lng: number;
    address?: string;
  };
  
  warehouse?: {
    lat: number;
    lng: number;
    address?: string;
  };
  
  stops_timeline?: {
    order: number;
    status: string;
    is_current: boolean;
    label: string;
  }[];
  
  mapbox_token?: string;
}

export const usePublicTracking = (trackingCode: string) => {
  const [data, setData] = useState<PublicTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTracking = useCallback(async () => {
    if (!trackingCode) {
      setError('Kode tracking tidak valid');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await supabase.functions.invoke('delivery-public-tracking', {
        body: { tracking_code: trackingCode },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to fetch tracking');
      }

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setData(response.data);
    } catch (err: any) {
      console.error('[Public Tracking] Error:', err);
      setError(err.message || 'Terjadi kesalahan saat memuat data tracking');
    } finally {
      setLoading(false);
    }
  }, [trackingCode]);

  // Initial fetch
  useEffect(() => {
    fetchTracking();
  }, [fetchTracking]);

  // Auto-refresh every 10 seconds if tracking is active
  useEffect(() => {
    if (data?.can_see_live_location && !data?.is_completed) {
      const interval = setInterval(fetchTracking, 10000);
      return () => clearInterval(interval);
    }
  }, [data?.can_see_live_location, data?.is_completed, fetchTracking]);

  // Setup realtime subscription for stop updates
  useEffect(() => {
    if (!trackingCode) return;

    const channel = supabase
      .channel(`public-tracking-${trackingCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_stops',
          filter: `tracking_code=eq.${trackingCode}`,
        },
        () => {
          console.log('[Public Tracking] Stop update received');
          fetchTracking();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trackingCode, fetchTracking]);

  return {
    data,
    loading,
    error,
    refetch: fetchTracking,
  };
};
