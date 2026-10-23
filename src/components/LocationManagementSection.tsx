import React, { useState, useMemo } from 'react';
import { 
  MapPin, Plus, Edit2, Trash2, CheckCircle2, AlertTriangle, 
  Search, X, Building2, Phone, Mail, FileText, Check, ShieldAlert,
  ArrowRight, ShieldCheck, Box
} from 'lucide-react';
import { LocationRecord, Seal, Trip } from '../types';
import type { User } from '../firebase';

interface LocationManagementSectionProps {
  locations: LocationRecord[];
  seals: Seal[];
  trips: Trip[];
  currentUser: User | null;
  onCreateLocation: (data: {
    code: string;
    name: string;
    address?: string;
    notes?: string;
  }) => { success: boolean; error?: string };
  onUpdateLocation: (id: string, data: {
    name: string;
    address?: string;
    notes?: string;
  }) => { success: boolean; error?: string };
  onDeleteLocation: (id: string) => { success: boolean; error?: string };
  isDark: boolean;
}

export const LocationManagementSection: React.FC<LocationManagementSectionProps> = ({
  locations,
  seals,
  trips,
  currentUser,
  onCreateLocation,
  onUpdateLocation,
  onDeleteLocation,
  isDark
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Edit Modal state
  const [editingLocation, setEditingLocation] = useState<LocationRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Delete Modal state
  const [deletingLocation, setDeletingLocation] = useState<LocationRecord | null>(null);

  // Filtered locations
  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        loc.code.toLowerCase().includes(q) ||
        loc.name.toLowerCase().includes(q) ||
        (loc.address && loc.address.toLowerCase().includes(q)) ||
        (loc.notes && loc.notes.toLowerCase().includes(q))
      );
    });
  }, [locations, searchQuery]);

  // Usage statistics for each location
  const locationUsage = useMemo(() => {
    const map: Record<string, { seals: number; trips: number }> = {};
    locations.forEach(loc => {
      const sealCount = seals.filter(s => s.location === loc.code || s.returnOriginLocation === loc.code).length;
      const tripCount = trips.filter(t => t.originLocation === loc.code || t.destination === loc.code).length;
      map[loc.code] = { seals: sealCount, trips: tripCount };
    });
    return map;
  }, [locations, seals, trips]);

  // Handle Create Location
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    const cleanCode = newCode.trim().toUpperCase();
    if (!cleanCode) {
      setCreateError('Station Code is required (e.g. MIA, ORD, DFW).');
      return;
    }
    if (!/^[A-Z0-9_-]{2,8}$/.test(cleanCode)) {
      setCreateError('Station Code must be 2-8 uppercase alphanumeric characters.');
      return;
    }
    if (!newName.trim()) {
      setCreateError('Facility Name is required.');
      return;
    }

    const res = onCreateLocation({
      code: cleanCode,
      name: newName.trim(),
      address: newAddress.trim() || undefined,
      notes: newNotes.trim() || undefined
    });

    if (res.success) {
      setCreateSuccess(`Location "${cleanCode} - ${newName.trim()}" created successfully!`);
      setNewCode('');
      setNewName('');
      setNewAddress('');
      setNewNotes('');
      setTimeout(() => {
        setCreateSuccess(null);
        setShowCreateModal(false);
      }, 1200);
    } else {
      setCreateError(res.error || 'Failed to create location.');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (loc: LocationRecord) => {
    setEditingLocation(loc);
    setEditName(loc.name);
    setEditAddress(loc.address || '');
    setEditNotes(loc.notes || '');
    setEditError(null);
    setEditSuccess(null);
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation) return;
    setEditError(null);
    setEditSuccess(null);

    if (!editName.trim()) {
      setEditError('Location Name is required.');
      return;
    }

    const res = onUpdateLocation(editingLocation.id, {
      name: editName.trim(),
      address: editAddress.trim() || undefined,
      notes: editNotes.trim() || undefined
    });

    if (res.success) {
      setEditSuccess(`Location "${editingLocation.code}" updated successfully!`);
      setTimeout(() => {
        setEditSuccess(null);
        setEditingLocation(null);
      }, 1200);
    } else {
      setEditError(res.error || 'Failed to update location.');
    }
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = () => {
    if (!deletingLocation) return;
    const res = onDeleteLocation(deletingLocation.id);
    if (res.success) {
      setDeletingLocation(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top action bar: Search & Create Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search station code, location name, address..."
            className={`w-full pl-9 pr-8 py-2 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 border transition-colors ${
              isDark 
                ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-400' 
                : 'bg-white border-slate-300 text-slate-950 placeholder-slate-500'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-black'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Create Location Button */}
        <button
          type="button"
          onClick={() => {
            setShowCreateModal(true);
            setCreateError(null);
            setCreateSuccess(null);
          }}
          className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create New Location</span>
        </button>
      </div>

      {/* Locations Table / Cards */}
      <div className={`rounded-xl border overflow-hidden shadow-xs ${isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-white border-slate-300'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b text-[11px] font-extrabold tracking-wider uppercase ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
              }`}>
                <th className="py-3 px-4">Station Code</th>
                <th className="py-3 px-4">Location Name</th>
                <th className="py-3 px-4">Usage Reference</th>
                <th className="py-3 px-4 text-right">Superuser Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
              {filteredLocations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No locations found</p>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or create a new location above.</p>
                  </td>
                </tr>
              ) : (
                filteredLocations.map(loc => {
                  const usage = locationUsage[loc.code] || { seals: 0, trips: 0 };
                  const isDeletable = usage.seals === 0 && usage.trips === 0;

                  return (
                    <tr 
                      key={loc.id} 
                      className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}
                    >
                      {/* Code Badge */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="w-9 h-9 rounded-lg bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
                            {loc.code}
                          </span>
                        </div>
                      </td>

                      {/* 2nd Column: Location Name and below the Street Address */}
                      <td className="py-3.5 px-4">
                        <div className={`font-extrabold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {loc.name?.trim() || `${loc.code} Station`}
                        </div>
                        {loc.address ? (
                          <div className={`text-xs flex items-center gap-1.5 mt-1 font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            <Building2 className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                            <span>{loc.address}</span>
                          </div>
                        ) : (
                          <div className={`text-xs italic mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            No street address specified
                          </div>
                        )}
                      </td>

                      {/* Usage */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5 text-[11px]">
                          <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Seals: <strong className={`font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{usage.seals}</strong>
                          </span>
                          <span className={`${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            Trips: <strong className={`font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{usage.trips}</strong>
                          </span>
                        </div>
                      </td>

                      {/* Action buttons: Edit & Delete */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(loc)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                              isDark
                                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700'
                                : 'bg-white border-slate-300 text-slate-800 hover:text-black hover:bg-slate-100 shadow-2xs'
                            }`}
                            title={`Edit ${loc.code} location details`}
                          >
                            <Edit2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingLocation(loc)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isDark
                                ? 'bg-slate-800 border-slate-700 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-700'
                                : 'bg-white border-slate-300 text-rose-600 hover:bg-rose-50 hover:border-rose-300'
                            }`}
                            title={`Delete ${loc.code} location`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE LOCATION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className={`rounded-2xl border shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-950'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Create New Location</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Add a new station/facility for seal custody &amp; dispatches</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-950 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-700" />
                <span>{createError}</span>
              </div>
            )}

            {createSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                <span>{createSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block font-bold mb-1 text-slate-800 dark:text-slate-200">
                    Station Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="e.g. MIA"
                    maxLength={8}
                    required
                    className={`w-full px-3 py-2 rounded-lg font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-amber-500 border ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-950'
                    }`}
                  />
                  <span className="text-[10px] text-slate-500">2-8 letters/digits</span>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold mb-1 text-slate-800 dark:text-slate-200">
                    Location Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Miami International Cargo Hub"
                    required
                    className={`w-full px-3 py-2 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 border ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-950'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-800 dark:text-slate-200">
                  Street Address / Airport Facility
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g. 2100 NW 42nd Ave, Cargo Bldg 705, Miami, FL 33142"
                  className={`w-full px-3 py-2 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-950'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-800 dark:text-slate-200">
                  Operational Notes &amp; Routing Guidelines
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Southeast regional gateway terminal. All high-sec seals staged in vault room 204."
                  className={`w-full px-3 py-2 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-950'
                  }`}
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className={`px-3.5 py-2 rounded-lg font-bold transition-colors cursor-pointer ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Save &amp; Register Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT LOCATION MODAL */}
      {editingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className={`rounded-2xl border shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-950'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Edit Location: #{editingLocation.code}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Modify facility details, contact info, or operational status</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingLocation(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-950 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-700" />
                <span>{editError}</span>
              </div>
            )}

            {editSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                <span>{editSuccess}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block font-bold mb-1 text-slate-800 dark:text-slate-200">
                    Station Code
                  </label>
                  <input
                    type="text"
                    value={editingLocation.code}
                    disabled
                    className={`w-full px-3 py-2 rounded-lg font-mono font-bold uppercase opacity-70 cursor-not-allowed border ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-200 border-slate-300 text-slate-900'
                    }`}
                  />
                  <span className="text-[10px] text-slate-500">Immutable identifier</span>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold mb-1 text-slate-800 dark:text-slate-200">
                    Location Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className={`w-full px-3 py-2 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 border ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-950'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-800 dark:text-slate-200">
                  Street Address / Airport Facility
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-950'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-800 dark:text-slate-200">
                  Operational Notes &amp; Routing Guidelines
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className={`w-full px-3 py-2 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-950'
                  }`}
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLocation(null)}
                  className={`px-3.5 py-2 rounded-lg font-bold transition-colors cursor-pointer ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
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

      {/* DELETE CONFIRMATION MODAL */}
      {deletingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className={`rounded-2xl border shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-950'
          }`}>
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm">Delete Location &ldquo;{deletingLocation.code}&rdquo;?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{deletingLocation.name}</p>
              </div>
            </div>

            {(() => {
              const usage = locationUsage[deletingLocation.code] || { seals: 0, trips: 0 };
              const hasDependencies = usage.seals > 0 || usage.trips > 0;

              return (
                <div className="space-y-3 text-xs">
                  {hasDependencies ? (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-amber-950 dark:text-amber-200 leading-relaxed">
                      <strong>Active references found:</strong> This station currently has <strong>{usage.seals} seal(s)</strong> and <strong>{usage.trips} trip dispatch(es)</strong> linked to it. Deleting it will remove this location code from future system menus. Consider changing its status to <strong>INACTIVE</strong> instead to preserve historical audit traceability.
                    </div>
                  ) : (
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      This station has zero active seals or trips linked to it. Are you sure you want to permanently delete this location from the system registry?
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setDeletingLocation(null)}
                      className={`px-3.5 py-2 rounded-lg font-bold transition-colors cursor-pointer ${
                        isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Delete</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
};
