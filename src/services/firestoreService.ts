import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  getDocs, 
  onSnapshot, 
  writeBatch,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Seal, Trip, LocationRecord, AuthorizedUser, AccessRequest, AuditLogEntry } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Standard error handler conforming strictly to Firestore integration specifications
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('[Firestore Error]', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Collection names in Firebase (default) database
export const COLLECTIONS = {
  SEALS: 'seals',
  TRIPS: 'trips',
  LOCATIONS: 'locations',
  USERS: 'users',
  ACCESS_REQUESTS: 'accessRequests',
  AUDIT_LOGS: 'auditLogs'
} as const;

/**
 * Recursively cleans an object for Firestore by omitting any keys whose value is undefined,
 * preventing FirebaseError: "Unsupported field value: undefined".
 */
export function cleanForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => (typeof item === 'object' && item !== null && !(item instanceof Date) ? cleanForFirestore(item) : item)) as any;
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[key] = cleanForFirestore(value);
    } else if (Array.isArray(value)) {
      result[key] = value
        .filter(item => item !== undefined)
        .map(item => (typeof item === 'object' && item !== null && !(item instanceof Date) ? cleanForFirestore(item) : item));
    } else {
      result[key] = value;
    }
  }
  return result;
}

// --- SEALS INVENTORY ---

