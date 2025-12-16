import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { tracking_code } = await req.json();
    
    if (!tracking_code) {
      return new Response(JSON.stringify({ error: 'Tracking code required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Public Tracking] Looking up: ${tracking_code}`);

    // Get stop by tracking code
    const { data: stop, error: stopError } = await supabase
      .from('delivery_stops')
      .select(`
        *,
        delivery_trips (
          id,
          trip_code,
          driver_name,
          driver_phone,
          vehicle_info,
          status,
          started_at,
          completed_at,
          current_lat,
          current_lng,
          current_location_updated_at,
          warehouse_lat,
          warehouse_lng,
          warehouse_address
        )
      `)
      .eq('tracking_code', tracking_code)
      .single();

    if (stopError || !stop) {
      console.log('[Public Tracking] Stop not found:', stopError);
      return new Response(JSON.stringify({ error: 'Tracking not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trip = stop.delivery_trips;

    // Get all stops to determine position in queue
    const { data: allStops } = await supabase
      .from('delivery_stops')
      .select('id, stop_order, status, recipient_name, destination_address')
      .eq('trip_id', stop.trip_id)
      .order('stop_order', { ascending: true });

    // Determine visibility: only show live tracking if this stop is active or completed
    const isActive = stop.status === 'in_transit' || stop.status === 'arrived';
    const isCompleted = stop.status === 'completed';
    const isPending = stop.status === 'pending';

    // Count stops ahead
    const stopsAhead = allStops?.filter(s => 
      s.stop_order < stop.stop_order && s.status !== 'completed'
    ).length || 0;

    // Build response based on visibility rules
    const response: any = {
      tracking_code: stop.tracking_code,
      status: stop.status,
      stop_order: stop.stop_order,
      total_stops: allStops?.length || 1,
      recipient_name: stop.recipient_name,
      destination_address: stop.destination_address,
      estimated_arrival: stop.estimated_arrival,
      actual_arrival: stop.actual_arrival,
      completed_at: stop.completed_at,
      proof_photos: stop.proof_photos,
      delivery_notes: stop.delivery_notes,
      
      // Trip info
      trip_status: trip.status,
      trip_started_at: trip.started_at,
      driver_name: trip.driver_name,
      driver_phone: trip.driver_phone,
      vehicle_info: trip.vehicle_info,
      
      // Visibility flags
      can_see_live_location: isActive,
      is_completed: isCompleted,
      is_pending: isPending,
      stops_ahead: stopsAhead,
      
      // Mapbox token for map display
      mapbox_token: mapboxToken,
    };

    // Only include live location if this stop is active
    if (isActive && trip.current_lat && trip.current_lng) {
      response.driver_location = {
        lat: parseFloat(trip.current_lat),
        lng: parseFloat(trip.current_lng),
        updated_at: trip.current_location_updated_at,
      };
      
      response.destination = {
        lat: parseFloat(stop.destination_lat),
        lng: parseFloat(stop.destination_lng),
        address: stop.destination_address,
      };

      response.warehouse = {
        lat: parseFloat(trip.warehouse_lat),
        lng: parseFloat(trip.warehouse_lng),
        address: trip.warehouse_address,
      };
    }

    // If pending, show message about waiting
    if (isPending && stopsAhead > 0) {
      response.waiting_message = `Pengiriman Anda dalam antrian. Ada ${stopsAhead} pengiriman sebelum giliran Anda.`;
    }

    // Get stops summary for timeline (hide other recipients' details)
    response.stops_timeline = allStops?.map((s, idx) => ({
      order: s.stop_order,
      status: s.status,
      is_current: s.id === stop.id,
      label: s.id === stop.id ? 'Lokasi Anda' : `Pengiriman ${idx + 1}`,
    }));

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[Public Tracking] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
