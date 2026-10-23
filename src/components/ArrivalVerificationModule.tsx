import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, AlertTriangle, Truck, ShieldCheck, ArrowRight, 
  MapPin, Calendar, Clock, FileText, Check, AlertCircle, X, RotateCcw,
  ShieldAlert, Trash2, Search, Scissors, Loader2
} from 'lucide-react';
import { Trip, Seal, UserRole } from '../types';

interface ArrivalVerificationModuleProps {
  trips: Trip[];
  seals: Seal[];
  currentRole: UserRole;
  operatorBranch: string;
  assignedFacility?: string;
  isFacilityRestricted?: boolean;
  destinations: string[];
  onVerifyArrivalStandard: (tripId: string, arrivalNotes?: string) => Promise<void> | void;
  onVerifyArrivalInspectionSwap: (tripId: string, reason: string, arrivalNotes?: string) => Promise<void> | void;
  onRollbackTrip?: (tripId: string, reason: string) => void;
  onSelectSealForPassport: (seal: Seal) => void;
}

export const ArrivalVerificationModule: React.FC<ArrivalVerificationModuleProps> = ({
  trips,
  seals,
  currentRole,
  operatorBranch,
  assignedFacility,
  isFacilityRestricted,
  destinations,
  onVerifyArrivalStandard,
  onVerifyArrivalInspectionSwap,
  onRollbackTrip,
  onSelectSealForPassport
}) => {
  const isOperator = currentRole === 'OPERATOR';
  const operatorAssignedFacility = (assignedFacility && assignedFacility !== 'ALL') 
    ? assignedFacility 
    : (operatorBranch !== 'ALL' ? operatorBranch : 'LAX');

  const initialBranchFilter = isOperator ? operatorAssignedFacility : 'ALL';
  const [stationFilter, setStationFilter] = useState<string>(initialBranchFilter);
  const [activeTab, setActiveTab] = useState<'IN_TRANSIT' | 'COMPLETED' | 'DISPOSED' | 'ROLLED_BACK'>('IN_TRANSIT');
  const [searchQuery, setSearchQuery] = useState('');

  // Superuser Rollback modal state
  const [selectedTripToRollback, setSelectedTripToRollback] = useState<Trip | null>(null);
  const [rollbackReason, setRollbackReason] = useState<string>('Admin dispatch clerical error: Wrong seal numbers assigned');
  const [rollbackError, setRollbackError] = useState<string>('');

  const handleOpenRollback = (trip: Trip) => {
    setSelectedTripToRollback(trip);
    setRollbackReason(`Admin dispatch error on ${trip.id}: Reverting Primary #${trip.primarySealNumber} & Spare #${trip.extraSealNumber} back to origin ${trip.originLocation} stock`);
    setRollbackError('');
  };

  const handleConfirmRollback = () => {
    if (!selectedTripToRollback || !onRollbackTrip) return;
    if (!rollbackReason.trim()) {
      setRollbackError('Mandatory: Please provide a justification for this audit rollback.');
      return;
    }
    onRollbackTrip(selectedTripToRollback.id, rollbackReason.trim());
    setSelectedTripToRollback(null);
  };

  React.useEffect(() => {
    if (isOperator) {
      setStationFilter(operatorAssignedFacility);
    }
  }, [isOperator, operatorAssignedFacility]);

  const [selectedTripForVerification, setSelectedTripForVerification] = useState<Trip | null>(null);
  const [selectedDoorSealChoice, setSelectedDoorSealChoice] = useState<'PRIMARY' | 'EXTRA'>('PRIMARY');
  const [inspectionReason, setInspectionReason] = useState<string>('Customs physical inspection in transit — primary seal broken by officers and replaced with inside spare seal');
  const [dualDisposalConfirmed, setDualDisposalConfirmed] = useState<boolean>(true);
  const [normalDisposalConfirmed, setNormalDisposalConfirmed] = useState<boolean>(true);
  const [arrivalNotes, setArrivalNotes] = useState<string>('Container unloaded at destination receiving bay. Door seal intact upon gate arrival.');
  const [validationError, setValidationError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const handleOpenVerification = (trip: Trip) => {
    setSelectedTripForVerification(trip);
    setSelectedDoorSealChoice('PRIMARY');
    setInspectionReason('Customs physical inspection in transit — primary seal broken by officers and replaced with inside spare seal');
    setDualDisposalConfirmed(true);
    setNormalDisposalConfirmed(true);
    setArrivalNotes(`Container unloaded at ${trip.destination} station bay. Door seal inspected before cutting.`);
    setValidationError('');
    setIsVerifying(false);
  };

  const handleConfirmVerification = async () => {
    if (!selectedTripForVerification) return;
    setValidationError('');

    if (selectedDoorSealChoice === 'PRIMARY') {
      if (!normalDisposalConfirmed) {
        setValidationError('You must confirm that the container was opened and Primary Seal was cut & disposed of.');
        return;
      }
      try {
        setIsVerifying(true);
        await onVerifyArrivalStandard(selectedTripForVerification.id, arrivalNotes.trim());
        setSelectedTripForVerification(null);
        setActiveTab('DISPOSED');
      } catch (err: any) {
        setValidationError(err?.message || 'Failed to save arrival verification to Firestore. Please try again.');
      } finally {
        setIsVerifying(false);
      }
    } else {
      if (!inspectionReason.trim()) {
        setValidationError('Mandatory: Please provide the official reason for seal change (e.g., Customs border inspection).');
        return;
      }
      if (!dualDisposalConfirmed) {
        setValidationError('Mandatory: You must check the dual disposal checkbox confirming both seals were destroyed.');
        return;
      }
      try {
        setIsVerifying(true);
        await onVerifyArrivalInspectionSwap(
          selectedTripForVerification.id, 
          inspectionReason.trim(), 
          arrivalNotes.trim()
        );
        setSelectedTripForVerification(null);
        setActiveTab('DISPOSED');
      } catch (err: any) {
        setValidationError(err?.message || 'Failed to save arrival verification to Firestore. Please try again.');
      } finally {
        setIsVerifying(false);
      }
    }
  };

  const effectiveStation = isOperator ? operatorAssignedFacility : stationFilter;

  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      const matchesStation = effectiveStation === 'ALL' || trip.destination === effectiveStation;
      const matchesTab = activeTab === 'IN_TRANSIT' 
        ? trip.status === 'IN_TRANSIT'
        : activeTab === 'COMPLETED'
        ? (trip.status === 'COMPLETED_STANDARD' || trip.status === 'COMPLETED_INSPECTION_SWAP')
        : trip.status === 'ROLLED_BACK';
      const matchesSearch = 
        trip.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.containerOrTruckId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.primarySealNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.extraSealNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.hawbs.some(m => m.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesStation && matchesTab && matchesSearch;
    });
  }, [trips, effectiveStation, activeTab, searchQuery]);

  // All Disposed seals related to destination station filter
  const disposedSeals = useMemo(() => {
    return seals.filter(s => {
      if (s.status !== 'DISPOSED') return false;
      if (effectiveStation === 'ALL') return true;
      return (
        s.location === effectiveStation ||
        s.currentTripDestination === effectiveStation ||
        s.currentTripOrigin === effectiveStation ||
        s.returnOriginatingDestination === effectiveStation
      );
    });
  }, [seals, effectiveStation]);

  const filteredDisposedSeals = useMemo(() => {
    if (!searchQuery.trim()) return disposedSeals;
    const q = searchQuery.toLowerCase().trim();
    return disposedSeals.filter(s => 
      s.sealNumber.toLowerCase().includes(q) ||
      (s.currentTripId && s.currentTripId.toLowerCase().includes(q)) ||
      (s.disposalReason && s.disposalReason.toLowerCase().includes(q)) ||
      (s.disposedBy && s.disposedBy.toLowerCase().includes(q)) ||
      (s.boxRef && s.boxRef.toLowerCase().includes(q)) ||
      (s.location && s.location.toLowerCase().includes(q)) ||
      (s.currentTripOrigin && s.currentTripOrigin.toLowerCase().includes(q)) ||
      (s.notes && s.notes.toLowerCase().includes(q))
    );
  }, [disposedSeals, searchQuery]);

  const inTransitCount = trips.filter(t => t.status === 'IN_TRANSIT').length;
  const completedCount = trips.filter(t => t.status === 'COMPLETED_STANDARD' || t.status === 'COMPLETED_INSPECTION_SWAP').length;
  const disposedCount = disposedSeals.length;
  const rolledBackCount = trips.filter(t => t.status === 'ROLLED_BACK').length;

  return (
    <div className="space-y-6">
      
      {/* Header Banner - Darker Gray Box (bg-slate-200) */}
      <div className="bg-slate-200 rounded-xl border border-slate-300 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-950">Destination Arrival &amp; Seal Verification</h2>
              {currentRole === 'OPERATOR' && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 border border-emerald-300">
                  {operatorBranch === 'ALL' ? 'All Inbound Stations' : `Station: ${operatorBranch}`}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-700 mt-1 font-medium">
              Verify incoming container door seals, execute standard disposal, or record mid-route inspection spare seal replacements.
            </p>
          </div>

          {/* Filter Bar: Station select & Status tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs bg-slate-300/90 p-1 rounded-lg border border-slate-400">
              <button
                type="button"
                onClick={() => setActiveTab('IN_TRANSIT')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'IN_TRANSIT'
                    ? 'bg-slate-950 text-white shadow-2xs'
                    : 'text-slate-800 hover:text-black'
                }`}
              >
                <Truck className="w-3.5 h-3.5 text-amber-500" />
                <span>In-Transit Inbound</span>
                <span className="font-mono text-[10px] bg-amber-200 text-amber-950 font-extrabold px-1.5 py-0.2 rounded">
                  {inTransitCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('COMPLETED')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'COMPLETED'
                    ? 'bg-slate-950 text-white shadow-2xs'
                    : 'text-slate-800 hover:text-black'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Completed Trips</span>
                <span className="font-mono text-[10px] bg-slate-400 text-slate-900 font-extrabold px-1.5 py-0.2 rounded">
                  {completedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('DISPOSED')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'DISPOSED'
                    ? 'bg-slate-950 text-white shadow-2xs'
                    : 'text-slate-800 hover:text-black'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Disposed Seals</span>
                <span className={`font-mono text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                  activeTab === 'DISPOSED' ? 'bg-slate-700 text-white' : 'bg-slate-400 text-slate-900'
                }`}>
                  {disposedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ROLLED_BACK')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'ROLLED_BACK'
                    ? 'bg-rose-900 text-white shadow-2xs'
                    : 'text-slate-800 hover:text-black'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                <span>Rolled Back</span>
                <span className="font-mono text-[10px] bg-rose-200 text-rose-950 font-extrabold px-1.5 py-0.2 rounded">
                  {rolledBackCount}
                </span>
              </button>
            </div>

            {/* Station dropdown */}
            <select
              value={isOperator ? operatorAssignedFacility : stationFilter}
              onChange={(e) => {
                if (isOperator) return;
                setStationFilter(e.target.value);
              }}
              disabled={isOperator}
              className={`text-xs font-bold px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                isOperator
                  ? 'bg-slate-200 border-slate-400 text-slate-800 cursor-not-allowed opacity-90'
                  : 'bg-white border-slate-300 text-slate-950 cursor-pointer'
              }`}
              title={isOperator ? `Facility locked to assigned branch (${operatorAssignedFacility}) for Operator user` : 'Filter arrival trips by station'}
            >
              {isOperator ? (
                <option value={operatorAssignedFacility}>
                  {operatorAssignedFacility} Station (Assigned)
                </option>
              ) : (
                <>
                  <option value="ALL">All Stations ({trips.length} trips)</option>
                  {destinations.map(d => (
                    <option key={d} value={d}>{d} Station</option>
                  ))}
                </>
              )}
            </select>

            {/* Search Input */}
            <div className="relative w-44 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search seal, trip, HAWB..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-950 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area: Disposed Seals View vs Trips View */}
      {activeTab === 'DISPOSED' ? (
        <div className="space-y-4">
          <div className="bg-slate-300/80 rounded-xl border border-slate-400 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Trash2 className="w-5 h-5 text-slate-200" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-950 text-sm flex items-center gap-2">
                  <span>Destination Verified Disposed Seals Log</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-900 border border-slate-400 font-bold">
                    {filteredDisposedSeals.length} Destroyed &amp; Retired
                  </span>
                </h3>
                <p className="text-xs text-slate-700 font-medium">
                  Official registry of physical security seals cut, verified, and destroyed at receiving stations or during customs transit replacements.
                </p>
              </div>
            </div>
            {stationFilter !== 'ALL' && (
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-indigo-100 text-indigo-950 border border-indigo-300 self-start sm:self-auto">
                Station: {stationFilter}
              </span>
            )}
          </div>

          {filteredDisposedSeals.length === 0 ? (
            <div className="bg-slate-200 rounded-xl border border-slate-300 p-12 text-center text-slate-700 shadow-xs">
              <Trash2 className="w-10 h-10 mx-auto mb-2 text-slate-500" />
              <h3 className="font-bold text-slate-900 text-sm">No disposed seals found</h3>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                {searchQuery 
                  ? `No disposed seals match search term "${searchQuery}".` 
                  : `There are currently no disposed seals recorded for station filter "${stationFilter}".`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDisposedSeals.map((seal) => {
                const associatedTrip = trips.find(t => 
                  t.id === seal.currentTripId || 
                  t.primarySealNumber === seal.sealNumber || 
                  t.extraSealNumber === seal.sealNumber
                );
                const isPrimary = associatedTrip?.primarySealNumber === seal.sealNumber;
                const isExtra = associatedTrip?.extraSealNumber === seal.sealNumber;

                return (
                  <div
                    key={seal.sealNumber}
                    className="bg-slate-200 rounded-xl border border-slate-300 p-4 shadow-xs hover:border-slate-400 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-lg bg-slate-300 border border-slate-400 flex items-center justify-center text-slate-800 shrink-0 mt-0.5">
                        <Trash2 className="w-5 h-5 text-slate-700" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => onSelectSealForPassport(seal)}
                            className="font-mono font-extrabold text-indigo-900 hover:text-indigo-950 text-base flex items-center gap-1 cursor-pointer"
                            title="Click to view digital seal passport"
                          >
                            <span>#{seal.sealNumber}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                          </button>

                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-300 text-slate-900 border border-slate-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                            <span>DISPOSED &amp; CUT</span>
                          </span>

                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                            isPrimary 
                              ? 'bg-blue-100 text-blue-950 border border-blue-300' 
                              : isExtra 
                              ? 'bg-purple-100 text-purple-950 border border-purple-300' 
                              : 'bg-slate-100 text-slate-800 border border-slate-300'
                          }`}>
                            {isPrimary ? 'Primary Exterior Door Seal' : isExtra ? 'Inside Contingency Spare Seal' : 'Inbound Seal'}
                          </span>

                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-950 border border-indigo-300">
                            Station: {seal.location || associatedTrip?.destination || 'Destination'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700 mt-1.5 font-medium">
                          {associatedTrip && (
                            <>
                              <span>Trip: <strong className="font-mono text-slate-950 font-bold">{associatedTrip.id}</strong></span>
                              <span>·</span>
                              <span>Unit: <strong className="font-mono text-slate-950 font-bold">{associatedTrip.containerOrTruckId}</strong></span>
                              <span>·</span>
                              <span>Route: <strong className="text-indigo-900">{associatedTrip.originLocation || seal.currentTripOrigin}</strong> &rarr; <strong className="text-slate-950">{associatedTrip.destination || seal.currentTripDestination}</strong></span>
                              <span>·</span>
                            </>
                          )}
                          <span>Disposed At: <span className="text-slate-900 font-semibold">{seal.disposedAt || associatedTrip?.verifiedAt || 'Destination Arrival'}</span></span>
                          <span>·</span>
                          <span>Officer: <span className="text-slate-900 font-semibold">{seal.disposedBy || associatedTrip?.verifiedBy || 'Authorized Operator'}</span></span>
                        </div>

                        <div className="mt-2 text-xs bg-slate-300/90 rounded-lg p-2.5 border border-slate-400 text-slate-900 font-medium">
                          <strong className="text-slate-950 font-bold">Disposal Audit Reason: </strong>
                          <span>{seal.disposalReason || associatedTrip?.inspectionReason || associatedTrip?.disposalNotes || 'Container door opened at receiving station. Seal destroyed.'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => onSelectSealForPassport(seal)}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>View Seal Passport</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Trips Grid / List with Darker Gray Boxes (bg-slate-200) */
        <div className="space-y-4">
          {filteredTrips.length === 0 ? (
            <div className="bg-slate-200 rounded-xl border border-slate-300 p-12 text-center text-slate-700 shadow-xs">
              <Truck className="w-10 h-10 mx-auto mb-2 text-slate-500" />
              <h3 className="font-bold text-slate-900 text-sm">No shipments found</h3>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                There are no {activeTab === 'IN_TRANSIT' ? 'in-transit inbound' : activeTab === 'COMPLETED' ? 'completed' : 'rolled-back'} shipments for station filter &ldquo;{stationFilter}&rdquo;.
              </p>
            </div>
          ) : (
          filteredTrips.map((trip) => {
            const primarySealObj = seals.find(s => s.sealNumber === trip.primarySealNumber);
            const extraSealObj = seals.find(s => s.sealNumber === trip.extraSealNumber);

            return (
              <div 
                key={trip.id} 
                className="bg-slate-200 rounded-xl border border-slate-300 p-5 shadow-xs hover:border-slate-400 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-300">
                  
                  {/* Left: Trip ID, Destination, Date, Container */}
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      trip.status === 'IN_TRANSIT' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}>
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-slate-950 text-sm">{trip.id}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-950 border border-indigo-300 flex items-center gap-1">
                          <strong className="text-indigo-800 font-mono">{trip.originLocation || 'Origin'}</strong>
                          <span>&rarr;</span>
                          <strong className="text-indigo-950 font-mono">{trip.destination}</strong>
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          trip.status === 'IN_TRANSIT' 
                            ? 'bg-amber-200 text-amber-950 border border-amber-300' 
                            : trip.status === 'COMPLETED_STANDARD'
                            ? 'bg-emerald-200 text-emerald-950 border border-emerald-300'
                            : trip.status === 'ROLLED_BACK'
                            ? 'bg-rose-200 text-rose-950 border border-rose-300'
                            : 'bg-rose-200 text-rose-950 border border-rose-300'
                        }`}>
                          {trip.status === 'IN_TRANSIT' 
                            ? 'In Transit En Route' 
                            : trip.status === 'COMPLETED_STANDARD'
                            ? 'Standard Arrival (Intact)'
                            : trip.status === 'ROLLED_BACK'
                            ? 'Rolled Back / Voided'
                            : 'Inspection Seal Swap (Swapped)'}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700 mt-1 font-medium">
                        <span>Unit: <strong className="font-mono text-slate-950 font-bold">{trip.containerOrTruckId}</strong></span>
                        <span>·</span>
                        <span>Dispatched: <span className="text-slate-900 font-semibold">{trip.dispatchDate}</span></span>
                        <span>·</span>
                        <span>HAWBs: <span className="font-mono font-extrabold text-slate-950">{trip.hawbs.join(', ')}</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-start md:self-center flex-wrap">
                    {trip.status === 'IN_TRANSIT' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenVerification(trip)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Verify Arrival &amp; Check Seals</span>
                        </button>
                        {currentRole === 'SUPERUSER' && onRollbackTrip && (
                          <button
                            type="button"
                            onClick={() => handleOpenRollback(trip)}
                            className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                            title="Superuser: Undo accidental dispatch and restore seals to origin stock"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Rollback Dispatch</span>
                          </button>
                        )}
                      </>
                    ) : trip.status === 'ROLLED_BACK' ? (
                      <div className="text-right">
                        <div className="text-xs font-bold text-rose-900 flex items-center gap-1 justify-end">
                          <RotateCcw className="w-3.5 h-3.5 text-rose-700" />
                          <span>Rolled Back by Superuser</span>
                        </div>
                        <div className="text-[11px] text-rose-800 font-mono mt-0.5 font-medium">
                          {trip.rolledBackAt} ({trip.rolledBackBy})
                        </div>
                      </div>
                    ) : (
                      <div className="text-right">
                        <div className="text-xs font-bold text-emerald-900 flex items-center gap-1 justify-end">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Verified at Destination</span>
                        </div>
                        <div className="text-[11px] text-slate-600 font-mono mt-0.5 font-medium">
                          {trip.verifiedAt} ({trip.verifiedBy})
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Completed Banners if Verified */}
                {trip.status === 'COMPLETED_INSPECTION_SWAP' && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-300 border border-slate-400 text-slate-950 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-slate-800 shrink-0" />
                      <span>
                        <strong className="text-slate-950">Dual Seal Disposal Confirmed:</strong> Primary Seal <span className="font-mono font-bold">#{trip.primarySealNumber}</span> (broken mid-route) &amp; Inside Spare Seal <span className="font-mono font-bold">#{trip.extraSealNumber}</span> (cut at destination opening) are both recorded as <strong className="text-slate-900 uppercase">DISPOSED</strong>.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('DISPOSED')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-[11px] font-bold transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      View in Disposed Seals Tab &rarr;
                    </button>
                  </div>
                )}

                {trip.status === 'COMPLETED_STANDARD' && (
                  <div className="mt-3 p-3 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        <strong className="text-emerald-950">Standard Arrival Verified:</strong> Primary Seal <span className="font-mono font-bold">#{trip.primarySealNumber}</span> cut &amp; marked as <strong className="uppercase">DISPOSED</strong>. Spare Seal <span className="font-mono font-bold">#{trip.extraSealNumber}</span> scheduled for return to {trip.originLocation || 'Origin'}.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('DISPOSED')}
                      className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded text-[11px] font-bold transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      View in Disposed Seals Tab &rarr;
                    </button>
                  </div>
                )}

                {/* Lower Card: Seals Assigned - Sub-boxes (bg-slate-300) */}
                <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  
                  {/* Primary Seal */}
                  <div className="p-3 bg-slate-300 rounded-lg border border-slate-400">
                    <div className="text-[11px] text-slate-700 font-bold mb-1 flex items-center justify-between">
                      <span>Primary Door Seal</span>
                      <span className="text-indigo-900 font-mono text-[10px] font-extrabold">Exterior Door</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => primarySealObj && onSelectSealForPassport(primarySealObj)}
                        className="font-mono font-extrabold text-indigo-800 hover:text-indigo-950 text-sm flex items-center gap-1"
                        title="Click to view Seal Passport"
                      >
                        <span>#{trip.primarySealNumber}</span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                      </button>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        trip.status === 'IN_TRANSIT' 
                          ? 'bg-amber-100 text-amber-950 border border-amber-300' 
                          : trip.status === 'ROLLED_BACK'
                          ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                          : 'bg-slate-400 text-slate-900'
                      }`}>
                        {trip.status === 'IN_TRANSIT' ? 'In-Transit' : trip.status === 'ROLLED_BACK' ? 'Restored Stock' : 'Disposed & Cut'}
                      </span>
                    </div>
                  </div>

                  {/* Inside Extra Seal */}
                  <div className="p-3 bg-slate-300 rounded-lg border border-slate-400">
                    <div className="text-[11px] text-slate-700 font-bold mb-1 flex items-center justify-between">
                      <span>Inside Spare Seal</span>
                      <span className="text-purple-900 font-mono text-[10px] font-extrabold">Contingency</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => extraSealObj && onSelectSealForPassport(extraSealObj)}
                        className="font-mono font-extrabold text-indigo-800 hover:text-indigo-950 text-sm flex items-center gap-1"
                        title="Click to view Seal Passport"
                      >
                        <span>#{trip.extraSealNumber}</span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                      </button>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        trip.status === 'IN_TRANSIT'
                          ? 'bg-amber-100 text-amber-950 border border-amber-300'
                          : trip.status === 'COMPLETED_STANDARD'
                          ? 'bg-purple-100 text-purple-950 border border-purple-300'
                          : trip.status === 'ROLLED_BACK'
                          ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                          : 'bg-slate-400 text-slate-900'
                      }`}>
                        {trip.status === 'IN_TRANSIT'
                          ? 'In-Transit'
                          : trip.status === 'COMPLETED_STANDARD'
                          ? 'Pending Return'
                          : trip.status === 'ROLLED_BACK'
                          ? 'Restored Stock'
                          : 'Disposed & Cut'}
                      </span>
                    </div>
                  </div>

                  {/* Summary / Notes */}
                  <div className="p-3 bg-slate-300 rounded-lg border border-slate-400 sm:col-span-2 md:col-span-1">
                    <div className="text-[11px] text-slate-700 font-bold mb-1">
                      {trip.status === 'IN_TRANSIT' ? 'Dispatch Instructions' : trip.status === 'ROLLED_BACK' ? 'Superuser Rollback Justification' : 'Arrival Verification Log'}
                    </div>
                    <div className="text-slate-900 font-semibold truncate" title={trip.status === 'ROLLED_BACK' ? trip.rollbackReason : (trip.inspectionReason || trip.disposalNotes || trip.notes)}>
                      {trip.status === 'ROLLED_BACK' ? (trip.rollbackReason || 'Voided by Superuser') : (trip.inspectionReason || trip.disposalNotes || trip.notes || 'No remarks recorded.')}
                    </div>
                  </div>

                </div>

              </div>
            );
          })
        )}
      </div>
      )}

      {/* Interactive Verification Modal - Darker Gray Box (bg-slate-200) */}
      {selectedTripForVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div 
            className="bg-slate-200 rounded-xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-300 bg-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-950 text-base flex items-center gap-2">
                    Arrival Verification: {selectedTripForVerification.id}
                  </h3>
                  <p className="text-xs text-slate-700 font-medium">
                    Destination: <strong className="text-slate-950">{selectedTripForVerification.destination} Hub</strong> · Unit: <span className="font-mono text-slate-950 font-bold">{selectedTripForVerification.containerOrTruckId}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTripForVerification(null)}
                className="text-slate-600 hover:text-slate-950 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              
              {/* Validation alert */}
              {validationError && (
                <div className="p-3 bg-rose-100 border border-rose-300 rounded-lg text-xs text-rose-950 flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Step 1: Confirm Arriving Door Seal */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
                  Step 1: Confirm Arriving Container Door Seal
                </label>
                <p className="text-xs text-slate-700 font-medium mb-3">
                  Inspect the physical lock on the container door right now. Which seal number is physically present on the latch?
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Case A: Arrived with Primary Seal */}
                  <label className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    selectedDoorSealChoice === 'PRIMARY'
                      ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/30'
                      : 'border-slate-300 bg-white hover:bg-slate-50'
                  }`}>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <input
                            type="radio"
                            name="doorSealChoice"
                            checked={selectedDoorSealChoice === 'PRIMARY'}
                            onChange={() => {
                              setSelectedDoorSealChoice('PRIMARY');
                              setValidationError('');
                            }}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          Primary Seal (Normal)
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 border border-emerald-300">
                          Standard
                        </span>
                      </div>
                      <div className="font-mono text-base font-extrabold text-slate-950 mb-1">
                        #{selectedTripForVerification.primarySealNumber}
                      </div>
                      <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                        Original seal placed at Origin is intact. No inspection or tampering occurred en route.
                      </p>
                    </div>
                  </label>

                  {/* Case B: Arrived with Inside Extra Spare Seal */}
                  <label className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    selectedDoorSealChoice === 'EXTRA'
                      ? 'border-amber-600 bg-amber-50 ring-2 ring-amber-500/30'
                      : 'border-slate-300 bg-white hover:bg-slate-50'
                  }`}>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <input
                            type="radio"
                            name="doorSealChoice"
                            checked={selectedDoorSealChoice === 'EXTRA'}
                            onChange={() => {
                              setSelectedDoorSealChoice('EXTRA');
                              setDualDisposalConfirmed(true);
                              setValidationError('');
                            }}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          Inside Spare Seal
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-950 border border-amber-300">
                          Mid-Route Swap
                        </span>
                      </div>
                      <div className="font-mono text-base font-extrabold text-slate-950 mb-1">
                        #{selectedTripForVerification.extraSealNumber}
                      </div>
                      <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                        Spare seal was applied to door after Primary was broken (e.g. Customs / Police inspection).
                      </p>
                    </div>
                  </label>

                </div>
              </div>

              {/* Dynamic Branch: CASE A Details */}
              {selectedDoorSealChoice === 'PRIMARY' && (
                <div className="bg-emerald-100 border border-emerald-300 rounded-xl p-4 space-y-4 animate-in fade-in">
                  <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Case A: Normal Destination Arrival Workflow</span>
                  </div>

                  <div className="text-xs text-emerald-950 space-y-2">
                    <div className="flex items-start gap-2 bg-white p-3 rounded-lg border border-emerald-200 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                      <div>
                        <strong>Primary Seal #{selectedTripForVerification.primarySealNumber}:</strong> Will be marked as <span className="font-bold text-rose-700">DISPOSED</span> (cut upon opening container doors).
                      </div>
                    </div>

                    <div className="flex items-start gap-2 bg-white p-3 rounded-lg border border-emerald-200 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                      <div>
                        <strong>Unused Spare Seal #{selectedTripForVerification.extraSealNumber}:</strong> Will automatically move to <span className="font-bold text-purple-700">Return Transit Inventory (PENDING_RETURN_TRANSIT)</span> to be couriered exclusively back to Origin Station <strong className="text-indigo-900 font-extrabold">{selectedTripForVerification.originLocation || 'Origin'}</strong>.
                      </div>
                    </div>
                  </div>

                  {/* Confirmation checkbox */}
                  <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={normalDisposalConfirmed}
                      onChange={(e) => setNormalDisposalConfirmed(e.target.checked)}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-emerald-950 font-bold">
                      I confirm that container doors have been unlocked at {selectedTripForVerification.destination}, and Primary Seal #{selectedTripForVerification.primarySealNumber} was physically cut and scrapped.
                    </span>
                  </label>
                </div>
              )}

              {/* Dynamic Branch: CASE B Mid-Route Inspection Seal Change */}
              {selectedDoorSealChoice === 'EXTRA' && (
                <div className="bg-amber-100 border border-amber-300 rounded-xl p-5 space-y-4 animate-in fade-in">
                  
                  {/* Alert Banner */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950">
                        Mid-Route Inspection / Seal Change Protocol Active
                      </h4>
                      <p className="text-xs text-amber-950 mt-0.5 font-medium">
                        The container arrived bearing Inside Spare Seal <strong className="font-mono">#{selectedTripForVerification.extraSealNumber}</strong>. Per security regulations, you must record the official cause and verify dual seal disposal.
                      </p>
                    </div>
                  </div>

                  {/* Dual Disposal Status Breakdown */}
                  <div className="text-xs text-amber-950 space-y-2">
                    <div className="flex items-start gap-2 bg-white p-3 rounded-lg border border-amber-300 font-medium shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-1.5 shrink-0" />
                      <div>
                        <strong>Broken Primary Seal #{selectedTripForVerification.primarySealNumber}:</strong> Will be marked as <span className="font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-300">DISPOSED</span> (cut / broken during transit inspection).
                      </div>
                    </div>

                    <div className="flex items-start gap-2 bg-white p-3 rounded-lg border border-amber-300 font-medium shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-1.5 shrink-0" />
                      <div>
                        <strong>Arrived Inside Spare Seal #{selectedTripForVerification.extraSealNumber}:</strong> Will be marked as <span className="font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-300">DISPOSED</span> (cut upon destination container opening).
                      </div>
                    </div>
                  </div>

                  {/* Mandatory Reason Field */}
                  <div>
                    <label className="block text-xs font-bold text-slate-950 mb-1">
                      Reason for Seal Change <span className="text-rose-700 font-bold">* Mandatory</span>
                    </label>
                    <textarea
                      value={inspectionReason}
                      onChange={(e) => {
                        setInspectionReason(e.target.value);
                        setValidationError('');
                      }}
                      required
                      rows={2}
                      placeholder="e.g. Customs physical inspection in transit — primary seal broken by officers and replaced with inside spare seal"
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-[11px] text-amber-950 mt-1 font-semibold">
                      Must state checkpoint, inspection agency (CBP/Customs/Police), or transit incident.
                    </p>
                  </div>

                  {/* Dual Disposal Checkbox */}
                  <div className="p-3 bg-white rounded-lg border border-amber-300">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dualDisposalConfirmed}
                        onChange={(e) => {
                          setDualDisposalConfirmed(e.target.checked);
                          setValidationError('');
                        }}
                        className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-xs text-slate-950 font-bold leading-relaxed">
                        Dual Disposal Confirmation: I explicitly confirm that BOTH seals (the broken Primary Seal #{selectedTripForVerification.primarySealNumber} and the Extra Seal #{selectedTripForVerification.extraSealNumber} cut upon destination opening) have been permanently destroyed and disposed of at {selectedTripForVerification.destination}.
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-600 ml-6 mt-1 font-medium">
                      Neither seal will be returned to Origin inventory; both will be recorded as DISPOSED in the audit chain.
                    </p>
                  </div>

                </div>
              )}

              {/* Arrival Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Arrival Verification Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={arrivalNotes}
                  onChange={(e) => setArrivalNotes(e.target.value)}
                  placeholder="e.g. Unloaded at bay 4, all cargo counts match manifest"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-300 bg-slate-300 flex items-center justify-between">
              <button
                type="button"
                disabled={isVerifying}
                onClick={() => setSelectedTripForVerification(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isVerifying}
                onClick={handleConfirmVerification}
                className={`px-5 py-2.5 rounded-lg text-xs font-bold text-white shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  selectedDoorSealChoice === 'PRIMARY'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Saving to Firestore Database...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>
                      {selectedDoorSealChoice === 'PRIMARY'
                        ? 'Complete Standard Arrival (Dispose Primary & Return Extra)'
                        : 'Complete Arrival with Inspection Swap (Dispose Both)'}
                    </span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

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
                <li>A permanent audit log entry will be recorded with your credentials, timestamp, and justification reason.</li>
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
                onClick={handleConfirmRollback}
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

    </div>
  );
};
