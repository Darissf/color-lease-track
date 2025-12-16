import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocationUpdate {
  trip_id: string;
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

interface StopStatusUpdate {
  stop_id: string;
  status: 'in_transit' | 'arrived' | 'completed';
  driver_notes?: string;
  proof_photos?: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { action, data } = await req.json();
    console.log(`[Delivery Tracking] Action: ${action}`, data);

    switch (action) {
      case 'update_location': {
        const locationData = data as LocationUpdate;
        
        // Update trip's current location
        const { error: tripError } = await supabase
          .from('delivery_trips')
          .update({
            current_lat: locationData.lat,
            current_lng: locationData.lng,
            current_location_updated_at: new Date().toISOString(),
          })
          .eq('id', locationData.trip_id);

        if (tripError) throw tripError;

        // Insert into location history
        const { error: historyError } = await supabase
          .from('delivery_location_history')
          .insert({
            trip_id: locationData.trip_id,
            lat: locationData.lat,
            lng: locationData.lng,
            accuracy: locationData.accuracy,
            speed: locationData.speed,
            heading: locationData.heading,
          });

        if (historyError) console.error('Location history error:', historyError);

        // Calculate ETA for current active stop
        const { data: activeStop } = await supabase
          .from('delivery_stops')
          .select('*')
          .eq('trip_id', locationData.trip_id)
          .eq('status', 'in_transit')
          .single();

        let eta = null;
        if (activeStop && mapboxToken) {
          try {
            const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${locationData.lng},${locationData.lat};${activeStop.destination_lng},${activeStop.destination_lat}?access_token=${mapboxToken}`;
            const directionsRes = await fetch(directionsUrl);
            const directionsData = await directionsRes.json();
            
            if (directionsData.routes && directionsData.routes[0]) {
              const durationSeconds = directionsData.routes[0].duration;
              eta = new Date(Date.now() + durationSeconds * 1000).toISOString();
              
              // Update stop with ETA
              await supabase
                .from('delivery_stops')
                .update({ estimated_arrival: eta })
                .eq('id', activeStop.id);
            }
          } catch (etaError) {
            console.error('ETA calculation error:', etaError);
          }
        }

        return new Response(JSON.stringify({ success: true, eta }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update_stop_status': {
        const statusData = data as StopStatusUpdate;
        
        // Get current stop info
        const { data: stop, error: stopFetchError } = await supabase
          .from('delivery_stops')
          .select('*, delivery_trips(*)')
          .eq('id', statusData.stop_id)
          .single();

        if (stopFetchError || !stop) throw new Error('Stop not found');

        const updateData: any = { status: statusData.status };
        
        if (statusData.status === 'arrived') {
          updateData.actual_arrival = new Date().toISOString();
        }
        
        if (statusData.status === 'completed') {
          updateData.completed_at = new Date().toISOString();
          if (statusData.proof_photos) {
            updateData.proof_photos = statusData.proof_photos;
          }
          if (statusData.driver_notes) {
            updateData.driver_notes = statusData.driver_notes;
          }
        }

        // Update stop
        const { error: stopError } = await supabase
          .from('delivery_stops')
          .update(updateData)
          .eq('id', statusData.stop_id);

        if (stopError) throw stopError;

        // If completed, activate next stop
        if (statusData.status === 'completed') {
          const { data: nextStop } = await supabase
            .from('delivery_stops')
            .select('*')
            .eq('trip_id', stop.trip_id)
            .eq('status', 'pending')
            .order('stop_order', { ascending: true })
            .limit(1)
            .single();

          if (nextStop) {
            await supabase
              .from('delivery_stops')
              .update({ status: 'in_transit' })
              .eq('id', nextStop.id);

            // Send WhatsApp notification to next stop recipient
            await sendWhatsAppNotification(supabase, {
              type: 'stop_active',
              stop: nextStop,
              trip: stop.delivery_trips,
            });
          } else {
            // All stops completed - mark trip as completed
            await supabase
              .from('delivery_trips')
              .update({ 
                status: 'completed',
                completed_at: new Date().toISOString(),
              })
              .eq('id', stop.trip_id);
          }

          // Send completion notification to current stop recipient
          await sendWhatsAppNotification(supabase, {
            type: 'stop_completed',
            stop: stop,
            trip: stop.delivery_trips,
          });
        }

        // Send arrived notification
        if (statusData.status === 'arrived') {
          await sendWhatsAppNotification(supabase, {
            type: 'stop_arrived',
            stop: stop,
            trip: stop.delivery_trips,
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'start_trip': {
        const { trip_id } = data;
        
        // Get trip and first stop
        const { data: trip, error: tripError } = await supabase
          .from('delivery_trips')
          .select('*, delivery_stops(*)')
          .eq('id', trip_id)
          .single();

        if (tripError || !trip) throw new Error('Trip not found');

        // Update trip status
        await supabase
          .from('delivery_trips')
          .update({ 
            status: 'in_progress',
            started_at: new Date().toISOString(),
          })
          .eq('id', trip_id);

        // Set first stop as in_transit
        const stops = trip.delivery_stops.sort((a: any, b: any) => a.stop_order - b.stop_order);
        if (stops.length > 0) {
          await supabase
            .from('delivery_stops')
            .update({ status: 'in_transit' })
            .eq('id', stops[0].id);

          // Send notification to first stop recipient
          await sendWhatsAppNotification(supabase, {
            type: 'trip_started',
            stop: stops[0],
            trip: trip,
          });
        }

        // Send notification to ALL recipients about trip starting
        for (const stop of stops) {
          await sendWhatsAppNotification(supabase, {
            type: 'trip_started_all',
            stop: stop,
            trip: trip,
            isFirstStop: stop.stop_order === 1,
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_route': {
        const { origin, destinations } = data;
        
        if (!mapboxToken) {
          return new Response(JSON.stringify({ error: 'Mapbox token not configured' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Build coordinates string for Mapbox Directions API
        const coords = [origin, ...destinations]
          .map((d: any) => `${d.lng},${d.lat}`)
          .join(';');

        const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&steps=true&access_token=${mapboxToken}`;
        
        const response = await fetch(directionsUrl);
        const routeData = await response.json();

        return new Response(JSON.stringify(routeData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: unknown) {
    console.error('[Delivery Tracking] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function sendWhatsAppNotification(supabase: any, payload: any) {
  try {
    const { type, stop, trip, isFirstStop } = payload;
    
    if (!stop?.recipient_phone) {
      console.log('[WhatsApp] No recipient phone for notification');
      return;
    }

    // Get WhatsApp settings
    const { data: waSettings } = await supabase
      .from('whatsapp_settings')
      .select('*')
      .eq('user_id', trip.user_id)
      .eq('is_active', true)
      .single();

    if (!waSettings) {
      console.log('[WhatsApp] No active WhatsApp settings');
      return;
    }

    let message = '';
    const trackingUrl = `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app')}/track/${stop.tracking_code}`;

    switch (type) {
      case 'trip_started':
        message = `🚚 *PENGIRIMAN DIMULAI*\n\nHalo *${stop.recipient_name}*,\n\nPengiriman scaffolding Anda sedang dalam perjalanan!\n\n👤 Driver: ${trip.driver_name}\n📞 Telp: ${trip.driver_phone || '-'}\n🚗 Kendaraan: ${trip.vehicle_info || '-'}\n\n📍 Track live:\n${trackingUrl}\n\nTerima kasih! 🙏`;
        break;
      case 'trip_started_all':
        if (isFirstStop) {
          message = `🚚 *PENGIRIMAN DIMULAI*\n\nHalo *${stop.recipient_name}*,\n\nPengiriman scaffolding Anda sedang dalam perjalanan!\n\n👤 Driver: ${trip.driver_name}\n📍 Track live:\n${trackingUrl}\n\nTerima kasih! 🙏`;
        } else {
          message = `📦 *JADWAL PENGIRIMAN*\n\nHalo *${stop.recipient_name}*,\n\nPengiriman scaffolding Anda dalam antrian hari ini.\n\n👤 Driver: ${trip.driver_name}\n📍 Track:\n${trackingUrl}\n\nKami akan kirim notifikasi saat giliran Anda. Terima kasih! 🙏`;
        }
        break;
      case 'stop_active':
        message = `🚗 *GILIRAN ANDA!*\n\nHalo *${stop.recipient_name}*,\n\nDriver sedang menuju lokasi Anda!\n\n👤 Driver: ${trip.driver_name}\n📞 Telp: ${trip.driver_phone || '-'}\n\n📍 Track live:\n${trackingUrl}\n\nMohon bersiap untuk menerima pengiriman. 🙏`;
        break;
      case 'stop_arrived':
        message = `📍 *DRIVER TIBA!*\n\nHalo *${stop.recipient_name}*,\n\nDriver telah tiba di lokasi Anda!\n\n👤 Driver: ${trip.driver_name}\n📞 Telp: ${trip.driver_phone || '-'}\n\nMohon segera temui driver untuk serah terima. 🙏`;
        break;
      case 'stop_completed':
        message = `✅ *PENGIRIMAN SELESAI*\n\nHalo *${stop.recipient_name}*,\n\nPengiriman scaffolding telah selesai!\n\nTerima kasih telah menggunakan layanan kami. 🙏`;
        break;
    }

    if (!message) return;

    // Send via WAHA or Meta API
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-unified`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        phone: stop.recipient_phone,
        message: message,
        user_id: trip.user_id,
      }),
    });

    console.log(`[WhatsApp] Sent ${type} notification to ${stop.recipient_phone}`);
  } catch (error) {
    console.error('[WhatsApp] Notification error:', error);
  }
}
