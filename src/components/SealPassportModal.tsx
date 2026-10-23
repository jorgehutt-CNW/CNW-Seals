import React from 'react';
import { X, ShieldCheck, Box, Calendar, Truck, ArrowRight, AlertTriangle, CheckCircle, Clock, Edit3 } from 'lucide-react';
import { Seal, Trip, AuditLogEntry } from '../types';

interface SealPassportModalProps {
  seal: Seal | null;
  onClose: () => void;
  trips: Trip[];
  auditLogs: AuditLogEntry[];
  isSuperuser?: boolean;
  onTriggerEdit?: (seal: Seal) => void;
}

export const SealPassportModal: React.FC<SealPassportModalProps> = ({
  seal,
  onClose,
  trips,
  auditLogs,
  isSuperuser,
  onTriggerEdit
}) => {
  if (!seal) return null;

  const associatedTrip = trips.find(
    t => t.id === seal.currentTripId || t.id === seal.returnTripId || t.primarySealNumber === seal.sealNumber || t.extraSealNumber === seal.sealNumber
  );

  const sealAuditLogs = auditLogs.filter(log => log.sealNumbers.includes(seal.sealNumber));

  const getStatusBadge = () => {
    switch (seal.status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-extrabold bg-emerald-100 text-emerald-950 border border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            Available in Main Stock (HQ)
          </span>
        );
      case 'IN_TRANSIT_OUTBOUND':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-extrabold bg-amber-100 text-amber-950 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            In-Transit Outbound ({seal.currentTripDestination || 'En Route'})
          </span>
        );
      case 'PENDING_RETURN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-extrabold bg-purple-100 text-purple-950 border border-purple-300">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            Pending Return Transit ({seal.returnOriginatingDestination || 'Destination'})
          </span>
        );
      case 'DISPOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-extrabold bg-slate-300 text-slate-900 border border-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
            Disposed / Cut &amp; Destroyed
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div 
        className="bg-slate-200 rounded-xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-300 bg-slate-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 border border-indigo-300 flex items-center justify-center text-indigo-900">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-mono font-extrabold text-slate-950 tabular-nums">
                  Seal #{seal.sealNumber}
                </span>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-slate-700 font-semibold">Chain-of-Custody Digital Passport &amp; Lifecycle Ledger</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-600 hover:text-black rounded-lg hover:bg-slate-400/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white rounded-lg border border-slate-300">
              <div className="text-[11px] font-bold text-slate-600">Station Location</div>
              <div className="font-bold text-sm text-indigo-950 mt-0.5 flex items-center gap-1">
                <span>{seal.location} Station</span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-300">
              <div className="text-[11px] font-bold text-slate-600">Box / Batch Ref</div>
              <div className="font-mono text-sm font-extrabold text-slate-950 mt-0.5">{seal.boxRef || 'N/A'}</div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-300">
              <div className="text-[11px] font-bold text-slate-600">Registration Date</div>
              <div className="text-sm font-extrabold text-slate-950 mt-0.5">{seal.purchaseDate || 'N/A'}</div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-300">
              <div className="text-[11px] font-bold text-slate-600">Current Custody</div>
              <div className="text-sm font-extrabold text-slate-950 mt-0.5 truncate">
                {seal.status === 'AVAILABLE' 
                  ? `${seal.location} Stock Safe` 
                  : seal.currentTripId 
                  ? `En route to ${seal.currentTripDestination}` 
                  : seal.returnTripId 
                  ? `Returning to ${seal.returnOriginLocation || seal.location}` 
                  : 'Disposed'}
              </div>
            </div>
          </div>

          {/* Description & Notes */}
          {seal.notes && (
            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 text-xs text-indigo-950 font-medium">
              <span className="font-bold text-indigo-950">Specification &amp; Notes: </span>
              {seal.notes}
            </div>
          )}

          {/* Active Trip Info if currently assigned or recently associated */}
          {associatedTrip && (
            <div className="border border-slate-300 rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <Truck className="w-3.5 h-3.5 text-indigo-700" />
                  Associated Trip Record: {associatedTrip.id}
                </span>
                <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded ${
                  associatedTrip.status === 'IN_TRANSIT' 
                    ? 'bg-amber-100 text-amber-950 border border-amber-300' 
                    : associatedTrip.status === 'ROLLED_BACK'
                    ? 'bg-rose-100 text-rose-950 border border-rose-300'
                    : 'bg-slate-200 text-slate-800'
                }`}>
                  {associatedTrip.status === 'IN_TRANSIT' 
                    ? 'Active In-Transit' 
                    : associatedTrip.status === 'ROLLED_BACK'
                    ? 'Rolled Back & Voided'
                    : 'Trip Completed'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-800 font-semibold">
                <div><span className="text-slate-600 font-normal">Destination:</span> <strong className="text-slate-950">{associatedTrip.destination}</strong></div>
                <div><span className="text-slate-600 font-normal">Container / Truck:</span> <span className="font-mono font-bold text-slate-950">{associatedTrip.containerOrTruckId}</span></div>
                <div><span className="text-slate-600 font-normal">Primary Door Seal:</span> <span className="font-mono font-bold text-slate-950">#{associatedTrip.primarySealNumber} {associatedTrip.primarySealNumber === seal.sealNumber ? '(This Seal)' : ''}</span></div>
                <div><span className="text-slate-600 font-normal">Inside Spare Seal:</span> <span className="font-mono font-bold text-slate-950">#{associatedTrip.extraSealNumber} {associatedTrip.extraSealNumber === seal.sealNumber ? '(This Seal)' : ''}</span></div>
                <div className="col-span-2">
                  <span className="text-slate-600 font-normal">HAWB(s):</span>{' '}
                  <span className="font-mono font-extrabold text-slate-950">{associatedTrip.hawbs.join(' · ')}</span>
                </div>
                {associatedTrip.status === 'ROLLED_BACK' && (
                  <div className="col-span-2 mt-1 p-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-950 font-medium">
                    <strong>Superuser Rollback:</strong> Executed by {associatedTrip.rolledBackBy || 'Superuser'} on {associatedTrip.rolledBackAt}.
                    <div className="mt-0.5">Reason: &ldquo;{associatedTrip.rollbackReason}&rdquo;</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Disposal Details if Disposed */}
          {seal.status === 'DISPOSED' && (
            <div className="p-4 bg-slate-300 rounded-lg border border-slate-400">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-slate-700" />
                Disposal &amp; Decommissioning Record
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-700 font-medium">Timestamp:</span>
                  <span className="font-mono text-slate-950 font-bold">{seal.disposedAt || 'Recorded'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-700 font-medium">Disposed By:</span>
                  <span className="text-slate-950 font-bold">{seal.disposedBy || 'Authorized Operator'}</span>
                </div>
                <div className="text-slate-900 mt-2 p-2.5 bg-white rounded border border-slate-300 font-medium">
                  <span className="font-bold text-slate-950">Reason / Log: </span>
                  {seal.disposalReason || 'Normal disposal upon container opening.'}
                </div>
              </div>
            </div>
          )}

          {/* Return Transit Details if Pending Return */}
          {seal.status === 'PENDING_RETURN_TRANSIT' && (
            <div className="p-4 bg-purple-100 rounded-lg border border-purple-300">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-purple-700" />
                  Return Transit to Origin {seal.returnOriginLocation || seal.location}
                </h4>
                {seal.returnTrackingNumber ? (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-purple-200 text-purple-950 border border-purple-300">
                    Dispatched / En Route
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-300">
                    Staged at Destination Safe
                  </span>
                )}
              </div>
              <p className="text-xs text-purple-950 font-medium">
                This seal was an <strong>unused inside spare seal</strong> during trip{' '}
                <span className="font-mono font-bold">{seal.returnTripId}</span> to{' '}
                <span className="font-bold">{seal.returnOriginatingDestination}</span>.
                It arrived intact on <span className="font-bold">{seal.returnArrivalDate}</span> and is addressed strictly back to <strong>Origin {seal.returnOriginLocation || seal.location} Station</strong>.
              </p>

              {seal.returnTrackingNumber ? (
                <div className="mt-3 p-3 bg-white/90 rounded border border-purple-200 grid grid-cols-2 gap-2 text-xs text-slate-800">
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block">Courier Tracking / AWB:</span>
                    <span className="font-mono font-extrabold text-purple-950">{seal.returnTrackingNumber}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block">Date Dispatched:</span>
                    <span className="font-bold text-slate-900">{seal.returnSentDate || 'Recorded'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block">Logistics Provider:</span>
                    <span className="font-bold text-slate-900">{seal.returnCarrier || 'Courier Service'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block">Dispatched By:</span>
                    <span className="font-bold text-slate-900">{seal.returnSentBy || 'Station Operator'}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-2.5 text-[11px] text-amber-900 bg-amber-50 p-2 rounded border border-amber-200 font-medium">
                  Currently staged in destination station safe. Awaiting operator courier dispatch with tracking number.
                </div>
              )}
            </div>
          )}

          {/* Audit History Timeline for this Seal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-700" />
              Event Timeline ({sealAuditLogs.length} events logged)
            </h4>
            {sealAuditLogs.length === 0 ? (
              <p className="text-xs text-slate-600 italic">No events logged yet for this seal.</p>
            ) : (
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-400">
                {sealAuditLogs.map((log) => (
                  <div key={log.id} className="relative flex items-start gap-3 pl-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600 mt-1 shrink-0 z-10" />
                    <div className="bg-white p-3 rounded-lg border border-slate-300 text-xs w-full shadow-2xs">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-slate-950">{log.summary}</span>
                        <span className="text-[11px] text-slate-600 font-mono font-medium">{log.timestamp}</span>
                      </div>
                      <div className="text-slate-800 font-medium">{log.details}</div>
                      <div className="text-[11px] text-slate-500 mt-1 font-semibold">Actor: {log.actor}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-300 bg-slate-300 flex items-center justify-between">
          <div>
            {isSuperuser && onTriggerEdit && (seal.status === 'AVAILABLE' || seal.status === 'IN_TRANSIT_OUTBOUND' || seal.status === 'PENDING_RETURN_TRANSIT') && (
              <button
                type="button"
                onClick={() => {
                  onTriggerEdit(seal);
                  onClose();
                }}
                className="px-3 py-1.5 text-xs font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Edit this seal with Superuser privileges"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                <span>Edit Seal Details</span>
                <span className="font-mono text-[9px] bg-amber-600 text-white px-1.5 py-0.2 rounded uppercase font-black">
                  Superuser
                </span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Close Passport
          </button>
        </div>

      </div>
    </div>
  );
};
