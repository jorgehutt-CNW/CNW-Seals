import React, { useState } from 'react';
import { AlertTriangle, X, Check, Copy, ExternalLink } from 'lucide-react';

interface UnauthorizedDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetrySignIn: () => void;
}

export const UnauthorizedDomainModal: React.FC<UnauthorizedDomainModalProps> = ({
  isOpen,
  onClose,
  onRetrySignIn,
}) => {
  const [copied, setCopied] = useState(false);
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'Current app domain';

  if (!isOpen) return null;

  const handleCopy = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(hostname);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-200 rounded-xl shadow-2xl border border-slate-300 w-full max-w-lg p-6 animate-in fade-in zoom-in-95">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 text-amber-800">
            <div className="w-10 h-10 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Authorize Domain in Firebase Console</h3>
              <p className="text-xs text-slate-700 font-medium">Error: auth/unauthorized-domain</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-300/60 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-slate-800">
          <p className="font-medium leading-relaxed">
            Firebase Authentication blocks Google Sign-In requests from web domains that are not yet allowlisted in your Firebase project (<strong className="font-mono text-slate-950 font-bold">cnw-seal</strong>).
          </p>

          {/* Hostname display with copy button */}
          <div className="bg-slate-100 p-3.5 rounded-lg border border-slate-300">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-[11px] uppercase tracking-wider text-slate-700">Domain to Authorize:</span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Domain</span>
                  </>
                )}
              </button>
            </div>
            <div className="font-mono text-xs font-bold text-slate-950 bg-white p-2 rounded border border-slate-300 select-all break-all">
              {hostname}
            </div>
          </div>

          {/* 3 Step Resolution Guide */}
          <div className="bg-slate-300/60 p-3.5 rounded-lg border border-slate-400/80 space-y-2">
            <span className="font-extrabold text-slate-950 text-xs block">How to resolve in 30 seconds:</span>
            <ol className="list-decimal list-inside space-y-1.5 font-medium text-slate-800">
              <li>
                Go to <strong className="text-slate-950">Firebase Console</strong> &rarr; <strong className="text-slate-950">Authentication</strong> &rarr; <strong className="text-slate-950">Settings</strong> tab.
              </li>
              <li>
                Scroll down to the <strong className="text-slate-950">Authorized domains</strong> section.
              </li>
              <li>
                Click <strong className="text-slate-950">&ldquo;Add domain&rdquo;</strong>, paste the domain above, and click <strong className="text-slate-950">Save</strong>.
              </li>
            </ol>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-300">
          <a
            href="https://console.firebase.google.com/project/cnw-seal/authentication/settings"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
          >
            <span>Open Firebase Settings</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="w-full sm:w-auto flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onRetrySignIn();
              }}
              className="px-3.5 py-2 text-xs font-bold bg-slate-950 hover:bg-black text-white rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              Try Sign In Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
