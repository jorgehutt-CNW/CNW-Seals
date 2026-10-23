import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, Truck, RotateCcw, Trash2, Box, ArrowRightLeft, 
  UserCheck, FileText, Sun, Moon, LogOut, Loader2, MapPin,
  Search, X, ExternalLink, ArrowRight, ShieldAlert, Users, Lock
} from 'lucide-react';
import { UserRole, Seal, LocationRecord } from '../types';
import type { User } from '../firebase';

interface HeaderProps {
  locations: readonly string[] | string[];
  locationsList?: LocationRecord[];
  selectedLocation: string;
  onLocationChange: (location: string) => void;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  operatorBranch: string;
  onOperatorBranchChange: (branch: string) => void;
  destinations: string[];
  kpiStats: {
    available: number;
    outbound: number;
    pendingReturn: number;
    disposed: number;
  };
  onOpenAudit?: () => void;
  onResetData?: () => void;
  isResetting?: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  currentUser: User | null;
  onSignInGoogle: () => void;
  onSignOut: () => void;
  isAuthLoading?: boolean;
  seals: Seal[];
  onSelectSealForPassport: (seal: Seal) => void;
  isEnrolledSuperuser?: boolean;
  onOpenUserManagement?: () => void;
  onOpenLocations?: () => void;
  pendingRequestsCount?: number;
  isFacilityRestricted?: boolean;
  assignedFacility?: string;
}

