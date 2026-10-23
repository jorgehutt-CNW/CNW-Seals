import React, { useState, useMemo } from 'react';
import { 
  FileText, Search, Filter, Download, ShieldCheck, ArrowRight, 
  Calendar, CheckCircle2, AlertTriangle, Truck, RotateCcw, PackagePlus,
  Trash2, X, ChevronRight, Layers
} from 'lucide-react';
import { AuditLogEntry, AuditEventType, Seal } from '../types';

interface AuditLogModuleProps {
  auditLogs: AuditLogEntry[];
  seals: Seal[];
  onSelectSealForPassport: (seal: Seal) => void;
}

export const AuditLogModule: React.FC<AuditLogModuleProps> = ({
  auditLogs,
  seals,
  onSelectSealForPassport
}) => {
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchesType = eventTypeFilter === 'ALL' || log.eventType === eventTypeFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        log.summary.toLowerCase().includes(q) ||
        (log.details && log.details.toLowerCase().includes(q)) ||
        (log.tripId && log.tripId.toLowerCase().includes(q)) ||
        (log.destination && log.destination.toLowerCase().includes(q)) ||
        log.actor.toLowerCase().includes(q) ||
        log.sealNumbers.some(num => num.includes(q));

      return matchesType && matchesSearch;
    });
  }, [auditLogs, eventTypeFilter, searchQuery]);

  const handleExportCSV = () => {
    const headers = ['ID', 'Timestamp', 'Event Type', 'Actor', 'Seals', 'Trip ID', 'Destination', 'Summary', 'Details'];
    const rows = filteredLogs.map(l => [
      l.id,
      `"${l.timestamp}"`,
      `"${l.eventType}"`,
      `"${l.actor}"`,
      `"${l.sealNumbers.join(', ')}"`,
      `"${l.tripId || ''}"`,
      `"${l.destination || ''}"`,
      `"${l.summary.replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CNW-Seal_Audit_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getEventBadge = (eventType: AuditEventType) => {
    switch (eventType) {
      case 'BULK_PURCHASE_REGISTERED':
      case 'SINGLE_SEAL_ADDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-950 border border-indigo-300">
            <PackagePlus className="w-3 h-3" />
            Stock Inflow
          </span>
        );
      case 'TRIP_DISPATCHED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-950 border border-amber-300">
            <Truck className="w-3 h-3" />
            Outbound Dispatch
          </span>
        );
      case 'TRIP_DISPATCH_ROLLED_BACK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-black bg-amber-100 text-amber-950 border border-amber-400 shadow-2xs">
            <RotateCcw className="w-3 h-3 text-amber-800" />
            Superuser Rollback
          </span>
        );
      case 'ARRIVAL_VERIFIED_STANDARD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-950 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3" />
            Standard Arrival
          </span>
        );
      case 'ARRIVAL_VERIFIED_INSPECTION_SWAP':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-950 border border-rose-300">
            <AlertTriangle className="w-3 h-3" />
            Inspection Seal Swap
          </span>
        );
      case 'RETURN_DISPATCHED_TO_ORIGIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-950 border border-blue-300">
            <Truck className="w-3 h-3 text-blue-700" />
            Return Dispatched
          </span>
        );
      case 'EXTRA_SEAL_RETURN_RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-950 border border-purple-300">
            <RotateCcw className="w-3 h-3" />
            Return Restocked
          </span>
        );
      case 'USER_ENROLLED':
      case 'USER_ROLE_ASSIGNED':
      case 'USER_ACCESS_RESTORED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-950 border border-amber-300">
            <ShieldCheck className="w-3 h-3 text-amber-700" />
            User Auth &amp; Role
          </span>
        );
      case 'USER_ACCESS_REVOKED':
      case 'USER_REMOVED':
      case 'UNAUTHORIZED_LOGIN_BLOCKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-950 border border-rose-300">
            <AlertTriangle className="w-3 h-3 text-rose-700" />
            Auth Restricted
          </span>
        );
      case 'SEAL_EDITED':
      case 'SEAL_DELETED':
      case 'SEAL_DISPOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-300 text-slate-900 border border-slate-400">
            <Trash2 className="w-3 h-3" />
            Disposal / Mod
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-800 border border-slate-300">
            System Event
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner - Darker Gray Box (bg-slate-200) */}
      <div className="bg-slate-200 rounded-xl border border-slate-300 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-950 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-950">Chain-of-Custody Immutable Audit Ledger</h2>
                <span className="text-xs font-mono font-extrabold px-2.5 py-0.5 rounded bg-slate-300 text-slate-900 border border-slate-400">
                  {auditLogs.length} Events Logged
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-0.5 font-medium">
                Complete forensic trace: purchase generation, outbound dispatch, destination door verifications, inspection replacements, return stock receipts, and Superuser error rollbacks.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar - Darker Gray Box (bg-slate-200) */}
      <div className="bg-slate-200 rounded-xl border border-slate-300 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Event Type Filter */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'ALL', label: 'All Events', icon: <Layers className="w-3.5 h-3.5 text-indigo-500" /> },
            { id: 'TRIP_DISPATCHED', label: 'Dispatches', icon: <Truck className="w-3.5 h-3.5 text-amber-500" /> },
            { id: 'TRIP_DISPATCH_ROLLED_BACK', label: 'Superuser Rollbacks', icon: <RotateCcw className="w-3.5 h-3.5 text-amber-700" /> },
            { id: 'ARRIVAL_VERIFIED_STANDARD', label: 'Standard Arrivals', icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> },
            { id: 'ARRIVAL_VERIFIED_INSPECTION_SWAP', label: 'Inspection Swaps', icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> },
            { id: 'EXTRA_SEAL_RETURN_RECEIVED', label: 'Returns Received', icon: <RotateCcw className="w-3.5 h-3.5 text-purple-500" /> },
            { id: 'BULK_PURCHASE_REGISTERED', label: 'Purchases', icon: <PackagePlus className="w-3.5 h-3.5 text-indigo-500" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setEventTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                eventTypeFilter === tab.id
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-white text-slate-800 hover:bg-slate-100 border border-slate-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search seal #, trip, HAWB, actor..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-950 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>

      {/* Ledger Table - Darker Gray Box (bg-slate-200) */}
      <div className="bg-slate-200 rounded-xl border border-slate-300 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-300 border-b border-slate-400 text-slate-800 font-extrabold tracking-wider uppercase text-[11px]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Seal Number(s)</th>
                <th className="py-3 px-4">Trip / Station</th>
                <th className="py-3 px-4">Event Summary &amp; Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 font-sans">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-600 bg-slate-200">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                    <p className="font-bold text-slate-800">No audit log entries matching filters.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr 
                    key={log.id} 
                    className={`hover:bg-slate-300/80 transition-colors ${
                      log.eventType === 'TRIP_DISPATCH_ROLLED_BACK' ? 'bg-amber-100/70 border-l-4 border-l-amber-500' : 'bg-slate-200'
                    }`}
                  >
                    
                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono text-slate-800 font-bold whitespace-nowrap tabular-nums">
                      {log.timestamp}
                    </td>

                    {/* Event Type Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getEventBadge(log.eventType)}
                    </td>

                    {/* Actor */}
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {log.actor}
                    </td>

                    {/* Affected Seals */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap items-center gap-1 max-w-xs">
                        {log.sealNumbers.slice(0, 4).map((num) => {
                          const sealObj = seals.find(s => s.sealNumber === num);
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => sealObj && onSelectSealForPassport(sealObj)}
                              className="font-mono text-[11px] font-extrabold px-1.5 py-0.5 rounded bg-white hover:bg-indigo-100 text-indigo-900 hover:text-black border border-slate-300 transition-colors"
                              title="Click to view Seal Passport"
                            >
                              #{num}
                            </button>
                          );
                        })}
                        {log.sealNumbers.length > 4 && (
                          <span className="text-[10px] text-slate-700 font-mono font-bold">
                            +{log.sealNumbers.length - 4} more
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Trip & Destination */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.tripId ? (
                        <div className="font-mono font-extrabold text-slate-950">
                          <span>{log.tripId}</span>
                          {log.destination && (
                            <span className="ml-1 text-[11px] font-bold text-slate-700">
                              ({log.destination})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* Summary & Details */}
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-950">{log.summary}</div>
                      {log.details && (
                        <div className="text-slate-700 text-[11px] mt-0.5 max-w-lg leading-relaxed font-medium">
                          {log.details}
                        </div>
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
          <span>Displaying {filteredLogs.length} events</span>
          <span className="italic">Click any seal number badge to view its individual digital chain-of-custody passport</span>
        </div>
      </div>

    </div>
  );
};
