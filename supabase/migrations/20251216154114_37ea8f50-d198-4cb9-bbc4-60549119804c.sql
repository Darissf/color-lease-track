-- =====================================================
-- DELIVERY TRACKING SYSTEM - Multi-Stop Live Tracking
-- =====================================================

-- Table 1: warehouse_settings - Lokasi gudang default
CREATE TABLE public.warehouse_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(255) DEFAULT 'Gudang Utama',
  address TEXT,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 2: delivery_trips - Trip pengiriman utama
CREATE TABLE public.delivery_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  trip_code VARCHAR(20) UNIQUE NOT NULL,
  driver_name VARCHAR(255) NOT NULL,
  driver_phone VARCHAR(20),
  vehicle_info VARCHAR(255),
  warehouse_lat DECIMAL(10, 8) NOT NULL,
  warehouse_lng DECIMAL(11, 8) NOT NULL,
  warehouse_address TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  current_lat DECIMAL(10, 8),
  current_lng DECIMAL(11, 8),
  current_location_updated_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 3: delivery_stops - Stop/tujuan dalam trip
CREATE TABLE public.delivery_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.delivery_trips(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.rental_contracts(id) ON DELETE SET NULL,
  stop_order INTEGER NOT NULL,
  tracking_code VARCHAR(20) UNIQUE NOT NULL,
  destination_lat DECIMAL(10, 8) NOT NULL,
  destination_lng DECIMAL(11, 8) NOT NULL,
  destination_address TEXT,
  recipient_name VARCHAR(255),
  recipient_phone VARCHAR(20),
  status VARCHAR(50) DEFAULT 'pending',
  estimated_arrival TIMESTAMP WITH TIME ZONE,
  actual_arrival TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  proof_photos TEXT[],
  delivery_notes TEXT,
  driver_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 4: delivery_location_history - Histori lokasi GPS
CREATE TABLE public.delivery_location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.delivery_trips(id) ON DELETE CASCADE,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2),
  speed DECIMAL(10, 2),
  heading DECIMAL(5, 2),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES for performance
-- =====================================================

CREATE INDEX idx_warehouse_settings_user_id ON public.warehouse_settings(user_id);
CREATE INDEX idx_delivery_trips_user_id ON public.delivery_trips(user_id);
CREATE INDEX idx_delivery_trips_status ON public.delivery_trips(status);
CREATE INDEX idx_delivery_trips_trip_code ON public.delivery_trips(trip_code);
CREATE INDEX idx_delivery_stops_trip_id ON public.delivery_stops(trip_id);
CREATE INDEX idx_delivery_stops_tracking_code ON public.delivery_stops(tracking_code);
CREATE INDEX idx_delivery_stops_contract_id ON public.delivery_stops(contract_id);
CREATE INDEX idx_delivery_stops_status ON public.delivery_stops(status);
CREATE INDEX idx_delivery_location_history_trip_id ON public.delivery_location_history(trip_id);
CREATE INDEX idx_delivery_location_history_recorded_at ON public.delivery_location_history(recorded_at);

-- =====================================================
-- Enable RLS
-- =====================================================

ALTER TABLE public.warehouse_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_location_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - warehouse_settings
-- =====================================================

CREATE POLICY "Super admins can manage warehouse settings"
ON public.warehouse_settings FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Admins can view warehouse settings"
ON public.warehouse_settings FOR SELECT
USING (is_admin(auth.uid()));

-- =====================================================
-- RLS POLICIES - delivery_trips
-- =====================================================

CREATE POLICY "Admins can manage delivery trips"
ON public.delivery_trips FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view trips for their linked contracts"
ON public.delivery_trips FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.delivery_stops ds
    JOIN public.rental_contracts rc ON ds.contract_id = rc.id
    JOIN public.client_groups cg ON rc.client_group_id = cg.id
    WHERE ds.trip_id = delivery_trips.id
    AND cg.linked_user_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES - delivery_stops
-- =====================================================

CREATE POLICY "Admins can manage delivery stops"
ON public.delivery_stops FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view their own delivery stops"
ON public.delivery_stops FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.rental_contracts rc
    JOIN public.client_groups cg ON rc.client_group_id = cg.id
    WHERE rc.id = delivery_stops.contract_id
    AND cg.linked_user_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES - delivery_location_history
-- =====================================================

CREATE POLICY "Admins can manage location history"
ON public.delivery_location_history FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view location history for their trips"
ON public.delivery_location_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.delivery_trips dt
    JOIN public.delivery_stops ds ON ds.trip_id = dt.id
    JOIN public.rental_contracts rc ON ds.contract_id = rc.id
    JOIN public.client_groups cg ON rc.client_group_id = cg.id
    WHERE dt.id = delivery_location_history.trip_id
    AND cg.linked_user_id = auth.uid()
  )
);

-- =====================================================
-- Enable Realtime for live tracking
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_trips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_stops;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_location_history;

-- =====================================================
-- Triggers for updated_at
-- =====================================================

CREATE TRIGGER update_warehouse_settings_updated_at
  BEFORE UPDATE ON public.warehouse_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_trips_updated_at
  BEFORE UPDATE ON public.delivery_trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_stops_updated_at
  BEFORE UPDATE ON public.delivery_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Function to generate trip code
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_trip_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_date TEXT;
  v_count INTEGER;
  v_code TEXT;
BEGIN
  v_date := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM delivery_trips
  WHERE DATE(created_at) = CURRENT_DATE;
  
  v_code := 'TRP-' || v_date || '-' || LPAD(v_count::TEXT, 3, '0');
  
  RETURN v_code;
END;
$$;

-- =====================================================
-- Function to generate tracking code
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := 'DLV-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    
    SELECT EXISTS(SELECT 1 FROM delivery_stops WHERE tracking_code = v_code) INTO v_exists;
    
    IF NOT v_exists THEN
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$;