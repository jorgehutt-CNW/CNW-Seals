import React, { useState, useMemo } from 'react';
import { 
  RotateCcw, ShieldCheck, CheckSquare, Square, Check, 
  Truck, ArrowRight, CheckCircle2, AlertCircle, Calendar, MapPin, Box, Filter,
  Search, X, Copy, ExternalLink, Package, UserCheck, Clock, ArrowDownLeft
} from 'lucide-react';
import { Seal, Trip } from '../types';

interface ReturnReceptionModuleProps {
  pendingReturnSeals: Seal[];
  allPendingReturnSeals: Seal[];
  selectedLocation: string;
  trips: Trip[];
  onConfirmReturnReceived: (sealNumbers: string[]) => void;
  onSelectSealForPassport: (seal: Seal) => void;
  onNavigateToMainStock: () => void;
}

export const ReturnReceptionModule: React.FC<ReturnReceptionModuleProps> = ({
  pendingReturnSeals,
  allPendingReturnSeals,
  selectedLocation,
  trips,
  onConfirmReturnReceived,
  onSelectSealForPassport,
  onNavigateToMainStock
}) => {
  const [selectedSealNumbers, setSelectedSealNumbers] = useState<string[]>([]);
  const [lastReceivedBatch, setLastReceivedBatch] = useState<{ count: number; origin: string; trackingNumber?: string } | null>(null);
  const [showAllLocations, setShowAllLocations] = useState<boolean>(selectedLocation === 'ALL');

  // Filter & Search state
  const [trackingFilter, setTrackingFilter] = useState<string>('ALL'); // 'ALL' | 'UNSENT' | specific tracking number
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  // Sync showAllLocations if top selectedLocation is ALL
  React.useEffect(() => {
    if (selectedLocation === 'ALL') {
      setShowAllLocations(true);
    }
  }, [selectedLocation]);

  // Location-scoped seals
  const locationScopedSeals = useMemo(() => {
    if (showAllLocations || selectedLocation === 'ALL') {
      return allPendingReturnSeals;
    }
    return allPendingReturnSeals.filter(
      s => (s.returnOriginLocation || s.location) === selectedLocation
    );
  }, [allPendingReturnSeals, selectedLocation, showAllLocations]);

  // Extract shipment / tracking summaries for quick filters
  const trackingSummary = useMemo(() => {
    const trackingMap = new Map<string, {
      trackingNumber: string;
      carrier: string;
      sentDate: string;
      sentBy: string;
      originStation: string;
      destinationStation: string;
      count: number;
      sealNumbers: string[];
    }>();

    let unsentCount = 0;
    const unsentSealNumbers: string[] = [];

    locationScopedSeals.forEach(s => {
      if (s.returnTrackingNumber) {
        const trk = s.returnTrackingNumber.trim();
        const existing = trackingMap.get(trk);
        if (existing) {
          existing.count += 1;
          existing.sealNumbers.push(s.sealNumber);
        } else {
          trackingMap.set(trk, {
            trackingNumber: trk,
            carrier: s.returnCarrier || 'Courier',
            sentDate: s.returnSentDate || 'Recorded',
            sentBy: s.returnSentBy || 'Operator',
            originStation: s.returnOriginLocation || s.location || 'LAX',
            destinationStation: s.returnOriginatingDestination || 'Destination',
            count: 1,
            sealNumbers: [s.sealNumber]
          });
        }
      } else {
        unsentCount += 1;
        unsentSealNumbers.push(s.sealNumber);
      }
    });

    return {
      shipments: Array.from(trackingMap.values()),
      unsentCount,
      unsentSealNumbers,
      totalCount: locationScopedSeals.length
    };
  }, [locationScopedSeals]);

  // Final filtered list based on location, tracking filter, and text search
  const displayedSeals = useMemo(() => {
    let list = locationScopedSeals;

    // 1. Filter by Tracking Number pill / dropdown
    if (trackingFilter === 'UNSENT') {
      list = list.filter(s => !s.returnTrackingNumber);
    } else if (trackingFilter !== 'ALL') {
      list = list.filter(s => s.returnTrackingNumber === trackingFilter);
    }

    // 2. Filter by search query (Tracking #, Seal #, Carrier, HAWB, Dispatcher, Origin, Destination)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s => {
        const matchSeal = s.sealNumber.toLowerCase().includes(q);
        const matchTracking = s.returnTrackingNumber?.toLowerCase().includes(q);
        const matchCarrier = s.returnCarrier?.toLowerCase().includes(q);
        const matchSentBy = s.returnSentBy?.toLowerCase().includes(q);
        const matchOrigin = (s.returnOriginLocation || s.location || '').toLowerCase().includes(q);
        const matchHolding = (s.returnOriginatingDestination || '').toLowerCase().includes(q);
        const matchTrip = (s.returnTripId || '').toLowerCase().includes(q);
        
        const associatedTrip = trips.find(t => t.id === s.returnTripId || t.extraSealNumber === s.sealNumber);
        const matchHawb = associatedTrip?.hawbs.some(h => h.toLowerCase().includes(q));

        return matchSeal || matchTracking || matchCarrier || matchSentBy || matchOrigin || matchHolding || matchTrip || matchHawb;
      });
    }

    return list;
  }, [locationScopedSeals, trackingFilter, searchQuery, trips]);

  // Copy tracking number to clipboard with feedback
  const handleCopyTracking = (e: React.MouseEvent, tracking: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(tracking);
    setCopiedTracking(tracking);
    setTimeout(() => {
      setCopiedTracking(null);
    }, 2000);
  };

  const toggleSelectSeal = (num: string) => {
    setSelectedSealNumbers(prev => 
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
    );
  };

  const selectAll = () => {
    if (selectedSealNumbers.length === displayedSeals.length && displayedSeals.length > 0) {
      setSelectedSealNumbers([]);
    } else {
      setSelectedSealNumbers(displayedSeals.map(s => s.sealNumber));
    }
  };

  const handleBatchReceive = () => {
    if (selectedSealNumbers.length === 0) return;
    onConfirmReturnReceived(selectedSealNumbers);
    setLastReceivedBatch({
      count: selectedSealNumbers.length,
      origin: selectedLocation === 'ALL' ? 'Their Respective Origins' : `${selectedLocation} Station`,
      trackingNumber: trackingFilter !== 'ALL' && trackingFilter !== 'UNSENT' ? trackingFilter : undefined
    });
    setSelectedSealNumbers([]);
  };

  const handleSingleReceive = (sealNumber: string, sealOrigin: string, trackingNum?: string) => {
    onConfirmReturnReceived([sealNumber]);
    setLastReceivedBatch({
      count: 1,
      origin: `${sealOrigin} Station`,
      trackingNumber: trackingNum
    });
    setSelectedSealNumbers(prev => prev.filter(n => n !== sealNumber));
  };

  // Quick select all seals belonging to an active tracking number
  const handleSelectAllInTracking = (trackingNum: string) => {
    const sealsInTracking = displayedSeals
      .filter(s => s.returnTrackingNumber === trackingNum)
      .map(s => s.sealNumber);
    setSelectedSealNumbers(Array.from(new Set([...selectedSealNumbers, ...sealsInTracking])));
  };

  // Active shipment details if a specific tracking filter is active
  const activeShipment = useMemo(() => {
    if (trackingFilter === 'ALL' || trackingFilter === 'UNSENT') return null;
    return trackingSummary.shipments.find(s => s.trackingNumber === trackingFilter);
  }, [trackingFilter, trackingSummary]);

  return (
    <div className="space-y-6">
      
      {/* Banner Card - Solid Data Box (bg-slate-200) */}
      <div className="bg-slate-200 rounded-xl border border-slate-300 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <RotateCcw className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-950">
                  Unused Extra Spare Seals Return Reception
                </h2>
                <span className="text-xs font-mono font-extrabold px-2.5 py-0.5 rounded bg-purple-100 text-purple-950 border border-purple-300">
                  {displayedSeals.length} Returning {selectedLocation !== 'ALL' && !showAllLocations ? `to ${selectedLocation}` : 'to Origins'}
                </span>
                {trackingFilter !== 'ALL' && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-indigo-700" />
                    <span>Tracking: {trackingFilter === 'UNSENT' ? 'Unsent/Safe' : trackingFilter}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-700 mt-0.5 font-medium">
                Spare seals unused at destination terminals returning <strong>strictly to their originating location</strong>. Filter by courier tracking number, inspect shipment details, and confirm warehouse intake.
              </p>
            </div>
          </div>

          {/* Controls: Location toggle & Batch Action Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            {selectedLocation !== 'ALL' && (
              <button
                type="button"
                onClick={() => setShowAllLocations(!showAllLocations)}
                className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  showAllLocations
                    ? 'bg-slate-800 text-white border-slate-700'
                    : 'bg-white text-slate-800 hover:bg-slate-100 border-slate-300'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{showAllLocations ? `Filter only ${selectedLocation}` : `Show All Stations (${allPendingReturnSeals.length})`}</span>
              </button>
            )}

            {displayedSeals.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="px-3 py-2 text-xs font-bold text-slate-800 hover:text-black bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  {selectedSealNumbers.length === displayedSeals.length && displayedSeals.length > 0 ? 'Deselect All' : `Select All (${displayedSeals.length})`}
                </button>

                <button
                  type="button"
                  onClick={handleBatchReceive}
                  disabled={selectedSealNumbers.length === 0}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-400 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    Confirm Received at Origin ({selectedSealNumbers.length})
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tracking Number Search & Shipment Filters Toolbar */}
      <div className="bg-slate-200 rounded-xl border border-slate-300 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search input for Tracking Number, Seal #, Carrier, etc. */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by Tracking # (e.g. FX-, UPS-), Seal #, Carrier, HAWB..."
              className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-white text-slate-900 border border-slate-300 rounded-lg placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Tracking Dropdown / Shipment Counter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 shrink-0 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-purple-700" />
              <span>Tracking Shipment:</span>
            </span>
            <select
              value={trackingFilter}
              onChange={(e) => setTrackingFilter(e.target.value)}
              className="px-3 py-2 text-xs font-bold bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Shipments &amp; Staged ({locationScopedSeals.length} seals)</option>
              {trackingSummary.shipments.map(s => (
                <option key={s.trackingNumber} value={s.trackingNumber}>
                  📦 {s.trackingNumber} ({s.count} seal{s.count > 1 ? 's' : ''} · {s.carrier})
                </option>
              ))}
              {trackingSummary.unsentCount > 0 && (
                <option value="UNSENT">
                  ⏳ Staged in Safe (Unsent / No Tracking: {trackingSummary.unsentCount})
                </option>
              )}
            </select>

            {(trackingFilter !== 'ALL' || searchQuery.trim()) && (
              <button
                type="button"
                onClick={() => {
                  setTrackingFilter('ALL');
                  setSearchQuery('');
                }}
                className="px-2.5 py-2 text-xs font-bold text-purple-900 hover:text-purple-950 bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                title="Reset all filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Pill Buttons: Clickable Tracking Shipments */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-300/80">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mr-1 shrink-0">
            Shipment Batches:
          </span>

          <button
            type="button"
            onClick={() => setTrackingFilter('ALL')}
            className={`px-2.5 py-1 text-xs rounded-md font-bold transition-all cursor-pointer ${
              trackingFilter === 'ALL'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
            }`}
          >
            All ({trackingSummary.totalCount})
          </button>

          {trackingSummary.shipments.map(shipment => {
            const isSelected = trackingFilter === shipment.trackingNumber;
            return (
              <button
                key={shipment.trackingNumber}
                type="button"
                onClick={() => setTrackingFilter(shipment.trackingNumber)}
                className={`px-2.5 py-1 text-xs rounded-md font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-700 text-white shadow-xs ring-2 ring-indigo-400'
                    : 'bg-white hover:bg-indigo-50 text-slate-900 border border-slate-300 hover:border-indigo-400'
                }`}
                title={`Filter to ${shipment.trackingNumber} (${shipment.carrier} - Sent ${shipment.sentDate})`}
              >
                <Package className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-200' : 'text-indigo-600'}`} />
                <span>{shipment.trackingNumber}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-sans font-extrabold ${
                  isSelected ? 'bg-indigo-900 text-indigo-100' : 'bg-purple-100 text-purple-950'
                }`}>
                  {shipment.count}
                </span>
              </button>
            );
          })}

          {trackingSummary.unsentCount > 0 && (
            <button
              type="button"
              onClick={() => setTrackingFilter('UNSENT')}
              className={`px-2.5 py-1 text-xs rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                trackingFilter === 'UNSENT'
                  ? 'bg-amber-700 text-white shadow-xs ring-2 ring-amber-400'
                  : 'bg-white hover:bg-amber-50 text-amber-950 border border-slate-300 hover:border-amber-400'
              }`}
              title="Show seals staged in safe awaiting courier dispatch"
            >
              <Clock className={`w-3.5 h-3.5 ${trackingFilter === 'UNSENT' ? 'text-amber-200' : 'text-amber-700'}`} />
              <span>Unsent / Safe</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
                trackingFilter === 'UNSENT' ? 'bg-amber-900 text-amber-100' : 'bg-amber-100 text-amber-950'
              }`}>
                {trackingSummary.unsentCount}
              </span>
            </button>
          )}
        </div>

        {/* Detailed Shipment Card when a specific tracking number is active */}
        {activeShipment && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900">Shipment Details:</span>
                  <span className="font-mono font-extrabold text-indigo-950 bg-indigo-100 border border-indigo-300 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                    <span>{activeShipment.trackingNumber}</span>
                    <button
                      type="button"
                      onClick={(e) => handleCopyTracking(e, activeShipment.trackingNumber)}
                      className="hover:text-indigo-600 p-0.5 rounded transition-colors cursor-pointer"
                      title="Copy tracking number"
                    >
                      {copiedTracking === activeShipment.trackingNumber ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </span>
                  <span className="font-extrabold text-slate-800 bg-white border border-slate-300 px-2 py-0.5 rounded text-[11px]">
                    {activeShipment.carrier}
                  </span>
                  <span className="text-slate-600 font-medium">
                    Date Sent: <strong>{activeShipment.sentDate}</strong>
                  </span>
                </div>
                <div className="text-[11px] text-slate-700 mt-1 flex items-center gap-2 flex-wrap">
                  <span>Dispatched by: <strong>{activeShipment.sentBy}</strong></span>
                  <span>•</span>
                  <span>Route: <strong>{activeShipment.destinationStation} Station &rarr; {activeShipment.originStation} Origin</strong></span>
                  <span>•</span>
                  <span className="font-bold text-indigo-900">Total in Package: {activeShipment.count} seal(s)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleSelectAllInTracking(activeShipment.trackingNumber)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Select All in Package ({activeShipment.count})</span>
              </button>

              <button
                type="button"
                onClick={() => setTrackingFilter('ALL')}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition-colors cursor-pointer"
              >
                Show All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Success Notification Banner */}
      {lastReceivedBatch && (
        <div className="bg-emerald-100 border border-emerald-300 rounded-xl p-4 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <div className="text-xs text-emerald-950 font-bold">
              Successfully confirmed receipt of {lastReceivedBatch.count} returning spare seal(s) {lastReceivedBatch.trackingNumber ? `from Tracking #${lastReceivedBatch.trackingNumber} ` : ''}back into <strong>{lastReceivedBatch.origin}</strong>! These seals are now restored to <strong>AVAILABLE</strong> status at that origin station.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onNavigateToMainStock}
              className="text-xs font-bold text-emerald-900 hover:text-black underline whitespace-nowrap cursor-pointer"
            >
              View Available Stock
            </button>
            <button
              type="button"
              onClick={() => setLastReceivedBatch(null)}
              className="text-xs text-slate-700 hover:text-black px-2 font-bold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Return Table - Solid Data Box (bg-slate-200) */}
      <div className="bg-slate-200 rounded-xl border border-slate-300 shadow-xs overflow-hidden">
        {displayedSeals.length === 0 ? (
          <div className="p-12 text-center text-slate-600">
            <RotateCcw className="w-10 h-10 mx-auto mb-2 text-slate-500" />
            <h3 className="font-bold text-slate-900 text-sm">
              No Seals Found Matching Active Filters
            </h3>
            <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto font-medium">
              {trackingFilter !== 'ALL' || searchQuery.trim()
                ? 'Try clearing the search query or tracking filter to see all seals in return transit.'
                : 'When destination stations verify standard container arrivals, the unused spare inside seal automatically enters this return queue addressed strictly to its origin station.'}
            </p>
            {(trackingFilter !== 'ALL' || searchQuery.trim()) && (
              <button
                type="button"
                onClick={() => {
                  setTrackingFilter('ALL');
                  setSearchQuery('');
                }}
                className="mt-3 px-3 py-1.5 text-xs font-bold text-indigo-900 bg-indigo-100 hover:bg-indigo-200 border border-indigo-300 rounded-lg transition-colors cursor-pointer"
              >
                Clear Active Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-300 border-b border-slate-400 text-slate-800 font-extrabold tracking-wider uppercase text-[11px]">
                  <th className="py-3 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedSealNumbers.length === displayedSeals.length && displayedSeals.length > 0}
                      onChange={selectAll}
                      className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Returning Seal #</th>
                  <th className="py-3 px-4">Courier &amp; Shipping Details</th>
                  <th className="py-3 px-4">Return Route &amp; Target Origin</th>
                  <th className="py-3 px-4">Trip Record &amp; HAWB(s)</th>
                  <th className="py-3 px-4">Destination Unpack Date</th>
                  <th className="py-3 px-4 text-right">Warehouse Intake</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {displayedSeals.map((seal) => {
                  const associatedTrip = trips.find(t => t.id === seal.returnTripId || t.extraSealNumber === seal.sealNumber);
                  const isChecked = selectedSealNumbers.includes(seal.sealNumber);
                  const originStation = seal.returnOriginLocation || seal.location || 'LAX';
                  const holdingStation = seal.returnOriginatingDestination || 'Destination';

                  return (
                    <tr 
                      key={seal.sealNumber}
                      className={`hover:bg-purple-200/50 transition-colors ${isChecked ? 'bg-purple-200/60' : 'bg-slate-200'}`}
                    >
                      {/* Selection Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectSeal(seal.sealNumber)}
                          className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                      </td>

                      {/* Seal Number */}
                      <td className="py-3.5 px-4 font-mono font-extrabold text-slate-950 text-sm">
                        <div className="flex flex-col gap-1 items-start">
                          <button
                            type="button"
                            onClick={() => onSelectSealForPassport(seal)}
                            className="hover:underline hover:text-indigo-700 flex items-center gap-1.5 cursor-pointer"
                            title="Open detailed Seal Passport"
                          >
                            <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
                            <span>#{seal.sealNumber}</span>
                          </button>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-sans font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-950 border border-purple-300">
                              Inside Spare
                            </span>
                            <span className="text-[10px] font-mono text-slate-600 font-semibold">
                              Box: {seal.boxRef}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Courier & Shipping Details (Comprehensive shipment breakdown) */}
                      <td className="py-3.5 px-4">
                        {seal.returnTrackingNumber ? (
                          <div className="space-y-1.5">
                            {/* Tracking Number badge with 1-click copy */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-xs text-purple-950 bg-purple-100 border border-purple-300 px-2 py-0.5 rounded-md inline-flex items-center gap-1.5 shadow-2xs">
                                <Truck className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                                <span>{seal.returnTrackingNumber}</span>
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyTracking(e, seal.returnTrackingNumber!)}
                                className="p-1 rounded hover:bg-slate-300/80 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                                title="Copy tracking number"
                              >
                                {copiedTracking === seal.returnTrackingNumber ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>

                            {/* Carrier & Date Sent */}
                            <div className="flex items-center gap-2 text-[11px] text-slate-800 flex-wrap">
                              <span className="font-extrabold text-slate-950 bg-white/80 border border-slate-300/90 px-1.5 py-0.2 rounded">
                                {seal.returnCarrier || 'Courier'}
                              </span>
                              <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                                <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                                <span>Sent: <strong>{seal.returnSentDate || 'Recorded'}</strong></span>
                              </span>
                            </div>

                            {/* Dispatched by Operator */}
                            {seal.returnSentBy && (
                              <div className="text-[10px] text-slate-600 font-medium flex items-center gap-1">
                                <UserCheck className="w-3 h-3 text-slate-500 shrink-0" />
                                <span>Sender: <strong>{seal.returnSentBy}</strong></span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-950 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded font-bold shadow-2xs">
                              <Clock className="w-3 h-3 text-amber-700 shrink-0" />
                              <span>Staged in Safe (Unsent)</span>
                            </span>
                            <p className="text-[10px] text-slate-600">
                              Awaiting destination operator to dispatch via courier
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Return Route & Target Origin (Strict Origin Return Guarantee) */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {/* Route Flow */}
                          <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                            <span className="text-slate-700">{holdingStation} Station</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="text-indigo-900 font-extrabold">{originStation} Origin</span>
                          </div>

                          {/* Target Origin Badge */}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-extrabold text-[11px] bg-indigo-100 text-indigo-950 border border-indigo-300">
                            <MapPin className="w-3 h-3 text-indigo-700 shrink-0" />
                            <span>Restores to {originStation} Stock</span>
                          </span>
                        </div>
                      </td>

                      {/* Trip Reference & HAWB(s) */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-xs text-slate-900 block">
                            {associatedTrip?.id || seal.returnTripId || 'TRP-DISPATCH'}
                          </span>
                          <div className="font-mono text-[11px] text-slate-700 font-semibold max-w-xs truncate" title={associatedTrip?.hawbs.join(', ')}>
                            HAWB: {associatedTrip?.hawbs.join(', ') || 'HAWB-ARCHIVED'}
                          </div>
                          {associatedTrip?.containerOrTruckId && (
                            <span className="text-[10px] text-slate-600 font-mono">
                              Unit: {associatedTrip.containerOrTruckId}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Destination Unpack Date */}
                      <td className="py-3.5 px-4 text-slate-800 font-medium">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{seal.returnArrivalDate || 'Recent'}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          Unpacked at {holdingStation}
                        </span>
                      </td>

                      {/* Single Warehouse Intake Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleSingleReceive(seal.sealNumber, originStation, seal.returnTrackingNumber)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                          title={`Confirm seal intake and restore to ${originStation} Stock`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Receive at {originStation}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer Summary */}
        <div className="p-3 bg-slate-300 border-t border-slate-400 text-slate-800 text-[11px] font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>
              Showing {displayedSeals.length} of {locationScopedSeals.length} returning spare seal(s)
            </span>
            {trackingFilter !== 'ALL' && (
              <span className="font-mono text-[10px] bg-purple-100 text-purple-950 border border-purple-300 px-1.5 py-0.2 rounded">
                Filter: {trackingFilter}
              </span>
            )}
          </div>
          <span className="italic text-slate-700">
            Chain of Custody Guarantee: All returned seals restore to AVAILABLE status strictly in their originating station inventory
          </span>
        </div>
      </div>

    </div>
  );
};
