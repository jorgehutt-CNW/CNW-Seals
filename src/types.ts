export type SealStatus = 
  | 'AVAILABLE' 
  | 'IN_TRANSIT_OUTBOUND' 
  | 'PENDING_RETURN_TRANSIT' 
  | 'DISPOSED';

export type UserRole = 'SUPERUSER' | 'ADMIN' | 'OPERATOR';

export interface Seal {
  sealNumber: string;
  status: SealStatus;
  purchaseDate: string;
  boxRef: string;
  notes?: string;
  location: string; // Current inventory location (e.g., 'LAX', 'SFO', 'PHX')
  // Associated trip/transit data
  currentTripId?: string;
  currentTripOrigin?: string; // Origin location where the trip departed
  currentTripDestination?: string;
  // Disposal data
  disposedAt?: string;
  disposalReason?: string;
  disposedBy?: string;
  // Return transit data
  returnTripId?: string;
  returnOriginLocation?: string; // The origin branch this spare seal must return to
  returnOriginatingDestination?: string; // The destination station where the container was unpacked
  returnArrivalDate?: string;
  returnTrackingNumber?: string; // Courier tracking / waybill number (e.g. FedEx, UPS, AWB)
  returnSentDate?: string; // Date operator dispatched/sent the seals back
  returnSentBy?: string; // Operator who dispatched the return
  returnCarrier?: string; // Courier name (e.g. FedEx, UPS, DHL, Internal Courier)
}

export type TripStatus = 'IN_TRANSIT' | 'COMPLETED_STANDARD' | 'COMPLETED_INSPECTION_SWAP' | 'ROLLED_BACK';

export interface Trip {
  id: string;
  dispatchDate: string;
  originLocation: string; // Origin location from which the trip was dispatched (e.g., 'LAX')
  destination: string; // Destination location (e.g., 'SFO', 'PHX')
  hawbs: string[];
  containerOrTruckId: string;
  primarySealNumber: string;
  extraSealNumber: string;
  notes?: string;
  status: TripStatus;
  // Verification data
  verifiedAt?: string;
  verifiedBy?: string;
  arrivedDoorSealNumber?: string;
  inspectionReason?: string;
  disposalNotes?: string;
  // Superuser Rollback data
  rolledBackAt?: string;
  rolledBackBy?: string;
  rollbackReason?: string;
}

export type AuditEventType = 
  | 'BULK_PURCHASE_REGISTERED'
  | 'SINGLE_SEAL_ADDED'
  | 'SEAL_EDITED'
  | 'SEAL_DELETED'
  | 'TRIP_DISPATCHED'
  | 'TRIP_DISPATCH_ROLLED_BACK'
  | 'ARRIVAL_VERIFIED_STANDARD'
  | 'ARRIVAL_VERIFIED_INSPECTION_SWAP'
  | 'RETURN_DISPATCHED_TO_ORIGIN'
  | 'EXTRA_SEAL_RETURN_RECEIVED'
  | 'SEAL_DISPOSED'
  | 'USER_ENROLLED'
  | 'USER_ROLE_ASSIGNED'
  | 'USER_EDITED'
  | 'USER_ACCESS_REVOKED'
  | 'USER_ACCESS_RESTORED'
  | 'USER_REMOVED'
  | 'UNAUTHORIZED_LOGIN_BLOCKED'
  | 'LOCATION_CREATED'
  | 'LOCATION_UPDATED'
  | 'LOCATION_DELETED';

export interface LocationRecord {
  id: string;
  code: string; // e.g. 'LAX' (unique, uppercase)
  name: string; // e.g. 'Los Angeles International Gateway'
  address?: string;
  notes?: string;
}

export interface AuthorizedUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  station: string; // 'ALL', 'LAX', 'SFO', 'PHX', etc.
  status: 'ACTIVE' | 'REVOKED';
  enrolledAt: string;
  enrolledBy: string;
  notes?: string;
}

export interface AccessRequest {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  actor: string;
  sealNumbers: string[];
  tripId?: string;
  originLocation?: string;
  destination?: string;
  location?: string;
  trackingNumber?: string;
  carrier?: string;
  targetUserEmail?: string;
  targetUserRole?: UserRole;
  summary: string;
  details?: string;
}

