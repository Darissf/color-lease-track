import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader2 } from 'lucide-react';

interface Coordinate {
  lat: number;
  lng: number;
}

interface DeliveryMapProps {
  mapboxToken: string;
  warehouse?: Coordinate;
  stops?: (Coordinate & { label?: string; status?: string })[];
  driverLocation?: Coordinate;
  showRoute?: boolean;
  className?: string;
  onMapLoad?: (map: mapboxgl.Map) => void;
}

export const DeliveryMap: React.FC<DeliveryMapProps> = ({
  mapboxToken,
  warehouse,
  stops = [],
  driverLocation,
  showRoute = true,
  className = '',
  onMapLoad,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) {
      setError('Mapbox token tidak tersedia');
      setLoading(false);
      return;
    }

    try {
      mapboxgl.accessToken = mapboxToken;

      // Calculate center from all points
      const allPoints = [
        warehouse,
        ...stops,
        driverLocation,
      ].filter(Boolean) as Coordinate[];

      const center = allPoints.length > 0
        ? {
            lng: allPoints.reduce((sum, p) => sum + p.lng, 0) / allPoints.length,
            lat: allPoints.reduce((sum, p) => sum + p.lat, 0) / allPoints.length,
          }
        : { lng: 115.2126, lat: -8.6705 }; // Default: Bali

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [center.lng, center.lat],
        zoom: 12,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', async () => {
        setLoading(false);
        
        // Add warehouse marker
        if (warehouse) {
          const warehouseEl = document.createElement('div');
          warehouseEl.className = 'warehouse-marker';
          warehouseEl.innerHTML = `
            <div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
              </svg>
            </div>
          `;
          
          new mapboxgl.Marker({ element: warehouseEl })
            .setLngLat([warehouse.lng, warehouse.lat])
            .setPopup(new mapboxgl.Popup().setHTML('<strong>Gudang</strong>'))
            .addTo(map.current!);
        }

        // Add stop markers
        stops.forEach((stop, index) => {
          const stopEl = document.createElement('div');
          const statusColor = getStatusColor(stop.status);
          stopEl.innerHTML = `
            <div class="w-8 h-8 ${statusColor} rounded-full flex items-center justify-center shadow-lg border-2 border-white text-white font-bold text-sm">
              ${index + 1}
            </div>
          `;
          
          new mapboxgl.Marker({ element: stopEl })
            .setLngLat([stop.lng, stop.lat])
            .setPopup(new mapboxgl.Popup().setHTML(`
              <strong>${stop.label || `Stop ${index + 1}`}</strong>
              <br/>
              <span class="text-sm">${stop.status || 'pending'}</span>
            `))
            .addTo(map.current!);
        });

        // Fetch and draw route if needed
        if (showRoute && warehouse && stops.length > 0) {
          await drawRoute(map.current!, mapboxToken, warehouse, stops);
        }

        // Fit bounds to show all markers
        if (allPoints.length > 1) {
          const bounds = new mapboxgl.LngLatBounds();
          allPoints.forEach(p => bounds.extend([p.lng, p.lat]));
          map.current!.fitBounds(bounds, { padding: 50 });
        }

        onMapLoad?.(map.current!);
      });

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setError('Error loading map');
        setLoading(false);
      });

    } catch (err) {
      console.error('Map initialization error:', err);
      setError('Gagal memuat peta');
      setLoading(false);
    }

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, warehouse, stops, showRoute, onMapLoad]);

  // Update driver marker position
  useEffect(() => {
    if (!map.current || !driverLocation) return;

    if (!driverMarker.current) {
      const driverEl = document.createElement('div');
      driverEl.innerHTML = `
        <div class="relative">
          <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-3 border-white animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </div>
          <div class="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping"></div>
        </div>
      `;
      
      driverMarker.current = new mapboxgl.Marker({ element: driverEl })
        .setLngLat([driverLocation.lng, driverLocation.lat])
        .setPopup(new mapboxgl.Popup().setHTML('<strong>Driver</strong><br/>Live location'))
        .addTo(map.current);
    } else {
      driverMarker.current.setLngLat([driverLocation.lng, driverLocation.lat]);
    }
  }, [driverLocation]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 rounded-lg ${className}`}>
        <div className="text-center text-slate-500">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-lg z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
    </div>
  );
};

function getStatusColor(status?: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-500';
    case 'arrived':
      return 'bg-yellow-500';
    case 'in_transit':
      return 'bg-blue-500';
    default:
      return 'bg-slate-400';
  }
}

async function drawRoute(
  map: mapboxgl.Map,
  token: string,
  warehouse: Coordinate,
  stops: Coordinate[]
): Promise<void> {
  try {
    const coords = [warehouse, ...stops]
      .map(p => `${p.lng},${p.lat}`)
      .join(';');

    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${token}`
    );
    const data = await response.json();

    if (data.routes && data.routes[0]) {
      const route = data.routes[0].geometry;

      if (map.getSource('route')) {
        (map.getSource('route') as mapboxgl.GeoJSONSource).setData({
          type: 'Feature',
          properties: {},
          geometry: route,
        });
      } else {
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: route,
          },
        });

        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 4,
            'line-opacity': 0.75,
          },
        });
      }
    }
  } catch (err) {
    console.error('Route drawing error:', err);
  }
}
