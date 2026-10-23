import { Seal, Trip, AuditLogEntry, AuthorizedUser, LocationRecord } from './types';

// System Locations: Configurable and governed exclusively by the Superuser
export const DEFAULT_LOCATIONS: LocationRecord[] = [
  {
    id: 'LOC-LAX',
    code: 'LAX',
    name: 'Los Angeles International Gateway',
    address: '5800 W Century Blvd, Los Angeles, CA 90045',
    notes: 'Primary West Coast Cargo Terminal'
  },
  {
    id: 'LOC-SFO',
    code: 'SFO',
    name: 'San Francisco International Hub',
    address: '706 S Airport Blvd, South San Francisco, CA 94080',
    notes: 'Northern California Air Cargo Terminal'
  },
  {
    id: 'LOC-PHX',
    code: 'PHX',
    name: 'Phoenix Sky Harbor Freight Terminal',
    address: '3200 E Sky Harbor Blvd, Phoenix, AZ 85034',
    notes: 'Southwest Logistics Hub'
  }
];

export const LOCATIONS = ['LAX', 'SFO', 'PHX'] as const;
export const INITIAL_DESTINATIONS = ['LAX', 'SFO', 'PHX'];

// Production state: No mock or demo seals
export const INITIAL_SEALS: Seal[] = [];

// Production state: No mock or demo trips
export const INITIAL_TRIPS: Trip[] = [];

// Production state: No mock or demo audit logs
export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [];

// Authorized Users Directory: Jorge Hutt (Superuser) is the sole initial authorized user.
// Superuser has global authority to enroll users and assign roles/stations.
export const INITIAL_AUTHORIZED_USERS: AuthorizedUser[] = [
  {
    id: 'USR-001',
    email: 'jorge.hutt@cnwglobal.com',
    displayName: 'Jorge Hutt',
    role: 'SUPERUSER',
    station: 'ALL',
    status: 'ACTIVE',
    enrolledAt: '2026-10-01 08:00',
    enrolledBy: 'System Primary Superuser',
    notes: 'Primary Superuser: global multi-facility oversight, user enrollment, role assignments, and audit governance.'
  }
];
