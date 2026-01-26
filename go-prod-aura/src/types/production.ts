// ============================================================================
// TYPES TYPESCRIPT - MODULE PRODUCTION
// Date : 14 novembre 2025
// Description : Types pour les 16 tables du module Production
// ============================================================================

// ============================================================================
// TOURING PARTY
// ============================================================================

export interface VehicleCount {
  type: 'CAR' | 'VAN' | 'VAN_TRAILER' | 'TOURBUS' | 'TOURBUS_TRAILER' | 'TRUCK' | 'TRUCK_TRAILER' | 'SEMI_TRAILER';
  count: number;
}

export interface ArtistTouringParty {
  id: string;
  event_id: string;
  artist_id: string;
  group_size: number;
  vehicles: VehicleCount[];
  notes?: string;
  special_requirements?: string;
  status: 'todo' | 'incomplete' | 'completed';
  performance_date?: string; // DATE format
  created_at: string;
  updated_at: string;
}

export interface ArtistTouringPartyWithArtist extends ArtistTouringParty {
  artist_name: string;
}

export interface ArtistTouringPartyWithDay extends ArtistTouringPartyWithArtist {
  day_name?: string;
}

// ============================================================================
// TRAVELS
// ============================================================================

export type TravelType = 
  | 'PLANE' 
  | 'TRAIN' 
  | 'CAR' 
  | 'VAN' 
  | 'VAN_TRAILER' 
  | 'TOURBUS' 
  | 'TOURBUS_TRAILER' 
  | 'TRUCK' 
  | 'TRUCK_TRAILER' 
  | 'SEMI_TRAILER';

export interface Travel {
  id: string;
  event_id: string;
  artist_id?: string;
  contact_id?: string;
  is_arrival: boolean;
  travel_type: TravelType;
  scheduled_datetime: string; // TIMESTAMPTZ
  actual_datetime?: string; // TIMESTAMPTZ
  departure_location?: string;
  arrival_location?: string;
  reference_number?: string;
  passenger_count: number;
  notes?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TravelWithRelations extends Travel {
  artist_name?: string;
  contact_name?: string;
}

// ============================================================================
// BASES
// ============================================================================

export interface Base {
  id: string;
  name: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
  created_at: string;
}

// ============================================================================
// MISSIONS
// ============================================================================

export type MissionStatus = 'unplanned' | 'draft' | 'planned' | 'dispatched';

export interface Mission {
  id: string;
  event_id: string;
  travel_id?: string;
  driver_id?: string;
  vehicle_id?: string;
  base_id?: string;
  artist_id?: string;
  contact_id?: string;
  
  pickup_location: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  pickup_datetime: string; // TIMESTAMPTZ
  
  dropoff_location: string;
  dropoff_latitude?: number;
  dropoff_longitude?: number;
  dropoff_datetime?: string; // TIMESTAMPTZ
  
  passenger_count: number;
  luggage_count: number;
  
  status: MissionStatus;
  
  notes?: string;
  estimated_duration_minutes?: number;
  actual_duration_minutes?: number;
  
