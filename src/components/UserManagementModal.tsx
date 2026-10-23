import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserPlus, ShieldAlert, ShieldCheck, X, Check, 
  Trash2, Search, Clock, Shield, CheckCircle2, AlertTriangle,
  Sun, Moon, MapPin, CloudUpload, Database, Edit2
} from 'lucide-react';
import { AuthorizedUser, AccessRequest, UserRole, LocationRecord, Seal, Trip } from '../types';
import type { User } from '../firebase';
import { LocationManagementSection } from './LocationManagementSection';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  authorizedUsers: AuthorizedUser[];
  accessRequests: AccessRequest[];
  currentUser: User | null;
  onEnrollUser: (data: { email: string; displayName: string; role: UserRole; station: string; notes?: string }) => boolean;
  onUpdateUser?: (userId: string, data: { displayName?: string; role?: UserRole; station?: string; status?: 'ACTIVE' | 'REVOKED'; notes?: string }) => boolean;
  onUpdateUserRole: (userId: string, newRole: UserRole) => boolean;
  onUpdateUserStation: (userId: string, newStation: string) => boolean;
  onToggleUserStatus: (userId: string) => boolean;
  onRemoveUser: (userId: string) => boolean;
  onApproveAccessRequest: (requestId: string, role: UserRole, station: string) => boolean;
  onRejectAccessRequest: (requestId: string) => boolean;
  destinations: string[];
  locations: readonly string[] | string[];
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  locationsList?: LocationRecord[];
  seals?: Seal[];
  trips?: Trip[];
  onCreateLocation?: (data: { code: string; name: string; address?: string; notes?: string }) => { success: boolean; error?: string };
  onUpdateLocation?: (id: string, data: { name: string; address?: string; notes?: string }) => { success: boolean; error?: string };
  onDeleteLocation?: (id: string) => { success: boolean; error?: string };
  initialTab?: 'USERS' | 'ENROLL' | 'REQUESTS' | 'LOCATIONS';
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  authorizedUsers,
  accessRequests,
  currentUser,
  onEnrollUser,
  onUpdateUser,
  onUpdateUserRole,
  onUpdateUserStation,
  onToggleUserStatus,
  onRemoveUser,
  onApproveAccessRequest,
  onRejectAccessRequest,
  destinations,
  locations,
  theme = 'light',
  onToggleTheme,
  locationsList = [],
  seals = [],
  trips = [],
  onCreateLocation = () => ({ success: false, error: 'Not implemented' }),
  onUpdateLocation = () => ({ success: false, error: 'Not implemented' }),
  onDeleteLocation = () => ({ success: false, error: 'Not implemented' }),
  initialTab = 'USERS'
}) => {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'USERS' | 'ENROLL' | 'REQUESTS' | 'LOCATIONS'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // System locations registered and governed by the Superuser
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

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Enrollment Form State
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrollName, setEnrollName] = useState('');
  const [enrollRole, setEnrollRole] = useState<UserRole>('ADMIN');
  const [enrollStation, setEnrollStation] = useState('ALL');
  const [enrollNotes, setEnrollNotes] = useState('');
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);

  // Approval modal state for pending requests
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  const [approveRole, setApproveRole] = useState<UserRole>('OPERATOR');
  const [approveStation, setApproveStation] = useState<string>('LAX');

  // User Edit Modal state
  const [editingUser, setEditingUser] = useState<AuthorizedUser | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('ADMIN');
  const [editUserStation, setEditUserStation] = useState('ALL');
  const [editUserStatus, setEditUserStatus] = useState<'ACTIVE' | 'REVOKED'>('ACTIVE');
  const [editUserNotes, setEditUserNotes] = useState('');
  const [editUserSuccess, setEditUserSuccess] = useState<string | null>(null);

  const handleOpenEditUser = (u: AuthorizedUser) => {
    setEditingUser(u);
    setEditUserName(u.displayName);
    setEditUserRole(u.role);
    setEditUserStation(u.station || 'ALL');
    setEditUserStatus(u.status);
    setEditUserNotes(u.notes || '');
    setEditUserSuccess(null);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const name = editUserName.trim() || editingUser.email.split('@')[0];
    if (onUpdateUser) {
      onUpdateUser(editingUser.id, {
        displayName: name,
        role: editUserRole,
        station: editUserStation,
        status: editUserStatus,
        notes: editUserNotes.trim() || undefined
      });
    } else {
      if (editUserRole !== editingUser.role) onUpdateUserRole(editingUser.id, editUserRole);
      if (editUserStation !== editingUser.station) onUpdateUserStation(editingUser.id, editUserStation);
      if (editUserStatus !== editingUser.status) onToggleUserStatus(editingUser.id);
    }
    setEditUserSuccess(`User ${editingUser.email} updated successfully!`);
    setTimeout(() => {
      setEditUserSuccess(null);
      setEditingUser(null);
    }, 800);
  };

  if (!isOpen) return null;

  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollError(null);
    setEnrollSuccess(null);

    const email = enrollEmail.trim().toLowerCase();
    if (!email) {
      setEnrollError('Email address is required.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setEnrollError('Please enter a valid email address.');
      return;
    }

    const name = enrollName.trim() || email.split('@')[0];

    const success = onEnrollUser({
      email,
      displayName: name,
      role: enrollRole,
      station: enrollStation,
      notes: enrollNotes.trim() || undefined
    });

    if (success) {
      setEnrollSuccess(`User ${email} enrolled successfully with ${enrollRole} role!`);
      setEnrollEmail('');
      setEnrollName('');
      setEnrollNotes('');
      setTimeout(() => {
        setEnrollSuccess(null);
        setActiveTab('USERS');
      }, 1500);
    } else {
      setEnrollError(`User with email "${email}" is already enrolled.`);
    }
  };

  const handleApproveConfirm = (requestId: string) => {
    onApproveAccessRequest(requestId, approveRole, approveStation);
    setApprovingRequestId(null);
  };

  // Filter users
  const filteredUsers = authorizedUsers.filter(u => {
    const matchesSearch = 
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.station.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const pendingRequests = accessRequests.filter(r => r.status === 'PENDING');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div 
        className={`rounded-xl shadow-2xl border w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
          isDark 
            ? 'bg-slate-900 border-slate-800 text-slate-100' 
            : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shadow-2xs ${
              isDark 
                ? 'bg-indigo-950/70 border-indigo-800 text-indigo-400' 
                : 'bg-indigo-50 border-indigo-200 text-indigo-700'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  User Enrollment &amp; Role Governance
                </h2>
                <span className={`text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded border ${
                  isDark 
                    ? 'bg-amber-950/60 text-amber-300 border-amber-800' 
                    : 'bg-amber-50 text-amber-900 border-amber-300'
                }`}>
                  Superuser Console
                </span>
              </div>
              <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Only the Superuser can enroll users and assign system authorization roles.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 hover:border-slate-600'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                }`}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-[11px] font-bold">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="text-[11px] font-bold">Dark</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs - Consistent Segmented Buttons */}
        <div className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            
            {/* Tab 1: Authorized Users */}
            <button
              type="button"
              onClick={() => setActiveTab('USERS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'USERS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : isDark
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Authorized Users</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums ${
                activeTab === 'USERS'
                  ? 'bg-white/20 text-white font-extrabold'
                  : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700 font-extrabold'
              }`}>
                {authorizedUsers.length}
              </span>
            </button>

            {/* Tab 2: Enroll New User */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('ENROLL');
                setEnrollError(null);
                setEnrollSuccess(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'ENROLL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : isDark
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Enroll New User</span>
            </button>

            {/* Tab 3: Pending Requests */}
            <button
              type="button"
              onClick={() => setActiveTab('REQUESTS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'REQUESTS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : isDark
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Requests</span>
              {pendingRequests.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-600 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              )}
            </button>

            {/* Tab 4: System Locations (Superuser CRUD) */}
            <button
              type="button"
              onClick={() => setActiveTab('LOCATIONS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'LOCATIONS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : isDark
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <MapPin className={`w-3.5 h-3.5 ${activeTab === 'LOCATIONS' ? 'text-amber-300' : 'text-amber-500'}`} />
              <span>System Locations</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums ${
                activeTab === 'LOCATIONS'
                  ? 'bg-white/20 text-white font-extrabold'
                  : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700 font-extrabold'
              }`}>
                {locationsList.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className={`text-xs font-medium hidden sm:block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Signed in as: <strong className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentUser?.displayName || currentUser?.email}</strong>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className={`flex-1 overflow-y-auto p-6 space-y-4 ${
          isDark ? 'bg-slate-950/40' : 'bg-slate-50/70'
        }`}>
          
          {/* TAB 1: AUTHORIZED USERS DIRECTORY */}
          {activeTab === 'USERS' && (
            <div className="space-y-4">
              
              {/* Filter & Search Bar */}
              <div className={`p-3.5 rounded-xl border shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
                isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by user email, name, or station..."
                    className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark 
                        ? 'bg-slate-900 border-slate-700 text-white' 
                        : 'bg-white border-slate-300 text-slate-950'
                    }`}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Role Filter:</span>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className={`text-xs font-bold rounded-lg px-3 py-1.5 border focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
                      isDark 
                        ? 'bg-slate-900 border-slate-700 text-white' 
                        : 'bg-white border-slate-300 text-slate-950'
                    }`}
                  >
                    <option value="ALL">All Roles</option>
                    <option value="SUPERUSER">Superuser Only</option>
                    <option value="ADMIN">Admin Only</option>
                    <option value="OPERATOR">Operator Only</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setActiveTab('ENROLL')}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Enroll User</span>
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className={`rounded-xl border shadow-xs overflow-hidden ${
                isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div className="overflow-x-auto w-full">
                  <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b font-extrabold uppercase text-[11px] tracking-wider ${
                        isDark 
                          ? 'bg-slate-900 border-slate-700 text-slate-300' 
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}>
                        <th className="py-3 px-4">User Identity</th>
                        <th className="py-3 px-4">Assigned Role</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Enrollment Details</th>
                        <th className="py-3 px-4 text-right">Superuser Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-700/60' : 'divide-slate-200'}`}>
                      {filteredUsers.map(user => {
                        const isSelf = user.email.toLowerCase() === currentUser?.email?.toLowerCase();

                        return (
                          <tr key={user.id} className={`transition-colors ${isDark ? 'hover:bg-slate-750' : 'hover:bg-slate-50'}`}>
                            
                            {/* User Identity */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                  user.role === 'SUPERUSER' ? 'bg-amber-600 text-white' :
                                  user.role === 'ADMIN' ? 'bg-indigo-600 text-white' :
                                  'bg-emerald-600 text-white'
                                }`}>
                                  {user.displayName[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className="min-w-0">
                                  <div className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    <span>{user.displayName}</span>
                                    {isSelf && (
                                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-900 border border-indigo-300">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <span className={`font-mono text-[11px] block truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {user.email}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Role with Superuser selector */}
                            <td className="py-3 px-4">
                              <select
                                value={user.role}
                                onChange={(e) => onUpdateUserRole(user.id, e.target.value as UserRole)}
                                disabled={isSelf}
                                className={`text-xs font-extrabold px-2 py-1 rounded-md border cursor-pointer ${
                                  user.role === 'SUPERUSER' 
                                    ? isDark ? 'bg-amber-950/80 text-amber-300 border-amber-700' : 'bg-amber-100 text-amber-950 border-amber-300'
                                    : user.role === 'ADMIN' 
                                    ? isDark ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700' : 'bg-indigo-100 text-indigo-950 border-indigo-300'
                                    : isDark ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700' : 'bg-emerald-100 text-emerald-950 border-emerald-300'
                                } disabled:opacity-75 disabled:cursor-not-allowed`}
                                title={isSelf ? 'Cannot modify your own Superuser role' : 'Assign role'}
                              >
                                <option value="OPERATOR">Operator (Yard/Branch)</option>
                                <option value="ADMIN">Admin (HQ/Dispatch)</option>
                                <option value="SUPERUSER">Superuser (Full Control)</option>
                              </select>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                user.status === 'ACTIVE' 
                                  ? isDark 
                                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800' 
                                    : 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                                  : isDark 
                                    ? 'bg-rose-950/60 text-rose-300 border-rose-800' 
                                    : 'bg-rose-100 text-rose-900 border-rose-300'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                                <span>{user.status}</span>
                              </span>
                            </td>

                            {/* Enrollment details */}
                            <td className={`py-3 px-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              <div className="text-[11px]">Enrolled: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{user.enrolledAt.split(' ')[0]}</strong></div>
                              <div className="text-[10px] text-slate-500">By: {user.enrolledBy}</div>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isSelf && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditUser(user)}
                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 ${
                                      isDark 
                                        ? 'bg-slate-800 border-slate-700 text-indigo-300 hover:text-white hover:bg-slate-700 hover:border-slate-600' 
                                        : 'bg-white border-slate-300 text-indigo-700 hover:text-indigo-950 hover:bg-indigo-50 hover:border-indigo-300 shadow-2xs'
                                    }`}
                                    title={`Edit ${user.displayName} (${user.email})`}
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>Edit</span>
                                  </button>
                                )}

                                {!isSelf && (
                                  <button
                                    type="button"
                                    onClick={() => onRemoveUser(user.id)}
                                    className={`p-1 rounded transition-colors cursor-pointer ${
                                      isDark 
                                        ? 'text-slate-500 hover:text-rose-400 hover:bg-slate-700' 
                                        : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                    }`}
                                    title="Delete authorization record"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ENROLL NEW USER FORM - Clean Card */}
          {activeTab === 'ENROLL' && (
            <div className={`max-w-2xl mx-auto rounded-xl border p-6 shadow-xs space-y-5 ${
              isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              
              {/* Header Box */}
              <div className={`flex items-center justify-between pb-4 border-b ${
                isDark ? 'border-slate-700' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shadow-2xs ${
                    isDark 
                      ? 'bg-indigo-950/70 border-indigo-800 text-indigo-400' 
                      : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  }`}>
                    <UserPlus className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Enroll New Authorized User
                    </h3>
                    <p className={`text-xs font-medium mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Grant system authorization and assign operational role permissions.
                    </p>
                  </div>
                </div>

                <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border shrink-0 hidden sm:inline-block ${
                  isDark 
                    ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800' 
                    : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                }`}>
                  Console Mode
                </span>
              </div>

              {enrollError && (
                <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 border ${
                  isDark 
                    ? 'bg-rose-950/50 border-rose-800 text-rose-200' 
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{enrollError}</span>
                </div>
              )}

              {enrollSuccess && (
                <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 border ${
                  isDark 
                    ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{enrollSuccess}</span>
                </div>
              )}

              <form onSubmit={handleEnrollSubmit} className="space-y-4 text-xs">
                
                {/* Email Address */}
                <div>
                  <label className={`block font-bold mb-1 text-xs ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                    Google Account Email Address <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="email"
                    value={enrollEmail}
                    onChange={(e) => setEnrollEmail(e.target.value)}
                    placeholder="e.g. jorge.hutt@cnwglobal.com or operator.lax@cnwglobal.com"
                    required
                    className={`w-full px-3 py-2 rounded-lg font-mono font-bold text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark 
                        ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500' 
                        : 'bg-white border-slate-300 text-slate-950 placeholder:text-slate-400'
                    }`}
                  />
                  <span className={`text-[10px] block mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    The user must sign in with this exact Google account to gain access.
                  </span>
                </div>

                {/* Full Name / Title */}
                <div>
                  <label className={`block font-bold mb-1 text-xs ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                    Full Name / Operational Title <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={enrollName}
                    onChange={(e) => setEnrollName(e.target.value)}
                    placeholder="e.g. Station Dispatch Lead or Yard Receiving Operator"
                    required
                    className={`w-full px-3 py-2 rounded-lg font-semibold text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark 
                        ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500' 
                        : 'bg-white border-slate-300 text-slate-950 placeholder:text-slate-400'
                    }`}
                  />
                  <span className={`text-[10px] block mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Displayed in transaction ledgers and audit records.
                  </span>
                </div>

                {/* Role and Station Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block font-bold mb-1 text-xs ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                      Assigned Role <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={enrollRole}
                      onChange={(e) => setEnrollRole(e.target.value as UserRole)}
                      className={`w-full px-3 py-2 rounded-lg font-bold text-xs border cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDark 
                          ? 'bg-slate-900 border-slate-700 text-white' 
                          : 'bg-white border-slate-300 text-slate-950'
                      }`}
                    >
                      <option value="OPERATOR">OPERATOR (Destination Yard/Branch)</option>
                      <option value="ADMIN">ADMIN (HQ Logistics &amp; Stock)</option>
                      <option value="SUPERUSER">SUPERUSER (Full Authority &amp; Rollback)</option>
                    </select>
                    <span className={`text-[10px] block mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Operational access permissions level
                    </span>
                  </div>

                  <div>
                    <label className={`block font-bold mb-1 text-xs ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                      Assigned Station / Location <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={enrollStation}
                      onChange={(e) => setEnrollStation(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg font-bold text-xs border cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDark 
                          ? 'bg-slate-900 border-slate-700 text-white' 
                          : 'bg-white border-slate-300 text-slate-950'
                      }`}
                    >
                      <option value="ALL">All Stations (HQ / Universal)</option>
                      {recordedLocations.map(loc => (
                        <option 
                          key={loc.id || loc.code} 
                          value={loc.code}
                        >
                          {loc.code} - {loc.name}
                        </option>
                      ))}
                    </select>
                    <span className={`text-[10px] block mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Scoping facility (Admin &amp; Operator data boundary)
                    </span>
                  </div>
                </div>

                {/* Role Description Card */}
                <div className={`p-3.5 rounded-lg border text-xs space-y-2 ${
                  isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Role Permissions Preview:</span>
                    </span>
                    <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded border uppercase ${
                      enrollRole === 'SUPERUSER' 
                        ? isDark ? 'bg-amber-950/80 text-amber-300 border-amber-700' : 'bg-amber-100 text-amber-950 border-amber-300' 
                        : enrollRole === 'ADMIN' 
                        ? isDark ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700' : 'bg-indigo-100 text-indigo-950 border-indigo-300' 
                        : isDark ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700' : 'bg-emerald-100 text-emerald-950 border-emerald-300'
                    }`}>
                      {enrollRole}
                    </span>
                  </div>

                  {enrollRole === 'OPERATOR' && (
                    <p className={`font-medium leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Verifies inbound container arrivals, cuts and destroys door seals, and dispatches unused inside spare seals back to their originating station with courier tracking.
                    </p>
                  )}
                  {enrollRole === 'ADMIN' && (
                    <p className={`font-medium leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Performs ISO 17712 seal stock registration, assigns outbound door + spare seals to dispatches with HAWBs, and intakes returned spare seals back into origin stock.
                    </p>
                  )}
                  {enrollRole === 'SUPERUSER' && (
                    <p className={`font-medium leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Master administrative authority: can execute emergency Trip Dispatch rollbacks to recover mistakenly assigned seals, enroll new authorized users, and reassign system roles.
                    </p>
                  )}

                  <div className={`pt-2 border-t text-[11px] font-semibold flex items-center gap-1.5 ${
                    isDark ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-800'
                  }`}>
                    <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Facility Scoping Policy: {enrollRole === 'SUPERUSER' ? 'Superuser has universal access across all stations.' : `Admin and Operator users can only see data related to their assigned facility (${enrollStation}).`}</span>
                  </div>
                </div>

                {/* Administrative Notes */}
                <div>
                  <label className={`block font-bold mb-1 text-xs ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                    Administrative Notes / Authorization Purpose
                  </label>
                  <input
                    type="text"
                    value={enrollNotes}
                    onChange={(e) => setEnrollNotes(e.target.value)}
                    placeholder="e.g. Authorized for LAX receiving dock operations"
                    className={`w-full px-3 py-2 rounded-lg font-medium text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark 
                        ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500' 
                        : 'bg-white border-slate-300 text-slate-950 placeholder:text-slate-400'
                    }`}
                  />
                  <span className={`text-[10px] block mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Optional notes recorded into the audit trail ledger.
                  </span>
                </div>

                {/* Submit and Cancel Actions */}
                <div className={`pt-4 border-t flex items-center justify-end gap-2.5 ${
                  isDark ? 'border-slate-700' : 'border-slate-200'
                }`}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('USERS')}
                    className={`px-3.5 py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                      isDark 
                        ? 'text-slate-300 hover:text-white bg-slate-900 border-slate-700 hover:bg-slate-700' 
                        : 'text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border-slate-300'
                    }`}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Authorize &amp; Enroll User</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: PENDING ACCESS REQUESTS */}
          {activeTab === 'REQUESTS' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border shadow-xs flex items-center justify-between ${
                isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div>
                  <h3 className={`font-bold text-xs uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Unauthorized Login Access Requests
                  </h3>
                  <p className={`text-xs font-medium mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    When an unauthorized user attempts to log in, their access request appears here for Superuser review.
                  </p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  isDark 
                    ? 'bg-amber-950/60 text-amber-300 border-amber-800' 
                    : 'bg-amber-50 text-amber-900 border-amber-300'
                }`}>
                  {pendingRequests.length} Pending
                </span>
              </div>

              {pendingRequests.length === 0 ? (
                <div className={`p-12 text-center rounded-xl border ${
                  isDark ? 'bg-slate-800/60 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
                }`}>
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                  <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>No Pending Access Requests</h4>
                  <p className={`text-xs font-medium mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    All login requests have been processed. Unauthorized users are blocked until approved here or enrolled above.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map(req => (
                    <div key={req.id} className={`p-4 rounded-xl border shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>{req.displayName}</span>
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {req.email}
                          </span>
                        </div>
                        <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          Requested at: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{req.requestedAt}</strong>
                          {req.notes && (
                            <span className="italic ml-2">&ldquo;{req.notes}&rdquo;</span>
                          )}
                        </div>
                      </div>

                      {approvingRequestId === req.id ? (
                        <div className={`flex items-center gap-2 p-2 rounded-lg border ${
                          isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-300'
                        }`}>
                          <select
                            value={approveRole}
                            onChange={(e) => setApproveRole(e.target.value as UserRole)}
                            className={`text-xs font-bold border rounded px-2.5 py-1.5 cursor-pointer focus:ring-2 focus:ring-indigo-500 ${
                              isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-950'
                            }`}
                          >
                            <option value="OPERATOR">Operator</option>
                            <option value="ADMIN">Admin</option>
                            <option value="SUPERUSER">Superuser</option>
                          </select>

                          <select
                            value={approveStation}
                            onChange={(e) => setApproveStation(e.target.value)}
                            className={`text-xs font-bold border rounded px-2.5 py-1.5 cursor-pointer focus:ring-2 focus:ring-indigo-500 ${
                              isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-950'
                            }`}
                          >
                            <option value="ALL">All Stations</option>
                            {recordedLocations.map(loc => (
                              <option 
                                key={loc.id || loc.code} 
                                value={loc.code}
                              >
                                {loc.code} - {loc.name}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => handleApproveConfirm(req.id)}
                            className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
                          >
                            Confirm
                          </button>

                          <button
                            type="button"
                            onClick={() => setApprovingRequestId(null)}
                            className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border cursor-pointer ${
                              isDark 
                                ? 'bg-slate-800 border-slate-600 text-slate-300 hover:text-white' 
                                : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
                            }`}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setApprovingRequestId(req.id);
                              setApproveRole('OPERATOR');
                              setApproveStation('LAX');
                            }}
                            className="px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve &amp; Assign Role</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onRejectAccessRequest(req.id)}
                            className={`px-3 py-2 text-xs font-bold rounded-lg border shadow-2xs transition-colors cursor-pointer ${
                              isDark 
                                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-rose-950/40 hover:text-rose-400' 
                                : 'bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border-slate-300'
                            }`}
                          >
                            Deny
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SYSTEM LOCATIONS CRUD (SUPERUSER GOVERNANCE) */}
          {activeTab === 'LOCATIONS' && (
            <LocationManagementSection
              locations={locationsList}
              seals={seals}
              trips={trips}
              currentUser={currentUser}
              onCreateLocation={onCreateLocation}
              onUpdateLocation={onUpdateLocation}
              onDeleteLocation={onDeleteLocation}
              isDark={isDark}
            />
          )}

        </div>

        {/* Modal Footer */}
        <div className={`px-6 py-3 border-t flex items-center justify-between text-xs shrink-0 ${
          isDark 
            ? 'bg-slate-900 border-slate-800 text-slate-400' 
            : 'bg-white border-slate-200 text-slate-600'
        }`}>
          <span className="font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>All user enrollments and role modifications are recorded in the tamper-evident Audit Log</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer shadow-xs ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700' 
                : 'bg-slate-900 hover:bg-black text-white'
            }`}
          >
            Close Console
          </button>
        </div>

      </div>

      {/* EDIT USER MODAL OVERLAY */}
      {editingUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className={`rounded-2xl border shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-150 ${
              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between pb-4 border-b ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shadow-xs ${
                  isDark ? 'bg-indigo-950/70 border-indigo-800 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                }`}>
                  <Edit2 className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Edit User Authorization</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{editingUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-black hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editUserSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{editUserSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditUser} className="mt-4 space-y-4 text-xs">
              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                  Full Name / Operational Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  required
                  className={`w-full px-3 py-2 rounded-lg font-semibold text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-950'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                    Assigned Role <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value as UserRole)}
                    className={`w-full px-3 py-2 rounded-lg font-bold text-xs border cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-950'
                    }`}
                  >
                    <option value="OPERATOR">OPERATOR (Yard/Branch)</option>
                    <option value="ADMIN">ADMIN (HQ Logistics)</option>
                    <option value="SUPERUSER">SUPERUSER (Full Authority)</option>
                  </select>
                </div>

                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                    Assigned Station / Location <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={editUserStation}
                    onChange={(e) => setEditUserStation(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg font-bold text-xs border cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-950'
                    }`}
                  >
                    <option value="ALL">All Stations (HQ / Universal)</option>
                    {recordedLocations.map(loc => (
                      <option key={loc.id || loc.code} value={loc.code}>
                        {loc.code} - {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                  Account Access Status
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    editUserStatus === 'ACTIVE'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                      : isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="editUserStatus"
                      checked={editUserStatus === 'ACTIVE'}
                      onChange={() => setEditUserStatus('ACTIVE')}
                      className="accent-emerald-600"
                    />
                    <span>Active (Allowed)</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    editUserStatus === 'REVOKED'
                      ? 'bg-rose-50 border-rose-300 text-rose-950 font-bold'
                      : isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="editUserStatus"
                      checked={editUserStatus === 'REVOKED'}
                      onChange={() => setEditUserStatus('REVOKED')}
                      className="accent-rose-600"
                    />
                    <span>Revoked (Blocked)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                  Administrative Notes / Purpose
                </label>
                <input
                  type="text"
                  value={editUserNotes}
                  onChange={(e) => setEditUserNotes(e.target.value)}
                  placeholder="e.g. Authorized dock lead or branch coordinator"
                  className={`w-full px-3 py-2 rounded-lg font-medium text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-950'
                  }`}
                />
              </div>

              <div className={`pt-4 border-t flex items-center justify-end gap-2.5 ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className={`px-3.5 py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                    isDark ? 'text-slate-300 bg-slate-800 border-slate-700 hover:bg-slate-700' : 'text-slate-700 bg-slate-100 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
