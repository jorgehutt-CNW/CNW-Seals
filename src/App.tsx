import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, Package, Truck, RotateCcw, FileText, CheckCircle2, 
  AlertTriangle, Search, Info, HelpCircle, UserCheck, ArrowRight, X, Sparkles,
  Copy, Check, ExternalLink, ShieldAlert, Trash2, Loader2
} from 'lucide-react';
import { Seal, Trip, AuditLogEntry, UserRole, SealStatus, AuthorizedUser, AccessRequest, LocationRecord } from './types';
import { INITIAL_SEALS, INITIAL_TRIPS, INITIAL_AUDIT_LOGS, INITIAL_DESTINATIONS, INITIAL_AUTHORIZED_USERS, LOCATIONS, DEFAULT_LOCATIONS } from './mockData';
import { Header } from './components/Header';
import { MainStockModule } from './components/MainStockModule';
import { TripDispatchModule } from './components/TripDispatchModule';
import { ArrivalVerificationModule } from './components/ArrivalVerificationModule';
import { ReturnReceptionModule } from './components/ReturnReceptionModule';
import { OperatorReturnDispatchModule } from './components/OperatorReturnDispatchModule';
import { AuditLogModule } from './components/AuditLogModule';
import { SealPassportModal } from './components/SealPassportModal';
import { LoginPage } from './components/LoginPage';
import { UnauthorizedDomainModal } from './components/UnauthorizedDomainModal';
import { AccessDeniedScreen } from './components/AccessDeniedScreen';
import { UserManagementModal } from './components/UserManagementModal';
import { 
  auth, 
  db, 
  signInWithGoogle, 
  logOut, 
  onAuthStateChanged, 
  testFirestoreConnection,
  FIRESTORE_PROJECT_ID,
  type User 
} from './firebase';
import {
  saveSealToFirestore,
  saveBatchSealsToFirestore,
  deleteSealFromFirestore,
  saveTripToFirestore,
  saveLocationToFirestore,
  saveBatchLocationsToFirestore,
  deleteLocationFromFirestore,
  saveUserToFirestore,
  saveBatchUsersToFirestore,
  deleteUserFromFirestore,
  saveAccessRequestToFirestore,
  updateAccessRequestStatusInFirestore,
  saveAuditLogToFirestore,
  subscribeToCNWSealDatabase,
  recordUsersAndLocationsToFirestore,
  clearOperationalCollectionsFromFirestore
} from './services/firestoreService';

