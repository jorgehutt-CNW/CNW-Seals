import React, { useState, useMemo } from 'react';
import { 
  RotateCcw, ShieldCheck, Truck, ArrowRight, CheckCircle2, 
  AlertCircle, Calendar, MapPin, Box, Search, Check, 
  Send, Copy, ExternalLink, Package, Filter, Clock, UserCheck, Trash2
} from 'lucide-react';
import { Seal, Trip } from '../types';

interface OperatorReturnDispatchModuleProps {
  seals: Seal[];
  operatorBranch: string;
  destinations: string[];
  locations: readonly string[];
  trips: Trip[];
  currentUser: any;
  onDispatchReturnSeals: (data: {
    sealNumbers: string[];
    trackingNumber: string;
    sentDate: string;
    carrier: string;
    notes?: string;
  }) => void;
  onSelectSealForPassport: (seal: Seal) => void;
}

export const OperatorReturnDispatchModule: React.FC<OperatorReturnDispatchModuleProps> = ({
  seals,
  operatorBranch,
  destinations,
  locations,
  trips,
  currentUser,
  onDispatchReturnSeals,
  onSelectSealForPassport
}) => {
  // Current date for default dispatch date input (YYYY-MM-DD)
  const todayDateStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  // Filter state
  const [activeFilterTab, setActiveFilterTab] = useState<'READY' | 'DISPATCHED' | 'DISPOSED' | 'ALL'>('READY');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [originFilter, setOriginFilter] = useState<string>('ALL');

  // Multi-selection state
  const [selectedSealNumbers, setSelectedSealNumbers] = useState<string[]>([]);

  // Dispatch Form State
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [sentDate, setSentDate] = useState<string>(todayDateStr);
  const [carrier, setCarrier] = useState<string>('FedEx Express');
  const [dispatchNotes, setDispatchNotes] = useState<string>('');
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Seals currently staged or returned from this operator's destination station
  const stationSpareSeals = useMemo(() => {
    return seals.filter(s => {
      const isReturn = s.status === 'PENDING_RETURN_TRANSIT';
      const matchesBranch = operatorBranch === 'ALL' || s.returnOriginatingDestination === operatorBranch;
      return isReturn && matchesBranch;
    });
  }, [seals, operatorBranch]);

  // Breakdown between ready-to-dispatch and already-dispatched
  const readySeals = useMemo(() => {
    return stationSpareSeals.filter(s => !s.returnTrackingNumber);
  }, [stationSpareSeals]);

  const dispatchedSeals = useMemo(() => {
    return stationSpareSeals.filter(s => !!s.returnTrackingNumber);
  }, [stationSpareSeals]);

  // Seals that were confirmed cut/destroyed at this station
  const stationDisposedSeals = useMemo(() => {
    return seals.filter(s => {
      const isDisposed = s.status === 'DISPOSED';
      const matchesBranch = 
        operatorBranch === 'ALL' || 
        s.location === operatorBranch || 
        s.currentTripDestination === operatorBranch ||
        s.returnOriginatingDestination === operatorBranch;
      return isDisposed && matchesBranch;
    });
  }, [seals, operatorBranch]);

  // Filtered list according to tab, origin station filter, and search query
  const displayedSeals = useMemo(() => {
    let list = stationSpareSeals;
    if (activeFilterTab === 'READY') {
      list = readySeals;
    } else if (activeFilterTab === 'DISPATCHED') {
      list = dispatchedSeals;
    } else if (activeFilterTab === 'DISPOSED') {
      list = stationDisposedSeals;
    }

    if (originFilter !== 'ALL') {
      list = list.filter(s => (s.returnOriginLocation || s.location) === originFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s => 
        s.sealNumber.toLowerCase().includes(q) ||
        (s.currentTripId && s.currentTripId.toLowerCase().includes(q)) ||
        (s.returnTripId && s.returnTripId.toLowerCase().includes(q)) ||
        (s.returnTrackingNumber && s.returnTrackingNumber.toLowerCase().includes(q)) ||
        (s.returnCarrier && s.returnCarrier.toLowerCase().includes(q)) ||
        (s.disposalReason && s.disposalReason.toLowerCase().includes(q)) ||
        (s.notes && s.notes.toLowerCase().includes(q))
      );
    }

    return list;
  }, [stationSpareSeals, readySeals, dispatchedSeals, stationDisposedSeals, activeFilterTab, originFilter, searchQuery]);

  // Handle single seal selection toggle
  const toggleSelectSeal = (sealNum: string) => {
    const targetSeal = seals.find(s => s.sealNumber === sealNum);
    if (targetSeal?.status === 'DISPOSED') return; // Cannot select disposed seal
    setSelectedSealNumbers(prev => 
      prev.includes(sealNum) ? prev.filter(n => n !== sealNum) : [...prev, sealNum]
    );
    setFormError(null);
  };

  // Select all currently selectable (ready) seals in view
  const selectableDisplayedSeals = useMemo(() => {
    return displayedSeals.filter(s => s.status === 'PENDING_RETURN_TRANSIT' && !s.returnTrackingNumber);
  }, [displayedSeals]);

  const toggleSelectAll = () => {
    const selectableNums = selectableDisplayedSeals.map(s => s.sealNumber);
    const allSelected = selectableNums.length > 0 && selectableNums.every(n => selectedSealNumbers.includes(n));
    
    if (allSelected) {
      setSelectedSealNumbers(prev => prev.filter(n => !selectableNums.includes(n)));
    } else {
      setSelectedSealNumbers(prev => Array.from(new Set([...prev, ...selectableNums])));
    }
    setFormError(null);
  };

  // Copy tracking number helper
  const handleCopyTracking = (trackNum: string) => {
    navigator.clipboard.writeText(trackNum);
    setCopiedTracking(trackNum);
    setTimeout(() => setCopiedTracking(null), 2000);
  };

  // Submit dispatch action
  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSealNumbers.length === 0) {
      setFormError('Please select at least one seal to send back.');
      return;
    }

    if (!trackingNumber.trim()) {
      setFormError('Courier Tracking Number is required.');
      return;
    }

    if (!sentDate) {
      setFormError('Dispatch date is required.');
      return;
    }

    onDispatchReturnSeals({
      sealNumbers: selectedSealNumbers,
      trackingNumber: trackingNumber.trim(),
      sentDate,
      carrier,
      notes: dispatchNotes.trim()
    });

    // Reset form & selection
    setSelectedSealNumbers([]);
    setTrackingNumber('');
    setDispatchNotes('');
    setFormError(null);
    // Switch to Dispatched view to let user see their newly dispatched batch
    setActiveFilterTab('DISPATCHED');
  };

  // Target origins of currently selected seals
  const selectedOrigins = useMemo(() => {
    const originSet = new Set<string>();
    selectedSealNumbers.forEach(num => {
      const seal = seals.find(s => s.sealNumber === num);
      if (seal) {
        originSet.add(seal.returnOriginLocation || seal.location || 'Origin');
      }
    });
    return Array.from(originSet);
  }, [selectedSealNumbers, seals]);

  return (
    <div className="space-y-6">
      
      {/* Top Banner Header - Darker Gray Box (bg-slate-200) */}
      <div className="bg-slate-200 rounded-xl border border-slate-300 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <RotateCcw className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-950">
                  {operatorBranch === 'ALL' ? 'All Stations' : `${operatorBranch} Station`} Spare Seals — Return to Origin Dispatch
                </h2>
                <span className="text-xs font-mono font-extrabold px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-950 border border-emerald-300">
                  Station Custody Safe
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-1 font-medium">
                Select unused inside spare seals unpacked at this station, record the courier tracking number and date sent, and dispatch them strictly back to their originating station safe.
              </p>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-2">
            <div className="bg-white px-3.5 py-2 rounded-lg border border-slate-300 shadow-2xs text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Ready to Send</span>
              <span className="text-base font-extrabold text-amber-700">{readySeals.length}</span>
            </div>
            <div className="bg-white px-3.5 py-2 rounded-lg border border-slate-300 shadow-2xs text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Dispatched / Sent</span>
              <span className="text-base font-extrabold text-purple-700">{dispatchedSeals.length}</span>
            </div>
            <div className="bg-white px-3.5 py-2 rounded-lg border border-slate-300 shadow-2xs text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Staged</span>
              <span className="text-base font-extrabold text-slate-900">{stationSpareSeals.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dispatch Action Panel (Appears when seals are selected or pinned) */}
      <div className={`rounded-xl border transition-all ${
        selectedSealNumbers.length > 0
          ? 'bg-emerald-50/90 border-emerald-300 shadow-md ring-1 ring-emerald-400'
          : 'bg-slate-200 border-slate-300 shadow-xs'
      } p-5`}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-300">
          <div className="flex items-center gap-2">
            <Send className={`w-5 h-5 ${selectedSealNumbers.length > 0 ? 'text-emerald-700' : 'text-slate-600'}`} />
            <div>
              <h3 className="text-sm font-bold text-slate-950">
                Dispatch Return Shipment to Origin
              </h3>
              <p className="text-xs text-slate-700 font-medium">
                {selectedSealNumbers.length > 0
                  ? `Selected ${selectedSealNumbers.length} seal(s) returning to ${selectedOrigins.map(o => `${o} Station`).join(', ')}`
                  : 'Select one or more spare seals from the table below to enter shipping details.'}
              </p>
            </div>
          </div>

          {selectedSealNumbers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-md">
                {selectedSealNumbers.length} Seal{selectedSealNumbers.length > 1 ? 's' : ''} Selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedSealNumbers([])}
                className="text-xs text-slate-600 hover:text-slate-900 underline font-semibold cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>

        {formError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-900 rounded-lg text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Dispatch Form Inputs */}
        <form onSubmit={handleDispatchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* Tracking Number Input */}
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Courier Tracking / Waybill # <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => {
                  setTrackingNumber(e.target.value);
                  setFormError(null);
                }}
                placeholder="e.g. FX-7940182245 or 1Z99999"
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 placeholder:font-sans"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              AWB, FedEx, UPS or courier bag barcode
            </span>
          </div>

          {/* Date Sent Input */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Date Sent to Origin <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={sentDate}
                onChange={(e) => {
                  setSentDate(e.target.value);
                  setFormError(null);
                }}
                className="w-full px-3 py-2 text-xs font-bold bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Actual date dispatched by operator
            </span>
          </div>

          {/* Carrier / Courier Selector */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Courier / Carrier Method
            </label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="FedEx Express">FedEx Express</option>
              <option value="FedEx Ground">FedEx Ground</option>
              <option value="UPS Next Day Air">UPS Next Day Air</option>
              <option value="UPS Ground">UPS Ground</option>
              <option value="DHL Express">DHL Express</option>
              <option value="Internal CNW Pouch">Internal CNW Courier Pouch</option>
              <option value="On-Board Courier (OBC)">On-Board Courier (OBC)</option>
              <option value="Commercial Airline Cargo AWB">Commercial Airline Cargo AWB</option>
            </select>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Logistics service provider
            </span>
          </div>

          {/* Submit Button */}
          <div className="md:col-span-2 flex flex-col justify-end">
            <button
              type="submit"
              disabled={selectedSealNumbers.length === 0}
              className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                selectedSealNumbers.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold active:scale-[0.99]'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-400'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send ({selectedSealNumbers.length})</span>
            </button>
            <span className="text-[10px] text-slate-500 mt-0.5 text-center block">
              Dispatches to Origin Safe
            </span>
          </div>

          {/* Optional notes */}
          <div className="md:col-span-12 pt-1">
            <input
              type="text"
              value={dispatchNotes}
              onChange={(e) => setDispatchNotes(e.target.value)}
              placeholder="Optional: Dispatch memo, internal pouch seal #, or courier manifest notes..."
              className="w-full px-3 py-1.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
            />
          </div>
        </form>
      </div>

      {/* Table Section - Darker Gray Box (bg-slate-200) */}
      <div className="bg-slate-200 rounded-xl border border-slate-300 shadow-xs overflow-hidden">
        
        {/* Controls Toolbar: Filter Tabs, Origin Pulldown, Search & Select All */}
        <div className="p-4 border-b border-slate-300 bg-slate-300/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Tabs: Ready to Send vs Dispatched vs All */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300">
            <button
              type="button"
              onClick={() => setActiveFilterTab('READY')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeFilterTab === 'READY'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-black hover:bg-slate-100'
              }`}
            >
              <span>Ready to Send</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeFilterTab === 'READY' ? 'bg-amber-800 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {readySeals.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilterTab('DISPATCHED')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeFilterTab === 'DISPATCHED'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-black hover:bg-slate-100'
              }`}
            >
              <span>Dispatched / Sent</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeFilterTab === 'DISPATCHED' ? 'bg-purple-800 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {dispatchedSeals.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilterTab('DISPOSED')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeFilterTab === 'DISPOSED'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-black hover:bg-slate-100'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Disposed at Station</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeFilterTab === 'DISPOSED' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800 font-bold'
              }`}>
                {stationDisposedSeals.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilterTab('ALL')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeFilterTab === 'ALL'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-black hover:bg-slate-100'
              }`}
            >
              <span>All ({stationSpareSeals.length})</span>
            </button>
          </div>

          {/* Search & Origin Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Origin station filter */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-slate-600 font-semibold text-[11px]">Target Origin:</span>
              <select
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Origins</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc} Station</option>
                ))}
              </select>
            </div>

            {/* Search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search seal # or tracking..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44 placeholder:text-slate-400"
              />
            </div>

            {/* Select / Deselect All for Ready Seals */}
            {selectableDisplayedSeals.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="px-3 py-1.5 text-xs font-bold bg-white text-slate-800 hover:text-black border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {selectableDisplayedSeals.every(s => selectedSealNumbers.includes(s.sealNumber))
                  ? 'Deselect All'
                  : `Select All (${selectableDisplayedSeals.length})`}
              </button>
            )}
          </div>
        </div>

        {/* Seal Records Table */}
        {displayedSeals.length === 0 ? (
          <div className="p-12 text-center text-slate-600">
            <Package className="w-10 h-10 mx-auto mb-2 text-slate-400" />
            <h3 className="font-bold text-slate-900 text-sm">No Spare Seals Found</h3>
            <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto font-medium">
              {activeFilterTab === 'READY'
                ? `No unused spare seals are currently pending courier dispatch at ${operatorBranch === 'ALL' ? 'destinations' : `${operatorBranch} station`}.`
                : 'No seals matching the selected filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-300 border-b border-slate-400 text-slate-800 font-extrabold tracking-wider uppercase text-[11px]">
                  <th className="py-3 px-4 w-12 text-center">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="py-3 px-4">Spare Seal #</th>
                  <th className="py-3 px-4">Origin Station (Must Return To)</th>
                  <th className="py-3 px-4">Unpacked At</th>
                  <th className="py-3 px-4">Trip Record &amp; Arrival</th>
                  <th className="py-3 px-4">Courier Tracking &amp; Date Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {displayedSeals.map((seal) => {
                  const associatedTrip = trips.find(t => t.id === seal.returnTripId || t.id === seal.currentTripId || t.extraSealNumber === seal.sealNumber || t.primarySealNumber === seal.sealNumber);
                  const isChecked = selectedSealNumbers.includes(seal.sealNumber);
                  const originStation = seal.returnOriginLocation || seal.location || 'LAX';
                  const isDispatched = !!seal.returnTrackingNumber;
                  const isDisposed = seal.status === 'DISPOSED';

                  return (
                    <tr 
                      key={seal.sealNumber}
                      className={`hover:bg-slate-300/60 transition-colors ${
                        isChecked 
                          ? 'bg-emerald-100/90' 
                          : isDisposed
                          ? 'bg-slate-300/40'
                          : isDispatched 
                          ? 'bg-purple-50/50' 
                          : 'bg-slate-200'
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        {isDisposed ? (
                          <span title="Seal Disposed & Destroyed" className="inline-flex items-center justify-center">
                            <Trash2 className="w-4 h-4 text-slate-500" />
                          </span>
                        ) : !isDispatched ? (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectSeal(seal.sealNumber)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        ) : (
                          <span title="Already dispatched" className="inline-flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-purple-600" />
                          </span>
                        )}
                      </td>

                      {/* Seal Number */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => onSelectSealForPassport(seal)}
                          className="font-mono font-extrabold text-indigo-900 hover:text-indigo-950 text-sm flex items-center gap-1.5 cursor-pointer"
                          title="Open Chain of Custody Passport"
                        >
                          <span>#{seal.sealNumber}</span>
                          <span className={`text-[10px] font-sans font-bold px-1.5 py-0.2 rounded border ${
                            isDisposed
                              ? 'bg-slate-300 text-slate-900 border-slate-400'
                              : 'bg-emerald-100 text-emerald-950 border-emerald-300'
                          }`}>
                            {isDisposed ? 'DISPOSED & CUT' : 'Inside Spare'}
                          </span>
                        </button>
                      </td>

                      {/* Origin Station (Strict return destination or Disposal Location) */}
                      <td className="py-3.5 px-4">
                        {isDisposed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold text-xs bg-slate-300 text-slate-900 border border-slate-400">
                            <Trash2 className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            <span>Cut at {seal.location || operatorBranch}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-extrabold text-xs bg-indigo-100 text-indigo-950 border border-indigo-300">
                            <MapPin className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                            <span>Returns to {originStation}</span>
                          </span>
                        )}
                      </td>

                      {/* Destination Station */}
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        <span>{isDisposed ? `${seal.location || operatorBranch} Receiving Bay` : `${seal.returnOriginatingDestination || operatorBranch} Station Safe`}</span>
                      </td>

                      {/* Trip & Arrival Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">
                          {seal.returnTripId || seal.currentTripId || associatedTrip?.id || 'TRP-DISPATCH'}
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                          {isDisposed ? `Disposed: ${seal.disposedAt || 'Recorded'}` : `Arrived: ${seal.returnArrivalDate || 'Recorded'}`}
                        </div>
                      </td>

                      {/* Courier Tracking Number & Date Sent OR Disposal Reason */}
                      <td className="py-3.5 px-4">
                        {isDisposed ? (
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                              <span>{seal.disposedBy || 'Verified at destination'}</span>
                            </div>
                            <div className="text-[11px] text-slate-700 max-w-xs truncate font-medium" title={seal.disposalReason}>
                              {seal.disposalReason || 'Container opened & seal destroyed'}
                            </div>
                          </div>
                        ) : seal.returnTrackingNumber ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-extrabold text-purple-950 bg-purple-100 border border-purple-300 px-2 py-0.5 rounded text-xs">
                                {seal.returnTrackingNumber}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyTracking(seal.returnTrackingNumber!)}
                                className="text-slate-600 hover:text-slate-950 p-1 rounded hover:bg-slate-300 transition-colors"
                                title="Copy tracking number"
                              >
                                {copiedTracking === seal.returnTrackingNumber ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            <div className="text-[11px] text-slate-700 font-medium">
                              <span className="font-bold">{seal.returnCarrier || 'Courier'}</span> · Sent on <strong className="text-slate-900">{seal.returnSentDate || 'N/A'}</strong>
                            </div>
                            {seal.returnSentBy && (
                              <div className="text-[10px] text-slate-500 font-semibold">
                                By: {seal.returnSentBy}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                              <Clock className="w-3 h-3 text-amber-700" />
                              <span>Staged in safe (Not Sent)</span>
                            </span>
                            <div className="text-[10px] text-slate-500 font-medium">
                              Select this row to enter tracking #
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer Summary */}
        <div className="p-3 bg-slate-300/80 border-t border-slate-300 flex items-center justify-between text-xs text-slate-700 font-semibold">
          <div>
            Showing {displayedSeals.length} of {stationSpareSeals.length} spare seal(s) staged at {operatorBranch === 'ALL' ? 'all destination stations' : `${operatorBranch} station`}
          </div>
          <div className="text-slate-600 text-[11px]">
            * Seals must only return to their designated Origin station safe.
          </div>
        </div>

      </div>

    </div>
  );
};