export async function saveSealToFirestore(seal: Seal): Promise<void> {
  const path = `${COLLECTIONS.SEALS}/${seal.sealNumber}`;
  try {
    const sealRef = doc(db, COLLECTIONS.SEALS, seal.sealNumber);
    const cleaned = cleanForFirestore(seal);
    await setDoc(sealRef, cleaned);
    console.log(`[Firestore] Successfully saved seal #${seal.sealNumber} -> status: ${seal.status}, location: ${seal.location}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveBatchSealsToFirestore(seals: Seal[]): Promise<void> {
  if (seals.length === 0) return;
  const path = COLLECTIONS.SEALS;
  try {
    // Firestore batches allow up to 500 operations per batch
    const batchSize = 450;
    for (let i = 0; i < seals.length; i += batchSize) {
      const chunk = seals.slice(i, i + batchSize);
      const batch = writeBatch(db);
      for (const seal of chunk) {
        const sealRef = doc(db, COLLECTIONS.SEALS, seal.sealNumber);
        batch.set(sealRef, cleanForFirestore(seal));
      }
      await batch.commit();
    }
    console.log(`[Firestore] Successfully batch-saved ${seals.length} seals`);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteSealFromFirestore(sealNumber: string): Promise<void> {
  const path = `${COLLECTIONS.SEALS}/${sealNumber}`;
  try {
    const sealRef = doc(db, COLLECTIONS.SEALS, sealNumber);
    await deleteDoc(sealRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- TRIPS ---

export async function saveTripToFirestore(trip: Trip): Promise<void> {
  const path = `${COLLECTIONS.TRIPS}/${trip.id}`;
  try {
    const tripRef = doc(db, COLLECTIONS.TRIPS, trip.id);
    const cleaned = cleanForFirestore(trip);
    await setDoc(tripRef, cleaned);
    console.log(`[Firestore] Successfully saved trip ${trip.id} -> status: ${trip.status}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// --- LOCATIONS ---

export async function saveLocationToFirestore(location: LocationRecord): Promise<void> {
  const path = `${COLLECTIONS.LOCATIONS}/${location.id}`;
  try {
    const locRef = doc(db, COLLECTIONS.LOCATIONS, location.id);
    await setDoc(locRef, cleanForFirestore(location));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveBatchLocationsToFirestore(locations: LocationRecord[]): Promise<void> {
  if (locations.length === 0) return;
  const path = COLLECTIONS.LOCATIONS;
  try {
    const batch = writeBatch(db);
    for (const loc of locations) {
      const locRef = doc(db, COLLECTIONS.LOCATIONS, loc.id);
      batch.set(locRef, cleanForFirestore(loc));
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteLocationFromFirestore(locationId: string): Promise<void> {
  const path = `${COLLECTIONS.LOCATIONS}/${locationId}`;
  try {
    const locRef = doc(db, COLLECTIONS.LOCATIONS, locationId);
    await deleteDoc(locRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- USERS DIRECTORY (Single canonical 'users' collection) ---

export async function saveUserToFirestore(user: AuthorizedUser): Promise<void> {
  const path = `${COLLECTIONS.USERS}/${user.id}`;
  try {
    const userRef = doc(db, COLLECTIONS.USERS, user.id);
    await setDoc(userRef, cleanForFirestore(user));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveBatchUsersToFirestore(users: AuthorizedUser[]): Promise<void> {
  if (users.length === 0) return;
  const path = COLLECTIONS.USERS;
  try {
    const batch = writeBatch(db);
    for (const user of users) {
      const userRef = doc(db, COLLECTIONS.USERS, user.id);
      batch.set(userRef, cleanForFirestore(user));
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteUserFromFirestore(userId: string): Promise<void> {
  const path = `${COLLECTIONS.USERS}/${userId}`;
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await deleteDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Persists all users and system locations into the Firestore database (default)
 */
export async function recordUsersAndLocationsToFirestore(
  users: AuthorizedUser[],
  locations: LocationRecord[]
): Promise<{ usersSaved: number; locationsSaved: number }> {
  await Promise.all([
    saveBatchUsersToFirestore(users),
    saveBatchLocationsToFirestore(locations)
  ]);
  return {
    usersSaved: users.length,
    locationsSaved: locations.length
  };
}

// --- ACCESS REQUESTS ---

export async function saveAccessRequestToFirestore(request: AccessRequest): Promise<void> {
  const path = `${COLLECTIONS.ACCESS_REQUESTS}/${request.id}`;
  try {
    const reqRef = doc(db, COLLECTIONS.ACCESS_REQUESTS, request.id);
    await setDoc(reqRef, cleanForFirestore(request));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateAccessRequestStatusInFirestore(requestId: string, status: 'APPROVED' | 'REJECTED'): Promise<void> {
  const path = `${COLLECTIONS.ACCESS_REQUESTS}/${requestId}`;
  try {
    const reqRef = doc(db, COLLECTIONS.ACCESS_REQUESTS, requestId);
    await updateDoc(reqRef, { status });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// --- AUDIT LOGS ---

export async function saveAuditLogToFirestore(log: AuditLogEntry): Promise<void> {
  const path = `${COLLECTIONS.AUDIT_LOGS}/${log.id}`;
  try {
    const logRef = doc(db, COLLECTIONS.AUDIT_LOGS, log.id);
    await setDoc(logRef, cleanForFirestore(log));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// --- REALTIME FIRESTORE SUBSCRIPTIONS ---

export interface FirestoreDataListeners {
  onSeals?: (seals: Seal[]) => void;
  onTrips?: (trips: Trip[]) => void;
  onLocations?: (locations: LocationRecord[]) => void;
  onUsers?: (users: AuthorizedUser[]) => void;
  onRequests?: (requests: AccessRequest[]) => void;
  onLogs?: (logs: AuditLogEntry[]) => void;
  onError?: (error: Error) => void;
}

/**
 * Attaches real-time listeners across all 6 collections in the CNW-Seal database
 */
export function subscribeToCNWSealDatabase(listeners: FirestoreDataListeners): () => void {
  const unsubs: (() => void)[] = [];

  // 1. Seals
  if (listeners.onSeals) {
    const unsubSeals = onSnapshot(
      collection(db, COLLECTIONS.SEALS),
      (snapshot) => {
        const data: Seal[] = snapshot.docs.map(doc => doc.data() as Seal);
        listeners.onSeals?.(data);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, COLLECTIONS.SEALS);
        } catch (e: any) {
          listeners.onError?.(e);
        }
      }
    );
    unsubs.push(unsubSeals);
  }

  // 2. Trips
  if (listeners.onTrips) {
    const unsubTrips = onSnapshot(
      collection(db, COLLECTIONS.TRIPS),
      (snapshot) => {
        const data: Trip[] = snapshot.docs.map(doc => doc.data() as Trip);
        listeners.onTrips?.(data);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, COLLECTIONS.TRIPS);
        } catch (e: any) {
          listeners.onError?.(e);
        }
      }
    );
    unsubs.push(unsubTrips);
  }

  // 3. Locations
  if (listeners.onLocations) {
    const unsubLocations = onSnapshot(
      collection(db, COLLECTIONS.LOCATIONS),
      (snapshot) => {
        const data: LocationRecord[] = [];
        const seenCodes = new Set<string>();
        snapshot.docs.forEach(doc => {
          const loc = doc.data() as LocationRecord;
          if (loc && loc.code) {
            const cleanCode = loc.code.toUpperCase().trim();
            if (!seenCodes.has(cleanCode)) {
              seenCodes.add(cleanCode);
              data.push(loc);
            }
          }
        });
        listeners.onLocations?.(data);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, COLLECTIONS.LOCATIONS);
        } catch (e: any) {
          listeners.onError?.(e);
        }
      }
    );
    unsubs.push(unsubLocations);
  }

  // 4. Users (Realtime listener to single canonical 'users' collection)
  if (listeners.onUsers) {
    const unsubUsers = onSnapshot(
      collection(db, COLLECTIONS.USERS),
      (snapshot) => {
        const usersList: AuthorizedUser[] = [];
        const seen = new Set<string>();
        snapshot.docs.forEach(docSnap => {
          const u = docSnap.data() as AuthorizedUser;
          if (u && (u.id || u.email)) {
            const key = u.id || u.email?.toLowerCase().trim();
            if (key && !seen.has(key)) {
              seen.add(key);
              usersList.push(u);
            }
          }
        });
        if (usersList.length > 0) {
          listeners.onUsers?.(usersList);
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, COLLECTIONS.USERS);
        } catch (e: any) {
          listeners.onError?.(e);
        }
      }
    );
    unsubs.push(unsubUsers);
  }

  // 5. Access Requests
  if (listeners.onRequests) {
    const unsubRequests = onSnapshot(
      collection(db, COLLECTIONS.ACCESS_REQUESTS),
      (snapshot) => {
        const data: AccessRequest[] = snapshot.docs.map(doc => doc.data() as AccessRequest);
        listeners.onRequests?.(data);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, COLLECTIONS.ACCESS_REQUESTS);
        } catch (e: any) {
          listeners.onError?.(e);
        }
      }
    );
    unsubs.push(unsubRequests);
  }

  // 6. Audit Logs
  if (listeners.onLogs) {
    const unsubLogs = onSnapshot(
      collection(db, COLLECTIONS.AUDIT_LOGS),
      (snapshot) => {
        const data: AuditLogEntry[] = snapshot.docs.map(doc => doc.data() as AuditLogEntry);
        // Sort newest first
        data.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        listeners.onLogs?.(data);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, COLLECTIONS.AUDIT_LOGS);
        } catch (e: any) {
          listeners.onError?.(e);
        }
      }
    );
    unsubs.push(unsubLogs);
  }

  return () => {
    unsubs.forEach(u => u());
  };
}

/**
 * Superuser action: Deletes all documents from specific collections in Firestore:
 * auditLogs, locations, seals, and trips.
 * Preserves users and accessRequests so user authorizations remain intact.
 */
export async function clearOperationalCollectionsFromFirestore(): Promise<{
  deletedSeals: number;
  deletedTrips: number;
  deletedAuditLogs: number;
  deletedLocations: number;
}> {
  const deleteCollectionDocs = async (collectionName: string): Promise<number> => {
    try {
      const snap = await getDocs(collection(db, collectionName));
      const count = snap.size;
      if (count === 0) return 0;

      const batchSize = 400;
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += batchSize) {
        const chunk = docs.slice(i, i + batchSize);
        const batch = writeBatch(db);
        for (const d of chunk) {
          batch.delete(d.ref);
        }
        await batch.commit();
      }

      // Check if any lingering documents remain and delete individually
      const recheckSnap = await getDocs(collection(db, collectionName));
      if (recheckSnap.size > 0) {
        for (const docItem of recheckSnap.docs) {
          await deleteDoc(docItem.ref);
        }
      }

      console.log(`[Firestore] Completely wiped collection "${collectionName}": ${count} docs`);
      return count;
    } catch (err) {
      console.error(`[Firestore] Error wiping collection "${collectionName}":`, err);
      try {
        const fallbackSnap = await getDocs(collection(db, collectionName));
        for (const d of fallbackSnap.docs) {
          await deleteDoc(d.ref);
        }
        return fallbackSnap.size;
      } catch (fallbackErr) {
        handleFirestoreError(fallbackErr, OperationType.DELETE, collectionName);
      }
      return 0;
    }
  };

  // Run wipe across all four collections in parallel
  const [deletedLocations, deletedSeals, deletedTrips, deletedAuditLogs] = await Promise.all([
    deleteCollectionDocs(COLLECTIONS.LOCATIONS),
    deleteCollectionDocs(COLLECTIONS.SEALS),
    deleteCollectionDocs(COLLECTIONS.TRIPS),
    deleteCollectionDocs(COLLECTIONS.AUDIT_LOGS)
  ]);

  return { deletedSeals, deletedTrips, deletedAuditLogs, deletedLocations };
}

