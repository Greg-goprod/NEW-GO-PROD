-- ============================================================================
-- MIGRATION : MODULE PRODUCTION COMPLET
-- Date : 14 novembre 2025
-- Description : Création des 17 tables du module Production
-- Tables : touring_party, travels, missions, drivers, vehicles, shifts, hotels, catering, party_crew
-- ============================================================================

-- ============================================================================
-- 1. ARTIST_TOURING_PARTY
-- ============================================================================
CREATE TABLE IF NOT EXISTS artist_touring_party (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    group_size INTEGER NOT NULL DEFAULT 1,
    vehicles JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    special_requirements TEXT,
    status VARCHAR(50) CHECK (status IN ('todo', 'incomplete', 'completed')),
    performance_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, artist_id)
);

CREATE INDEX IF NOT EXISTS idx_artist_touring_party_event_id ON artist_touring_party(event_id);
CREATE INDEX IF NOT EXISTS idx_artist_touring_party_artist_id ON artist_touring_party(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_touring_party_status ON artist_touring_party(status);
CREATE INDEX IF NOT EXISTS idx_artist_touring_party_performance_date ON artist_touring_party(performance_date);

COMMENT ON TABLE artist_touring_party IS 'Effectifs artistes par événement (touring party)';
COMMENT ON COLUMN artist_touring_party.group_size IS 'Nombre de personnes dans le groupe';
COMMENT ON COLUMN artist_touring_party.vehicles IS 'Array JSONB des véhicules avec types et quantités';
COMMENT ON COLUMN artist_touring_party.status IS 'Statut calculé: todo, incomplete, completed';

-- ============================================================================
-- 2. TRAVELS
-- ============================================================================
CREATE TABLE IF NOT EXISTS travels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    artist_id UUID REFERENCES artists(id),
    contact_id UUID REFERENCES crm_contacts(id),
    is_arrival BOOLEAN NOT NULL DEFAULT true,
    travel_type VARCHAR(50) NOT NULL,
    scheduled_datetime TIMESTAMPTZ NOT NULL,
    actual_datetime TIMESTAMPTZ,
    departure_location VARCHAR(500),
    arrival_location VARCHAR(500),
    reference_number VARCHAR(100),
    passenger_count INTEGER DEFAULT 1,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'planned',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (artist_id IS NOT NULL OR contact_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_travels_event_id ON travels(event_id);
CREATE INDEX IF NOT EXISTS idx_travels_artist_id ON travels(artist_id);
CREATE INDEX IF NOT EXISTS idx_travels_contact_id ON travels(contact_id);
CREATE INDEX IF NOT EXISTS idx_travels_scheduled_datetime ON travels(scheduled_datetime);
CREATE INDEX IF NOT EXISTS idx_travels_status ON travels(status);
CREATE INDEX IF NOT EXISTS idx_travels_travel_type ON travels(travel_type);

COMMENT ON TABLE travels IS 'Voyages artistes (avion, train, véhicules)';
COMMENT ON COLUMN travels.is_arrival IS 'true = arrivée, false = départ';
COMMENT ON COLUMN travels.travel_type IS 'PLANE, TRAIN, CAR, VAN, TOURBUS, TRUCK, etc.';
COMMENT ON CONSTRAINT travels_check ON travels IS 'Soit artist_id soit contact_id doit être renseigné';

-- ============================================================================
-- 3. BASES
-- ============================================================================
CREATE TABLE IF NOT EXISTS bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500),
    city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bases_is_default ON bases(is_default);

COMMENT ON TABLE bases IS 'Bases de départ pour les missions (points de ralliement)';

-- ============================================================================
-- 4. DRIVERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    street VARCHAR(255),
    postal_code VARCHAR(20),
    city VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    birth_date DATE,
    languages TEXT[],
    t_shirt_size VARCHAR(10) DEFAULT 'M',
    hired_year INTEGER NOT NULL,
    permits TEXT[],
    notes TEXT,
    photo_url TEXT,
    availability_status VARCHAR(50) DEFAULT 'AVAILABLE' 
      CHECK (availability_status IN ('AVAILABLE', 'BUSY', 'OFF')),
    work_status VARCHAR(50) DEFAULT 'ACTIVE'
      CHECK (work_status IN ('ACTIVE', 'INACTIVE', 'SEASONAL')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drivers_last_name ON drivers(last_name);
CREATE INDEX IF NOT EXISTS idx_drivers_availability_status ON drivers(availability_status);
CREATE INDEX IF NOT EXISTS idx_drivers_work_status ON drivers(work_status);

COMMENT ON TABLE drivers IS 'Chauffeurs pour les missions';

-- ============================================================================
-- 5. VEHICLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    color VARCHAR(50),
    passenger_capacity INTEGER,
    luggage_capacity INTEGER,
    engagement_number VARCHAR(100),
    registration_number VARCHAR(50),
    fuel_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'available'
      CHECK (status IN ('available', 'assigned', 'maintenance', 'unavailable')),
    supplier VARCHAR(255),
    additional_equipment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_event_id ON vehicles(event_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(type);

COMMENT ON TABLE vehicles IS 'Véhicules disponibles par événement';

-- ============================================================================
-- 6. MISSIONS (dépend de travels, drivers, vehicles, bases)
-- ============================================================================
CREATE TABLE IF NOT EXISTS missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    travel_id UUID REFERENCES travels(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    base_id UUID REFERENCES bases(id) ON DELETE SET NULL,
    artist_id UUID REFERENCES artists(id),
    contact_id UUID REFERENCES crm_contacts(id),
    
    pickup_location TEXT NOT NULL,
    pickup_latitude DECIMAL(10, 8),
    pickup_longitude DECIMAL(11, 8),
    pickup_datetime TIMESTAMPTZ NOT NULL,
    
    dropoff_location TEXT NOT NULL,
    dropoff_latitude DECIMAL(10, 8),
    dropoff_longitude DECIMAL(11, 8),
    dropoff_datetime TIMESTAMPTZ,
    
    passenger_count INTEGER NOT NULL DEFAULT 1,
    luggage_count INTEGER DEFAULT 0,
    
    status VARCHAR(50) DEFAULT 'unplanned' 
      CHECK (status IN ('unplanned', 'draft', 'planned', 'dispatched')),
    
    notes TEXT,
    estimated_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(travel_id)
);

CREATE INDEX IF NOT EXISTS idx_missions_event_id ON missions(event_id);
CREATE INDEX IF NOT EXISTS idx_missions_travel_id ON missions(travel_id);
CREATE INDEX IF NOT EXISTS idx_missions_driver_id ON missions(driver_id);
CREATE INDEX IF NOT EXISTS idx_missions_vehicle_id ON missions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_missions_artist_id ON missions(artist_id);
CREATE INDEX IF NOT EXISTS idx_missions_contact_id ON missions(contact_id);
CREATE INDEX IF NOT EXISTS idx_missions_pickup_datetime ON missions(pickup_datetime);
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);

COMMENT ON TABLE missions IS 'Missions de transport (générées depuis travels ou manuelles)';
COMMENT ON COLUMN missions.travel_id IS 'Référence au travel source (optionnel)';
COMMENT ON COLUMN missions.status IS 'unplanned → draft → planned → dispatched';

-- ============================================================================
-- 7. STAFF_ASSIGNMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS staff_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'driver',
    status VARCHAR(50) DEFAULT 'confirmed',
    assigned_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(driver_id, event_id, role)
);

CREATE INDEX IF NOT EXISTS idx_staff_assignments_driver_id ON staff_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_event_id ON staff_assignments(event_id);

COMMENT ON TABLE staff_assignments IS 'Assignations chauffeurs aux événements';

-- ============================================================================
-- 8. VEHICLE_CHECK_LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS vehicle_check_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('RECEPTION', 'RETURN')),
    date DATE NOT NULL,
    kilometers INTEGER NOT NULL,
    defects TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_check_logs_vehicle_id ON vehicle_check_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_check_logs_type ON vehicle_check_logs(type);