export const Header: React.FC<HeaderProps> = ({
  locations,
  locationsList = [],
  selectedLocation,
  onLocationChange,
  currentRole,
  onRoleChange,
  operatorBranch,
  onOperatorBranchChange,
  destinations,
  kpiStats,
  onOpenAudit,
  onResetData,
  isResetting = false,
  theme,
  onToggleTheme,
  currentUser,
  onSignInGoogle,
  onSignOut,
  isAuthLoading = false,
  seals,
  onSelectSealForPassport,
  isEnrolledSuperuser = false,
  onOpenUserManagement,
  onOpenLocations,
  pendingRequestsCount = 0,
  isFacilityRestricted = false,
  assignedFacility = 'LAX',
}) => {
  const isDark = theme === 'dark';

  // Quick Seal Lookup state
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Matching seals for quick lookup, scoped to facility if user is restricted
  const facilityScopedSeals = useMemo(() => {
    if (!isFacilityRestricted || !assignedFacility) return seals;
    return seals.filter(s => 
      s.location === assignedFacility || 
      s.returnOriginLocation === assignedFacility || 
      s.returnOriginatingDestination === assignedFacility
    );
  }, [seals, isFacilityRestricted, assignedFacility]);

  const matchingSeals = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const clean = searchTerm.trim().toLowerCase().replace(/^#/, '');
    return facilityScopedSeals
      .filter(s => s.sealNumber.toLowerCase().includes(clean))
      .slice(0, 6);
  }, [searchTerm, facilityScopedSeals]);

  // Exact match seal
  const exactMatch = useMemo(() => {
    if (!searchTerm.trim()) return null;
    const clean = searchTerm.trim().toLowerCase().replace(/^#/, '');
    return facilityScopedSeals.find(s => s.sealNumber.toLowerCase() === clean);
  }, [searchTerm, facilityScopedSeals]);

  // Locations registered and maintained by the Superuser
  const recordedLocations = useMemo(() => {
    if (locationsList && locationsList.length > 0) {
      return locationsList;
    }
    return locations.map(code => ({
      id: `LOC-${code}`,
      code: String(code),
      name: `${code} Station`
    }));
  }, [locationsList, locations]);

  const handleSearchSelect = (seal: Seal) => {
    onSelectSealForPassport(seal);
    setIsSearchOpen(false);
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (exactMatch) {
        handleSearchSelect(exactMatch);
      } else if (matchingSeals.length > 0) {
        handleSearchSelect(matchingSeals[0]);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  return (
    <header className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-b sticky top-0 z-30 shadow-md transition-colors duration-200`}>
      {/* Top tier: Brand, Location Pulldown, Role Switcher, Google Auth, Theme Toggle, Audit, Reset */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold tracking-tight font-sans ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  CNW-Seal
                </span>
                <span className={`text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded border ${
                  isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}>
                  ISO 17712
                </span>
              </div>
              <p className={`text-xs hidden lg:block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Security Seal Inventory &amp; Transit Control
              </p>
            </div>
          </div>

          {/* Central Controls: Location Pulldown & Role Switcher */}
          <div className="flex items-center gap-2 flex-nowrap shrink-0">
            
            {/* Top Bar Location Selector Pulldown (Sleek h-8, less thick) - Admin & Superuser */}
            {(currentRole === 'ADMIN' || currentRole === 'SUPERUSER') && (
              isFacilityRestricted ? (
                <div className={`h-8 flex items-center gap-1.5 px-2.5 rounded-lg border text-xs font-medium transition-colors shrink-0 ${
                  isDark 
                    ? 'bg-slate-800/80 border-slate-700 text-slate-200' 
                    : 'bg-white border-slate-300 text-slate-800'
                }`}>
                  <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className={`text-[10px] font-semibold uppercase tracking-wider hidden sm:inline ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Facility:
                  </span>
                  <span className="font-extrabold text-xs text-indigo-950 dark:text-indigo-200">
                    {assignedFacility} Station
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800" title={`Assigned Facility: Data restricted exclusively to ${assignedFacility} Station`}>
                    <Lock className="w-2.5 h-2.5" />
                    <span>Assigned</span>
                  </span>
                </div>
              ) : (
                <div className={`h-8 flex items-center gap-1.5 px-2.5 rounded-lg border text-xs font-medium transition-colors shrink-0 ${
                  isDark 
                    ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:border-slate-600' 
                    : 'bg-white border-slate-300 text-slate-800 hover:border-slate-400'
                }`}>
                  <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className={`text-[10px] font-semibold uppercase tracking-wider hidden sm:inline ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Location:
                  </span>
                  <select
                    value={selectedLocation}
                    onChange={(e) => onLocationChange(e.target.value)}
                    className="bg-transparent font-bold focus:outline-none cursor-pointer pr-1 text-xs max-w-[220px] truncate"
                    title="Filter active seal inventory by location"
                  >
                    <option value="ALL" className={isDark ? 'bg-slate-800 text-white font-bold' : 'bg-white text-slate-900 font-bold'}>
                      All Locations (Overview)
                    </option>
                    {recordedLocations.map(loc => (
                      <option 
                        key={loc.id || loc.code} 
                        value={loc.code} 
                        className={isDark ? 'bg-slate-800 text-white font-bold' : 'bg-white text-slate-900 font-bold'}
                      >
                        {loc.code} - {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )
            )}

            {/* Operator Branch Selector when in Operator Mode (Sleek h-8, less thick, positioned on left of Role Switcher) */}
            {currentRole === 'OPERATOR' && (
              isFacilityRestricted ? (
                <div className={`h-8 hidden md:flex items-center gap-1.5 text-xs rounded-lg px-2.5 border shrink-0 ${
                  isDark 
                    ? 'bg-slate-800/80 text-emerald-300 border-emerald-800/60'
                    : 'bg-emerald-50/80 text-emerald-900 border-emerald-300'
                }`}>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Inbound Facility:</span>
                  <span className="font-extrabold text-xs text-emerald-950 dark:text-emerald-200">
                    {assignedFacility} Branch
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" title={`Assigned Facility: Inbound operations restricted exclusively to ${assignedFacility} Branch`}>
                    <Lock className="w-2.5 h-2.5" />
                    <span>Assigned</span>
                  </span>
                </div>
              ) : (
                <div className={`h-8 hidden md:flex items-center gap-1.5 text-xs rounded-lg px-2.5 border shrink-0 ${
                  isDark 
                    ? 'bg-slate-800/80 text-emerald-300 border-emerald-800/60'
                    : 'bg-emerald-50/80 text-emerald-900 border-emerald-300'
                }`}>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Inbound Station:</span>
                  <select
                    value={operatorBranch}
                    onChange={(e) => onOperatorBranchChange(e.target.value)}
                    className={`bg-transparent font-bold focus:outline-none cursor-pointer max-w-[200px] truncate ${
                      isDark ? 'text-emerald-300' : 'text-emerald-950'
                    }`}
                  >
                    <option value="ALL" className={isDark ? 'bg-slate-800 text-white font-bold' : 'bg-white text-slate-900 font-bold'}>All Inbound</option>
                    {recordedLocations.map(loc => (
                      <option 
                        key={loc.id || loc.code} 
                        value={loc.code} 
                        className={isDark ? 'bg-slate-800 text-white font-bold' : 'bg-white text-slate-900 font-bold'}
                      >
                        {loc.code} - {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )
            )}
          </div>

          {/* Right actions: User Management, Google Auth, Theme Toggle, Quick Audit & Reset (All uniform h-9) */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Superuser User Enrollment & Governance Console Button */}
            {isEnrolledSuperuser && onOpenUserManagement && (
              <button
                type="button"
                onClick={onOpenUserManagement}
                className={`h-9 flex items-center gap-1.5 px-3 text-xs font-bold rounded-lg border transition-all whitespace-nowrap cursor-pointer relative ${
                  isDark
                    ? 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border-amber-700/60'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300 shadow-2xs'
                }`}
                title="Superuser Console: Enroll Users & Assign Roles"
              >
                <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="hidden sm:inline">Users &amp; Roles</span>
                {pendingRequestsCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-600 text-white font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            )}

            {/* Google Authentication Sign In / User Profile (Uniform h-9) */}
            {currentUser ? (
              <div className={`h-9 flex items-center gap-2 pl-2.5 pr-1.5 rounded-lg border text-xs shadow-2xs ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
              }`}>
                {currentUser.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt={currentUser.displayName || 'Google User'} 
                    className="w-5 h-5 rounded-full object-cover border border-indigo-500 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:flex flex-col text-left leading-tight pr-0.5">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-[11px] truncate max-w-[100px]">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </span>
                    <span className={`text-[8px] font-mono font-extrabold px-1 rounded uppercase ${
                      currentRole === 'SUPERUSER' ? 'bg-amber-200 text-amber-950' :
                      currentRole === 'ADMIN' ? 'bg-indigo-200 text-indigo-950' :
                      'bg-emerald-200 text-emerald-950'
                    }`}>
                      {currentRole}
                    </span>
                  </div>
                  <span className={`text-[9px] truncate max-w-[110px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {currentUser.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onSignOut}
                  className={`h-7 w-7 flex items-center justify-center rounded-md hover:bg-rose-500/10 hover:text-rose-600 transition-colors cursor-pointer ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                  title="Sign Out of Google"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onSignInGoogle}
                disabled={isAuthLoading}
                className={`h-9 flex items-center gap-1.5 px-3 text-xs font-bold rounded-lg border transition-all shadow-xs cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700 hover:border-slate-600'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
                }`}
                title="Sign in with your Google account"
              >
                {isAuthLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                ) : (
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                )}
                <span>Sign In</span>
              </button>
            )}

            {/* Theme Toggle Button (Uniform h-9) */}
            <button
              type="button"
              onClick={onToggleTheme}
              className={`h-9 flex items-center gap-1.5 px-3 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 hover:border-slate-600'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>

            {/* Superuser Exclusive: Reset Button (Wipes auditLogs, locations, seals, trips in Firestore) */}
            {(isEnrolledSuperuser || currentRole === 'SUPERUSER') && onResetData && (
              <button
                type="button"
                onClick={onResetData}
                disabled={isResetting}
                className={`h-9 flex items-center gap-1.5 px-3 text-xs font-bold rounded-lg border transition-all whitespace-nowrap cursor-pointer shadow-xs ${
                  isDark
                    ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-800/80 hover:border-rose-700'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border-rose-300'
                } ${isResetting ? 'opacity-60 cursor-not-allowed' : ''}`}
                title="Superuser Exclusive: Wipe all data in Firestore collections: auditLogs, locations, seals, trips"
              >
                {isResetting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500 shrink-0" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                )}
                <span>Reset DB</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Second tier: Status Indicators & Quick Seal Lookup Group */}
      <div className={`border-t py-2.5 transition-colors ${
        isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-slate-50/90 backdrop-blur-xs'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            
            {/* 4 Status KPI Indicators: Distinct from ordinary buttons/form controls */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1">
              
              {/* Available Stock Indicator Card */}
              <div className={`relative overflow-hidden rounded-xl border px-3 py-2 transition-all flex items-center justify-between gap-2.5 ${
                isDark 
                  ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-100 hover:border-emerald-700/60 shadow-2xs' 
                  : 'bg-emerald-50/90 border-emerald-200/90 text-emerald-950 hover:border-emerald-300 shadow-2xs'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isDark 
                      ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30' 
                      : 'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/20'
                  }`}>
                    <Box className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0 leading-tight">
                    <span className={`block text-[10px] font-extrabold uppercase tracking-wider truncate ${
                      isDark ? 'text-emerald-400' : 'text-emerald-700'
                    }`}>
                      Available {selectedLocation !== 'ALL' && `(${selectedLocation})`}
                    </span>
                    <span className={`text-[10px] font-medium hidden sm:block truncate ${
                      isDark ? 'text-emerald-400/70' : 'text-emerald-800/75'
                    }`}>
                      Ready to Dispatch
                    </span>
                  </div>
                </div>
                <span className={`font-mono text-lg font-black tabular-nums shrink-0 ml-1.5 ${
                  isDark ? 'text-emerald-200' : 'text-emerald-900'
                }`}>
                  {kpiStats.available}
                </span>
              </div>

              {/* Outbound Transit Indicator Card */}
              <div className={`relative overflow-hidden rounded-xl border px-3 py-2 transition-all flex items-center justify-between gap-2.5 ${
                isDark 
                  ? 'bg-amber-950/30 border-amber-800/40 text-amber-100 hover:border-amber-700/60 shadow-2xs' 
                  : 'bg-amber-50/90 border-amber-200/90 text-amber-950 hover:border-amber-300 shadow-2xs'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isDark 
                      ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30' 
                      : 'bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20'
                  }`}>
                    <Truck className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0 leading-tight">
                    <span className={`block text-[10px] font-extrabold uppercase tracking-wider truncate ${
                      isDark ? 'text-amber-400' : 'text-amber-700'
                    }`}>
                      Outbound {selectedLocation !== 'ALL' && `(${selectedLocation})`}
                    </span>
                    <span className={`text-[10px] font-medium hidden sm:block truncate ${
                      isDark ? 'text-amber-400/70' : 'text-amber-800/75'
                    }`}>
                      Active Transit
                    </span>
                  </div>
                </div>
                <span className={`font-mono text-lg font-black tabular-nums shrink-0 ml-1.5 ${
                  isDark ? 'text-amber-200' : 'text-amber-900'
                }`}>
                  {kpiStats.outbound}
                </span>
              </div>

              {/* Pending Return Transit Indicator Card */}
              <div className={`relative overflow-hidden rounded-xl border px-3 py-2 transition-all flex items-center justify-between gap-2.5 ${
                isDark 
                  ? 'bg-purple-950/30 border-purple-800/40 text-purple-100 hover:border-purple-700/60 shadow-2xs' 
                  : 'bg-purple-50/90 border-purple-200/90 text-purple-950 hover:border-purple-300 shadow-2xs'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isDark 
                      ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30' 
                      : 'bg-purple-500/15 text-purple-700 ring-1 ring-purple-500/20'
                  }`}>
                    <RotateCcw className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0 leading-tight">
                    <span className={`block text-[10px] font-extrabold uppercase tracking-wider truncate ${
                      isDark ? 'text-purple-400' : 'text-purple-700'
                    }`}>
                      Returning {selectedLocation !== 'ALL' ? `(${selectedLocation})` : 'to Origin'}
                    </span>
                    <span className={`text-[10px] font-medium hidden sm:block truncate ${
                      isDark ? 'text-purple-400/70' : 'text-purple-800/75'
                    }`}>
                      Spare Return Flow
                    </span>
                  </div>
                </div>
                <span className={`font-mono text-lg font-black tabular-nums shrink-0 ml-1.5 ${
                  isDark ? 'text-purple-200' : 'text-purple-900'
                }`}>
                  {kpiStats.pendingReturn}
                </span>
              </div>

              {/* Disposed / Cut Indicator Card */}
              <div className={`relative overflow-hidden rounded-xl border px-3 py-2 transition-all flex items-center justify-between gap-2.5 ${
                isDark 
                  ? 'bg-slate-900/80 border-slate-700/60 text-slate-200 hover:border-slate-600 shadow-2xs' 
                  : 'bg-slate-100 border-slate-300/90 text-slate-900 hover:border-slate-400 shadow-2xs'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isDark 
                      ? 'bg-slate-800 text-slate-300 ring-1 ring-slate-700' 
                      : 'bg-slate-200 text-slate-700 ring-1 ring-slate-300'
                  }`}>
                    <Trash2 className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0 leading-tight">
                    <span className={`block text-[10px] font-extrabold uppercase tracking-wider truncate ${
                      isDark ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      Disposed / Cut
                    </span>
                    <span className={`text-[10px] font-medium hidden sm:block truncate ${
                      isDark ? 'text-slate-500' : 'text-slate-500'
                    }`}>
                      Decommissioned
                    </span>
                  </div>
                </div>
                <span className={`font-mono text-lg font-black tabular-nums shrink-0 ml-1.5 ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}>
                  {kpiStats.disposed}
                </span>
              </div>

            </div>

            {/* Quick Seal Lookup: Integrated into the same top indicator group */}
            <div ref={searchContainerRef} className="lg:w-80 shrink-0 relative">
              <div className={`relative flex items-center h-10 px-3 rounded-xl border transition-all ${
                isSearchOpen
                  ? isDark 
                    ? 'bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20' 
                    : 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                  : isDark 
                    ? 'bg-slate-900/90 border-slate-700/80 hover:border-slate-600' 
                    : 'bg-white border-slate-300 hover:border-slate-400 shadow-2xs'
              }`}>
                <Search className={`w-4 h-4 shrink-0 transition-colors ${
                  isSearchOpen ? 'text-indigo-500' : isDark ? 'text-slate-400' : 'text-slate-500'
                }`} />
                
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Quick Seal # Lookup..."
                  className={`w-full bg-transparent px-2.5 text-xs font-mono font-bold placeholder:font-sans placeholder:font-normal focus:outline-none ${
                    isDark ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'
                  }`}
                />

                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setIsSearchOpen(false);
                    }}
                    className={`p-0.5 mr-1 rounded-md hover:bg-slate-200/50 transition-colors cursor-pointer ${
                      isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {exactMatch ? (
                  <button
                    type="button"
                    onClick={() => handleSearchSelect(exactMatch)}
                    className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                    title="Open Complete Seal Passport"
                  >
                    <span>Passport</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ) : (
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border hidden sm:inline-block shrink-0 ${
                    isDark ? 'text-slate-500 border-slate-800 bg-slate-950/60' : 'text-slate-400 border-slate-200 bg-slate-50'
                  }`}>
                    #849xxx
                  </span>
                )}
              </div>

              {/* Live Dropdown Autocomplete Results */}
              {isSearchOpen && searchTerm.trim() && (
                <div className={`absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-black/60' : 'bg-white border-slate-300 text-slate-900 shadow-slate-400/30'
                }`}>
                  {matchingSeals.length > 0 ? (
                    <div className="p-1.5 space-y-1">
                      <div className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border-b flex items-center justify-between ${
                        isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-100'
                      }`}>
                        <span>Matching Seals ({matchingSeals.length})</span>
                        <span className="font-normal lowercase">Click or press Enter</span>
                      </div>
                      {matchingSeals.map((seal) => (
                        <button
                          key={seal.sealNumber}
                          type="button"
                          onClick={() => handleSearchSelect(seal)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs">#{seal.sealNumber}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                  seal.location === 'LAX' ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400' :
                                  seal.location === 'SFO' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                                  'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                                }`}>
                                  {seal.location}
                                </span>
                              </div>
                              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                Box: {seal.boxRef}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              seal.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                              seal.status === 'IN_TRANSIT_OUTBOUND' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                              seal.status === 'PENDING_RETURN_TRANSIT' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' :
                              'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {seal.status.replace(/_/g, ' ')}
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        No seal found matching &ldquo;<span className="font-mono text-indigo-600 dark:text-indigo-400">{searchTerm}</span>&rdquo;
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Try 6-digit seal numbers (e.g. 849050, 849051, 849060)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};
