import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LocationState {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

export const useDriverLocation = (tripId: string, isActive: boolean = false) => {
  const [location, setLocation] = useState<LocationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const sendLocationUpdate = useCallback(async (loc: LocationState) => {
    try {
      const response = await supabase.functions.invoke('delivery-tracking', {
        body: {
          action: 'update_location',
          data: {
            trip_id: tripId,
            lat: loc.lat,
            lng: loc.lng,
            accuracy: loc.accuracy,
            speed: loc.speed,
            heading: loc.heading,
          },
        },
      });

      if (response.error) {
        console.error('[Driver Location] Update error:', response.error);
      } else {
        console.log('[Driver Location] Location updated');
      }
    } catch (err) {
      console.error('[Driver Location] Send error:', err);
    }
  }, [tripId]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung oleh browser ini');
      toast({
        title: 'Error',
        description: 'Geolocation tidak didukung',
        variant: 'destructive',
      });
      return;
    }

    setIsTracking(true);
    setError(null);

    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation: LocationState = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp,
        };
        setLocation(newLocation);
      },
      (err) => {
        console.error('[Driver Location] Watch error:', err);
        setError(getLocationErrorMessage(err));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    // Send updates every 10 seconds
    intervalRef.current = setInterval(() => {
      if (location) {
        sendLocationUpdate(location);
      }
    }, 10000);

    // Send initial location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const initialLocation: LocationState = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp,
        };
        setLocation(initialLocation);
        sendLocationUpdate(initialLocation);
      },
      (err) => {
        console.error('[Driver Location] Initial position error:', err);
        setError(getLocationErrorMessage(err));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }, [location, sendLocationUpdate, toast]);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
    
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Auto-start tracking when active
  useEffect(() => {
    if (isActive && !isTracking) {
      startTracking();
    } else if (!isActive && isTracking) {
      stopTracking();
    }
  }, [isActive, isTracking, startTracking, stopTracking]);

  // Send location updates when location changes (throttled via interval)
  useEffect(() => {
    if (location && isTracking) {
      // Location is sent via interval, but we can send immediately on significant changes
      const lastSent = localStorage.getItem(`last_location_${tripId}`);
      if (!lastSent || Date.now() - parseInt(lastSent) > 10000) {
        sendLocationUpdate(location);
        localStorage.setItem(`last_location_${tripId}`, Date.now().toString());
      }
    }
  }, [location, isTracking, tripId, sendLocationUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    location,
    error,
    isTracking,
    startTracking,
    stopTracking,
  };
};

function getLocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Akses lokasi ditolak. Mohon izinkan akses lokasi di pengaturan browser.';
    case error.POSITION_UNAVAILABLE:
      return 'Informasi lokasi tidak tersedia. Pastikan GPS aktif.';
    case error.TIMEOUT:
      return 'Waktu permintaan lokasi habis. Coba lagi.';
    default:
      return 'Terjadi kesalahan saat mendapatkan lokasi.';
  }
}