COMMENT ON TABLE vehicle_check_logs IS 'Logs de vérification véhicules (réception/retour)';

-- ============================================================================
-- 9. SHIFTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    color VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shifts_event_id ON shifts(event_id);
CREATE INDEX IF NOT EXISTS idx_shifts_start_datetime ON shifts(start_datetime);

COMMENT ON TABLE shifts IS 'Créneaux horaires de travail';

-- ============================================================================
-- 10. SHIFT_DRIVERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS shift_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shift_id, driver_id)
);

CREATE INDEX IF NOT EXISTS idx_shift_drivers_shift_id ON shift_drivers(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_drivers_driver_id ON shift_drivers(driver_id);

COMMENT ON TABLE shift_drivers IS 'Association chauffeurs ↔ créneaux horaires';

-- ============================================================================
-- 11. HOTELS
-- ============================================================================
CREATE TABLE IF NOT EXISTS hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500),
    city VARCHAR(100),
    country VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    stars INTEGER CHECK (stars >= 0 AND stars <= 5),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotels_city ON hotels(city);
CREATE INDEX IF NOT EXISTS idx_hotels_is_active ON hotels(is_active);

COMMENT ON TABLE hotels IS 'Base de données hôtels';

-- ============================================================================
-- 12. HOTEL_ROOM_TYPES
-- ============================================================================
CREATE TABLE IF NOT EXISTS hotel_room_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    price_per_night DECIMAL(10,2),
    capacity INTEGER,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotel_room_types_hotel_id ON hotel_room_types(hotel_id);

