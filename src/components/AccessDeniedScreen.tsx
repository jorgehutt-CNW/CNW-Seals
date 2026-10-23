import React, { useState } from 'react';
import { 
  ShieldAlert, LogOut, Mail, Copy, Check, ExternalLink, 
  UserX, AlertTriangle, ArrowRight, Send, CheckCircle2, RefreshCw
} from 'lucide-react';
import type { User } from '../firebase';
import { AuthorizedUser } from '../types';

interface AccessDeniedScreenProps {
  currentUser: User;
  superusers: AuthorizedUser[];
  onRequestAccess: (email: string, displayName: string, notes?: string) => boolean;
  hasAlreadyRequested: boolean;
  onSignOut: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const AccessDeniedScreen: React.FC<AccessDeniedScreenProps> = ({
  currentUser,
  superusers,
  onRequestAccess,
  hasAlreadyRequested,
  onSignOut,
  theme,
  onToggleTheme
}) => {
  const isDark = theme === 'dark';
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [requestNotes, setRequestNotes] = useState('');
  const [isRequestSent, setIsRequestSent] = useState(hasAlreadyRequested);
  const [showRequestForm, setShowRequestForm] = useState(false);

  // Primary Superuser to contact
  const primarySuperuser = superusers.find(u => u.status === 'ACTIVE') || {
    displayName: 'Jorge Hutt',
    email: 'jorge.hutt@cnwglobal.com'
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2500);
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onRequestAccess(
      currentUser.email || 'unauthorized@user.com',
      currentUser.displayName || currentUser.email || 'User',
      requestNotes
    );
    if (success) {
      setIsRequestSent(true);
      setShowRequestForm(false);
    }
  };

  const mailtoLink = `mailto:${primarySuperuser.email}?subject=CNW-Seal%20Access%20Authorization%20Request%20(${encodeURIComponent(currentUser.email || '')})&body=Hello%20${encodeURIComponent(primarySuperuser.displayName || 'Superuser')},%0D%0A%0D%0APlease%20authorize%20my%20account%20for%20CNW-Seal%20access:%0D%0A-%20Name:%20${encodeURIComponent(currentUser.displayName || 'User')}%0D%0A-%20Email:%20${encodeURIComponent(currentUser.email || '')}%0D%0A-%20Requested%20Role:%20[Admin%20/%20Operator]%0D%0A-%20Assigned%20Station:%20[LAX%20/%20SFO%20/%20PHX]%0D%0A%0D%0AThank%20you!`;

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      
      {/* Top minimal bar */}
      <header className={`border-b px-4 sm:px-8 py-3.5 flex items-center justify-between ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold shadow-xs">
            <ShieldAlert className="w-4 h-4 stroke-[2.4]" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">
              CNW-Seal
            </span>
            <span className="text-[10px] ml-2 font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-rose-100 text-rose-950 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
              Access Control
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:text-black'
            }`}
          >
            {isDark ? 'Light' : 'Dark'}
          </button>

          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950/40 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className={`w-full max-w-xl rounded-xl border shadow-xl p-6 sm:p-8 animate-in fade-in zoom-in-95 ${
          isDark 
            ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-black/60' 
            : 'bg-slate-200 border-slate-300 text-slate-950 shadow-slate-300/60'
        }`}>
          
          {/* Header Warning */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800 flex items-center justify-center mb-4 shadow-xs">
              <ShieldAlert className="w-9 h-9 stroke-[2.2]" />
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              Access Denied: Account Not Authorized
            </h1>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-400 mt-2 max-w-md font-medium">
              You have signed in, but your Google Account is not enrolled in the authorized users registry for <strong>CNW-Seal</strong>.
            </p>
          </div>

          {/* Current Signed In Account Card */}
          <div className={`p-4 rounded-xl border mb-6 flex items-center justify-between gap-3 shadow-2xs ${
            isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-300'
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              {currentUser.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={currentUser.displayName || 'Google Account'} 
                  className="w-10 h-10 rounded-full object-cover border border-slate-300 dark:border-slate-600 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-400 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0 leading-tight">
                <span className="block font-bold text-xs truncate text-slate-900 dark:text-white">
                  {currentUser.displayName || 'Google User'}
                </span>
                <span className="block font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {currentUser.email}
                </span>
                <span className="inline-block mt-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                  Status: Access Rejected
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onSignOut}
              className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0 cursor-pointer"
              title="Sign in with a different account"
            >
              Switch Account
            </button>
          </div>

          {/* Core Instruction: Contact the Superuser */}
          <div className={`p-5 rounded-xl border mb-6 space-y-3.5 ${
            isDark 
              ? 'bg-amber-950/20 border-amber-800/40 text-amber-200' 
              : 'bg-amber-100 border-amber-300 text-amber-950'
          }`}>
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-amber-800 dark:text-amber-400 shrink-0" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-amber-950 dark:text-amber-300">
                Superuser Authorization Required
              </h2>
            </div>
            
            <p className="text-xs leading-relaxed font-semibold">
              The <strong>Superuser</strong> is the only authority who can enroll users and assign system operational roles (<span className="font-extrabold text-amber-950 dark:text-amber-300">Admin</span>, <span className="font-extrabold text-amber-950 dark:text-amber-300">Operator</span>, or <span className="font-extrabold text-amber-950 dark:text-amber-300">Superuser</span>).
            </p>

            {/* Superuser Contact Box */}
            <div className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${
              isDark ? 'bg-slate-900/90 border-amber-700/50' : 'bg-white border-slate-300'
            }`}>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block">
                  Designated Superuser Contact:
                </span>
                <span className="font-bold text-xs text-slate-950 dark:text-white block mt-0.5">
                  {primarySuperuser.displayName} <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-950 dark:text-amber-200 font-extrabold ml-1 border border-amber-400 dark:border-amber-700">SUPERUSER</span>
                </span>
                <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400">
                  {primarySuperuser.email}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyEmail(primarySuperuser.email)}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs text-slate-800 dark:text-slate-200"
                  title="Copy Superuser email address"
                >
                  {copiedEmail === primarySuperuser.email ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 dark:text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Email</span>
                    </>
                  )}
                </button>

                <a
                  href={mailtoLink}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Superuser</span>
                </a>
              </div>
            </div>
          </div>

          {/* In-App Direct Request Form / Status */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
            {isRequestSent ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold block text-emerald-950 dark:text-emerald-100">
                    Authorization Request Submitted to Superuser
                  </span>
                  <p className="mt-0.5 text-emerald-800 dark:text-emerald-300 font-medium">
                    Your request has been logged. When <strong>{primarySuperuser.displayName}</strong> authorizes your account and assigns your role, you will immediately be granted access upon refreshing or signing in again.
                  </p>
                </div>
              </div>
            ) : showRequestForm ? (
              <form onSubmit={handleSubmitRequest} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Submit In-App Access Request to Superuser:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRequestForm(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <textarea
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="Optional: State your department, station location (LAX, SFO, PHX), or reason for access..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Request to Superuser</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-600 dark:text-slate-400 text-center sm:text-left">
                  <span>Want to notify the Superuser directly in the system?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRequestForm(true)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Submit Access Request</span>
                </button>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>CNW-Seal v2.4 · Access Governance</span>
            <button
              type="button"
              onClick={onSignOut}
              className="text-rose-600 dark:text-rose-400 hover:underline font-bold cursor-pointer"
            >
              Sign Out &amp; Exit
            </button>
          </div>

        </div>
      </main>
    </div>
  );
};
