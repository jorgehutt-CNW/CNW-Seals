import React, { useState } from 'react';
import { 
  ShieldCheck, Lock, CheckCircle2, 
  AlertTriangle, Copy, Check, ExternalLink, Loader2, Sun, Moon 
} from 'lucide-react';

interface LoginPageProps {
  onSignInGoogle: () => void;
  isAuthLoading: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  errorMessage?: string | null;
  onClearError?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSignInGoogle,
  isAuthLoading,
  theme,
  onToggleTheme,
  errorMessage,
  onClearError,
}) => {
  const isDark = theme === 'dark';
  const [copiedHostname, setCopiedHostname] = useState(false);
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'Current App Domain';

  const handleCopyHostname = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.hostname);
      setCopiedHostname(true);
      setTimeout(() => setCopiedHostname(false), 2500);
    }
  };

  const isUnauthorizedDomain = errorMessage?.includes('unauthorized-domain');

  return (
    <div className={`min-h-screen flex flex-col justify-between font-sans transition-colors duration-200 ${
      isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* Top utility bar */}
      <header className={`border-b px-4 sm:px-8 py-3.5 flex items-center justify-between ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                CNW-Seal
              </span>
              <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${
                isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                ISO 17712
              </span>
            </div>
          </div>
        </div>

        {/* Theme switcher */}
        <button
          type="button"
          onClick={onToggleTheme}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
          }`}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Dark Mode</span>
            </>
          )}
        </button>
      </header>

      {/* Main Content Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md sm:max-w-lg space-y-6">
          
          {/* Main Login Card - Darker gray box (bg-slate-200) */}
          <div className="bg-slate-200 rounded-2xl border border-slate-300 p-6 sm:p-8 shadow-md">
            
            {/* Header Lockup */}
            <div className="text-center space-y-2 mb-6">
              <div className="inline-flex w-14 h-14 rounded-2xl bg-indigo-600 text-white items-center justify-center shadow-md mb-2">
                <Lock className="w-7 h-7 stroke-[2.2]" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">
                CNW Seal Inventory Control System
              </h1>
              <p className="text-xs sm:text-sm text-slate-700 font-medium max-w-sm mx-auto leading-relaxed">
                Security Seal Inventory &amp; Transit Control System. Authenticate to manage container dispatches, stock, and arrivals.
              </p>
            </div>

            {/* Error banner if present */}
            {errorMessage && (
              <div className="mb-6 p-4 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
                    <span>{isUnauthorizedDomain ? 'Firebase Domain Not Authorized' : 'Sign-In Notice'}</span>
                  </div>
                  {onClearError && (
                    <button 
                      type="button" 
                      onClick={onClearError} 
                      className="text-amber-800 hover:text-black font-extrabold text-xs"
                    >
                      &times;
                    </button>
                  )}
                </div>

                {isUnauthorizedDomain ? (
                  <div className="space-y-2 text-[11px] leading-relaxed text-slate-800">
                    <p>
                      Your Firebase project (<strong className="font-mono text-black font-bold">cnw-seal</strong>) requires allowlisting this web domain before completing Google Sign-In.
                    </p>
                    <div className="bg-white p-2 rounded border border-slate-300 flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-slate-900 truncate select-all">{currentHostname}</span>
                      <button
                        type="button"
                        onClick={handleCopyHostname}
                        className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                      >
                        {copiedHostname ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="pt-1 flex items-center justify-between gap-2">
                      <a
                        href="https://console.firebase.google.com/project/cnw-seal/authentication/settings"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-indigo-800 hover:text-indigo-950 underline"
                      >
                        <span>Open Firebase Settings</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <span className="text-slate-600 text-[10px]">Settings &rarr; Authorized domains</span>
                    </div>
                  </div>
                ) : (
                  <p className="font-medium text-slate-800">{errorMessage}</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              {/* Primary: Sign in with Google Button */}
              <button
                type="button"
                onClick={onSignInGoogle}
                disabled={isAuthLoading}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 hover:border-slate-400 font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isAuthLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Feature Checklist */}
            <div className="mt-6 pt-5 border-t border-slate-300 grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-800">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Dual-Seal Dispatches</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Arrival Verifications</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Return Transit Vault</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Forensic Audit Ledger</span>
              </div>
            </div>

          </div>

          {/* Compliance & Security Callout */}
          <div className="text-center text-[11px] text-slate-600 space-y-1">
            <p className="font-semibold text-slate-700">
              Controlled Access · ISO/PAS 17712 High-Security Container Seals
            </p>
            <p className="text-[10px] text-slate-500">
              Access is restricted to users enrolled by the Superuser. Unauthorized sign-ins will be directed to contact the Superuser for authorization.
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className={`py-3 px-4 text-center text-xs border-t ${
        isDark ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-500'
      }`}>
        <span>CNW-Seal &copy; {new Date().getFullYear()} · All rights reserved</span>
      </footer>
    </div>
  );
};