COMMENT ON TABLE hotel_room_types IS 'Types de chambres par hôtel';

-- ============================================================================
-- 13. HOTEL_RESERVATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS hotel_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    hotel_id UUID REFERENCES hotels(id),
    artist_id UUID REFERENCES artists(id),
    contact_id UUID REFERENCES crm_contacts(id),
    room_type_id UUID REFERENCES hotel_room_types(id),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    number_of_rooms INTEGER DEFAULT 1,
    number_of_guests INTEGER DEFAULT 1,
    total_price DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending'
      CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    notes TEXT,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (artist_id IS NOT NULL OR contact_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_hotel_reservations_event_id ON hotel_reservations(event_id);
CREATE INDEX IF NOT EXISTS idx_hotel_reservations_hotel_id ON hotel_reservations(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_reservations_artist_id ON hotel_reservations(artist_id);
CREATE INDEX IF NOT EXISTS idx_hotel_reservations_contact_id ON hotel_reservations(contact_id);
CREATE INDEX IF NOT EXISTS idx_hotel_reservations_status ON hotel_reservations(status);

COMMENT ON TABLE hotel_reservations IS 'Réservations hôtels par événement';

-- ============================================================================
-- 14. CATERING_REQUIREMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS catering_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    meal_type VARCHAR(50) NOT NULL
      CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'drinks')),
    count INTEGER DEFAULT 1,
    special_diet TEXT[],
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catering_requirements_event_id ON catering_requirements(event_id);
CREATE INDEX IF NOT EXISTS idx_catering_requirements_artist_id ON catering_requirements(artist_id);
CREATE INDEX IF NOT EXISTS idx_catering_requirements_meal_type ON catering_requirements(meal_type);

COMMENT ON TABLE catering_requirements IS 'Besoins catering par artiste';

-- ============================================================================
-- 15. CATERING_VOUCHERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS catering_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    code VARCHAR(100) UNIQUE NOT NULL,
    artist_id UUID REFERENCES artists(id),
    contact_id UUID REFERENCES crm_contacts(id),
    meal_type VARCHAR(50),
    value DECIMAL(10,2),
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMPTZ,
    scanned_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catering_vouchers_event_id ON catering_vouchers(event_id);
CREATE INDEX IF NOT EXISTS idx_catering_vouchers_code ON catering_vouchers(code);
CREATE INDEX IF NOT EXISTS idx_catering_vouchers_artist_id ON catering_vouchers(artist_id);
CREATE INDEX IF NOT EXISTS idx_catering_vouchers_is_used ON catering_vouchers(is_used);

COMMENT ON TABLE catering_vouchers IS 'Bons catering avec QR codes';

