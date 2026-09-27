import React, { useState } from 'react';
import { AuditLog, User } from '../types';
import { 
  History, 
  Search, 
  Filter, 
  ShieldCheck, 
  Lock, 
  Calendar, 
  User as UserIcon,
  Code,
  Download
} from 'lucide-react';

interface AuditTrailProps {
  auditLogs: AuditLog[];
  currentUser: User;
}

export const AuditTrail: React.FC<AuditTrailProps> = ({ auditLogs, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [inspectingLog, setInspectingLog] = useState<AuditLog | null>(null);

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = selectedRole === 'all' || log.userRole === selectedRole;
    const matchesEntity = selectedEntity === 'all' || log.entityType === selectedEntity;

    return matchesSearch && matchesRole && matchesEntity;
  });

  const handleExportAuditJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `WeighSure-Audit-Ledger-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Immutable Metrological Audit Trail
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex items-center space-x-1">
              <Lock className="w-3 h-3" />
              <span>Tamper-Evident Ledger</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete traceability of all instrument updates, OCR extractions, deterministic rule evaluations, and digital approvals.
          </p>
        </div>

        <button
          onClick={handleExportAuditJson}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Audit Manifest</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search action, details, user, entity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center space-x-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-slate-400"
            >
              <option value="all">All Roles</option>
              <option value="technician">Technician</option>
              <option value="approving_officer">Approving Officer</option>
              <option value="auditor">Auditor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <select
            value={selectedEntity}
            onChange={e => setSelectedEntity(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-slate-400"
          >
            <option value="all">All Entity Types</option>
            <option value="session">Test Session</option>
            <option value="instrument">Instrument</option>
            <option value="calculation">Calculation</option>
            <option value="approval">Approval</option>
            <option value="ocr_intake">OCR Intake</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Timestamp (UTC)</th>
                <th className="px-4 py-3">Action Event</th>
                <th className="px-4 py-3">Actor / Role</th>
                <th className="px-4 py-3">Entity Reference</th>
                <th className="px-4 py-3">Event Details</th>
                <th className="px-4 py-3 text-right">Raw Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] border border-blue-100">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{log.userName}</div>
                    <div className="text-[10px] text-slate-500 capitalize">{log.userRole.replace('_', ' ')}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">
                    <span className="text-slate-400 uppercase text-[10px] block">{log.entityType}</span>
                    {log.entityId}
                  </td>
                  <td className="px-4 py-3 text-slate-700 max-w-xs truncate">
                    {log.details}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setInspectingLog(log)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 transition-colors inline-flex items-center space-x-1"
                    >
                      <Code className="w-3 h-3" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No audit records match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Metadata Modal */}
      {inspectingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Audit Entry Inspection
                </h3>
                <div className="font-mono text-xs text-blue-700 mt-0.5">
                  ID: {inspectingLog.id}
                </div>
              </div>
              <button
                onClick={() => setInspectingLog(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">Action:</span>{' '}
                  <span className="font-mono font-bold text-slate-900">{inspectingLog.action}</span>
                </div>
                <div>
                  <span className="text-slate-500">Timestamp:</span>{' '}
                  <span className="text-slate-900">{new Date(inspectingLog.timestamp).toISOString()}</span>
                </div>
                <div>
                  <span className="text-slate-500">Actor:</span>{' '}
                  <span className="text-slate-900">{inspectingLog.userName} ({inspectingLog.userRole})</span>
                </div>
                <div>
                  <span className="text-slate-500">IP Address:</span>{' '}
                  <span className="font-mono text-slate-900">{inspectingLog.ipAddress || '127.0.0.1'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block mb-1">Payload / State Changes:</span>
                <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg font-mono text-[11px] overflow-x-auto max-h-60">
                  {JSON.stringify(inspectingLog.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setInspectingLog(null)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
