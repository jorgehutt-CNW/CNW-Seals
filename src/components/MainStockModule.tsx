import React, { useState, useMemo } from 'react';
import { 
  PackagePlus, Search, Filter, Plus, Edit3, Trash2, ShieldCheck, 
  AlertCircle, CheckCircle2, ChevronRight, X, Sparkles, Box, Info,
  Layers, Truck, RotateCcw, MapPin
} from 'lucide-react';
import { Seal, SealStatus, LocationRecord } from '../types';

interface MainStockModuleProps {
  seals: Seal[];
  selectedLocation: string;
  locations: readonly string[] | string[];
  locationsList?: LocationRecord[];
  isSuperuser?: boolean;
  currentRole?: string;
  assignedFacility?: string;
  isFacilityRestricted?: boolean;
  sealToEdit?: Seal | null;
  onClearSealToEdit?: () => void;
  onGenerateBatch: (start: number, end: number, purchaseDate: string, boxRef: string, notes: string, location: string) => { added: number; skipped: number };
  onAddSingleSeal: (sealNumber: string, purchaseDate: string, boxRef: string, notes: string, location: string) => boolean;
  onEditSeal: (oldSealNumber: string, newSealNumber: string, notes: string, location: string, newStatus?: SealStatus) => boolean;
  onDeleteSeal: (sealNumber: string) => boolean;
  onSelectSealForPassport: (seal: Seal) => void;
}

