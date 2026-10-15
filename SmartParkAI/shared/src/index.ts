/**
 * SmartPark AI - Shared Contracts, Schemas, & Types
 */

// Brand Palette
export const BRAND_COLORS = {
  primaryBlue: '#0878E8',
  deepNavy: '#071D42',
  secondaryBlue: '#0055B8',
  green: '#39D353',
  white: '#FFFFFF',
  background: '#F4F8FF',
  secondaryText: '#68758A',
  borders: '#DFE8F4',
  errorRed: '#E53E3E',
  warningAmber: '#DD6B20',
  surfaceCard: '#FFFFFF',
} as const;

export type UserRole = 'user' | 'operator' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  defaultVehiclePlate?: string;
  companyName?: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  userId: string;
  licensePlate: string;
  make: string;
  model: string;
  color: string;
  isEv: boolean;
  isAccessible: boolean;
  isDefault: boolean;
  createdAt?: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ITPark {
  id: string;
  name: string;
  slug: string;
  code: string;
  address: string;
  city: string;
  location: Coordinates;
  facilitiesCount?: number;
  totalCapacity?: number;
  availableSpaces?: number;
}

export interface ParkingFacility {
  id: string;
  itParkId: string;
  name: string;
  code: string;
  buildingName: string;
  levels: number;
  totalCapacity: number;
  availableCapacity: number;
  hasEvCharging: boolean;
  hasAccessibleParking: boolean;
  location: Coordinates;
  operatingHours: {
    open: string;
    close: string;
    is24x7: boolean;
  };
}

export type SlotType = 'standard' | 'ev' | 'accessible' | 'compact' | 'visitor';
export type SlotStatus = 'available' | 'occupied' | 'reserved' | 'maintenance';

export interface ParkingSlot {
  id: string;
  zoneId: string;
  facilityId: string;
  slotNumber: string;
  level: number;
  type: SlotType;
  status: SlotStatus;
  currentVehiclePlate?: string;
}

export interface ParkingZone {
  id: string;
  facilityId: string;
  name: string;
  code: string;
  level: number;
  totalSpaces: number;
  availableSpaces: number;
  reservedSpaces: number;
  occupiedSpaces: number;
  evSpaces: number;
  accessibleSpaces: number;
  pricePerHour: number;
  currentOccupancyRate: number;
  predictedOccupancyRate?: number;
}

export type ReservationStatus = 'active' | 'completed' | 'cancelled' | 'expired';

export interface Reservation {
  id: string;
  bookingReference: string;
  userId: string;
  facilityId: string;
  zoneId: string;
  slotId?: string;
  slotNumber?: string;
  licensePlate: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  estimatedPrice: number;
  createdAt: string;
  qrCodeToken?: string;
}

export type SessionStatus = 'active' | 'completed';

export interface ParkingSession {
  id: string;
  reservationId?: string;
  userId: string;
  facilityId: string;
  zoneId: string;
  slotId?: string;
  slotNumber?: string;
  licensePlate: string;
  entryTime: string;
  exitTime?: string;
  durationMinutes?: number;
  status: SessionStatus;
  totalCost?: number;
}

export interface PredictionRequest {
  zoneId: string;
  hour?: number;
  dayOfWeek?: number;
  currentOccupancy?: number;
  horizonMinutes?: number;
}

export interface PredictionResponse {
  zoneId: string;
  predictionHorizonMinutes: number;
  predictedOccupancyPercentage: number;
  estimatedAvailableSpaces: number;
  timestamp: string;
  modelVersion: string;
  dataFreshness: 'realtime' | 'synthetic_baseline' | 'fallback_heuristic';
  confidenceScore: number;
}

export interface RealtimeOccupancyPayload {
  facilityId: string;
  zoneId: string;
  totalSpaces: number;
  availableSpaces: number;
  occupiedSpaces: number;
  occupancyPercentage: number;
  timestamp: string;
}

export interface ServiceHealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  service: string;
  version: string;
  uptimeSeconds: number;
  database?: {
    connected: boolean;
    name?: string;
  };
  mlService?: {
    reachable: boolean;
    modelLoaded: boolean;
  };
  timestamp: string;
}

export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  OCCUPANCY_CHANGED: 'occupancy:changed',
  SLOT_STATUS_CHANGED: 'slot:status_changed',
  RESERVATION_CREATED: 'reservation:created',
  RESERVATION_CANCELLED: 'reservation:cancelled',
  SESSION_STARTED: 'session:started',
  SESSION_ENDED: 'session:ended',
  ADMIN_ALERT: 'admin:alert',
  SUBSCRIBE_FACILITY: 'facility:subscribe',
  UNSUBSCRIBE_FACILITY: 'facility:unsubscribe',
} as const;
