import React, { useState, useMemo, useEffect } from 'react';
import { 
  Truck, ShieldCheck, ArrowRight, Plus, AlertTriangle, CheckCircle2, 
  MapPin, Calendar, FileText, Tag, PlusCircle, X, Info, RotateCcw,
  ShieldAlert, AlertCircle, Lock
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../services/firestoreService';
import { Seal, Trip, UserRole, LocationRecord } from '../types';

interface TripDispatchModuleProps {
  availableSeals: Seal[];
  allSeals: Seal[];
  trips?: Trip[];
  currentRole?: UserRole;
  selectedLocation: string;
  locations: readonly string[] | string[];
  destinations: string[];
  assignedFacility?: string;
  isFacilityRestricted?: boolean;
  locationsList?: LocationRecord[];
  onAddDestination: (newDest: string) => void;
  onDispatchTrip: (tripData: {
    originLocation: string;
    destination: string;
    dispatchDate: string;
    hawbs: string[];
    containerOrTruckId: string;
    primarySealNumber: string;
    extraSealNumber: string;
    notes: string;
  }) => { success: boolean; tripId?: string; error?: string };
  onRollbackTrip?: (tripId: string, reason: string) => { success: boolean; error?: string };
  onNavigateToTrips: () => void;
}

export const TripDispatchModule: React.FC<TripDispatchModuleProps> = ({
  availableSeals,
  allSeals,
  trips = [],
  currentRole = 'ADMIN',
  selectedLocation,
  locations,
  destinations,
  assignedFacility,
  isFacilityRestricted = false,
  locationsList = [],
  onAddDestination,
  onDispatchTrip,
  onRollbackTrip,
  onNavigateToTrips
}) => {
  // Locations sourced directly from the Firestore 'locations' collection
  const [firestoreLocations, setFirestoreLocations] = useState<LocationRecord[]>(
    locationsList && locationsList.length > 0 ? locationsList : []
  );

  useEffect(() => {
    if (locationsList && locationsList.length > 0) {
      setFirestoreLocations(locationsList);
    }
  }, [locationsList]);

  // Live Firestore snapshot listener to ensure destination options always come from the database
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, COLLECTIONS.LOCATIONS),
      (snapshot) => {
        const docsList: LocationRecord[] = [];
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data() as LocationRecord;
          if (data && data.code) {
            docsList.push({
              id: docSnap.id,
              code: data.code.toUpperCase().trim(),
              name: data.name || data.code,
              address: data.address,
              notes: data.notes
            });
          }
        });
        setFirestoreLocations(docsList);
      },
      (error) => {
        console.warn('[TripDispatch] Firestore locations sync:', error);
      }
    );
    return () => unsub();
  }, []);

  // Superuser-recorded locations directly from Firestore
  const recordedLocations = useMemo(() => {
    if (firestoreLocations.length > 0) {
      return firestoreLocations;
    }
    if (locationsList && locationsList.length > 0) {
      return locationsList;
    }
    return locations.map(code => ({
      id: `LOC-${code}`,
      code: String(code),
      name: `${code} Station`
    }));
  }, [firestoreLocations, locationsList, locations]);

  // Origin is derived from user record (if assigned to a specific facility), or chosen in the form
  const userAssignedOrigin = useMemo(() => {
    if (assignedFacility && assignedFacility !== 'ALL') {
      return assignedFacility;
    }
    if (recordedLocations.length > 0) {
      return recordedLocations[0].code;
    }
    return locations[0] || 'LAX';
  }, [assignedFacility, recordedLocations, locations]);

  // Origin is ONLY locked if the user is explicitly restricted to a single assigned facility by their user record
  const isOriginLocked = Boolean(isFacilityRestricted && assignedFacility && assignedFacility !== 'ALL');

  const [originLocation, setOriginLocation] = useState<string>(userAssignedOrigin);

  // Keep originLocation synchronized with userAssignedOrigin ONLY when the user is restricted by their record
  React.useEffect(() => {
    if (isOriginLocked && userAssignedOrigin) {
      setOriginLocation(userAssignedOrigin);
    }
  }, [isOriginLocked, userAssignedOrigin]);

  // Destination options strictly sourced from records in the Firestore locations collection
  const destinationOptions = useMemo(() => {
    const pool = recordedLocations.length > 0 ? recordedLocations : (locationsList || []);
    const filtered = pool.filter(l => l.code !== originLocation);
    if (filtered.length > 0) return filtered;
    return pool;
  }, [recordedLocations, locationsList, originLocation]);

  // Destination state (default to first destination from Firestore records that isn't origin)
  const defaultDest = useMemo(() => {
    const candidate = destinationOptions.find(d => d.code !== originLocation);
    if (candidate) return candidate.code;
    return destinationOptions[0]?.code || 'SFO';
  }, [destinationOptions, originLocation]);

  const [destination, setDestination] = useState<string>(defaultDest);

  // Keep destination synchronized with valid Firestore location options
  React.useEffect(() => {
    if (!destination || destination === originLocation || !destinationOptions.some(d => d.code === destination)) {
      if (destinationOptions.length > 0) {
        setDestination(destinationOptions[0].code);
      }
    }
  }, [destination, originLocation, destinationOptions]);

  const [dispatchDate, setDispatchDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [containerId, setContainerId] = useState<string>('');
  const [hawbInput, setHawbInput] = useState<string>('');
  const [primarySeal, setPrimarySeal] = useState<string>('');
  const [extraSeal, setExtraSeal] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // New Destination modal state
  const [showAddDestModal, setShowAddDestModal] = useState(false);
  const [newDestCode, setNewDestCode] = useState('');
  const [newDestError, setNewDestError] = useState('');

  // Submission feedback
  const [formError, setFormError] = useState<string>('');
  const [successInfo, setSuccessInfo] = useState<{ 
    tripId: string; 
    origin: string; 
    destination: string; 
    primary: string; 
    extra: string 
  } | null>(null);

  // Superuser Rollback modal state
  const [selectedTripToRollback, setSelectedTripToRollback] = useState<Trip | null>(null);
  const [rollbackReason, setRollbackReason] = useState<string>('Clerical error: Incorrect seals assigned during dispatch');
  const [rollbackError, setRollbackError] = useState<string>('');

  const handleOpenRollbackModal = (trip: Trip) => {
    setSelectedTripToRollback(trip);
    setRollbackReason(`Admin dispatch error on ${trip.id}: Primary Seal #${trip.primarySealNumber} & Spare #${trip.extraSealNumber} unassigned and returned to origin stock`);
    setRollbackError('');
  };

  const handleExecuteRollback = () => {
    if (!selectedTripToRollback || !onRollbackTrip) return;
    if (!rollbackReason.trim()) {
      setRollbackError('Mandatory: Please provide an explanation / justification for the audit trail.');
      return;
    }
    const res = onRollbackTrip(selectedTripToRollback.id, rollbackReason.trim());
    if (res.success) {
      setSelectedTripToRollback(null);
      setRollbackReason('');
    } else {
      setRollbackError(res.error || 'Failed to rollback trip.');
    }
  };

  // Available seals physically located at the chosen Origin Station
  const originAvailableSeals = useMemo(() => {
    return allSeals.filter(s => s.status === 'AVAILABLE' && s.location === originLocation);
  }, [allSeals, originLocation]);

  // Trips associated with the facility (scoped if user is facility-restricted, otherwise all trips)
  const stationTrips = useMemo(() => {
    if (isFacilityRestricted && assignedFacility && assignedFacility !== 'ALL') {
      return trips.filter(t => t.originLocation === assignedFacility || t.destination === assignedFacility);
    }
    return trips;
  }, [trips, isFacilityRestricted, assignedFacility]);

  const inTransitTrips = useMemo(() => {
    return stationTrips.filter(t => t.status === 'IN_TRANSIT');
  }, [stationTrips]);

  const rolledBackTrips = useMemo(() => {
    return stationTrips.filter(t => t.status === 'ROLLED_BACK');
  }, [stationTrips]);

  // Auto-select first two available seals from origin station if not set or changed
  React.useEffect(() => {
    if (originAvailableSeals.length >= 1) {
      if (!originAvailableSeals.some(s => s.sealNumber === primarySeal)) {
        setPrimarySeal(originAvailableSeals[0].sealNumber);
      }
    } else {
      setPrimarySeal('');
    }

    if (originAvailableSeals.length >= 2) {
      if (!originAvailableSeals.some(s => s.sealNumber === extraSeal) || extraSeal === originAvailableSeals[0].sealNumber) {
        setExtraSeal(originAvailableSeals[1].sealNumber);
      }
    } else {
      setExtraSeal('');
    }
  }, [originAvailableSeals]);

  // Parse HAWBs from space/comma separated input
  const parsedHawbs = useMemo(() => {
    return hawbInput
      .split(/[\s,]+/)
      .map(m => m.trim())
      .filter(m => m.length > 0);
  }, [hawbInput]);

  // Validation
  const isSealConflict = Boolean(primarySeal && extraSeal && primarySeal === extraSeal);

  const handleAddDestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newDestCode.trim().toUpperCase();
    if (!cleanCode) {
      setNewDestError('Destination code cannot be empty.');
      return;
    }
    if (recordedLocations.some(l => l.code === cleanCode) || destinations.includes(cleanCode)) {
      setNewDestError(`Destination code "${cleanCode}" already exists.`);
      return;
    }
    onAddDestination(cleanCode);
    setDestination(cleanCode);
    setNewDestCode('');
    setShowAddDestModal(false);
    setNewDestError('');
  };

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!originLocation) {
      setFormError('Please select an Origin Station.');
      return;
    }

    if (!destination) {
      setFormError('Please select a Destination Station.');
      return;
    }

    if (originLocation === destination) {
      setFormError(`Origin Station and Destination Station cannot be the same (${originLocation}).`);
      return;
    }

    if (!containerId.trim()) {
      setFormError('Please enter a Container / Truck / Unit ID.');
      return;
    }

    if (!primarySeal) {
      setFormError(`Please select a Primary Door Seal available at ${originLocation}.`);
      return;
    }

    if (!extraSeal) {
      setFormError(`Please select an Inside Spare Extra Seal available at ${originLocation}.`);
      return;
    }

    if (primarySeal === extraSeal) {
      setFormError('Primary Seal and Extra Seal MUST be different seals.');
      return;
    }

    if (parsedHawbs.length === 0) {
      setFormError('Please enter at least one House Air Waybill (HAWB).');
      return;
    }

    const res = onDispatchTrip({
      originLocation,
      destination,
      dispatchDate,
      hawbs: parsedHawbs,
      containerOrTruckId: containerId.trim().toUpperCase(),
      primarySealNumber: primarySeal,
      extraSealNumber: extraSeal,
      notes: notes.trim()
    });

    if (res.success && res.tripId) {
      setSuccessInfo({
        tripId: res.tripId,
        origin: originLocation,
        destination,
        primary: primarySeal,
        extra: extraSeal
      });
      setContainerId(`TRK-${Math.floor(1000 + Math.random() * 9000)}`);
    } else {
      setFormError(res.error || 'Failed to dispatch trip.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Title Card - Darker Gray Data Box (bg-slate-200) */}
      <div className="bg-slate-200 rounded-xl border border-slate-300 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Truck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-950">Trip Dispatch &amp; Seal Assignment</h2>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-indigo-100 text-indigo-950 border border-indigo-300">
                  Origin: {originLocation}
                </span>
              </div>
              <p className="text-xs text-slate-700 font-medium mt-0.5">
                Assign 1 Primary Door Seal + 1 Inside Spare Seal from {originLocation} available stock. Unused spare seals return strictly to Origin {originLocation}.
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs font-bold text-slate-700 block">Available at {originLocation}:</span>
            <span className="font-mono text-base font-extrabold text-emerald-900 tabular-nums">
              {originAvailableSeals.length} Seals Ready
            </span>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successInfo && (
        <div className="bg-emerald-100 border border-emerald-300 rounded-xl p-5 animate-in fade-in zoom-in-95">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-emerald-950">
                  Trip {successInfo.tripId} Successfully Dispatched from {successInfo.origin} to {successInfo.destination}!
                </h3>
                <p className="text-xs text-emerald-900 mt-1 font-medium">
                  Primary Door Seal <strong className="font-mono">#{successInfo.primary}</strong> and Inside Spare Seal <strong className="font-mono">#{successInfo.extra}</strong> are now in <strong>Outbound Transit</strong>.
                </p>
                <div className="mt-2 text-[11px] text-emerald-950 font-semibold bg-emerald-200/60 p-2 rounded border border-emerald-300">
                  Custody Note: If Spare Seal #{successInfo.extra} remains unused at {successInfo.destination}, it will be scheduled to return strictly to Origin Station {successInfo.origin}.
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onNavigateToTrips}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    View In-Transit Shipments
                  </button>
                  <button
                    type="button"
                    onClick={() => setSuccessInfo(null)}
                    className="text-xs font-bold text-emerald-900 hover:text-emerald-950 underline cursor-pointer"
                  >
                    Dispatch Another Shipment
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSuccessInfo(null)}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Error alert */}
      {formError && (
        <div className="p-3 bg-rose-100 border border-rose-300 text-rose-950 rounded-xl text-xs flex items-center gap-2 font-semibold">
          <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Available Seals Warning if low stock at chosen origin */}
      {originAvailableSeals.length < 2 && (
        <div className="p-4 bg-amber-100 border border-amber-300 text-amber-950 rounded-xl text-xs flex items-start gap-3 font-medium">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Insufficient Available Seals at {originLocation} Station!</h4>
            <p className="mt-0.5 text-amber-900">
              Each dispatch requires 2 distinct available seals (1 Primary Door + 1 Inside Spare). You currently have{' '}
              <strong>{originAvailableSeals.length} available at {originLocation}</strong>. Please switch origin, or register new seals in the Main Stock tab.
            </p>
          </div>
        </div>
      )}

      {/* Main Dispatch Form - Darker Gray Data Box (bg-slate-200) */}
      <form onSubmit={handleDispatchSubmit} className="bg-slate-200 rounded-xl border border-slate-300 shadow-xs overflow-hidden">
        
        <div className="p-6 space-y-6">
          
          {/* Section 1: Transit Route & Identification */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-indigo-700" />
              1. Origin, Destination &amp; Vehicle Identification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              
              {/* Origin Station - Always the location assigned to the user */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-900">
                    Origin Station (Departure) <span className="text-rose-600">*</span>
                  </label>
                  {isOriginLocked && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-900 border border-indigo-200" title={`Departure origin is locked to your assigned facility in your user record: ${originLocation}`}>
                      <Lock className="w-2.5 h-2.5" />
                      <span>Assigned ({originLocation})</span>
                    </span>
                  )}
                </div>
                <select
                  value={originLocation}
                  onChange={(e) => {
                    if (isOriginLocked) return;
                    setOriginLocation(e.target.value);
                  }}
                  disabled={isOriginLocked}
                  required
                  className={`w-full px-3 py-2 border rounded-lg font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isOriginLocked 
                      ? 'bg-slate-100 border-slate-300 cursor-not-allowed opacity-90' 
                      : 'bg-white border-slate-300 cursor-pointer'
                  }`}
                  title={isOriginLocked ? `Departure origin is locked to your assigned facility in your user record: ${originLocation}` : 'Select departure origin station for this dispatch'}
                >
                  {recordedLocations.map(loc => (
                    <option key={loc.id || loc.code} value={loc.code}>
                      {loc.code} - {loc.name}
                    </option>
                  ))}
                  {!recordedLocations.some(l => l.code === originLocation) && (
                    <option value={originLocation}>{originLocation} Station</option>
                  )}
                </select>
                <span className="text-[10px] text-slate-600 block mt-1">
                  {isOriginLocked 
                    ? `Assigned in user record (${originLocation}). Seals drawn from this inventory.` 
                    : `Origin specified in form. Seals drawn from ${originLocation} inventory.`}
                </span>
              </div>

              {/* Destination */}
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Destination Station <span className="text-rose-600">*</span>
                </label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {destinationOptions.map(loc => (
                    <option key={loc.id || loc.code} value={loc.code}>
                      {loc.code} - {loc.name}
                    </option>
                  ))}
                  {!destinationOptions.some(l => l.code === destination) && destination && (
                    <option value={destination}>{destination}</option>
                  )}
                </select>
                <span className="text-[10px] text-slate-600 block mt-1">Target arrival destination</span>
              </div>

              {/* Container / Truck ID */}
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Container / Truck / Unit ID <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={containerId}
                  onChange={(e) => setContainerId(e.target.value)}
                  placeholder="e.g. TRK-8821 or CONT-4091"
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-600 block mt-1">Trailer or container number</span>
              </div>

              {/* Dispatch Date */}
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Dispatch Date <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-600 block mt-1">Departure timestamp</span>
              </div>

            </div>
          </div>

          {/* Section 2: Air Waybills */}
          <div className="pt-4 border-t border-slate-300">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-700" />
              2. House Air Waybill(s) (HAWB)
            </h3>
            <p className="text-xs text-slate-700 font-medium mb-2">
              Enter one or multiple HAWBs separated by spaces or commas (e.g. <span className="font-mono font-bold">38470180 07407444</span>).
            </p>
            <input
              type="text"
              value={hawbInput}
              onChange={(e) => setHawbInput(e.target.value)}
              placeholder="e.g. 38470180 07407444"
              required
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs font-semibold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {parsedHawbs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {parsedHawbs.map((h, idx) => (
                  <span key={idx} className="font-mono font-bold text-[11px] bg-slate-300 text-slate-900 px-2 py-0.5 rounded border border-slate-400">
                    HAWB #{h}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Dual Seal Assignment from Origin Available Stock */}
          <div className="pt-4 border-t border-slate-300">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-700" />
                3. Mandatory Dual-Seal Assignment (Drawn from {originLocation} Inventory)
              </h3>
              <span className="text-[11px] font-bold text-slate-700">
                {originAvailableSeals.length} available at {originLocation}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              {/* Primary Seal */}
              <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-300">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <span>Primary Door Seal</span>
                    <span className="text-rose-600">*</span>
                  </label>
                  <span className="text-[10px] uppercase font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-300">
                    Locked on Exterior Door
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 mb-2">
                  Applied to trailer door handle before departure from {originLocation}.
                </p>
                <select
                  value={primarySeal}
                  onChange={(e) => setPrimarySeal(e.target.value)}
                  required
                  disabled={originAvailableSeals.length === 0}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="">-- Select Seal Number --</option>
                  {originAvailableSeals.map(s => (
                    <option key={s.sealNumber} value={s.sealNumber}>
                      {s.sealNumber}
                    </option>
                  ))}
                </select>
              </div>

              {/* Extra Spare Seal */}
              <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-300">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                    <span>Inside Extra Spare Seal</span>
                    <span className="text-rose-600">*</span>
                  </label>
                  <span className="text-[10px] uppercase font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded border border-purple-300">
                    Placed Inside Enclosure
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 mb-2">
                  Placed inside container. Used only if CBP cuts door seal mid-route.
                </p>
                <select
                  value={extraSeal}
                  onChange={(e) => setExtraSeal(e.target.value)}
                  required
                  disabled={originAvailableSeals.length < 2}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="">-- Select Seal Number --</option>
                  {originAvailableSeals.map(s => (
                    <option key={s.sealNumber} value={s.sealNumber} disabled={s.sealNumber === primarySeal}>
                      {s.sealNumber}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Strict Origin Return Policy Callout */}
            <div className="mt-3 p-3 bg-purple-100 border border-purple-300 rounded-lg text-purple-950 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="font-bold">Origin Custody &amp; Return Routing:</strong> When standard arrival is verified at {destination}, unused Spare Seal <strong className="font-mono">#{extraSeal || '[Extra Seal]'}</strong> will automatically be routed <strong>strictly back to Origin Station {originLocation}</strong>. It cannot be co-mingled or transferred into {destination} local stock.
              </div>
            </div>

            {isSealConflict && (
              <div className="mt-2 text-rose-700 font-bold text-xs flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Primary and Extra Seal must not be identical!</span>
              </div>
            )}
          </div>

          {/* Section 4: Dispatch Notes */}
          <div className="pt-4 border-t border-slate-300">
            <label className="block font-bold text-slate-900 mb-1 text-xs">
              Operational Notes &amp; Inspection Observations
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

        </div>

        {/* Form Submission Footer */}
        <div className="px-6 py-4 bg-slate-300 border-t border-slate-400 flex items-center justify-between">
          <div className="text-xs text-slate-700 font-semibold">
            Departure: <strong className="text-slate-950">{originLocation} Station</strong> &rarr; Destination: <strong className="text-slate-950">{destination} Station</strong>
          </div>
          <button
            type="submit"
            disabled={originAvailableSeals.length < 2 || isSealConflict}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            <span>Confirm Outbound Dispatch</span>
          </button>
        </div>

      </form>

      {/* Superuser & Admin Outbound Dispatches Oversight Section */}
      <div className="bg-slate-200 rounded-xl border border-slate-300 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-300">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
              currentRole === 'SUPERUSER' ? 'bg-amber-600' : 'bg-slate-800'
            }`}>
              {currentRole === 'SUPERUSER' ? <ShieldAlert className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-950">Active Dispatches &amp; Rollback Controls</h3>
                {currentRole === 'SUPERUSER' ? (
                  <span className="font-mono text-[10px] uppercase font-black bg-amber-500 text-white px-2 py-0.5 rounded shadow-2xs">
                    Superuser Rollback Enabled
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-600 bg-slate-300 px-2 py-0.5 rounded">
                    Admin Read-Only
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-700 font-medium">
                {currentRole === 'SUPERUSER'
                  ? 'As Superuser, you can undo/rollback accidental dispatches (e.g. wrong seals selected) and return seals to origin stock.'
                  : 'Outbound shipments currently in transit. Errors must be rolled back by a Superuser.'}
              </p>
            </div>
          </div>

          <div className="text-xs font-semibold text-slate-700">
            Active In-Transit: <strong className="text-slate-950">{inTransitTrips.length}</strong>
            {rolledBackTrips.length > 0 && (
              <span className="ml-3 text-rose-800">
                Rolled Back: <strong>{rolledBackTrips.length}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Trips Cards */}
        {inTransitTrips.length === 0 && rolledBackTrips.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-600 font-medium bg-slate-100 rounded-lg border border-slate-300">
            No active in-transit dispatches currently recorded.
          </div>
        ) : (
          <div className="space-y-3">
            {inTransitTrips.map(trip => (
              <div 
                key={trip.id} 
                className="bg-white rounded-lg border border-slate-300 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black text-slate-950">{trip.id}</span>
                    <span className="font-bold text-xs text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                      {trip.originLocation} &rarr; {trip.destination}
                    </span>
                    <span className="text-[11px] font-mono text-slate-600">Unit: {trip.containerOrTruckId}</span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-300">
                      In-Transit Outbound
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-medium">Primary Door:</span>
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        #{trip.primarySealNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-medium">Inside Spare:</span>
                      <span className="font-mono font-bold text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                        #{trip.extraSealNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span>HAWB(s):</span>
                      <span className="font-mono font-semibold text-slate-800 truncate max-w-xs">{trip.hawbs.join(', ')}</span>
                    </div>
                  </div>

                  {trip.notes && (
                    <p className="text-[11px] text-slate-600 italic">
                      Notes: {trip.notes}
                    </p>
                  )}
                </div>

                {/* Rollback Action Button */}
                <div className="flex items-center gap-2 shrink-0">
                  {currentRole === 'SUPERUSER' ? (
                    <button
                      type="button"
                      onClick={() => handleOpenRollbackModal(trip)}
                      className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Undo dispatch and restore seals to origin stock"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Rollback Dispatch</span>
                    </button>
                  ) : (
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-300 px-2.5 py-1 rounded inline-block">
                        Superuser Required to Undo
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Rolled Back Trips History */}
            {rolledBackTrips.map(trip => (
              <div 
                key={trip.id} 
                className="bg-rose-50/80 rounded-lg border border-rose-200 p-3.5 text-xs text-rose-950 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold line-through text-slate-500">{trip.id}</span>
                    <span className="font-bold text-[10px] uppercase bg-rose-200 text-rose-950 border border-rose-300 px-2 py-0.2 rounded">
                      ROLLED BACK / VOIDED
                    </span>
                    <span className="text-slate-600">({trip.originLocation} &rarr; {trip.destination})</span>
                  </div>
                  <div className="text-[11px] text-rose-900 mt-1">
                    <strong>Rolled back by:</strong> {trip.rolledBackBy || 'Superuser'} on {trip.rolledBackAt || 'N/A'}.
                    <span className="ml-2 font-medium">Reason: &ldquo;{trip.rollbackReason}&rdquo;</span>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-600">
                  Reverted seals #{trip.primarySealNumber} &amp; #{trip.extraSealNumber} to {trip.originLocation}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Superuser Rollback Confirmation Modal */}
      {selectedTripToRollback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-200 rounded-xl shadow-2xl border border-slate-300 w-full max-w-lg p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-300">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-950 text-sm">
                    Superuser Rollback: Void Trip {selectedTripToRollback.id}
                  </h3>
                  <p className="text-[11px] text-slate-600">Dispatch Error Correction &amp; Seal Reversion</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTripToRollback(null)}
                className="text-slate-600 hover:text-slate-900 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {rollbackError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-100 text-rose-950 text-xs border border-rose-300 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                <span>{rollbackError}</span>
              </div>
            )}

            {/* Trip Details Summary */}
            <div className="mt-4 p-3.5 bg-white rounded-lg border border-slate-300 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-700">Trip Identifier:</span>
                <span className="font-mono font-extrabold text-slate-950">{selectedTripToRollback.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-800">
                <div>
                  <span className="text-slate-500">Route:</span>{' '}
                  <strong className="text-slate-950">{selectedTripToRollback.originLocation} &rarr; {selectedTripToRollback.destination}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Vehicle / Unit:</span>{' '}
                  <span className="font-mono font-bold text-slate-950">{selectedTripToRollback.containerOrTruckId}</span>
                </div>
                <div>
                  <span className="text-slate-500">Primary Door Seal:</span>{' '}
                  <strong className="font-mono text-emerald-900">#{selectedTripToRollback.primarySealNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Inside Spare Seal:</span>{' '}
                  <strong className="font-mono text-purple-900">#{selectedTripToRollback.extraSealNumber}</strong>
                </div>
              </div>
              <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                <span>HAWB(s): </span>
                <span className="font-mono font-semibold">{selectedTripToRollback.hawbs.join(', ')}</span>
              </div>
            </div>

            {/* Forensics notice */}
            <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-950 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Forensic Rollback Policy:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-900 font-medium">
                <li>Primary Seal <strong className="font-mono">#{selectedTripToRollback.primarySealNumber}</strong> and Inside Spare <strong className="font-mono">#{selectedTripToRollback.extraSealNumber}</strong> will immediately return to <strong>AVAILABLE</strong> inventory at <strong>{selectedTripToRollback.originLocation} Station</strong>.</li>
                <li>The trip record will be flagged as <strong>ROLLED_BACK</strong>.</li>
                <li>A permanent audit log entry will be logged capturing your credentials, timestamp, and justification reason.</li>
              </ul>
            </div>

            {/* Mandatory Reason Form */}
            <div className="mt-4">
              <label className="block font-bold text-slate-900 text-xs mb-1">
                Mandatory Reason for Rollback / Correction <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                rows={3}
                required
                placeholder="Explain the error (e.g., Admin selected seal #849050 instead of #849051, truck departure canceled, miskeyed HAWB)..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Action buttons */}
            <div className="mt-5 pt-3 flex justify-end gap-2 border-t border-slate-300">
              <button
                type="button"
                onClick={() => setSelectedTripToRollback(null)}
                className="px-3.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRollback}
                disabled={!rollbackReason.trim()}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirm &amp; Execute Rollback</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Destination Station Modal */}
      {showAddDestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-200 rounded-xl shadow-2xl border border-slate-300 w-full max-w-sm p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-300">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-indigo-700" />
                Add New Destination Station
              </h3>
              <button
                type="button"
                onClick={() => setShowAddDestModal(false)}
                className="text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {newDestError && (
              <div className="mt-3 p-2 rounded bg-rose-100 text-rose-950 text-xs border border-rose-300 font-semibold">
                {newDestError}
              </div>
            )}

            <form onSubmit={handleAddDestSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Destination Code (IATA / Hub Code) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={newDestCode}
                  onChange={(e) => setNewDestCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SEA, DFW, ATL"
                  maxLength={5}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-300">
                <button
                  type="button"
                  onClick={() => setShowAddDestModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-700 hover:bg-slate-300 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Add Station
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