-- ============================================================================
-- 16. PARTY_CREW
-- ============================================================================
CREATE TABLE IF NOT EXISTS party_crew (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    hourly_rate DECIMAL(10,2),
    currency VARCHAR(10) DEFAULT 'CHF',
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_party_crew_last_name ON party_crew(last_name);
CREATE INDEX IF NOT EXISTS idx_party_crew_role ON party_crew(role);
CREATE INDEX IF NOT EXISTS idx_party_crew_is_active ON party_crew(is_active);

COMMENT ON TABLE party_crew IS 'Équipe événementielle (party crew)';

-- ============================================================================
-- TRIGGERS update_updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Appliquer triggers à toutes les tables avec updated_at
DROP TRIGGER IF EXISTS update_artist_touring_party_updated_at ON artist_touring_party;
CREATE TRIGGER update_artist_touring_party_updated_at 
  BEFORE UPDATE ON artist_touring_party 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_travels_updated_at ON travels;
CREATE TRIGGER update_travels_updated_at 
  BEFORE UPDATE ON travels 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_missions_updated_at ON missions;
CREATE TRIGGER update_missions_updated_at 
  BEFORE UPDATE ON missions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
CREATE TRIGGER update_drivers_updated_at 
  BEFORE UPDATE ON drivers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at 
  BEFORE UPDATE ON vehicles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shifts_updated_at ON shifts;
CREATE TRIGGER update_shifts_updated_at 
  BEFORE UPDATE ON shifts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hotels_updated_at ON hotels;
CREATE TRIGGER update_hotels_updated_at 
  BEFORE UPDATE ON hotels 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hotel_reservations_updated_at ON hotel_reservations;
CREATE TRIGGER update_hotel_reservations_updated_at 
  BEFORE UPDATE ON hotel_reservations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_catering_requirements_updated_at ON catering_requirements;
CREATE TRIGGER update_catering_requirements_updated_at 
  BEFORE UPDATE ON catering_requirements 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_party_crew_updated_at ON party_crew;
CREATE TRIGGER update_party_crew_updated_at 
  BEFORE UPDATE ON party_crew 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FONCTIONS SQL
-- ============================================================================

-- Fonction : Récupérer touring party par événement avec infos artistes
CREATE OR REPLACE FUNCTION get_artist_touring_party_by_event(event_id_param UUID)
RETURNS TABLE(
    id UUID,
    artist_id UUID,
    artist_name TEXT,
    group_size INTEGER,
    vehicles JSONB,
    notes TEXT,
    special_requirements TEXT,
    status VARCHAR(50),
    performance_date DATE,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        atp.id,
        atp.artist_id,
        a.name::TEXT as artist_name,
        atp.group_size,
        atp.vehicles,
        atp.notes,
        atp.special_requirements,
        atp.status,
        atp.performance_date,
        atp.created_at,
        atp.updated_at
    FROM artist_touring_party atp
    JOIN artists a ON atp.artist_id = a.id
    WHERE atp.event_id = event_id_param
    ORDER BY atp.performance_date, a.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_artist_touring_party_by_event IS 'Récupère le touring party complet pour un événement';

-- ============================================================================
-- RLS POLICIES (authentification Supabase)
-- ============================================================================

-- Artist Touring Party
ALTER TABLE artist_touring_party ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated" ON artist_touring_party;
CREATE POLICY "Allow all authenticated" ON artist_touring_party 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Travels
ALTER TABLE travels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated" ON travels;
CREATE POLICY "Allow all authenticated" ON travels 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Bases
ALTER TABLE bases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated" ON bases;
CREATE POLICY "Allow all authenticated" ON bases 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Missions
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated" ON missions;
CREATE POLICY "Allow all authenticated" ON missions 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Drivers
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated" ON drivers;
CREATE POLICY "Allow all authenticated" ON drivers 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Vehicles
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated" ON vehicles;
CREATE POLICY "Allow all authenticated" ON vehicles 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Staff Assignments
ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated" ON staff_assignments;
CREATE POLICY "Allow all authenticated" ON staff_assignments 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Vehicle Check Logs
ALTER TABLE vehicle_check_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated" ON vehicle_check_logs;
CREATE POLICY "Allow all authenticated" ON vehicle_check_logs 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Shifts
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated" ON shifts;
CREATE POLICY "Allow all authenticated" ON shifts 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Shift Drivers
ALTER TABLE shift_drivers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated" ON shift_drivers;
CREATE POLICY "Allow all authenticated" ON shift_drivers 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Hotels
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated" ON hotels;
CREATE POLICY "Allow all authenticated" ON hotels 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Hotel Room Types
ALTER TABLE hotel_room_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated" ON hotel_room_types;
CREATE POLICY "Allow all authenticated" ON hotel_room_types 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Hotel Reservations
ALTER TABLE hotel_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated" ON hotel_reservations;
CREATE POLICY "Allow all authenticated" ON hotel_reservations 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Catering Requirements
ALTER TABLE catering_requirements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated" ON catering_requirements;
CREATE POLICY "Allow all authenticated" ON catering_requirements 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Catering Vouchers
ALTER TABLE catering_vouchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated" ON catering_vouchers;
CREATE POLICY "Allow all authenticated" ON catering_vouchers 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Party Crew
ALTER TABLE party_crew ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated" ON party_crew;
CREATE POLICY "Allow all authenticated" ON party_crew 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================