  created_at: string;
  updated_at: string;
}

export interface MissionWithRelations extends Mission {
  artist_name?: string;
  contact_name?: string;
  driver_name?: string;
  vehicle_name?: string;
  travel_reference?: string;
}

// ============================================================================
// DRIVERS
// ============================================================================

export type DriverAvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'OFF';
export type DriverWorkStatus = 'ACTIVE' | 'INACTIVE' | 'SEASONAL';

export interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  street?: string;
  postal_code?: string;
  city?: string;
  email?: string;
  phone?: string;
  birth_date?: string; // DATE
  languages?: string[];
  t_shirt_size: string;
  hired_year: number;
  permits?: string[];
  notes?: string;
  photo_url?: string;
  availability_status: DriverAvailabilityStatus;
  work_status: DriverWorkStatus;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// STAFF ASSIGNMENTS
// ============================================================================

export interface StaffAssignment {
  id: string;
  driver_id: string;
  event_id: string;
  role: string;
  status: string;
  assigned_date?: string; // DATE
  notes?: string;
  created_at: string;
}

// ============================================================================
// VEHICLES
// ============================================================================

export type VehicleStatus = 'available' | 'assigned' | 'maintenance' | 'unavailable';

export interface Vehicle {
  id: string;
  event_id: string;
  brand: string;
  model: string;
  type: string;
  color?: string;
  passenger_capacity?: number;
  luggage_capacity?: number;
  engagement_number?: string;
  registration_number?: string;
  fuel_type?: string;
  status: VehicleStatus;
  supplier?: string;
  additional_equipment?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// VEHICLE CHECK LOGS
// ============================================================================

export type VehicleCheckType = 'RECEPTION' | 'RETURN';

export interface VehicleCheckLog {
  id: string;
  vehicle_id: string;
  type: VehicleCheckType;
  date: string; // DATE
  kilometers: number;
  defects?: string;
  notes?: string;
  created_at: string;
}

// ============================================================================
// SHIFTS
// ============================================================================

export interface Shift {
  id: string;
  event_id: string;
  name: string;
  start_datetime: string; // TIMESTAMPTZ
  end_datetime: string; // TIMESTAMPTZ
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface ShiftDriver {
  id: string;
  shift_id: string;
  driver_id: string;
  created_at: string;
}

export interface ShiftWithDrivers extends Shift {
  drivers: Driver[];
}

// ============================================================================
// HOTELS
// ============================================================================

export interface Hotel {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  stars?: number; // 0-5
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface HotelRoomType {
  id: string;
  hotel_id: string;
  category: string;
  price_per_night?: number;
  capacity?: number;
  description?: string;
  created_at: string;
}

export type HotelReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface HotelReservation {
  id: string;
  event_id: string;
  hotel_id?: string;
  artist_id?: string;
  contact_id?: string;
  room_type_id?: string;
  check_in_date: string; // DATE
  check_out_date: string; // DATE
  number_of_rooms: number;
  number_of_guests: number;
  total_price?: number;
  status: HotelReservationStatus;
  notes?: string;
  confirmed_at?: string; // TIMESTAMPTZ
  created_at: string;
  updated_at: string;
}

export interface HotelReservationWithRelations extends HotelReservation {
  hotel_name?: string;
  artist_name?: string;
  contact_name?: string;
  room_category?: string;
}

// ============================================================================
// CATERING
// ============================================================================

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drinks';

export interface CateringRequirement {
  id: string;
  event_id: string;
  artist_id: string;
  meal_type: MealType;
  count: number;
  special_diet?: string[];
  notes?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CateringRequirementWithArtist extends CateringRequirement {
  artist_name: string;
}

export interface CateringVoucher {
  id: string;
  event_id: string;
  code: string; // UNIQUE
  artist_id?: string;
  contact_id?: string;
  meal_type?: string;
  value?: number;
  is_used: boolean;
  used_at?: string; // TIMESTAMPTZ
  scanned_by?: string;
  created_at: string;
}

export interface CateringVoucherWithRelations extends CateringVoucher {
  artist_name?: string;
  contact_name?: string;
}

// ============================================================================
// PARTY CREW
// ============================================================================

export interface PartyCrew {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  email?: string;
  phone?: string;
  hourly_rate?: number;
  currency: string; // Default 'CHF'
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// HELPERS & UTILITIES
// ============================================================================

export interface GeocodingResult {
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  importance?: number;
}

export interface RoutingResult {
  duration: number; // minutes
  distance: number; // km
}

export interface NominatimResponse {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    city?: string;
    postcode?: string;
    country?: string;
  };
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface TouringPartyFormData {
  group_size: number;
  vehicles: VehicleCount[];
  notes?: string;
  special_requirements?: string;
}

export interface TravelFormData {
  travel_type: TravelType;
  artist_id?: string;
  contact_id?: string;
  is_arrival: boolean;
  scheduled_datetime: string;
  departure_location?: string;
  arrival_location?: string;
  reference_number?: string;
  passenger_count: number;
  notes?: string;
}

export interface MissionFormData {
  travel_id?: string;
  artist_id?: string;
  contact_id?: string;
  pickup_location: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  pickup_datetime: string;
  dropoff_location: string;
  dropoff_latitude?: number;
  dropoff_longitude?: number;
  dropoff_datetime?: string;
  passenger_count: number;
  luggage_count: number;
  notes?: string;
}

export interface DriverFormData {
  first_name: string;
  last_name: string;
  street?: string;
  postal_code?: string;
  city?: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  languages?: string[];
  t_shirt_size: string;
  hired_year: number;
  permits?: string[];
  notes?: string;
  availability_status: DriverAvailabilityStatus;
  work_status: DriverWorkStatus;
}

export interface VehicleFormData {
  brand: string;
  model: string;
  type: string;
  color?: string;
  passenger_capacity?: number;
  luggage_capacity?: number;
  engagement_number?: string;
  registration_number?: string;
  fuel_type?: string;
  supplier?: string;
  additional_equipment?: string;
}

export interface HotelReservationFormData {
  hotel_id?: string;
  artist_id?: string;
  contact_id?: string;
  room_type_id?: string;
  check_in_date: string;
  check_out_date: string;
  number_of_rooms: number;
  number_of_guests: number;
  total_price?: number;
  notes?: string;
}

// ============================================================================
// STATISTICS & AGGREGATES
// ============================================================================

export interface TouringPartyStats {
  total_persons: number;
  total_vehicles: number;
  completed_count: number;
  incomplete_count: number;
  todo_count: number;
  artists_count: number;
}

export interface MissionStats {
  unplanned: number;
  draft: number;
  planned: number;
  dispatched: number;
  total: number;
}

export interface CateringStats {
  total_meals: number;
  by_type: Record<MealType, number>;
  total_vouchers: number;
  used_vouchers: number;
}