export const MainStockModule: React.FC<MainStockModuleProps> = ({
  seals,
  selectedLocation,
  locations,
  locationsList,
  isSuperuser,
  currentRole,
  assignedFacility,
  isFacilityRestricted,
  sealToEdit,
  onClearSealToEdit,
  onGenerateBatch,
  onAddSingleSeal,
  onEditSeal,
  onDeleteSeal,
  onSelectSealForPassport
}) => {
  // Tabs / Modes: 'ALL' | 'AVAILABLE' | 'IN_TRANSIT_OUTBOUND' | 'PENDING_RETURN_TRANSIT' | 'DISPOSED'
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Locations sourced directly from Firestore 'locations' collection (with fallback)
  const recordedLocations = useMemo(() => {
    if (locationsList && locationsList.length > 0) {
      return locationsList;
    }
    return locations.map(c => ({ id: `LOC-${c}`, code: c, name: `${c} Station` }));
  }, [locationsList, locations]);

  // Fixed facility for Admin User:
  // When user is an Admin (currentRole === 'ADMIN' && !isSuperuser) or facility restricted,
  // the facility is locked to their assigned facility.
  const isAdmin = currentRole === 'ADMIN' && !isSuperuser;
  const adminAssignedFacility = (isAdmin || isFacilityRestricted)
    ? (assignedFacility && assignedFacility !== 'ALL' 
        ? assignedFacility 
        : (selectedLocation !== 'ALL' ? selectedLocation : (recordedLocations[0]?.code || 'LAX')))
    : null;

  // Bulk generator state
  const [showBulkGenerator, setShowBulkGenerator] = useState(false);
  const [bulkStart, setBulkStart] = useState<string>('');
  const [bulkEnd, setBulkEnd] = useState<string>('');
  const [bulkDate, setBulkDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bulkBoxRef, setBulkBoxRef] = useState<string>('');
  const [bulkNotes, setBulkNotes] = useState<string>('');
  const [bulkLocation, setBulkLocation] = useState<string>(
    adminAssignedFacility || (
      selectedLocation === 'ALL' 
        ? (locationsList?.[0]?.code || locations[0] || 'LAX') 
        : selectedLocation
    )
  );
  const [bulkFeedback, setBulkFeedback] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Single seal modal
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [singleNumber, setSingleNumber] = useState('');
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);
  const [singleBoxRef, setSingleBoxRef] = useState('');
  const [singleNotes, setSingleNotes] = useState('');
  const [singleLocation, setSingleLocation] = useState(
    adminAssignedFacility || (
      selectedLocation === 'ALL' 
        ? (locationsList?.[0]?.code || locations[0] || 'LAX') 
        : selectedLocation
    )
  );
  const [singleError, setSingleError] = useState('');

  // Edit seal modal
  const [editingSeal, setEditingSeal] = useState<Seal | null>(null);
  const [editNumber, setEditNumber] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLocation, setEditLocation] = useState(locationsList?.[0]?.code || locations[0] || 'LAX');
  const [editStatus, setEditStatus] = useState<SealStatus>('AVAILABLE');
  const [editError, setEditError] = useState('');

  // Delete confirmation
  const [deletingSealNumber, setDeletingSealNumber] = useState<string | null>(null);

  // External trigger to edit a seal (e.g. from passport)
  React.useEffect(() => {
    if (sealToEdit) {
      setEditingSeal(sealToEdit);
      setEditNumber(sealToEdit.sealNumber);
      setEditNotes(sealToEdit.notes || '');
      setEditLocation(sealToEdit.location || 'LAX');
      setEditStatus(sealToEdit.status);
      setEditError('');
      onClearSealToEdit?.();
    }
  }, [sealToEdit, onClearSealToEdit]);

  // Update modal location defaults when top selectedLocation, assignedFacility, or recorded locations change
  React.useEffect(() => {
    if (adminAssignedFacility) {
      setBulkLocation(adminAssignedFacility);
      setSingleLocation(adminAssignedFacility);
    } else if (selectedLocation !== 'ALL') {
      setBulkLocation(selectedLocation);
      setSingleLocation(selectedLocation);
    } else if (recordedLocations.length > 0) {
      if (!recordedLocations.some(l => l.code === bulkLocation)) {
        setBulkLocation(recordedLocations[0].code);
      }
      if (!recordedLocations.some(l => l.code === singleLocation)) {
        setSingleLocation(recordedLocations[0].code);
      }
    }
  }, [adminAssignedFacility, selectedLocation, recordedLocations]);

  // Computed range count
  const parsedStart = parseInt(bulkStart, 10);
  const parsedEnd = parseInt(bulkEnd, 10);
  const calculatedCount = !isNaN(parsedStart) && !isNaN(parsedEnd) && parsedEnd >= parsedStart 
    ? parsedEnd - parsedStart + 1 
    : 0;

  // Handle Bulk Generation
  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBulkFeedback(null);

    if (isNaN(parsedStart) || isNaN(parsedEnd)) {
      setBulkFeedback({ message: 'Start and End seal numbers must be valid integers.', type: 'error' });
      return;
    }

    if (parsedEnd < parsedStart) {
      setBulkFeedback({ message: 'End seal number must be greater than or equal to Start seal number.', type: 'error' });
      return;
    }

    if (calculatedCount > 500) {
      setBulkFeedback({ message: 'Maximum 500 seals can be generated in a single batch to avoid browser latency.', type: 'warning' });
      return;
    }

    const targetLoc = adminAssignedFacility || bulkLocation || (selectedLocation === 'ALL' ? 'LAX' : selectedLocation);
    const result = onGenerateBatch(parsedStart, parsedEnd, bulkDate, bulkBoxRef.trim() || `BX-${targetLoc}-UNASSIGNED`, bulkNotes.trim(), targetLoc);
    if (result.added > 0) {
      setBulkFeedback({
        message: `Successfully generated and added ${result.added} seals to ${targetLoc} inventory.${result.skipped > 0 ? ` (${result.skipped} duplicate seal numbers skipped).` : ''}`,
        type: 'success'
      });
      // Increment defaults for next batch
      setBulkStart((parsedEnd + 1).toString());
      setBulkEnd((parsedEnd + 16).toString());
    } else {
      setBulkFeedback({
        message: `All ${result.skipped} seal numbers in this range already exist in the inventory. No new seals added.`,
        type: 'warning'
      });
    }
  };

  // Handle Single Seal Add
  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSingleError('');
    const cleanNum = singleNumber.trim();
    if (!cleanNum) {
      setSingleError('Please enter a seal number.');
      return;
    }

    const targetLoc = adminAssignedFacility || singleLocation || (selectedLocation === 'ALL' ? 'LAX' : selectedLocation);
    const success = onAddSingleSeal(cleanNum, singleDate, singleBoxRef.trim() || `BX-${targetLoc}-REG`, singleNotes.trim(), targetLoc);
    if (success) {
      setShowSingleModal(false);
      setSingleNumber('');
      setSingleNotes('');
    } else {
      setSingleError(`Seal #${cleanNum} already exists in the system.`);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSeal) return;
    setEditError('');

    const cleanNum = editNumber.trim();
    if (!cleanNum) {
      setEditError('Seal number cannot be empty.');
      return;
    }

    const success = onEditSeal(
      editingSeal.sealNumber, 
      cleanNum, 
      editNotes.trim(), 
      editLocation,
      isSuperuser ? editStatus : undefined
    );
    if (success) {
      setEditingSeal(null);
    } else {
      setEditError(`Cannot change seal number to #${cleanNum}: this number already exists.`);
    }
  };

  // Handle Delete
  const confirmDelete = () => {
    if (deletingSealNumber) {
      onDeleteSeal(deletingSealNumber);
      setDeletingSealNumber(null);
    }
  };

  // Seals scoped to the selected location
  const locationSeals = useMemo(() => {
    if (selectedLocation === 'ALL') return seals;
    return seals.filter(s => {
      // 1. Direct location match (covers AVAILABLE safe stock at station, etc.)
      if (s.location === selectedLocation) return true;
      // 2. In-transit seals originating from or destined for this station
      if (s.status === 'IN_TRANSIT_OUTBOUND' && (s.currentTripOrigin === selectedLocation || s.currentTripDestination === selectedLocation)) return true;
      // 3. Pending return seals originating from or destined for this station
      if (s.status === 'PENDING_RETURN_TRANSIT' && (s.returnOriginLocation === selectedLocation || s.returnOriginatingDestination === selectedLocation)) return true;
      // 4. Disposed seals that originated from this station or were destroyed at this destination station
      if (s.status === 'DISPOSED' && (s.currentTripOrigin === selectedLocation || s.currentTripDestination === selectedLocation || s.returnOriginLocation === selectedLocation)) return true;
      return false;
    });
  }, [seals, selectedLocation]);

  // Filtered seals for current view
  const filteredSeals = useMemo(() => {
    return locationSeals.filter(s => {
      const matchesSearch = s.sealNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.boxRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.notes && s.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [locationSeals, searchTerm, statusFilter]);

  const availableCount = locationSeals.filter(s => s.status === 'AVAILABLE').length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Action Controls - Solid Darker Gray Box (bg-slate-200) */}
      <div className="bg-slate-200 rounded-xl border border-slate-300 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-lg">
                <MapPin className="w-5 h-5 text-indigo-700" />
                <h2>
                  {selectedLocation === 'ALL' ? 'Seal Inventory (All Stations)' : `${selectedLocation} Station Seal Inventory`}
                </h2>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-950 border border-emerald-300">
                {availableCount} Available for Dispatch {selectedLocation !== 'ALL' && `at ${selectedLocation}`}
              </span>
            </div>
            <p className="text-xs text-slate-700 mt-1 font-medium">
              {selectedLocation === 'ALL'
                ? 'Consolidated view of all seals across LAX, SFO, and PHX stations. Select a specific location in the top bar to manage a single hub.'
                : `Dedicated physical seal reserves stationed at ${selectedLocation}. Only ${selectedLocation} available seals can be assigned to outbound dispatches.`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowBulkGenerator(!showBulkGenerator);
                setBulkFeedback(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all border cursor-pointer ${
                showBulkGenerator
                  ? 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent shadow-xs'
              }`}
            >
              <PackagePlus className="w-4 h-4" />
              <span>{showBulkGenerator ? 'Hide Bulk Generator' : 'Register Bulk Box'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowSingleModal(true);
                setSingleError('');
                setSingleLocation(adminAssignedFacility || (selectedLocation === 'ALL' ? 'LAX' : selectedLocation));
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Add Single Seal</span>
            </button>
          </div>
        </div>

        {/* Collapsible Bulk Generator Form */}
        {showBulkGenerator && (
          <div className="mt-5 pt-5 border-t border-slate-300 animate-in fade-in">
            <div className="bg-slate-300/80 rounded-xl p-4 border border-slate-400">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-950">
                  <Box className="w-4 h-4 text-indigo-700" />
                  <span>Bulk Range Purchase Generator (MegaFortis Sequential Boxes)</span>
                </div>
                <span className="text-[11px] font-mono font-bold bg-indigo-100 text-indigo-950 px-2 py-0.5 rounded border border-indigo-200">
                  Target Station: {bulkLocation}
                </span>
              </div>

              {bulkFeedback && (
                <div className={`mb-3 p-3 rounded-lg text-xs font-semibold flex items-center gap-2 border ${
                  bulkFeedback.type === 'success'
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                    : bulkFeedback.type === 'warning'
                    ? 'bg-amber-100 text-amber-950 border-amber-300'
                    : 'bg-rose-100 text-rose-950 border-rose-300'
                }`}>
                  {bulkFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
                  )}
                  <span>{bulkFeedback.message}</span>
                </div>
              )}

              <form onSubmit={handleBulkSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-900 mb-1 flex items-center justify-between">
                    <span>Station Location <span className="text-rose-600">*</span></span>
                    {adminAssignedFacility && (
                      <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                        Assigned
                      </span>
                    )}
                  </label>
                  <select
                    value={adminAssignedFacility || bulkLocation}
                    onChange={(e) => {
                      if (!adminAssignedFacility) {
                        setBulkLocation(e.target.value);
                      }
                    }}
                    disabled={Boolean(adminAssignedFacility)}
                    className={`w-full px-2.5 py-1.5 border rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                      adminAssignedFacility
                        ? 'bg-slate-200 border-slate-400 text-slate-800 cursor-not-allowed opacity-90'
                        : 'bg-white border-slate-300 text-slate-950'
                    }`}
                    title={adminAssignedFacility ? `Fixed to assigned facility (${adminAssignedFacility}) for Admin User` : 'Station Location'}
                  >
                    {recordedLocations.map(loc => (
                      <option key={loc.id || loc.code} value={loc.code}>
                        {loc.code} - {loc.name}
                      </option>
                    ))}
                    {!recordedLocations.some(l => l.code === (adminAssignedFacility || bulkLocation)) && (adminAssignedFacility || bulkLocation) && (
                      <option value={adminAssignedFacility || bulkLocation}>{adminAssignedFacility || bulkLocation}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Start Number <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    value={bulkStart}
                    onChange={(e) => setBulkStart(e.target.value)}
                    placeholder="e.g. 849070"
                    required
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    End Number <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    value={bulkEnd}
                    onChange={(e) => setBulkEnd(e.target.value)}
                    placeholder="e.g. 849085"
                    required
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Box Reference <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={bulkBoxRef}
                    onChange={(e) => setBulkBoxRef(e.target.value)}
                    placeholder="e.g. BX-LAX-050"
                    required
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Purchase Date <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={bulkDate}
                    onChange={(e) => setBulkDate(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Generate ({calculatedCount})</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Status filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { 
              id: 'ALL', 
              label: 'All Seals', 
              count: locationSeals.length,
              icon: <Layers className="w-3.5 h-3.5 text-indigo-500" />
            },
            { 
              id: 'AVAILABLE', 
              label: 'Available', 
              count: locationSeals.filter(s => s.status === 'AVAILABLE').length,
              icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            },
            { 
              id: 'IN_TRANSIT_OUTBOUND', 
              label: 'Outbound Transit', 
              count: locationSeals.filter(s => s.status === 'IN_TRANSIT_OUTBOUND').length,
              icon: <Truck className="w-3.5 h-3.5 text-amber-600" />
            },
            { 
              id: 'PENDING_RETURN_TRANSIT', 
              label: 'Pending Return', 
              count: locationSeals.filter(s => s.status === 'PENDING_RETURN_TRANSIT').length,
              icon: <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
            },
            { 
              id: 'DISPOSED', 
              label: 'Disposed', 
              count: locationSeals.filter(s => s.status === 'DISPOSED').length,
              icon: <Trash2 className="w-3.5 h-3.5 text-slate-500" />
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-white text-slate-800 hover:bg-slate-100 border border-slate-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums ${
                statusFilter === tab.id ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-950 font-extrabold'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${selectedLocation !== 'ALL' ? selectedLocation : ''} seal # or batch...`}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-950 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Inventory Table - Darker Gray Box (bg-slate-200) */}
      <div className="bg-slate-200 rounded-xl border border-slate-300 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-300 border-b border-slate-400 text-slate-800 font-extrabold tracking-wider uppercase text-[11px]">
                <th className="py-3 px-4">Seal Number</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Inventory Location</th>
                <th className="py-3 px-4">Box Ref</th>
                <th className="py-3 px-4">Registered Date</th>
                <th className="py-3 px-4">Transit / Custody Status</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {filteredSeals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-600 bg-slate-200">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                    <p className="font-bold text-slate-800">
                      No seals found for {selectedLocation === 'ALL' ? 'selected filters' : `${selectedLocation} Station`}.
                    </p>
                    <p className="text-xs text-slate-600 mt-1">Try clearing your search term, changing status, or switching stations in the top bar.</p>
                  </td>
                </tr>
              ) : (
                filteredSeals.map((seal) => (
                  <tr 
                    key={seal.sealNumber}
                    className="hover:bg-slate-300/80 transition-colors group cursor-pointer bg-slate-200"
                    onClick={() => onSelectSealForPassport(seal)}
                  >
                    {/* Seal Number */}
                    <td className="py-3 px-4 font-mono font-extrabold text-slate-950 text-sm">
                      <div className="flex items-center gap-1.5">
                        <span>#{seal.sealNumber}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      {seal.status === 'AVAILABLE' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          Available
                        </span>
                      )}
                      {seal.status === 'IN_TRANSIT_OUTBOUND' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-950 border border-amber-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          Outbound Transit
                        </span>
                      )}
                      {seal.status === 'PENDING_RETURN_TRANSIT' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-950 border border-purple-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                          Pending Return
                        </span>
                      )}
                      {seal.status === 'DISPOSED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-300 text-slate-800 border border-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          Disposed
                        </span>
                      )}
                    </td>

                    {/* Location Badge */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-extrabold text-xs bg-indigo-100 text-indigo-950 border border-indigo-300">
                        <MapPin className="w-3 h-3 text-indigo-600" />
                        <span>{seal.location}</span>
                      </span>
                    </td>

                    {/* Box Ref */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {seal.boxRef}
                    </td>

                    {/* Purchase Date */}
                    <td className="py-3 px-4 text-slate-800 font-semibold">
                      {seal.purchaseDate}
                    </td>

                    {/* Transit / Custody Details */}
                    <td className="py-3 px-4 text-slate-900 font-semibold">
                      {seal.status === 'AVAILABLE' && (
                        <span className="text-slate-700">In {seal.location} Stock Safe</span>
                      )}
                      {seal.status === 'IN_TRANSIT_OUTBOUND' && (
                        <span className="font-bold text-amber-950 inline-flex items-center gap-1">
                          <span className="font-extrabold text-indigo-800">{seal.currentTripOrigin || seal.location}</span>
                          <span>&rarr;</span>
                          <span className="font-extrabold text-amber-900">{seal.currentTripDestination}</span>
                          <span className="text-[10px] text-slate-600">({seal.currentTripId})</span>
                        </span>
                      )}
                      {seal.status === 'PENDING_RETURN_TRANSIT' && (
                        <span className="font-bold text-purple-950 inline-flex items-center gap-1">
                          <span>At {seal.returnOriginatingDestination}</span>
                          <span>&rarr; Returning only to <strong className="text-indigo-900 font-extrabold">{seal.returnOriginLocation || seal.location}</strong></span>
                        </span>
                      )}
                      {seal.status === 'DISPOSED' && (
                        <span className="text-slate-700">
                          Destroyed at destination ({seal.disposedBy?.split('(')[1]?.replace(')', '') || 'Disposed'})
                        </span>
                      )}
                    </td>

                    {/* Notes */}
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate font-medium" title={seal.notes}>
                      {seal.notes || '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      {seal.status === 'AVAILABLE' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSeal(seal);
                              setEditNumber(seal.sealNumber);
                              setEditNotes(seal.notes || '');
                              setEditLocation(seal.location || 'LAX');
                              setEditStatus(seal.status);
                              setEditError('');
                            }}
                            className="p-1.5 text-slate-700 hover:text-indigo-800 hover:bg-slate-300 rounded-md transition-colors cursor-pointer"
                            title="Edit seal details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingSealNumber(seal.sealNumber)}
                            className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-100 rounded-md transition-colors cursor-pointer"
                            title="Delete seal from inventory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : isSuperuser ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSeal(seal);
                              setEditNumber(seal.sealNumber);
                              setEditNotes(seal.notes || '');
                              setEditLocation(seal.location || 'LAX');
                              setEditStatus(seal.status);
                              setEditError('');
                            }}
                            className="px-2 py-1 text-xs font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-md transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                            title={`Superuser Override: Edit seal #${seal.sealNumber} (${seal.status})`}
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                            <span>Edit</span>
                            <span className="font-mono text-[9px] bg-amber-600 text-white px-1 py-0.2 rounded uppercase font-black">
                              Superuser
                            </span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-600 font-bold">
                          {seal.status === 'IN_TRANSIT_OUTBOUND' ? 'Outbound Transit' : 'In Custody'}
                        </span>
                      )}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-300 border-t border-slate-400 text-slate-800 text-[11px] font-bold flex items-center justify-between">
          <span>
            Showing {filteredSeals.length} of {locationSeals.length} seals for {selectedLocation === 'ALL' ? 'all stations' : `${selectedLocation} Station`}
          </span>
          <span className="italic">Click any seal to open its Digital Passport &amp; Custody Ledger</span>
        </div>
      </div>

      {/* Single Seal Modal - Darker Gray Box (bg-slate-200) */}
      {showSingleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-200 rounded-xl shadow-2xl border border-slate-300 w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-300">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-700" />
                Add Single Seal to Inventory
              </h3>
              <button
                type="button"
                onClick={() => setShowSingleModal(false)}
                className="text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {singleError && (
              <div className="mt-3 p-2.5 rounded bg-rose-100 text-rose-950 text-xs border border-rose-300 flex items-center gap-1.5 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{singleError}</span>
              </div>
            )}

            <form onSubmit={handleSingleSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-900 mb-1 flex items-center justify-between">
                  <span>Station Location <span className="text-rose-600">*</span></span>
                  {adminAssignedFacility && (
                    <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                      Assigned
                    </span>
                  )}
                </label>
                <select
                  value={adminAssignedFacility || singleLocation}
                  onChange={(e) => {
                    if (!adminAssignedFacility) {
                      setSingleLocation(e.target.value);
                      setSingleBoxRef(`BX-${e.target.value}-REG`);
                    }
                  }}
                  disabled={Boolean(adminAssignedFacility)}
                  className={`w-full px-3 py-2 border rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                    adminAssignedFacility
                      ? 'bg-slate-200 border-slate-400 text-slate-800 cursor-not-allowed opacity-90'
                      : 'bg-white border-slate-300 text-slate-950'
                  }`}
                  title={adminAssignedFacility ? `Fixed to assigned facility (${adminAssignedFacility}) for Admin User` : 'Station Location'}
                >
                  {recordedLocations.map(loc => (
                    <option key={loc.id || loc.code} value={loc.code}>
                      {loc.code} - {loc.name}
                    </option>
                  ))}
                  {!recordedLocations.some(l => l.code === (adminAssignedFacility || singleLocation)) && (adminAssignedFacility || singleLocation) && (
                    <option value={adminAssignedFacility || singleLocation}>{adminAssignedFacility || singleLocation}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Seal Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={singleNumber}
                  onChange={(e) => setSingleNumber(e.target.value)}
                  placeholder="e.g. 849099"
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Box / Batch Reference
                </label>
                <input
                  type="text"
                  value={singleBoxRef}
                  onChange={(e) => setSingleBoxRef(e.target.value)}
                  placeholder="e.g. BX-LAX-050"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Registration Date
                </label>
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={singleNotes}
                  onChange={(e) => setSingleNotes(e.target.value)}
                  placeholder="e.g. Single emergency replenishment"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-300">
                <button
                  type="button"
                  onClick={() => setShowSingleModal(false)}
                  className="px-3.5 py-2 rounded-lg text-slate-700 hover:bg-slate-300 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Add Seal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Seal Modal - Darker Gray Box (bg-slate-200) */}
      {editingSeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-200 rounded-xl shadow-2xl border border-slate-300 w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-300">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-700" />
                Edit Seal #{editingSeal.sealNumber}
              </h3>
              <button
                type="button"
                onClick={() => setEditingSeal(null)}
                className="text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="mt-3 p-2.5 rounded bg-rose-100 text-rose-950 text-xs border border-rose-300 flex items-center gap-1.5 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {editingSeal.status === 'IN_TRANSIT_OUTBOUND' && (
              <div className="mt-3 p-3 rounded-lg bg-amber-100 border border-amber-300 text-amber-950 text-xs shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <Truck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold uppercase tracking-wide text-[11px] text-amber-900 block">
                      Superuser Override · Active Outbound Transit Stage
                    </span>
                    <p className="mt-0.5 text-slate-800 font-medium text-[11px] leading-relaxed">
                      This seal is actively assigned to Trip <strong className="font-mono font-bold text-slate-900">{editingSeal.currentTripId || 'Outbound'}</strong> ({editingSeal.currentTripOrigin || editingSeal.location} &rarr; {editingSeal.currentTripDestination || 'En Route'}).
                      Updating the seal number or details will synchronize with the active trip dispatch record.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3 text-xs">
              {isSuperuser && (
                <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-lg">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                      <ShieldCheck className="w-4 h-4 text-amber-700" />
                      <span>Seal Lifecycle Status (Superuser Control)</span>
                    </label>
                    <span className="font-mono text-[9px] uppercase font-black bg-amber-600 text-white px-1.5 py-0.2 rounded">
                      Status Override
                    </span>
                  </div>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as SealStatus)}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-slate-950 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                  >
                    <option value="AVAILABLE">AVAILABLE - Ready in Station Stock Safe (For Dispatch)</option>
                    <option value="IN_TRANSIT_OUTBOUND">IN_TRANSIT_OUTBOUND - Outbound Transit (En Route with Cargo)</option>
                    <option value="PENDING_RETURN_TRANSIT">PENDING_RETURN_TRANSIT - Pending Return Courier to Origin</option>
                    <option value="DISPOSED">DISPOSED - Cut / Destroyed / Decommissioned</option>
                  </select>
                  <p className="text-[11px] text-amber-900 mt-1 font-medium">
                    Current stage: <strong className="font-extrabold">{editingSeal.status}</strong>. Changing status updates the lifecycle state and inventory availability.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Station Location <span className="text-rose-600">*</span>
                </label>
                <select
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-950 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {recordedLocations.map(loc => (
                    <option key={loc.id || loc.code} value={loc.code}>
                      {loc.code} - {loc.name}
                    </option>
                  ))}
                  {!recordedLocations.some(l => l.code === editLocation) && editLocation && (
                    <option value={editLocation}>{editLocation}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Seal Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={editNumber}
                  onChange={(e) => setEditNumber(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-300">
                <button
                  type="button"
                  onClick={() => setEditingSeal(null)}
                  className="px-3.5 py-2 rounded-lg text-slate-700 hover:bg-slate-300 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - Darker Gray Box (bg-slate-200) */}
      {deletingSealNumber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-200 rounded-xl shadow-2xl border border-slate-300 w-full max-w-sm p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-700 mb-3">
              <div className="w-9 h-9 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-rose-700" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Delete Seal #{deletingSealNumber}?</h3>
            </div>
            <p className="text-xs text-slate-800 mb-5 leading-relaxed font-semibold">
              This will permanently remove Seal <strong className="font-mono">#{deletingSealNumber}</strong> from the inventory and record the removal in the audit ledger.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingSealNumber(null)}
                className="px-3.5 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