export default function App() {
  // Theme state: default 'light' when app starts, with toggle to 'dark'
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  // Firebase Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [isFirestoreSynced, setIsFirestoreSynced] = useState<boolean>(false);

  // Validate Firestore default database connection for cnw-seal
  useEffect(() => {
    testFirestoreConnection().then(res => {
      console.log(`[Firebase Firestore] ${res.message}`);
    });
  }, []);

  // Live real-time synchronization with Firestore (default) database on cnw-seal
  useEffect(() => {
    // Automatically record & seed current users and locations into Firestore
    recordUsersAndLocationsToFirestore(
      authorizedUsers.length > 0 ? authorizedUsers : INITIAL_AUTHORIZED_USERS,
      locationsList.length > 0 ? locationsList : DEFAULT_LOCATIONS
    ).catch(err => {
      console.warn('[Firestore] User/location recording:', err);
    });

    const unsubscribe = subscribeToCNWSealDatabase({
      onSeals: (remoteSeals) => {
        if (remoteSeals && remoteSeals.length > 0) {
          setSeals(remoteSeals);
        } else {
          // If remote seals collection is empty, seed with INITIAL_SEALS
          saveBatchSealsToFirestore(INITIAL_SEALS).catch(err => console.warn('[Firestore] Initial seals seed:', err));
        }
        setIsFirestoreSynced(true);
      },
      onTrips: (remoteTrips) => {
        if (remoteTrips && remoteTrips.length > 0) {
          setTrips(remoteTrips);
        } else {
          // If remote trips collection is empty, seed with INITIAL_TRIPS
          for (const trip of INITIAL_TRIPS) {
            saveTripToFirestore(trip).catch(err => console.warn('[Firestore] Initial trip seed:', err));
          }
        }
      },
      onLocations: (remoteLocations) => {
        if (remoteLocations && remoteLocations.length > 0) {
          setLocationsList(remoteLocations);
        } else {
          // If remote locations collection is empty, seed with DEFAULT_LOCATIONS
          saveBatchLocationsToFirestore(DEFAULT_LOCATIONS).catch(console.error);
        }
      },
      onUsers: (remoteUsers) => {
        if (remoteUsers && remoteUsers.length > 0) {
          setAuthorizedUsers(remoteUsers);
        } else {
          // If remote users collection is empty, seed with INITIAL_AUTHORIZED_USERS
          saveBatchUsersToFirestore(INITIAL_AUTHORIZED_USERS).catch(console.error);
        }
      },
      onRequests: (remoteRequests) => {
        setAccessRequests(remoteRequests || []);
      },
      onLogs: (remoteLogs) => {
        if (remoteLogs && remoteLogs.length > 0) {
          setAuditLogs(remoteLogs);
        }
      },
      onError: (err) => {
        console.warn('[Firestore Live Sync]', err.message);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync document.documentElement and document.body with theme changes
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.className = 'bg-slate-900 text-slate-100 antialiased font-sans';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.className = 'bg-slate-100 text-slate-900 antialiased font-sans';
    }
  }, [theme]);

  // Persistent state in-memory
  const [seals, setSeals] = useState<Seal[]>(INITIAL_SEALS);
  const [trips, setTrips] = useState<Trip[]>(INITIAL_TRIPS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [destinations, setDestinations] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cnw_locations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((l: LocationRecord) => l.code);
        }
      }
    } catch (e) {
      // ignore
    }
    return INITIAL_DESTINATIONS;
  });

  // Authorized Users Directory (Enrolled & Assigned exclusively by Superuser)
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>(() => {
    try {
      const saved = localStorage.getItem('cnw_authorized_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const demoEmails = new Set([
            'admin@cnwglobal.com',
            'operator.lax@cnwglobal.com',
            'operator.sfo@cnwglobal.com',
            'admin.sfo@cnwglobal.com'
          ]);
          const filtered = parsed.filter((u: AuthorizedUser) => !demoEmails.has(u.email?.toLowerCase()));
          if (!filtered.some((u: AuthorizedUser) => u.email?.toLowerCase() === 'jorge.hutt@cnwglobal.com')) {
            filtered.unshift(INITIAL_AUTHORIZED_USERS[0]);
          }
          return filtered;
        }
      }
    } catch (e) {
      // ignore
    }
    return INITIAL_AUTHORIZED_USERS;
  });

  // Access Requests from unauthorized login attempts
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>(() => {
    try {
      const saved = localStorage.getItem('cnw_access_requests');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return [];
  });

  // System Locations: Configurable and governed exclusively by Superuser
  const [locationsList, setLocationsList] = useState<LocationRecord[]>(() => {
    try {
      const saved = localStorage.getItem('cnw_locations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      // ignore
    }
    return DEFAULT_LOCATIONS;
  });

  // Sync locationsList to localStorage and synchronize destinations
  useEffect(() => {
    try {
      localStorage.setItem('cnw_locations', JSON.stringify(locationsList));
    } catch (e) {
      // ignore
    }
    const activeCodes = locationsList.map(l => l.code);
    setDestinations(activeCodes.length > 0 ? activeCodes : ['LAX', 'SFO', 'PHX']);
  }, [locationsList]);

  // Derived location codes list for station pulldowns
  const activeLocationCodes = useMemo(() => {
    const codes = locationsList.map(l => l.code);
    return codes.length > 0 ? codes : ['LAX', 'SFO', 'PHX'];
  }, [locationsList]);

  // Superuser User & Location Management Console Modal state
  const [isUserManagementOpen, setIsUserManagementOpen] = useState<boolean>(false);
  const [userManagementInitialTab, setUserManagementInitialTab] = useState<'USERS' | 'ENROLL' | 'REQUESTS' | 'LOCATIONS'>('USERS');

  const handleOpenUserManagement = (tab: 'USERS' | 'ENROLL' | 'REQUESTS' | 'LOCATIONS' = 'USERS') => {
    setUserManagementInitialTab(tab);
    setIsUserManagementOpen(true);
  };

  const handleOpenLocations = () => {
    setUserManagementInitialTab('LOCATIONS');
    setIsUserManagementOpen(true);
  };

  // Sync authorizedUsers to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cnw_authorized_users', JSON.stringify(authorizedUsers));
    } catch (e) {
      // ignore
    }
  }, [authorizedUsers]);

  // Sync accessRequests to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cnw_access_requests', JSON.stringify(accessRequests));
    } catch (e) {
      // ignore
    }
  }, [accessRequests]);

  // Match currentUser against authorized users registry
  const matchedAuthorizedUser = useMemo(() => {
    if (!currentUser?.email) return null;
    const cleanEmail = currentUser.email.toLowerCase().trim();
    return authorizedUsers.find(u => u.email.toLowerCase().trim() === cleanEmail) || null;
  }, [currentUser, authorizedUsers]);

  const isUserAuthorized = !!matchedAuthorizedUser && matchedAuthorizedUser.status === 'ACTIVE';
  const isEnrolledSuperuser = matchedAuthorizedUser?.role === 'SUPERUSER';

  // Superusers list to contact when access is denied
  const superusersList = useMemo(() => {
    return authorizedUsers.filter(u => u.role === 'SUPERUSER');
  }, [authorizedUsers]);

  // Top Bar Selected Location ('LAX' default, 'SFO', 'PHX', or 'ALL')
  const [selectedLocation, setSelectedLocation] = useState<string>('LAX');

  // Role and Navigation state
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');
  const [operatorBranch, setOperatorBranch] = useState<string>('LAX');
  const [activeTab, setActiveTab] = useState<string>('MAIN_STOCK');
  const [sealToEditDirectly, setSealToEditDirectly] = useState<Seal | null>(null);

  // Facility Scoping Enforcement:
  // "The Admin users and Operator Users can see only the data related to the facility they are assigned to"
  const isFacilityRestricted = !isEnrolledSuperuser && (currentRole === 'ADMIN' || currentRole === 'OPERATOR') && !!matchedAuthorizedUser && matchedAuthorizedUser.station !== 'ALL';
  const userAssignedFacility = matchedAuthorizedUser?.station || (currentRole === 'OPERATOR' ? operatorBranch : selectedLocation);

  // Automatically assign authorized role and enforce assigned facility upon sign-in
  useEffect(() => {
    if (matchedAuthorizedUser && matchedAuthorizedUser.status === 'ACTIVE') {
      setCurrentRole(matchedAuthorizedUser.role);
      if (matchedAuthorizedUser.station !== 'ALL') {
        setSelectedLocation(matchedAuthorizedUser.station);
        setOperatorBranch(matchedAuthorizedUser.station);
      }
      if (matchedAuthorizedUser.role === 'OPERATOR') {
        const targetStation = matchedAuthorizedUser.station === 'ALL' ? 'LAX' : matchedAuthorizedUser.station;
        setOperatorBranch(targetStation);
        setActiveTab('ARRIVAL_VERIFY');
      } else if (matchedAuthorizedUser.role === 'SUPERUSER') {
        setCurrentRole('SUPERUSER');
      } else {
        setCurrentRole('ADMIN');
        if (matchedAuthorizedUser.station !== 'ALL') {
          setSelectedLocation(matchedAuthorizedUser.station);
        }
      }
    }
  }, [matchedAuthorizedUser]);

  // Scoped seals: restricted users only see seals related to their assigned facility
  const scopedSeals = useMemo(() => {
    if (!isFacilityRestricted || !userAssignedFacility) return seals;
    return seals.filter(s => 
      s.location === userAssignedFacility ||
      s.currentTripOrigin === userAssignedFacility ||
      s.currentTripDestination === userAssignedFacility ||
      s.returnOriginLocation === userAssignedFacility ||
      s.returnOriginatingDestination === userAssignedFacility
    );
  }, [seals, isFacilityRestricted, userAssignedFacility]);

  // Scoped trips: restricted users only see trips departing from or destined for their assigned facility
  const scopedTrips = useMemo(() => {
    if (!isFacilityRestricted || !userAssignedFacility) return trips;
    return trips.filter(t => 
      t.originLocation === userAssignedFacility || 
      t.destination === userAssignedFacility
    );
  }, [trips, isFacilityRestricted, userAssignedFacility]);

  // Scoped audit logs: restricted users only see audit trails involving their assigned facility
  const scopedAuditLogs = useMemo(() => {
    if (!isFacilityRestricted || !userAssignedFacility) return auditLogs;
    return auditLogs.filter(l => 
      l.location === userAssignedFacility ||
      l.originLocation === userAssignedFacility ||
      l.destination === userAssignedFacility ||
      (l.details && l.details.includes(userAssignedFacility)) ||
      (l.actor && l.actor.includes(userAssignedFacility))
    );
  }, [auditLogs, isFacilityRestricted, userAssignedFacility]);

  // Modal states
  const [selectedSealForPassport, setSelectedSealForPassport] = useState<Seal | null>(null);
  const [showLookupModal, setShowLookupModal] = useState<boolean>(false);
  const [lookupQuery, setLookupQuery] = useState<string>('');
  const [resetConfirmOpen, setResetConfirmOpen] = useState<boolean>(false);
  const [isResettingFirestore, setIsResettingFirestore] = useState<boolean>(false);
  const [unauthorizedDomainModal, setUnauthorizedDomainModal] = useState<boolean>(false);
  const [copiedHostname, setCopiedHostname] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Show toast helper
  const triggerToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => prev?.text === text ? null : prev);
    }, 4500);
  };

  // Copy hostname helper
  const handleCopyHostname = () => {
    const hostname = window.location.hostname;
    navigator.clipboard.writeText(hostname);
    setCopiedHostname(true);
    setTimeout(() => setCopiedHostname(false), 2500);
    triggerToast(`Copied domain "${hostname}" to clipboard.`, 'info');
  };

  // Toggle Dark / Light theme
  const handleToggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      triggerToast(`Switched to ${next === 'dark' ? 'Dark Mode' : 'Light Mode'}.`, 'info');
      return next;
    });
  };

  // Google Authentication Sign In / Sign Up
  const handleSignInGoogle = async () => {
    setAuthErrorMessage(null);
    try {
      setIsAuthLoading(true);
      const user = await signInWithGoogle();
      triggerToast(`Welcome ${user.displayName || user.email}! Signed in with Google.`, 'success');
    } catch (error: any) {
      if (error?.code === 'auth/unauthorized-domain') {
        setAuthErrorMessage('Firebase: Error (auth/unauthorized-domain). This domain must be added to Authorized domains in your Firebase Console.');
        setUnauthorizedDomainModal(true);
      } else if (error?.code === 'auth/popup-closed-by-user') {
        triggerToast('Google sign-in popup was closed before completing.', 'info');
      } else if (error?.code === 'auth/cancelled-popup-request') {
        // Ignored
      } else {
        const msg = error?.message || 'Google sign-in failed.';
        setAuthErrorMessage(msg);
        triggerToast(msg, 'warning');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Google Authentication Sign Out
  const handleSignOut = async () => {
    try {
      await logOut();
      setAuthErrorMessage(null);
      triggerToast('Signed out of CNW-Seal.', 'info');
    } catch (error: any) {
      triggerToast('Error signing out: ' + (error?.message || String(error)), 'warning');
    }
  };

  // Synchronize active tab when role changes
  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    if (role === 'OPERATOR') {
      setActiveTab('ARRIVAL_VERIFY');
      triggerToast('Switched to Destination Operator role. Operational focus: Arrival Verifications.', 'info');
    } else if (role === 'SUPERUSER') {
      if (activeTab === 'OPERATOR_BRANCH_VIEW') {
        setActiveTab('TRIP_DISPATCH');
      }
      triggerToast('Switched to Superuser role. Full administrative authority and Trip Dispatch Rollback unlocked.', 'warning');
    } else {
      if (activeTab === 'OPERATOR_BRANCH_VIEW') {
        setActiveTab('MAIN_STOCK');
      }
      triggerToast('Switched to Administrator (HQ) role. Full inventory & dispatch access unlocked.', 'info');
    }
  };

  // KPI calculations scoped to selectedLocation
  const kpiStats = useMemo(() => {
    const relevantSeals = selectedLocation === 'ALL' 
      ? seals 
      : seals.filter(s => s.location === selectedLocation);

    const relevantPendingReturn = selectedLocation === 'ALL'
      ? seals.filter(s => s.status === 'PENDING_RETURN_TRANSIT')
      : seals.filter(s => s.status === 'PENDING_RETURN_TRANSIT' && (s.returnOriginLocation === selectedLocation || s.location === selectedLocation));

    return {
      available: relevantSeals.filter(s => s.status === 'AVAILABLE').length,
      outbound: relevantSeals.filter(s => s.status === 'IN_TRANSIT_OUTBOUND').length,
      pendingReturn: relevantPendingReturn.length,
      disposed: relevantSeals.filter(s => s.status === 'DISPOSED').length,
    };
  }, [seals, selectedLocation]);

  // Available seals for dispatch (filtered by selectedLocation if specific station selected)
  const availableSeals = useMemo(() => {
    return seals.filter(s => {
      const isAvail = s.status === 'AVAILABLE';
      const matchesLoc = selectedLocation === 'ALL' || s.location === selectedLocation;
      return isAvail && matchesLoc;
    });
  }, [seals, selectedLocation]);

  // Pending return seals (filtered by selectedLocation if specific station selected)
  const pendingReturnSeals = useMemo(() => {
    return seals.filter(s => {
      const isPending = s.status === 'PENDING_RETURN_TRANSIT';
      const matchesLoc = selectedLocation === 'ALL' || s.returnOriginLocation === selectedLocation || s.location === selectedLocation;
      return isPending && matchesLoc;
    });
  }, [seals, selectedLocation]);

  // Operator view: Unused spare seals currently staged at this station ready to be dispatched
  const operatorStagedSpareCount = useMemo(() => {
    return seals.filter(s => {
      const isReturn = s.status === 'PENDING_RETURN_TRANSIT' && !s.returnTrackingNumber;
      const matchesBranch = operatorBranch === 'ALL' || s.returnOriginatingDestination === operatorBranch;
      return isReturn && matchesBranch;
    }).length;
  }, [seals, operatorBranch]);

  // Current timestamp string helper
  const getNowTimestamp = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return `${dateStr} ${hours}:${mins}`;
  };

  // --- ACTIONS ---

  // 1. Bulk Purchase Generator
  const handleGenerateBatch = (
    start: number, 
    end: number, 
    purchaseDate: string, 
    boxRef: string, 
    notes: string,
    location?: string
  ) => {
    const targetLocation = location || (selectedLocation === 'ALL' ? 'LAX' : selectedLocation);
    const existingSealNumbers = new Set(seals.map(s => s.sealNumber));
    const newSeals: Seal[] = [];
    const addedNumbers: string[] = [];
    let skipped = 0;

    for (let i = start; i <= end; i++) {
      const numStr = i.toString();
      if (existingSealNumbers.has(numStr)) {
        skipped++;
      } else {
        newSeals.push({
          sealNumber: numStr,
          status: 'AVAILABLE',
          purchaseDate,
          boxRef,
          location: targetLocation,
          notes: notes || 'MegaFortis High-Sec Bolt Seal / ISO 17712'
        });
        addedNumbers.push(numStr);
      }
    }

    if (newSeals.length > 0) {
      setSeals(prev => [...prev, ...newSeals]);
      
      const logEntry: AuditLogEntry = {
        id: `LOG-${Date.now()}`,
        timestamp: getNowTimestamp(),
        eventType: 'BULK_PURCHASE_REGISTERED',
        actor: currentUser ? (currentUser.displayName || currentUser.email || 'Admin') : `Admin (${targetLocation})`,
        location: targetLocation,
        sealNumbers: addedNumbers,
        summary: `Registered bulk purchase of ${newSeals.length} seals (${start} - ${end}) at ${targetLocation}`,
        details: `Box Ref: ${boxRef}. Location: ${targetLocation} Station. ${skipped > 0 ? `${skipped} duplicate numbers were skipped.` : ''} All seals added to ${targetLocation} Stock as AVAILABLE.`
      };
      setAuditLogs(prev => [logEntry, ...prev]);

      // Mirror to Firestore database
      saveBatchSealsToFirestore(newSeals).catch(err => console.error('[Firestore] Batch save failed:', err));
      saveAuditLogToFirestore(logEntry).catch(err => console.error('[Firestore] Log save failed:', err));

      triggerToast(`Added ${newSeals.length} seals to ${targetLocation} Stock from Box ${boxRef}.`, 'success');
    }

    return { added: newSeals.length, skipped };
  };

  // 2. Add Single Seal
  const handleAddSingleSeal = (
    sealNumber: string, 
    purchaseDate: string, 
    boxRef: string, 
    notes: string,
    location?: string
  ) => {
    if (seals.some(s => s.sealNumber === sealNumber)) {
      return false;
    }

    const targetLocation = location || (selectedLocation === 'ALL' ? 'LAX' : selectedLocation);
    const newSeal: Seal = {
      sealNumber,
      status: 'AVAILABLE',
      purchaseDate,
      boxRef,
      location: targetLocation,
      notes
    };

    setSeals(prev => [...prev, newSeal]);

    const logEntry: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp: getNowTimestamp(),
      eventType: 'SINGLE_SEAL_ADDED',
      actor: currentUser ? (currentUser.displayName || currentUser.email || 'Admin') : `Admin (${targetLocation})`,
      location: targetLocation,
      sealNumbers: [sealNumber],
      summary: `Registered single seal #${sealNumber} at ${targetLocation}`,
      details: `Box Ref: ${boxRef}. Location: ${targetLocation} Station. Status set to AVAILABLE.`
    };
    setAuditLogs(prev => [logEntry, ...prev]);

    // Mirror to Firestore database
    saveSealToFirestore(newSeal).catch(err => console.error('[Firestore] Single seal save failed:', err));
    saveAuditLogToFirestore(logEntry).catch(err => console.error('[Firestore] Log save failed:', err));

    triggerToast(`Seal #${sealNumber} added to ${targetLocation} Stock.`, 'success');
    return true;
  };

  // 3. Edit Seal
  const handleEditSeal = (oldNumber: string, newNumber: string, notes: string, location?: string, newStatus?: SealStatus) => {
    if (oldNumber !== newNumber && seals.some(s => s.sealNumber === newNumber)) {
      return false;
    }

    const existing = seals.find(s => s.sealNumber === oldNumber);
    const targetStatus = newStatus || existing?.status || 'AVAILABLE';
    const statusChanged = Boolean(existing && existing.status !== targetStatus);

    const updatedSeal: Seal = {
      ...(existing || { sealNumber: oldNumber, status: 'AVAILABLE', purchaseDate: '', boxRef: '', location: location || 'LAX' }),
      sealNumber: newNumber,
      notes,
      location: location || existing?.location || 'LAX',
      status: targetStatus,
      // If transitioned to AVAILABLE by superuser, clear active transit assignments
      ...(targetStatus === 'AVAILABLE' && existing?.status !== 'AVAILABLE' ? {
        currentTripId: undefined,
        currentTripOrigin: undefined,
        currentTripDestination: undefined,
        returnTripId: undefined,
        returnOriginLocation: undefined,
        returnOriginatingDestination: undefined,
        returnArrivalDate: undefined,
        returnTrackingNumber: undefined,
        returnSentDate: undefined,
        returnSentBy: undefined,
        returnCarrier: undefined
      } : {}),
      // If marked DISPOSED by superuser
      ...(targetStatus === 'DISPOSED' && existing?.status !== 'DISPOSED' ? {
        disposedAt: getNowTimestamp(),
        disposedBy: currentUser ? (currentUser.displayName || currentUser.email || 'Superuser') : 'Superuser',
        disposalReason: notes || 'Manually marked as DISPOSED by Superuser override'
      } : {})
    };

    setSeals(prev => prev.map(s => {
      if (s.sealNumber === oldNumber) {
        return updatedSeal;
      }
      return s;
    }));

    // If seal number changed and seal is assigned to active trips, synchronize trip records
    if (oldNumber !== newNumber) {
      setTrips(prev => prev.map(t => {
        let changed = false;
        let p = t.primarySealNumber;
        let e = t.extraSealNumber;
        if (p === oldNumber) {
          p = newNumber;
          changed = true;
        }
        if (e === oldNumber) {
          e = newNumber;
          changed = true;
        }
        if (changed) {
          const updatedTrip: Trip = { ...t, primarySealNumber: p, extraSealNumber: e };
          saveTripToFirestore(updatedTrip).catch(err => console.error('[Firestore] Trip update on seal edit failed:', err));
          return updatedTrip;
        }
        return t;
      }));
    }

    const isOutbound = existing?.status === 'IN_TRANSIT_OUTBOUND';
    const logSummary = statusChanged
      ? `SUPERUSER STATUS OVERRIDE #${oldNumber}: ${existing?.status} -> ${targetStatus}${oldNumber !== newNumber ? ` (renamed #${newNumber})` : ''}`
      : `Updated seal details #${oldNumber}${oldNumber !== newNumber ? ` -> #${newNumber}` : ''}${isOutbound ? ' (Superuser Override: Outbound Transit)' : ''}`;

    const logEntry: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp: getNowTimestamp(),
      eventType: 'SEAL_EDITED',
      actor: currentUser ? (currentUser.displayName || currentUser.email || 'Admin') : 'Superuser Override',
      sealNumbers: [newNumber],
      summary: logSummary,
      details: `Notes: "${notes}". Station: ${location || existing?.location || 'unchanged'}. Lifecycle Stage: ${existing?.status || 'N/A'} -> ${targetStatus}.`
    };
    setAuditLogs(prev => [logEntry, ...prev]);

    // Mirror to Firestore database
    if (oldNumber !== newNumber) {
      deleteSealFromFirestore(oldNumber).catch(err => console.error('[Firestore] Old seal delete failed:', err));
    }
    saveSealToFirestore(updatedSeal).catch(err => console.error('[Firestore] Seal update failed:', err));
    saveAuditLogToFirestore(logEntry).catch(err => console.error('[Firestore] Log save failed:', err));

    triggerToast(`Seal #${newNumber} updated${statusChanged ? ` (Status: ${targetStatus})` : ''}.`, 'info');
    return true;
  };

  // 4. Delete Seal
  const handleDeleteSeal = (sealNumber: string) => {
    setSeals(prev => prev.filter(s => s.sealNumber !== sealNumber));

    const logEntry: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp: getNowTimestamp(),
      eventType: 'SEAL_DELETED',
      actor: 'Admin',
      sealNumbers: [sealNumber],
      summary: `Deleted seal #${sealNumber} from inventory`,
      details: 'Physical seal removed from warehouse active stock records.'
    };
    setAuditLogs(prev => [logEntry, ...prev]);

    // Mirror to Firestore database
    deleteSealFromFirestore(sealNumber).catch(err => console.error('[Firestore] Seal delete failed:', err));
    saveAuditLogToFirestore(logEntry).catch(err => console.error('[Firestore] Log save failed:', err));

    triggerToast(`Seal #${sealNumber} deleted from inventory.`, 'warning');
    return true;
  };

  // 5. Add New Destination
  const handleAddDestination = (newDest: string) => {
    const clean = newDest.trim().toUpperCase();
    if (!clean) return;
    if (!destinations.includes(clean)) {
      setDestinations(prev => [...prev, clean]);
    }
    if (!locationsList.some(l => l.code === clean)) {
      const newLoc: LocationRecord = {
        id: `LOC-${clean}`,
        code: clean,
        name: `CNW ${clean}`
      };
      setLocationsList(prev => [...prev, newLoc]);
      saveLocationToFirestore(newLoc).catch(err => console.error('[Firestore] Add destination save failed:', err));
    }
    triggerToast(`Added new destination station: ${clean}`, 'success');
  };

  // 6. Trip Dispatch
  const handleDispatchTrip = (data: {
    originLocation: string;
    destination: string;
    dispatchDate: string;
    hawbs: string[];
    containerOrTruckId: string;
    primarySealNumber: string;
    extraSealNumber: string;
    notes: string;
  }) => {
    const tripId = `TRP-${new Date().getFullYear()}-${Math.floor(110 + trips.length)}`;

    const newTrip: Trip = {
      id: tripId,
      dispatchDate: data.dispatchDate,
      originLocation: data.originLocation,
      destination: data.destination,
      hawbs: data.hawbs,
      containerOrTruckId: data.containerOrTruckId,
      primarySealNumber: data.primarySealNumber,
      extraSealNumber: data.extraSealNumber,
      notes: data.notes,
      status: 'IN_TRANSIT'
    };

    const primaryObj = seals.find(s => s.sealNumber === data.primarySealNumber);
    const updatedPrimary: Seal | undefined = primaryObj ? {
      ...primaryObj,
      status: 'IN_TRANSIT_OUTBOUND',
      currentTripId: tripId,
      currentTripOrigin: data.originLocation,
      currentTripDestination: data.destination,
      notes: `${primaryObj.notes || ''} [Assigned as Primary Door Seal for ${tripId} (${data.originLocation} -> ${data.destination})]`.trim()
    } : undefined;

    const extraObj = seals.find(s => s.sealNumber === data.extraSealNumber);
    const updatedExtra: Seal | undefined = extraObj ? {
      ...extraObj,
      status: 'IN_TRANSIT_OUTBOUND',
      currentTripId: tripId,
      currentTripOrigin: data.originLocation,
      currentTripDestination: data.destination,
      notes: `${extraObj.notes || ''} [Assigned as Inside Spare Seal for ${tripId} (${data.originLocation} -> ${data.destination})]`.trim()
    } : undefined;

    setSeals(prev => prev.map(s => {
      if (s.sealNumber === data.primarySealNumber && updatedPrimary) return updatedPrimary;
      if (s.sealNumber === data.extraSealNumber && updatedExtra) return updatedExtra;
      return s;
    }));

    setTrips(prev => [newTrip, ...prev]);

    const logEntry: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp: getNowTimestamp(),
      eventType: 'TRIP_DISPATCHED',
      actor: currentUser ? (currentUser.displayName || currentUser.email || 'Admin') : `Admin (${data.originLocation})`,
      sealNumbers: [data.primarySealNumber, data.extraSealNumber],
      tripId,
      originLocation: data.originLocation,
      destination: data.destination,
      summary: `Dispatched Outbound Trip ${tripId} from ${data.originLocation} to ${data.destination}`,
      details: `Unit: ${data.containerOrTruckId}. Primary Door Seal: #${data.primarySealNumber}. Inside Spare Seal: #${data.extraSealNumber}. HAWBs: ${data.hawbs.join(', ')}.`
    };
    setAuditLogs(prev => [logEntry, ...prev]);

    // Mirror to Firestore database
    saveTripToFirestore(newTrip).catch(err => console.error('[Firestore] Trip save failed:', err));
    if (updatedPrimary) saveSealToFirestore(updatedPrimary).catch(err => console.error('[Firestore] Primary seal save failed:', err));
    if (updatedExtra) saveSealToFirestore(updatedExtra).catch(err => console.error('[Firestore] Spare seal save failed:', err));
    saveAuditLogToFirestore(logEntry).catch(err => console.error('[Firestore] Log save failed:', err));

    triggerToast(`Trip ${tripId} dispatched from ${data.originLocation} to ${data.destination} with seals #${data.primarySealNumber} & #${data.extraSealNumber}.`, 'success');

    return { success: true, tripId };
  };

  // 6b. Superuser Rollback / Undo Trip Dispatch
  const handleRollbackTripDispatch = (tripId: string, reason: string): { success: boolean; error?: string } => {
    const targetTrip = trips.find(t => t.id === tripId);
    if (!targetTrip) {
      triggerToast(`Trip record "${tripId}" could not be found.`, 'warning');
      return { success: false, error: 'Trip record not found.' };
    }

    if (targetTrip.status !== 'IN_TRANSIT') {
      triggerToast(`Trip ${tripId} cannot be rolled back because its status is "${targetTrip.status}". Only active in-transit dispatches can be rolled back.`, 'warning');
      return { success: false, error: 'Only in-transit trips can be rolled back.' };
    }

    const timestamp = getNowTimestamp();
    const actor = currentUser
      ? `${currentUser.displayName || currentUser.email} (Superuser)`
      : 'Superuser (Master Override)';

    const sanitizedReason = reason.trim() || 'Admin dispatch operational correction (Primary/Extra seal misallocation or clerical error)';

    const restoredPrimary = seals.find(s => s.sealNumber === targetTrip.primarySealNumber);
    const restoredExtra = seals.find(s => s.sealNumber === targetTrip.extraSealNumber);

    const primaryObj: Seal | undefined = restoredPrimary ? {
      ...restoredPrimary,
      status: 'AVAILABLE',
      location: targetTrip.originLocation,
      currentTripId: undefined,
      currentTripOrigin: undefined,
      currentTripDestination: undefined,
      notes: `${restoredPrimary.notes || ''} [SUPERUSER ROLLBACK: Outbound dispatch for Trip ${targetTrip.id} rolled back by ${actor} on ${timestamp}. Reason: "${sanitizedReason}". Reverted to ${targetTrip.originLocation} Stock as AVAILABLE]`.trim()
    } : undefined;

    const extraObj: Seal | undefined = restoredExtra ? {
      ...restoredExtra,
      status: 'AVAILABLE',
      location: targetTrip.originLocation,
      currentTripId: undefined,
      currentTripOrigin: undefined,
      currentTripDestination: undefined,
      notes: `${restoredExtra.notes || ''} [SUPERUSER ROLLBACK: Outbound dispatch for Trip ${targetTrip.id} rolled back by ${actor} on ${timestamp}. Reason: "${sanitizedReason}". Reverted to ${targetTrip.originLocation} Stock as AVAILABLE]`.trim()
    } : undefined;

    // 1. Revert both seals to AVAILABLE status strictly at origin location
    setSeals(prev => prev.map(s => {
      if (s.sealNumber === targetTrip.primarySealNumber && primaryObj) return primaryObj;
      if (s.sealNumber === targetTrip.extraSealNumber && extraObj) return extraObj;
      return s;
    }));

    // 2. Mark the trip as ROLLED_BACK with forensic audit metadata
    const updatedTrip: Trip = {
      ...targetTrip,
      status: 'ROLLED_BACK',
      rolledBackAt: timestamp,
      rolledBackBy: actor,
      rollbackReason: sanitizedReason
    };

    setTrips(prev => prev.map(t => t.id === tripId ? updatedTrip : t));

    // 3. Create immutable Audit Trail entry
    const logEntry: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp,
      eventType: 'TRIP_DISPATCH_ROLLED_BACK',
      actor,
      sealNumbers: [targetTrip.primarySealNumber, targetTrip.extraSealNumber],
      tripId: targetTrip.id,
      originLocation: targetTrip.originLocation,
      destination: targetTrip.destination,
      location: targetTrip.originLocation,
      summary: `SUPERUSER ROLLBACK: Voided Outbound Dispatch for Trip ${targetTrip.id} (${targetTrip.originLocation} -> ${targetTrip.destination})`,
      details: `Dispatch error rollback executed by ${actor}. Voided outbound trip ${targetTrip.id}. Restored Primary Door Seal #${targetTrip.primarySealNumber} and Inside Spare Seal #${targetTrip.extraSealNumber} back to Origin ${targetTrip.originLocation} Main Stock as AVAILABLE. Justification: "${sanitizedReason}". Unit: ${targetTrip.containerOrTruckId}. HAWB(s): ${targetTrip.hawbs.join(', ')}.`
    };
    setAuditLogs(prev => [logEntry, ...prev]);

    // Mirror to Firestore database
    saveTripToFirestore(updatedTrip).catch(err => console.error('[Firestore] Trip rollback save failed:', err));
    if (primaryObj) saveSealToFirestore(primaryObj).catch(err => console.error('[Firestore] Restore primary seal failed:', err));
    if (extraObj) saveSealToFirestore(extraObj).catch(err => console.error('[Firestore] Restore extra seal failed:', err));
    saveAuditLogToFirestore(logEntry).catch(err => console.error('[Firestore] Log save failed:', err));

    triggerToast(`Trip ${targetTrip.id} rolled back! Seals #${targetTrip.primarySealNumber} & #${targetTrip.extraSealNumber} restored to AVAILABLE stock at ${targetTrip.originLocation}.`, 'success');
    return { success: true };
  };

  // 7. Verify Arrival - Case A: Normal Destination Arrival
  const handleVerifyArrivalStandard = async (tripId: string, arrivalNotes?: string) => {
    const targetTrip = trips.find(t => t.id === tripId);
    if (!targetTrip) return;

    const timestamp = getNowTimestamp();
    const verifiedBy = currentUser
      ? `${currentUser.displayName || currentUser.email} (${currentRole === 'OPERATOR' ? `${operatorBranch} Operator` : 'HQ Admin'})`
      : (currentRole === 'OPERATOR' ? `Operator (${operatorBranch} Branch)` : 'Admin (HQ)');

    const updatedTrip: Trip = {
      ...targetTrip,
      status: 'COMPLETED_STANDARD',
      verifiedAt: timestamp,
      verifiedBy,
      arrivedDoorSealNumber: targetTrip.primarySealNumber,
      disposalNotes: arrivalNotes || 'Standard door opening. Primary seal cut and destroyed.'
    };

    const primaryObj = seals.find(s => s.sealNumber === targetTrip.primarySealNumber);
    const extraObj = seals.find(s => s.sealNumber === targetTrip.extraSealNumber);

    const updatedPrimary: Seal = {
      ...(primaryObj || {
        sealNumber: targetTrip.primarySealNumber,
        purchaseDate: targetTrip.dispatchDate,
        boxRef: `BX-${targetTrip.originLocation || 'LAX'}-REG`
      }),
      status: 'DISPOSED',
      location: targetTrip.destination,
      currentTripId: tripId,
      currentTripOrigin: targetTrip.originLocation,
      currentTripDestination: targetTrip.destination,
      disposedAt: timestamp,
      disposedBy: verifiedBy,
      disposalReason: `Normal destination arrival door opening at ${targetTrip.destination}. ${arrivalNotes || ''}`.trim(),
      returnTripId: undefined,
      returnOriginLocation: undefined,
      returnOriginatingDestination: undefined,
      returnArrivalDate: undefined,
      returnTrackingNumber: undefined,
      returnSentDate: undefined,
      returnSentBy: undefined,
      returnCarrier: undefined
    };

    const updatedExtra: Seal = {
      ...(extraObj || {
        sealNumber: targetTrip.extraSealNumber,
        purchaseDate: targetTrip.dispatchDate,
        boxRef: `BX-${targetTrip.originLocation || 'LAX'}-REG`
      }),
      status: 'PENDING_RETURN_TRANSIT',
      location: targetTrip.destination,
      currentTripId: tripId,
      returnTripId: tripId,
      returnOriginLocation: targetTrip.originLocation || 'LAX',
      returnOriginatingDestination: targetTrip.destination,
      returnArrivalDate: timestamp.split(' ')[0],
      notes: `${extraObj?.notes || ''} [Unused inside spare from ${tripId} at ${targetTrip.destination} returning strictly to Origin ${targetTrip.originLocation || 'LAX'}]`.trim(),
      disposedAt: undefined,
      disposedBy: undefined,
      disposalReason: undefined
    };

    setTrips(prev => prev.map(t => t.id === tripId ? updatedTrip : t));

    setSeals(prev => {
      const hasPrimary = prev.some(s => s.sealNumber === targetTrip.primarySealNumber);
      const hasExtra = prev.some(s => s.sealNumber === targetTrip.extraSealNumber);
      let list = prev.map(s => {
        if (s.sealNumber === targetTrip.primarySealNumber) return updatedPrimary;
        if (s.sealNumber === targetTrip.extraSealNumber) return updatedExtra;
        return s;
      });
      if (!hasPrimary) list = [updatedPrimary, ...list];
      if (!hasExtra) list = [updatedExtra, ...list];
      return list;
    });

    const logEntry: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp,
      eventType: 'ARRIVAL_VERIFIED_STANDARD',
      actor: verifiedBy,
      sealNumbers: [targetTrip.primarySealNumber, targetTrip.extraSealNumber],
      tripId,
      originLocation: targetTrip.originLocation,
      destination: targetTrip.destination,
      summary: `Standard Arrival Verified for Trip ${tripId} at ${targetTrip.destination}`,
      details: `Arrived intact with Primary Seal #${targetTrip.primarySealNumber} on door (DISPOSED). Unused Spare Seal #${targetTrip.extraSealNumber} moved to Return Transit addressed exclusively to Origin ${targetTrip.originLocation || 'LAX'}.`
    };
    setAuditLogs(prev => [logEntry, ...prev]);

    // Mirror to Firestore database with Promise.all and await
    try {
      await Promise.all([
        saveTripToFirestore(updatedTrip),
        saveSealToFirestore(updatedPrimary),
        saveSealToFirestore(updatedExtra),
        saveAuditLogToFirestore(logEntry)
      ]);
      triggerToast(`Trip ${tripId} arrival verified! Primary seal #${targetTrip.primarySealNumber} marked DISPOSED & spare #${targetTrip.extraSealNumber} queued for return in Firestore.`, 'success');
    } catch (err: any) {
      console.error('[Firestore] Arrival standard verification save failed:', err);
      triggerToast(`Trip verified locally, but Firestore sync error: ${err.message || 'Error saving to database'}`, 'warning');
      throw err;
    }
  };

  // 8. Verify Arrival - Case B: Mid-Route Inspection Seal Swap
  const handleVerifyArrivalInspectionSwap = async (tripId: string, reason: string, arrivalNotes?: string) => {
    const targetTrip = trips.find(t => t.id === tripId);
    if (!targetTrip) return;

    const timestamp = getNowTimestamp();
    const verifiedBy = currentUser
      ? `${currentUser.displayName || currentUser.email} (${currentRole === 'OPERATOR' ? `${operatorBranch} Operator` : 'HQ Admin'})`
      : (currentRole === 'OPERATOR' ? `Operator (${operatorBranch} Branch)` : 'Admin (HQ)');

    const updatedTrip: Trip = {
      ...targetTrip,
      status: 'COMPLETED_INSPECTION_SWAP',
      verifiedAt: timestamp,
      verifiedBy,
      arrivedDoorSealNumber: targetTrip.extraSealNumber,
      inspectionReason: reason,
      disposalNotes: `Dual seal disposal: Primary #${targetTrip.primarySealNumber} and Extra #${targetTrip.extraSealNumber}. ${arrivalNotes || ''}`.trim()
    };

    const primaryObj = seals.find(s => s.sealNumber === targetTrip.primarySealNumber);
    const extraObj = seals.find(s => s.sealNumber === targetTrip.extraSealNumber);

    const updatedPrimary: Seal = {
      ...(primaryObj || {
        sealNumber: targetTrip.primarySealNumber,
        purchaseDate: targetTrip.dispatchDate,
        boxRef: `BX-${targetTrip.originLocation || 'LAX'}-REG`
      }),
      status: 'DISPOSED',
      location: targetTrip.destination,
      currentTripId: tripId,
      currentTripOrigin: targetTrip.originLocation,
      currentTripDestination: targetTrip.destination,
      disposedAt: timestamp,
      disposedBy: verifiedBy,
      disposalReason: `Mid-Route Replacement: ${reason}`,
      returnTripId: undefined,
      returnOriginLocation: undefined,
      returnOriginatingDestination: undefined,
      returnArrivalDate: undefined,
      returnTrackingNumber: undefined,
      returnSentDate: undefined,
      returnSentBy: undefined,
      returnCarrier: undefined
    };

    const updatedExtra: Seal = {
      ...(extraObj || {
        sealNumber: targetTrip.extraSealNumber,
        purchaseDate: targetTrip.dispatchDate,
        boxRef: `BX-${targetTrip.originLocation || 'LAX'}-REG`
      }),
      status: 'DISPOSED',
      location: targetTrip.destination,
      currentTripId: tripId,
      currentTripOrigin: targetTrip.originLocation,
      currentTripDestination: targetTrip.destination,
      disposedAt: timestamp,
      disposedBy: verifiedBy,
      disposalReason: `Destination Opening after Mid-Route Replacement: ${reason}`,
      returnTripId: undefined,
      returnOriginLocation: undefined,
      returnOriginatingDestination: undefined,
      returnArrivalDate: undefined,
      returnTrackingNumber: undefined,
      returnSentDate: undefined,
      returnSentBy: undefined,
      returnCarrier: undefined
    };

    setTrips(prev => prev.map(t => t.id === tripId ? updatedTrip : t));

    setSeals(prev => {
      const hasPrimary = prev.some(s => s.sealNumber === targetTrip.primarySealNumber);
      const hasExtra = prev.some(s => s.sealNumber === targetTrip.extraSealNumber);
      let list = prev.map(s => {
        if (s.sealNumber === targetTrip.primarySealNumber) return updatedPrimary;
        if (s.sealNumber === targetTrip.extraSealNumber) return updatedExtra;
        return s;
      });
      if (!hasPrimary) list = [updatedPrimary, ...list];
      if (!hasExtra) list = [updatedExtra, ...list];
      return list;
    });

    const logEntry: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp,
      eventType: 'ARRIVAL_VERIFIED_INSPECTION_SWAP',
      actor: verifiedBy,
      sealNumbers: [targetTrip.primarySealNumber, targetTrip.extraSealNumber],
      tripId,
      originLocation: targetTrip.originLocation,
      destination: targetTrip.destination,
      summary: `Inspection Seal Swap Verified for Trip ${tripId} at ${targetTrip.destination}`,
      details: `Container arrived with Inside Spare Seal #${targetTrip.extraSealNumber} on door. Reason: "${reason}". Both seals confirmed destroyed & DISPOSED.`
    };
    setAuditLogs(prev => [logEntry, ...prev]);

    // Mirror to Firestore database with Promise.all and await
    try {
      await Promise.all([
        saveTripToFirestore(updatedTrip),
        saveSealToFirestore(updatedPrimary),
        saveSealToFirestore(updatedExtra),
        saveAuditLogToFirestore(logEntry)
      ]);
      triggerToast(`Inspection swap verified for Trip ${tripId}. Both seals successfully saved to Firestore as DISPOSED.`, 'warning');
    } catch (err: any) {
      console.error('[Firestore] Arrival inspection swap save failed:', err);
      triggerToast(`Trip verified locally, but Firestore sync error: ${err.message || 'Error saving to database'}`, 'warning');
      throw err;
    }
  };

  // 9. Return Reception (Admin Only)
  const handleConfirmReturnReceived = (sealNumbers: string[]) => {
    const timestamp = getNowTimestamp();
    const updatedSealsList: Seal[] = [];

    setSeals(prev => prev.map(s => {
      if (sealNumbers.includes(s.sealNumber)) {
        const targetOrigin = s.returnOriginLocation || s.location || 'LAX';
        const updated: Seal = {
          ...s,
          status: 'AVAILABLE',
          location: targetOrigin, // Returns strictly to origin location!
          currentTripId: undefined,
          currentTripOrigin: undefined,
          currentTripDestination: undefined,
          returnTripId: undefined,
          returnOriginLocation: undefined,
          returnOriginatingDestination: undefined,
          returnArrivalDate: undefined,
          notes: `${s.notes || ''} [Returned to Origin ${targetOrigin} Main Stock on ${timestamp.split(' ')[0]}]`.trim()
        };
        updatedSealsList.push(updated);
        return updated;
      }
      return s;
    }));

    const logEntry: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp,
      eventType: 'EXTRA_SEAL_RETURN_RECEIVED',
      actor: currentUser ? (currentUser.displayName || currentUser.email || 'Admin') : 'Admin',
      sealNumbers,
      summary: `Confirmed receipt of ${sealNumbers.length} return spare seal(s) back into Origin Station stock`,
      details: `Seals restored to AVAILABLE status strictly in their respective Origin Station inventories: ${sealNumbers.map(n => `#${n}`).join(', ')}.`
    };
    setAuditLogs(prev => [logEntry, ...prev]);

    // Mirror to Firestore database
    if (updatedSealsList.length > 0) {
      saveBatchSealsToFirestore(updatedSealsList).catch(err => console.error('[Firestore] Return received seals save failed:', err));
    }
    saveAuditLogToFirestore(logEntry).catch(err => console.error('[Firestore] Log save failed:', err));

    triggerToast(`Received ${sealNumbers.length} returning seals back into their Origin Station stock!`, 'success');
  };

  // 9b. Operator Dispatches Spare Seals to Origin with Tracking # and Date Sent
  const handleDispatchReturnSeals = (data: {
    sealNumbers: string[];
    trackingNumber: string;
    sentDate: string;
    carrier: string;
    notes?: string;
  }) => {
    const timestamp = getNowTimestamp();
    const operatorName = currentUser
      ? `${currentUser.displayName || currentUser.email} (${operatorBranch} Operator)`
      : `Operator (${operatorBranch} Branch)`;

    const targetedOrigins = new Set<string>();
    const updatedSealsList: Seal[] = [];

    setSeals(prev => prev.map(s => {
      if (data.sealNumbers.includes(s.sealNumber)) {
        const originLoc = s.returnOriginLocation || s.location || 'LAX';
        targetedOrigins.add(originLoc);
        const updated: Seal = {
          ...s,
          returnTrackingNumber: data.trackingNumber,
          returnSentDate: data.sentDate,
          returnSentBy: operatorName,
          returnCarrier: data.carrier,
          notes: `${s.notes || ''} [Dispatched to Origin ${originLoc} via ${data.carrier} Tracking #${data.trackingNumber} on ${data.sentDate}${data.notes ? ` - ${data.notes}` : ''}]`.trim()
        };
        updatedSealsList.push(updated);
        return updated;
      }
      return s;
    }));

    const originListStr = Array.from(targetedOrigins).join(', ');

    const logEntry: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp,
      eventType: 'RETURN_DISPATCHED_TO_ORIGIN',
      actor: operatorName,
      sealNumbers: data.sealNumbers,
      trackingNumber: data.trackingNumber,
      carrier: data.carrier,
      location: operatorBranch,
      destination: originListStr,
      summary: `Dispatched return of ${data.sealNumbers.length} spare seal(s) from ${operatorBranch} to Origin ${originListStr}`,
      details: `Courier: ${data.carrier}. Tracking #${data.trackingNumber}. Date Sent: ${data.sentDate}. Destination Station(s): ${originListStr}.`
    };
    setAuditLogs(prev => [logEntry, ...prev]);

    // Mirror to Firestore database
    if (updatedSealsList.length > 0) {
      saveBatchSealsToFirestore(updatedSealsList).catch(err => console.error('[Firestore] Return dispatch seals save failed:', err));
    }
    saveAuditLogToFirestore(logEntry).catch(err => console.error('[Firestore] Log save failed:', err));

    triggerToast(`Dispatched ${data.sealNumbers.length} seal(s) to Origin ${originListStr} with Tracking #${data.trackingNumber}!`, 'success');
  };

  // 10. Superuser Wipe Operational Database in Firestore (collections: auditLogs, locations, seals, trips)
  const handleWipeFirestoreCollections = async () => {
    setIsResettingFirestore(true);
    try {
      const result = await clearOperationalCollectionsFromFirestore();
      // Wipe local operational state in React to guarantee sync with wiped Firestore database
      setSeals([]);
      setTrips([]);
      setAuditLogs([]);
      setLocationsList([]);
      setDestinations([]);
      setSelectedLocation('ALL');
      setResetConfirmOpen(false);

      const summary = `Wiped ${result.deletedSeals} seals, ${result.deletedTrips} trips, ${result.deletedAuditLogs} audit logs, and ${result.deletedLocations} locations from Firestore.`;
      console.log(`[Firestore] ${summary}`);
      triggerToast(`Database reset complete: ${summary}`, 'success');
    } catch (err: any) {
      console.error('[Firestore Wipe Failed]:', err);
      triggerToast(`Failed to wipe Firestore: ${err?.message || 'Database error'}`, 'warning');
    } finally {
      setIsResettingFirestore(false);
    }
  };

  // 11. Superuser User Enrollment & Role Assignment Handlers
  const handleEnrollUser = (data: {
    email: string;
    displayName: string;
    role: UserRole;
    station: string;
    notes?: string;
  }): boolean => {
    const cleanEmail = data.email.toLowerCase().trim();
    if (authorizedUsers.some(u => u.email.toLowerCase().trim() === cleanEmail)) {
      return false;
    }

    const timestamp = getNowTimestamp();
    const actor = currentUser?.displayName || currentUser?.email || 'Superuser (Jorge Hutt)';

    const newUser: AuthorizedUser = {
      id: `USR-${Date.now()}`,
      email: cleanEmail,
      displayName: data.displayName.trim() || cleanEmail.split('@')[0],
      role: data.role,
      station: data.station,
      status: 'ACTIVE',
      enrolledAt: timestamp,
      enrolledBy: actor,
      notes: data.notes
    };

    setAuthorizedUsers(prev => [...prev, newUser]);

    // Also auto-resolve any pending access request for this email
    setAccessRequests(prev => prev.map(req => 
      req.email.toLowerCase().trim() === cleanEmail ? { ...req, status: 'APPROVED' } : req
    ));

    const logEntry: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp,
      eventType: 'USER_ENROLLED',
      actor,
      sealNumbers: [],
      targetUserEmail: cleanEmail,
      targetUserRole: data.role,
      summary: `SUPERUSER ENROLLED: Authorized ${newUser.displayName} (${cleanEmail}) as ${data.role}`,
      details: `Enrolled by ${actor}. Role: ${data.role}. Station: ${data.station}. Status: ACTIVE. Notes: ${data.notes || 'None'}.`
    };
    setAuditLogs(prev => [logEntry, ...prev]);

    // Mirror to Firestore database
    saveUserToFirestore(newUser).catch(err => console.error('[Firestore] User enroll save failed:', err));
    saveAuditLogToFirestore(logEntry).catch(err => console.error('[Firestore] Log save failed:', err));

    triggerToast(`Enrolled user ${cleanEmail} as ${data.role}!`, 'success');
    return true;
  };

  const handleUpdateUserRole = (userId: string, newRole: UserRole): boolean => {
    const targetUser = authorizedUsers.find(u => u.id === userId);
    if (!targetUser) return false;

    const oldRole = targetUser.role;
    if (oldRole === newRole) return true;

    const timestamp = getNowTimestamp();
    const actor = currentUser?.displayName || currentUser?.email || 'Superuser (Jorge Hutt)';

    const updatedUser: AuthorizedUser = { ...targetUser, role: newRole };

    setAuthorizedUsers(prev => prev.map(u => 
      u.id === userId ? updatedUser : u
    ));

    const logEntry: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp,
      eventType: 'USER_ROLE_ASSIGNED',
      actor,
      sealNumbers: [],
      targetUserEmail: targetUser.email,
      targetUserRole: newRole,
      summary: `SUPERUSER ROLE CHANGE: Reassigned ${targetUser.email} from ${oldRole} to ${newRole}`,
      details: `Superuser ${actor} updated system authorization role for ${targetUser.displayName} (${targetUser.email}) from ${oldRole} to ${newRole}.`
    };
    setAuditLogs(prev => [logEntry, ...prev]);

    // Mirror to Firestore database
    saveUserToFirestore(updatedUser).catch(err => console.error('[Firestore] User role update failed:', err));
    saveAuditLogToFirestore(logEntry).catch(err => console.error('[Firestore] Log save failed:', err));

    triggerToast(`Updated role for ${targetUser.email} to ${newRole}!`, 'info');
    return true;
  };

  const handleUpdateUserStation = (userId: string, newStation: string): boolean => {
    const targetUser = authorizedUsers.find(u => u.id === userId);
    if (!targetUser) return false;

    const updatedUser: AuthorizedUser = { ...targetUser, station: newStation };

    setAuthorizedUsers(prev => prev.map(u => 
      u.id === userId ? updatedUser : u
    ));

    // Mirror to Firestore database
    saveUserToFirestore(updatedUser).catch(err => console.error('[Firestore] User station update failed:', err));

    triggerToast(`Station updated to ${newStation}.`, 'info');
    return true;
  };

  const handleUpdateUser = (
    userId: string, 
    data: { displayName?: string; role?: UserRole; station?: string; status?: 'ACTIVE' | 'REVOKED'; notes?: string }
  ): boolean => {
    const targetUser = authorizedUsers.find(u => u.id === userId);
    if (!targetUser) return false;

    const updatedUser: AuthorizedUser = {
      ...targetUser,
      displayName: data.displayName !== undefined ? data.displayName : targetUser.displayName,
      role: data.role !== undefined ? data.role : targetUser.role,
      station: data.station !== undefined ? data.station : targetUser.station,
      status: data.status !== undefined ? data.status : targetUser.status,
      notes: data.notes !== undefined ? data.notes : targetUser.notes
    };

    setAuthorizedUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));

    const logEntry: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp: getNowTimestamp(),
      eventType: 'USER_EDITED',
      actor: currentUser?.displayName || currentUser?.email || 'Superuser (Jorge Hutt)',
      sealNumbers: [],
      targetUserEmail: targetUser.email,
      targetUserRole: updatedUser.role,
      summary: `SUPERUSER UPDATED USER: ${updatedUser.displayName} (${updatedUser.email})`,
      details: `User authorization record updated: Role=${updatedUser.role}, Station=${updatedUser.station}, Status=${updatedUser.status}.`
    };
    setAuditLogs(prev => [logEntry, ...prev]);

    saveUserToFirestore(updatedUser).catch(err => console.error('[Firestore] User update save failed:', err));
    saveAuditLogToFirestore(logEntry).catch(err => console.error('[Firestore] Log save failed:', err));

    triggerToast(`User "${updatedUser.displayName}" updated successfully!`, 'success');
    return true;
  };

  const handleToggleUserStatus = (userId: string): boolean => {
    const targetUser = authorizedUsers.find(u => u.id === userId);
    if (!targetUser) return false;

    const newStatus = targetUser.status === 'ACTIVE' ? 'REVOKED' : 'ACTIVE';
    const timestamp = getNowTimestamp();
    const actor = currentUser?.displayName || currentUser?.email || 'Superuser (Jorge Hutt)';

    const updatedUser: AuthorizedUser = { ...targetUser, status: newStatus };

    setAuthorizedUsers(prev => prev.map(u => 
      u.id === userId ? updatedUser : u
    ));

    const logEntry: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp,
      eventType: newStatus === 'ACTIVE' ? 'USER_ACCESS_RESTORED' : 'USER_ACCESS_REVOKED',
      actor,
      sealNumbers: [],
      targetUserEmail: targetUser.email,
      targetUserRole: targetUser.role,
      summary: `SUPERUSER ACCESS ${newStatus}: ${targetUser.displayName} (${targetUser.email})`,
      details: `Application access ${newStatus === 'ACTIVE' ? 'restored' : 'revoked'} by Superuser ${actor} for ${targetUser.email}.`
    };
    setAuditLogs(prev => [logEntry, ...prev]);

    // Mirror to Firestore database
    saveUserToFirestore(updatedUser).catch(err => console.error('[Firestore] User status toggle failed:', err));
    saveAuditLogToFirestore(logEntry).catch(err => console.error('[Firestore] Log save failed:', err));

    triggerToast(`User access ${newStatus === 'ACTIVE' ? 'restored' : 'revoked'} for ${targetUser.email}.`, newStatus === 'ACTIVE' ? 'success' : 'warning');
    return true;
  };

  const handleRemoveUser = (userId: string): boolean => {
    const targetUser = authorizedUsers.find(u => u.id === userId);
    if (!targetUser) return false;

    const timestamp = getNowTimestamp();
    const actor = currentUser?.displayName || currentUser?.email || 'Superuser (Jorge Hutt)';

    setAuthorizedUsers(prev => prev.filter(u => u.id !== userId));

    const logEntry: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp,
      eventType: 'USER_REMOVED',
      actor,
      sealNumbers: [],
      targetUserEmail: targetUser.email,
      summary: `SUPERUSER REMOVED USER: Deleted authorization record for ${targetUser.email}`,
      details: `Authorization record for ${targetUser.displayName} (${targetUser.email}) removed by Superuser ${actor}. Account will be blocked upon next sign-in.`
    };
    setAuditLogs(prev => [logEntry, ...prev]);

    // Mirror to Firestore database
    deleteUserFromFirestore(userId).catch(err => console.error('[Firestore] User remove failed:', err));
    saveAuditLogToFirestore(logEntry).catch(err => console.error('[Firestore] Log save failed:', err));

    triggerToast(`Authorization removed for ${targetUser.email}.`, 'warning');
    return true;
  };

  const handleSubmitAccessRequest = (email: string, displayName: string, notes?: string): boolean => {
    const cleanEmail = email.toLowerCase().trim();
    const timestamp = getNowTimestamp();

    const newRequest: AccessRequest = {
      id: `REQ-${Date.now()}`,
      email: cleanEmail,
      displayName: displayName.trim() || cleanEmail.split('@')[0],
      requestedAt: timestamp,
      status: 'PENDING',
      notes
    };

    setAccessRequests(prev => [newRequest, ...prev]);

    const logEntry: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp,
      eventType: 'UNAUTHORIZED_LOGIN_BLOCKED',
      actor: cleanEmail,
      sealNumbers: [],
      targetUserEmail: cleanEmail,
      summary: `UNAUTHORIZED LOGIN REJECTED: ${cleanEmail} requested Superuser authorization`,
      details: `Account ${cleanEmail} attempted to access CNW-Seal without prior enrollment. Access denied. Authorization request logged for Superuser review. Notes: "${notes || 'None'}".`
    };
    setAuditLogs(prev => [logEntry, ...prev]);

    // Mirror to Firestore database
    saveAccessRequestToFirestore(newRequest).catch(err => console.error('[Firestore] Access request save failed:', err));
    saveAuditLogToFirestore(logEntry).catch(err => console.error('[Firestore] Log save failed:', err));

    triggerToast('Access request submitted to Superuser for review.', 'info');
    return true;
  };

  const handleApproveAccessRequest = (requestId: string, role: UserRole, station: string): boolean => {
    const targetReq = accessRequests.find(r => r.id === requestId);
    if (!targetReq) return false;

    setAccessRequests(prev => prev.map(r => 
      r.id === requestId ? { ...r, status: 'APPROVED' } : r
    ));

    // Mirror to Firestore database
    updateAccessRequestStatusInFirestore(requestId, 'APPROVED').catch(err => console.error('[Firestore] Request approve failed:', err));

    return handleEnrollUser({
      email: targetReq.email,
      displayName: targetReq.displayName,
      role,
      station,
      notes: targetReq.notes
    });
  };

  const handleRejectAccessRequest = (requestId: string): boolean => {
    const targetReq = accessRequests.find(r => r.id === requestId);
    if (!targetReq) return false;

    setAccessRequests(prev => prev.map(r => 
      r.id === requestId ? { ...r, status: 'REJECTED' } : r
    ));

    // Mirror to Firestore database
    updateAccessRequestStatusInFirestore(requestId, 'REJECTED').catch(err => console.error('[Firestore] Request reject failed:', err));

    triggerToast(`Denied access request from ${targetReq.email}.`, 'info');
    return true;
  };

  // 12. Superuser Location Governance (Create, Update, Delete System Locations)
  const handleCreateLocation = (data: {
    code: string;
    name: string;
    address?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    notes?: string;
  }): { success: boolean; error?: string } => {
    const cleanCode = data.code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, error: 'Station Code is required.' };
    }
    if (!/^[A-Z0-9_-]{2,8}$/.test(cleanCode)) {
      return { success: false, error: 'Station Code must be 2 to 8 alphanumeric characters (e.g. MIA, ORD).' };
    }
    if (!data.name.trim()) {
      return { success: false, error: 'Facility Name is required.' };
    }
    if (locationsList.some(l => l.code.toUpperCase() === cleanCode)) {
      return { success: false, error: `Station code "${cleanCode}" already exists. Please choose a unique code.` };
    }

    const timestamp = getNowTimestamp();
    const actor = currentUser?.displayName 
      ? `${currentUser.displayName} (${currentUser.email || 'Superuser'})`
      : currentUser?.email || 'Superuser (Jorge Hutt)';

    const newLocation: LocationRecord = {
      id: `LOC-${cleanCode}-${Date.now()}`,
      code: cleanCode,
      name: data.name.trim(),
      address: data.address?.trim() || undefined,
      notes: data.notes?.trim() || undefined
    };

    setLocationsList(prev => [...prev, newLocation]);

    // Ensure this location is immediately recognized in trip destinations
    setDestinations(prev => prev.includes(cleanCode) ? prev : [...prev, cleanCode]);

    const logEntry: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp,
      eventType: 'LOCATION_CREATED',
      actor,
      sealNumbers: [],
      location: cleanCode,
      summary: `LOCATION REGISTERED: ${cleanCode} (${data.name.trim()}) created`,
      details: `Superuser ${actor} created new system location ${cleanCode} ("${data.name.trim()}"). Address: "${data.address?.trim() || 'N/A'}".`
    };
    setAuditLogs(prev => [logEntry, ...prev]);

    // Mirror to Firestore database
    saveLocationToFirestore(newLocation).catch(err => console.error('[Firestore] Location create failed:', err));
    saveAuditLogToFirestore(logEntry).catch(err => console.error('[Firestore] Log save failed:', err));

    triggerToast(`Location ${cleanCode} (${data.name.trim()}) created successfully.`, 'success');
    return { success: true };
  };

  const handleUpdateLocation = (
    id: string,
    data: {
      name: string;
      address?: string;
      notes?: string;
    }
  ): { success: boolean; error?: string } => {
    const target = locationsList.find(l => l.id === id);
    if (!target) {
      return { success: false, error: 'Location not found.' };
    }
    if (!data.name.trim()) {
      return { success: false, error: 'Location Name is required.' };
    }

    const timestamp = getNowTimestamp();
    const actor = currentUser?.displayName 
      ? `${currentUser.displayName} (${currentUser.email || 'Superuser'})`
      : currentUser?.email || 'Superuser (Jorge Hutt)';

    const updatedLocation: LocationRecord = {
      id: target.id,
      code: target.code,
      name: data.name.trim(),
      address: data.address?.trim() || undefined,
      notes: data.notes?.trim() || undefined
    };

    setLocationsList(prev => prev.map(loc => loc.id === id ? updatedLocation : loc));

    const logEntry: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp,
      eventType: 'LOCATION_UPDATED',
      actor,
      sealNumbers: [],
      location: target.code,
      summary: `LOCATION UPDATED: ${target.code} (${data.name.trim()})`,
      details: `Superuser ${actor} updated facility record for ${target.code}. Name: "${data.name.trim()}". Address: "${data.address?.trim() || 'N/A'}".`
    };
    setAuditLogs(prev => [logEntry, ...prev]);

    // Mirror to Firestore database
    saveLocationToFirestore(updatedLocation).catch(err => console.error('[Firestore] Location update failed:', err));
    saveAuditLogToFirestore(logEntry).catch(err => console.error('[Firestore] Log save failed:', err));

    triggerToast(`Location ${target.code} updated successfully.`, 'success');
    return { success: true };
  };

  const handleDeleteLocation = (id: string): { success: boolean; error?: string } => {
    const target = locationsList.find(l => l.id === id);
    if (!target) {
      return { success: false, error: 'Location not found.' };
    }

    const activeSeals = seals.filter(s => (s.location === target.code || s.returnOriginLocation === target.code) && s.status !== 'DISPOSED').length;
    const activeTrips = trips.filter(t => (t.originLocation === target.code || t.destination === target.code) && t.status === 'IN_TRANSIT').length;

    if (activeSeals > 0 || activeTrips > 0) {
      return {
        success: false,
        error: `Cannot delete location "${target.code}": ${activeSeals} active seal(s) and ${activeTrips} in-transit trip(s) depend on this facility.`
      };
    }

    const timestamp = getNowTimestamp();
    const actor = currentUser?.displayName 
      ? `${currentUser.displayName} (${currentUser.email || 'Superuser'})`
      : currentUser?.email || 'Superuser (Jorge Hutt)';

    setLocationsList(prev => prev.filter(l => l.id !== id));

    if (selectedLocation === target.code) {
      setSelectedLocation('ALL');
    }
    if (operatorBranch === target.code) {
      setOperatorBranch('LAX');
    }

    const logEntry: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp,
      eventType: 'LOCATION_DELETED',
      actor,
      sealNumbers: [],
      location: target.code,
      summary: `FACILITY DELETED: ${target.code} (${target.name}) removed from system`,
      details: `Superuser ${actor} deleted location ${target.code} ("${target.name}") from system inventory records.`
    };
    setAuditLogs(prev => [logEntry, ...prev]);

    // Mirror to Firestore database
    deleteLocationFromFirestore(id).catch(err => console.error('[Firestore] Location delete failed:', err));
    saveAuditLogToFirestore(logEntry).catch(err => console.error('[Firestore] Log save failed:', err));

    triggerToast(`Location ${target.code} deleted from system.`, 'warning');
    return { success: true };
  };

  // 13. Explicit Superuser Sync: Force Record All Users & Locations to Firestore
  const handleRecordUsersAndLocationsToFirestore = async (): Promise<boolean> => {
    try {
      const usersToSave = authorizedUsers.length > 0 ? authorizedUsers : INITIAL_AUTHORIZED_USERS;
      const locationsToSave = locationsList.length > 0 ? locationsList : DEFAULT_LOCATIONS;

      await recordUsersAndLocationsToFirestore(usersToSave, locationsToSave);

      const logEntry: AuditLogEntry = {
        id: `LOG-${Date.now()}`,
        timestamp: getNowTimestamp(),
        eventType: 'USER_ROLE_ASSIGNED',
        actor: currentUser ? (currentUser.displayName || currentUser.email || 'Superuser') : 'Superuser (Jorge Hutt)',
        sealNumbers: [],
        summary: `FIRESTORE PERSISTENCE: Recorded ${locationsToSave.length} locations & ${usersToSave.length} users to cnw-seal (default)`,
        details: `Synchronized system locations (${locationsToSave.map(l => l.code).join(', ')}) and authorized users (${usersToSave.map(u => u.email).join(', ')}) into Cloud Firestore.`
      };
      setAuditLogs(prev => [logEntry, ...prev]);
      saveAuditLogToFirestore(logEntry).catch(console.error);

      triggerToast(`Successfully recorded ${locationsToSave.length} locations & ${usersToSave.length} users to Firebase (cnw-seal)!`, 'success');
      return true;
    } catch (e: any) {
      console.error('[Firestore Record Error]', e);
      triggerToast(`Failed to record to Firestore: ${e?.message || e}`, 'warning');
      return false;
    }
  };

  // Quick seal lookup search
  const foundSeal = useMemo(() => {
    if (!lookupQuery.trim()) return null;
    const clean = lookupQuery.trim().replace(/^#/, '');
    return seals.find(s => s.sealNumber === clean);
  }, [lookupQuery, seals]);

  const isDark = theme === 'dark';

  // 1. Initial Loading Screen while checking Firebase session
  if (isAuthLoading && !currentUser) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center font-sans ${
        isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}>
        <div className="flex flex-col items-center gap-4 p-8 text-center animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">CNW-Seal</h1>
            <p className="text-xs text-slate-500 mt-1">Checking authentication credentials...</p>
          </div>
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mt-2" />
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Login Page on app start
  if (!currentUser) {
    return (
      <>
        <LoginPage
          onSignInGoogle={handleSignInGoogle}
          isAuthLoading={isAuthLoading}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          errorMessage={authErrorMessage}
          onClearError={() => setAuthErrorMessage(null)}
        />
        <UnauthorizedDomainModal
          isOpen={unauthorizedDomainModal}
          onClose={() => setUnauthorizedDomainModal(false)}
          onRetrySignIn={handleSignInGoogle}
        />
      </>
    );
  }

  // 3. Unauthorized User Access Rejection:
  // If user signed in with Google but is NOT in authorizedUsers with ACTIVE status,
  // reject access and instruct them to contact the Superuser!
  if (currentUser && !isUserAuthorized) {
    const hasAlreadyRequested = accessRequests.some(
      r => r.email.toLowerCase().trim() === currentUser.email?.toLowerCase().trim() && r.status === 'PENDING'
    );

    return (
      <AccessDeniedScreen
        currentUser={currentUser}
        superusers={superusersList}
        onRequestAccess={handleSubmitAccessRequest}
        hasAlreadyRequested={hasAlreadyRequested}
        onSignOut={handleSignOut}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      
      {/* Header */}
      <Header
        locations={activeLocationCodes}
        locationsList={locationsList}
        selectedLocation={selectedLocation}
        onLocationChange={(loc) => {
          if (isFacilityRestricted) {
            triggerToast(`Facility locked: As an assigned ${currentRole}, your view is constrained to ${userAssignedFacility} Station.`, 'warning');
            return;
          }
          setSelectedLocation(loc);
        }}
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        operatorBranch={operatorBranch}
        onOperatorBranchChange={(branch) => {
          if (isFacilityRestricted) {
            triggerToast(`Facility locked: As an assigned Operator, your view is constrained to ${userAssignedFacility} Station.`, 'warning');
            return;
          }
          setOperatorBranch(branch);
        }}
        destinations={destinations}
        kpiStats={kpiStats}
        onOpenAudit={() => setActiveTab('AUDIT_LOG')}
        onResetData={() => setResetConfirmOpen(true)}
        isResetting={isResettingFirestore}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        currentUser={currentUser}
        onSignInGoogle={handleSignInGoogle}
        onSignOut={handleSignOut}
        isAuthLoading={isAuthLoading}
        seals={scopedSeals}
        onSelectSealForPassport={setSelectedSealForPassport}
        isEnrolledSuperuser={isEnrolledSuperuser}
        onOpenUserManagement={() => handleOpenUserManagement('USERS')}
        onOpenLocations={handleOpenLocations}
        pendingRequestsCount={accessRequests.filter(r => r.status === 'PENDING').length}
        isFacilityRestricted={isFacilityRestricted}
        assignedFacility={userAssignedFacility}
      />

      {/* Main Container in Dark or Light Window */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Navigation Tabs Bar */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b ${
          isDark ? 'border-slate-800' : 'border-slate-300'
        }`}>
          
          {/* Tabs based on Role */}
          <div className={`flex flex-wrap items-center gap-1.5 p-1 rounded-xl border shadow-md ${
            isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-300'
          }`}>
            {(currentRole === 'ADMIN' || currentRole === 'SUPERUSER') ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('MAIN_STOCK')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === 'MAIN_STOCK'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : isDark ? 'text-slate-300 hover:text-white hover:bg-slate-700/60' : 'text-slate-700 hover:text-black hover:bg-slate-100'
                  }`}
                >
                  <Package className="w-4 h-4 text-emerald-400" />
                  <span>Main Stock Inventory</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('TRIP_DISPATCH')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === 'TRIP_DISPATCH'
                      ? currentRole === 'SUPERUSER' ? 'bg-amber-600 text-white shadow-xs' : 'bg-indigo-600 text-white shadow-xs'
                      : isDark ? 'text-slate-300 hover:text-white hover:bg-slate-700/60' : 'text-slate-700 hover:text-black hover:bg-slate-100'
                  }`}
                >
                  <Truck className="w-4 h-4 text-amber-400" />
                  <span>Trip Dispatch</span>
                  {currentRole === 'SUPERUSER' && (
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-400 text-amber-950 font-extrabold uppercase">
                      Rollback
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('ARRIVAL_VERIFY')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === 'ARRIVAL_VERIFY'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : isDark ? 'text-slate-300 hover:text-white hover:bg-slate-700/60' : 'text-slate-700 hover:text-black hover:bg-slate-100'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>Arrival Verification</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('RETURN_RECEPTION')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap relative ${
                    activeTab === 'RETURN_RECEPTION'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : isDark ? 'text-slate-300 hover:text-white hover:bg-slate-700/60' : 'text-slate-700 hover:text-black hover:bg-slate-100'
                  }`}
                >
                  <RotateCcw className="w-4 h-4 text-purple-400" />
                  <span>Return Transit Reception</span>
                  {pendingReturnSeals.length > 0 && (
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500 text-white font-extrabold">
                      {pendingReturnSeals.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('AUDIT_LOG')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === 'AUDIT_LOG'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : isDark ? 'text-slate-300 hover:text-white hover:bg-slate-700/60' : 'text-slate-700 hover:text-black hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>Audit Trail Ledger</span>
                </button>

                {/* Box-type element next to the right of Audit Trail Ledger */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs shadow-2xs whitespace-nowrap ${
                  currentRole === 'SUPERUSER'
                    ? isDark 
                      ? 'bg-amber-950/40 border-amber-700/60 text-amber-200' 
                      : 'bg-amber-50/90 border-amber-300 text-amber-950'
                    : isDark 
                      ? 'bg-slate-900 border-slate-700 text-slate-200' 
                      : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}>
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    currentRole === 'SUPERUSER'
                      ? 'bg-amber-500 ring-2 ring-amber-400/50'
                      : currentRole === 'ADMIN'
                      ? 'bg-indigo-500'
                      : 'bg-emerald-500'
                  }`} />
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[11px] opacity-75">Role:</span>
                    <span className="font-extrabold text-xs">
                      {currentRole === 'SUPERUSER'
                        ? 'Superuser'
                        : currentRole === 'ADMIN'
                        ? 'Admin (Origin / HQ)'
                        : `Operator (${operatorBranch})`}
                    </span>
                    {currentRole === 'SUPERUSER' && (
                      <span className="font-mono text-[9px] uppercase font-black bg-amber-500 text-white px-1.5 py-0.2 rounded shadow-2xs">
                        Override
                      </span>
                    )}
                  </div>

                  {/* Role switch action buttons if Superuser */}
                  {currentRole === 'SUPERUSER' ? (
                    <div className="flex items-center gap-1 pl-1 border-l border-amber-400/40">
                      <button
                        type="button"
                        onClick={() => handleRoleChange('ADMIN')}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer border ${
                          isDark 
                            ? 'bg-amber-900/40 hover:bg-amber-800/60 text-amber-200 border-amber-700' 
                            : 'bg-white hover:bg-amber-100 text-slate-900 border-amber-300 shadow-2xs'
                        }`}
                        title="View system as Administrator"
                      >
                        Admin
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRoleChange('OPERATOR')}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer border ${
                          isDark 
                            ? 'bg-amber-900/40 hover:bg-amber-800/60 text-amber-200 border-amber-700' 
                            : 'bg-white hover:bg-amber-100 text-slate-900 border-amber-300 shadow-2xs'
                        }`}
                        title="View system as Operator"
                      >
                        Operator
                      </button>
                    </div>
                  ) : currentRole === 'ADMIN' && isEnrolledSuperuser ? (
                    <button
                      type="button"
                      onClick={() => handleRoleChange('SUPERUSER')}
                      className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <ShieldAlert className="w-2.5 h-2.5 text-amber-200" />
                      <span>Superuser</span>
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              // Operator Navigation
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('ARRIVAL_VERIFY')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === 'ARRIVAL_VERIFY'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isDark ? 'text-slate-300 hover:text-white hover:bg-slate-700/60' : 'text-slate-700 hover:text-black hover:bg-slate-100'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Container Arrival Verification ({operatorBranch})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('OPERATOR_BRANCH_VIEW')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === 'OPERATOR_BRANCH_VIEW'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isDark ? 'text-slate-300 hover:text-white hover:bg-slate-700/60' : 'text-slate-700 hover:text-black hover:bg-slate-100'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Return Spare Seals to Origin</span>
                  {operatorStagedSpareCount > 0 && (
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-extrabold">
                      {operatorStagedSpareCount}
                    </span>
                  )}
                </button>

                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs shadow-2xs whitespace-nowrap ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-semibold text-[11px] opacity-75">Role:</span>
                  <span className="font-extrabold text-xs">Operator ({operatorBranch})</span>
                  {isEnrolledSuperuser && (
                    <button
                      type="button"
                      onClick={() => handleRoleChange('SUPERUSER')}
                      className="ml-1 px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <ShieldAlert className="w-2.5 h-2.5 text-amber-200" />
                      <span>Superuser</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

        </div>

        {/* ACTIVE MODULE VIEW - Scoped to user's assigned facility when restricted */}
        {activeTab === 'MAIN_STOCK' && (
          <MainStockModule
            seals={scopedSeals}
            selectedLocation={selectedLocation}
            locations={activeLocationCodes}
            locationsList={locationsList}
            isSuperuser={isEnrolledSuperuser || currentRole === 'SUPERUSER'}
            currentRole={currentRole}
            sealToEdit={sealToEditDirectly}
            onClearSealToEdit={() => setSealToEditDirectly(null)}
            onGenerateBatch={handleGenerateBatch}
            onAddSingleSeal={handleAddSingleSeal}
            onEditSeal={handleEditSeal}
            onDeleteSeal={handleDeleteSeal}
            onSelectSealForPassport={setSelectedSealForPassport}
          />
        )}

        {activeTab === 'TRIP_DISPATCH' && (
          <TripDispatchModule
            availableSeals={availableSeals}
            allSeals={scopedSeals}
            trips={scopedTrips}
            currentRole={currentRole}
            selectedLocation={selectedLocation}
            locations={activeLocationCodes}
            destinations={destinations}
            assignedFacility={userAssignedFacility}
            isFacilityRestricted={isFacilityRestricted}
            locationsList={locationsList}
            onAddDestination={handleAddDestination}
            onDispatchTrip={handleDispatchTrip}
            onRollbackTrip={handleRollbackTripDispatch}
            onNavigateToTrips={() => setActiveTab('ARRIVAL_VERIFY')}
          />
        )}

        {activeTab === 'ARRIVAL_VERIFY' && (
          <ArrivalVerificationModule
            trips={scopedTrips}
            seals={scopedSeals}
            currentRole={currentRole}
            operatorBranch={operatorBranch}
            destinations={destinations}
            onVerifyArrivalStandard={handleVerifyArrivalStandard}
            onVerifyArrivalInspectionSwap={handleVerifyArrivalInspectionSwap}
            onRollbackTrip={handleRollbackTripDispatch}
            onSelectSealForPassport={setSelectedSealForPassport}
          />
        )}

        {activeTab === 'RETURN_RECEPTION' && (
          <ReturnReceptionModule
            pendingReturnSeals={pendingReturnSeals}
            allPendingReturnSeals={scopedSeals.filter(s => s.status === 'PENDING_RETURN_TRANSIT')}
            selectedLocation={selectedLocation}
            trips={scopedTrips}
            onConfirmReturnReceived={handleConfirmReturnReceived}
            onSelectSealForPassport={setSelectedSealForPassport}
            onNavigateToMainStock={() => setActiveTab('MAIN_STOCK')}
          />
        )}

        {activeTab === 'AUDIT_LOG' && (
          <AuditLogModule
            auditLogs={scopedAuditLogs}
            seals={scopedSeals}
            onSelectSealForPassport={setSelectedSealForPassport}
          />
        )}

        {/* Operator-Specific Return Dispatch to Origin View */}
        {activeTab === 'OPERATOR_BRANCH_VIEW' && (
          <OperatorReturnDispatchModule
            seals={scopedSeals}
            operatorBranch={operatorBranch}
            destinations={destinations}
            locations={activeLocationCodes}
            trips={scopedTrips}
            currentUser={currentUser}
            onDispatchReturnSeals={handleDispatchReturnSeals}
            onSelectSealForPassport={setSelectedSealForPassport}
          />
        )}

      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className={`px-4 py-3 rounded-xl shadow-2xl border text-xs flex items-center gap-2.5 max-w-md ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-700'
              : toastMessage.type === 'warning'
              ? 'bg-amber-950 text-amber-100 border-amber-700'
              : 'bg-slate-950 text-slate-100 border-slate-700'
          }`}>
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toastMessage.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
            {toastMessage.type === 'info' && <Info className="w-4 h-4 text-indigo-400 shrink-0" />}
            <span className="font-semibold">{toastMessage.text}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="ml-auto text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Seal Lookup Dialog - Darker Gray Box (bg-slate-200) */}
      {showLookupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-200 rounded-xl shadow-2xl border border-slate-300 w-full max-w-md p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-300">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Search className="w-4 h-4 text-indigo-700" />
                Quick Seal Number Lookup
              </h3>
              <button
                type="button"
                onClick={() => setShowLookupModal(false)}
                className="text-slate-600 hover:text-slate-950"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Enter Seal Number
                </label>
                <input
                  type="text"
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  placeholder="e.g. 849050 or 849055"
                  autoFocus
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-sm font-extrabold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {lookupQuery.trim() && (
                <div className="mt-4">
                  {foundSeal ? (
                    <div className="p-3.5 bg-slate-300 rounded-lg border border-slate-400 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-extrabold text-slate-950 text-sm">#{foundSeal.sealNumber}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          foundSeal.status === 'AVAILABLE'
                            ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                            : foundSeal.status === 'IN_TRANSIT_OUTBOUND'
                            ? 'bg-amber-100 text-amber-950 border border-amber-300'
                            : foundSeal.status === 'PENDING_RETURN_TRANSIT'
                            ? 'bg-purple-100 text-purple-950 border border-purple-300'
                            : 'bg-slate-400 text-slate-900'
                        }`}>
                          {foundSeal.status}
                        </span>
                      </div>
                      <div className="text-slate-800 font-semibold">
                        Box Ref: <strong className="font-mono text-slate-950 font-bold">{foundSeal.boxRef}</strong> · Registered: {foundSeal.purchaseDate}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSealForPassport(foundSeal);
                          setShowLookupModal(false);
                        }}
                        className="w-full py-1.5 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Open Complete Seal Passport</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 text-center text-xs text-rose-950 bg-rose-100 rounded-lg border border-rose-300 font-bold">
                      No seal found matching &ldquo;{lookupQuery}&rdquo; in current records.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Superuser Reset Confirmation Modal */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Wipe Firestore Collections</h3>
                <p className="text-xs text-rose-300 font-semibold">Superuser Database Maintenance</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              This action will permanently wipe all documents from the following collections in the Firestore database:
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-xs font-mono font-bold text-slate-200">auditLogs</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-xs font-mono font-bold text-slate-200">locations</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-xs font-mono font-bold text-slate-200">seals</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-xs font-mono font-bold text-slate-200">trips</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs mb-5">
              <p className="font-semibold">Note: User accounts &amp; authorizations in the <code className="font-mono text-amber-200">users</code> collection will remain safely intact.</p>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                disabled={isResettingFirestore}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleWipeFirestoreCollections}
                disabled={isResettingFirestore}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isResettingFirestore ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Wiping Firestore...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Wipe All Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Firebase Unauthorized Domain Modal */}
      <UnauthorizedDomainModal
        isOpen={unauthorizedDomainModal}
        onClose={() => setUnauthorizedDomainModal(false)}
        onRetrySignIn={handleSignInGoogle}
      />

      {/* Seal Passport Modal */}
      {selectedSealForPassport && (
        <SealPassportModal
          seal={selectedSealForPassport}
          onClose={() => setSelectedSealForPassport(null)}
          trips={trips}
          auditLogs={auditLogs}
          isSuperuser={isEnrolledSuperuser || currentRole === 'SUPERUSER'}
          onTriggerEdit={(seal) => {
            setSelectedSealForPassport(null);
            setActiveTab('MAIN_STOCK');
            setSealToEditDirectly(seal);
          }}
        />
      )}

      {/* Superuser User Enrollment & Role Governance Console Modal */}
      {isUserManagementOpen && (
        <UserManagementModal
          isOpen={isUserManagementOpen}
          onClose={() => setIsUserManagementOpen(false)}
          authorizedUsers={authorizedUsers}
          accessRequests={accessRequests}
          currentUser={currentUser}
          onEnrollUser={handleEnrollUser}
          onUpdateUser={handleUpdateUser}
          onUpdateUserRole={handleUpdateUserRole}
          onUpdateUserStation={handleUpdateUserStation}
          onToggleUserStatus={handleToggleUserStatus}
          onRemoveUser={handleRemoveUser}
          onApproveAccessRequest={handleApproveAccessRequest}
          onRejectAccessRequest={handleRejectAccessRequest}
          destinations={destinations}
          locations={activeLocationCodes}
          locationsList={locationsList}
          seals={seals}
          trips={trips}
          onCreateLocation={handleCreateLocation}
          onUpdateLocation={handleUpdateLocation}
          onDeleteLocation={handleDeleteLocation}
          initialTab={userManagementInitialTab}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      )}

      {/* Footer */}
      <footer className={`py-4 mt-auto border-t transition-colors ${
        isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-white border-slate-300 text-slate-600'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2">
            <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>CNW-Seal</span>
            <span>·</span>
            <span>Security Seal Chain of Custody &amp; Inventory Management</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span>Firebase Firestore: cnw-seal (default)</span>
            <span>·</span>
            <span>ISO/PAS 17712 High-Security Specification</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
