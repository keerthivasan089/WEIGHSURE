import React, { useState } from 'react';
import { TestSession, Instrument, User } from '../types';
import { 
  Scale, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Award,
  ArrowRight,
  FileCheck2
} from 'lucide-react';

interface TestSessionListProps {
  testSessions: TestSession[];
  instruments: Instrument[];
  currentUser: User;
  onSelectSession: (session: TestSession) => void;
  onNewSession: () => void;
}

export const TestSessionList: React.FC<TestSessionListProps> = ({
  testSessions,
  instruments,
  currentUser,
  onSelectSession,
  onNewSession
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filtered = testSessions.filter(session => {
    const inst = instruments.find(i => i.id === session.instrumentId) || session.instrument;
    const matchesSearch =
      (inst?.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inst?.serialNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.technicianName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'all' || session.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Metrological Test Sessions
          </h1>
          <p className="text-sm text-slate-500">
            Type-evaluation, linearity, repeatability, and eccentricity testing runs under OIML R-76.
          </p>
        </div>

        {(currentUser.role === 'technician' || currentUser.role === 'admin') && (
          <button
            onClick={onNewSession}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>New Test Session</span>
          </button>
        )}
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by model, serial, technician, session ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-slate-400"
          >
            <option value="all">All Session Statuses</option>
            <option value="draft">Draft Intake</option>
            <option value="calculated">Calculated (Pre-approval)</option>
            <option value="pending_approval">Pending Officer Sign-off</option>
            <option value="approved">Approved & Signed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Session ID & Date</th>
                <th className="px-4 py-3">Instrument Model & SN</th>
                <th className="px-4 py-3">Accuracy Class</th>
                <th className="px-4 py-3">Technician</th>
                <th className="px-4 py-3">Observations</th>
                <th className="px-4 py-3">Evaluation Result</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((session) => {
                const inst = instruments.find(i => i.id === session.instrumentId) || session.instrument;

                return (
                  <tr
                    key={session.id}
                    onClick={() => onSelectSession(session)}
                    className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-slate-900">{session.id}</div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{inst?.model || 'NAWI'}</div>
                      <div className="text-[11px] font-mono text-slate-500">SN: {inst?.serialNo}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {inst?.accuracyClass}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-800 font-medium">
                      {session.technicianName}
                    </td>
                    <td className="px-4 py-3.5 font-mono">
                      {session.observations.length} points
                    </td>
                    <td className="px-4 py-3.5">
                      {session.calculation ? (
                        <span
                          className={`inline-block font-bold text-[11px] px-2 py-0.5 rounded ${
                            session.calculation.overallResult === 'PASS'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {session.calculation.overallResult}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {session.status === 'approved' && (
                        <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approved</span>
                        </span>
                      )}
                      {session.status === 'pending_approval' && (
                        <span className="inline-flex items-center space-x-1 text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-semibold text-[11px]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending Review</span>
                        </span>
                      )}
                      {session.status === 'calculated' && (
                        <span className="inline-flex items-center space-x-1 text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 font-semibold text-[11px]">
                          <Scale className="w-3.5 h-3.5" />
                          <span>Calculated</span>
                        </span>
                      )}
                      {session.status === 'draft' && (
                        <span className="inline-block text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 font-medium text-[11px]">
                          Draft
                        </span>
                      )}
                      {session.status === 'rejected' && (
                        <span className="inline-flex items-center space-x-1 text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 font-semibold text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Rejected</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-slate-400 hover:text-slate-700 font-bold">
                        Open →
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No test sessions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
