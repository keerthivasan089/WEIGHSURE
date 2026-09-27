import React, { useState, useEffect } from 'react';
import { User, TestSession, Instrument, AuditLog } from '../types';
import { 
  Scale, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileCheck2, 
  Scan, 
  Plus, 
  ArrowRight, 
  Award, 
  Layers,
  History,
  Search,
  ShieldCheck,
  Check,
  QrCode,
  Compass
} from 'lucide-react';
import { MetrologyEmblem } from './MetrologyEmblem';
import { GettingStartedTour } from './GettingStartedTour';

interface DashboardProps {
  currentUser: User;
  allUsers?: User[];
  onSwitchRole?: (user: User) => void;
  testSessions: TestSession[];
  instruments: Instrument[];
  auditLogs: AuditLog[];
  onNewSession: () => void;
  onNewInstrument: () => void;
  onSelectSession: (session: TestSession) => void;
  onOpenOcr: () => void;
  onNavigateTab: (tab: string) => void;
  onOpenVerifyModal?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  allUsers = [],
  onSwitchRole,
  testSessions,
  instruments,
  auditLogs,
  onNewSession,
  onNewInstrument,
  onSelectSession,
  onOpenOcr,
  onNavigateTab,
  onOpenVerifyModal
}) => {
  const pendingApprovals = testSessions.filter(s => s.status === 'pending_approval');
  const approvedSessions = testSessions.filter(s => s.status === 'approved');
  const mySessions = testSessions.filter(s => s.technicianId === currentUser.id);

  const [isTourOpen, setIsTourOpen] = useState(false);

  useEffect(() => {
    const tourCompleted = localStorage.getItem('nawi_getting_started_tour_completed');
    if (!tourCompleted) {
      const timer = setTimeout(() => {
        setIsTourOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* 
        STATUTORY GOVERNMENT EXECUTIVE COMMAND BAR - LIGHT BLUE ROYAL THEME
        Engineered with a responsive 2-tier layout so the Officer Identity and all Action
        Controls remain 100% visible and intact before and after sidebar toggling.
      */}
      <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 rounded-2xl p-4 sm:p-5 text-white shadow-lg shadow-blue-500/15 border border-sky-300/40 relative overflow-hidden">
        {/* Subtle royal ambient glow */}
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3.5">
          {/* Top Row: Authority Header (Left) + Prominent Officer Identity (Right) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-white/20">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-white/15 border border-white/25 text-[11px] text-sky-100 font-bold tracking-wider uppercase backdrop-blur-xs">
              <MetrologyEmblem size={16} />
              <span>Directorate of Legal Metrology · Statutory Verification Portal</span>
            </div>

            {/* Officer Name Display & Role Switcher - ALWAYS VISIBLE ON RIGHT SIDE */}
            <div className="flex items-center space-x-2 shrink-0">
              <div className="flex items-center space-x-2 bg-white/15 hover:bg-white/20 border border-white/25 rounded-xl px-3 py-1.5 backdrop-blur-xs transition-colors">
                <div className="w-6 h-6 rounded-lg bg-white text-blue-900 flex items-center justify-center text-xs font-black font-mono shadow-xs shrink-0">
                  {currentUser.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="text-left leading-tight">
                  <div className="text-xs font-extrabold text-white whitespace-nowrap">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-sky-200 capitalize font-medium">
                    {currentUser.role.replace('_', ' ')}
                  </div>
                </div>

                {/* Role Switcher Dropdown */}
                {allUsers && allUsers.length > 0 && onSwitchRole && (
                  <select
                    aria-label="Switch Statutory Role"
                    value={currentUser.id}
                    onChange={(e) => {
                      const selected = allUsers.find(u => u.id === e.target.value);
                      if (selected) onSwitchRole(selected);
                    }}
                    className="ml-1.5 bg-blue-950/40 hover:bg-blue-950/60 border border-white/30 text-white text-[10px] font-bold rounded-lg px-2 py-1 cursor-pointer outline-hidden transition-colors"
                  >
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id} className="bg-white text-slate-900 font-medium">
                        Switch: {u.name} ({u.role.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Middle & Bottom Row: Titles & Action Controls */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
            {/* Title and Statutory Standards line */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <h1 className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
                  National Legal Metrology Portal
                </h1>
                <span className="text-xs sm:text-sm font-medium text-sky-100">
                  Non-Automatic Weighing Instruments (OIML R-76)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-sky-150 font-medium">
                <span className="bg-white/10 px-2 py-0.5 rounded-md border border-white/15">
                  Active Standard: <strong className="text-white font-mono">OIML R-76-1:2006 (E)</strong>
                </span>
                <span className="bg-white/10 px-2 py-0.5 rounded-md border border-white/15">
                  MPE Metric: <strong className="text-white font-mono">Table 6 Statutory</strong>
                </span>
                <span className="bg-white/10 px-2 py-0.5 rounded-md border border-white/15">
                  Signed by: <strong className="text-white">{currentUser.name}</strong>
                </span>
              </div>
            </div>

            {/* Quick Action Controls - Fully responsive & wrapping without horizontal clipping */}
            <div className="flex flex-wrap items-center gap-2 pt-1 lg:pt-0">
              {/* Getting Started Interactive Tooltip Tour Trigger */}
              <button
                id="btn-tour-launch"
                onClick={() => setIsTourOpen(true)}
                className="px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer text-amber-100 bg-amber-500/30 hover:bg-amber-500/40 border border-amber-300/60 shadow-sm transition-all whitespace-nowrap"
                title="Interactive Getting Started Tooltip Tour"
              >
                <Compass className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
                <span>Tour</span>
              </button>

              {currentUser.role === 'approving_officer' ? (
                <button
                  id="tour-step-start-test"
                  onClick={() => onNavigateTab('sessions')}
                  className="btn-ref-primary px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-md whitespace-nowrap"
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-blue-900" />
                  <span>Review Pending ({pendingApprovals.length})</span>
                </button>
              ) : (
                <button
                  id="tour-step-start-test"
                  onClick={onNewSession}
                  className="btn-ref-primary px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-md whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-900" />
                  <span>Start New Test</span>
                </button>
              )}

              <button
                id="btn-hero-ocr-intake"
                onClick={onOpenOcr}
                className="btn-ref-secondary px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
              >
                <Scan className="w-3.5 h-3.5 text-sky-200" />
                <span>OCR Intake</span>
              </button>

              {onOpenVerifyModal && (
                <button
                  id="btn-hero-qr-verify"
                  onClick={onOpenVerifyModal}
                  className="btn-ref-secondary px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer text-white border-white/40 hover:border-white whitespace-nowrap"
                  title="Authenticate legal certificate QR stamp"
                >
                  <QrCode className="w-3.5 h-3.5 text-sky-200" />
                  <span>Verify QR</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* STATUTORY ACTION ALERT: Show if any sessions require clearance */}
      {pendingApprovals.length > 0 && (
        <div 
          onClick={() => onNavigateTab('sessions')}
          className="bg-amber-500/10 border-2 border-amber-400/60 hover:border-amber-400 rounded-2xl p-3.5 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all shadow-sm group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900 font-display flex items-center space-x-2">
                <span>Statutory Clearance Queue</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
                  {pendingApprovals.length} ACTION REQUIRED
                </span>
              </div>
              <p className="text-xs text-amber-800/90 font-medium">
                {pendingApprovals.length} test session(s) evaluated and waiting for Approving Authority digital sign-off under Table 6 MPE.
              </p>
            </div>
          </div>
          <button className="text-xs font-bold text-amber-900 group-hover:text-amber-950 flex items-center space-x-1 shrink-0 self-start sm:self-center">
            <span>Review Clearances</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}

      {/* KPI Stats Grid - Modern High-Contrast White Cards (Prioritizing Pending Approvals) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Pending Approval (Priority #1) */}
        <div 
          onClick={() => onNavigateTab('sessions')}
          className={`bg-white p-4.5 rounded-2xl border-2 shadow-[0_4px_20px_rgba(15,39,87,0.06)] transition-all cursor-pointer group ${
            pendingApprovals.length > 0 
              ? 'border-amber-400 bg-amber-50/40 hover:border-amber-500 hover:shadow-amber-100/60' 
              : 'border-blue-100/90 hover:border-blue-400/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider font-display">
              Pending Approval
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-amber-700 font-display tracking-tight">{pendingApprovals.length}</div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
              pendingApprovals.length > 0 ? 'bg-amber-100 text-amber-900 font-mono' : 'bg-slate-100 text-slate-600'
            }`}>
              {pendingApprovals.length > 0 ? 'Clearance Required' : 'Queue clear'}
            </span>
          </div>
        </div>

        {/* Card 2: Approved & Signed Certificates */}
        <div 
          onClick={() => onNavigateTab('sessions')}
          className="bg-white p-4.5 rounded-2xl border-2 border-blue-100/90 shadow-[0_4px_20px_rgba(15,39,87,0.06)] hover:border-blue-400/80 hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider font-display">
              Approved Reports
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-emerald-700 font-display tracking-tight">{approvedSessions.length}</div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 font-mono">
              Digitally signed
            </span>
          </div>
        </div>

        {/* Card 3: Total NAWIs - Target for 'Register Instrument' */}
        <div 
          id="tour-step-register-instrument"
          onClick={() => onNavigateTab('instruments')}
          className="bg-white p-4.5 rounded-2xl border-2 border-blue-100/90 shadow-[0_4px_20px_rgba(15,39,87,0.06)] hover:border-blue-400/80 hover:shadow-lg transition-all cursor-pointer group relative"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider font-display">
              Register Instrument
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-slate-900 font-display tracking-tight">{instruments.length}</div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNewInstrument();
              }}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200/60 font-mono transition-colors"
              title="Register new NAWI"
            >
              + Register NAWI
            </button>
          </div>
        </div>

        {/* Card 4: Audit Events - Target for 'Review Audit Trail' */}
        <div 
          id="tour-step-audit-trail"
          onClick={() => onNavigateTab('audit')}
          className="bg-white p-4.5 rounded-2xl border-2 border-blue-100/90 shadow-[0_4px_20px_rgba(15,39,87,0.06)] hover:border-blue-400/80 hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider font-display">
              Review Audit Trail
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center group-hover:scale-110 transition-transform">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-slate-900 font-display tracking-tight">{auditLogs.length}</div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/60 font-mono">
              ISO 17025 Ledger
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Test Sessions Queue & Cryptographic Audit Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Priority Test Sessions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 font-display">
                {currentUser.role === 'approving_officer'
                  ? 'Pending Review & Approval Queue'
                  : 'Recent Verification Sessions'}
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                {testSessions.length} total
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('sessions')}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <span>View all sessions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm divide-y divide-slate-100 overflow-hidden">
            {testSessions.slice(0, 5).map((session) => {
              const inst = instruments.find(i => i.id === session.instrumentId) || session.instrument;
              return (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session)}
                  className="p-4 hover:bg-blue-50/40 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-900 font-display">
                        {inst?.model || 'NAWI Instrument'}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        SN: {inst?.serialNo || 'N/A'}
                      </span>
                      {inst?.accuracyClass && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          {inst.accuracyClass}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-slate-500 font-medium">
                      <span>Tech: {session.technicianName}</span>
                      <span>•</span>
                      <span>{session.observations.length} observations</span>
                      <span>•</span>
                      <span>{new Date(session.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Status Badge */}
                    {session.status === 'approved' && (
                      <span className="inline-flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approved & Signed</span>
                      </span>
                    )}
                    {session.status === 'pending_approval' && (
                      <span className="inline-flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending Officer Sign-off</span>
                      </span>
                    )}
                    {session.status === 'calculated' && (
                      <span className="inline-flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        <Scale className="w-3.5 h-3.5" />
                        <span>Calculated ({session.calculation?.overallResult})</span>
                      </span>
                    )}
                    {session.status === 'draft' && (
                      <span className="inline-flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        <span>Draft Intake</span>
                      </span>
                    )}
                    {session.status === 'rejected' && (
                      <span className="inline-flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Rejected</span>
                      </span>
                    )}

                    <span className="text-slate-400 font-bold">→</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Live Audit Log Stream & Principles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 font-display">Recent Audit Log</h2>
            <button
              onClick={() => onNavigateTab('audit')}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors cursor-pointer"
            >
              Full log
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm space-y-3">
            {auditLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="text-xs border-b border-slate-100 pb-2.5 last:border-none last:pb-0">
                <div className="flex items-center justify-between text-slate-700 font-semibold">
                  <span className="font-mono text-[11px] text-blue-900 font-bold truncate max-w-[170px]">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-slate-500 mt-1 flex items-center justify-between">
                  <span>By {log.userName}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/60 font-mono">
                    {log.userRole.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Statutory Regulatory Reference Card */}
          <div className="bg-gradient-to-br from-sky-50 via-blue-50/70 to-indigo-50/60 rounded-2xl border border-sky-200/90 p-4 text-xs text-slate-800 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-sky-200/60 pb-2.5">
              <div className="flex items-center space-x-2 font-bold font-display text-blue-900">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Statutory Standards In Force</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-white p-2 rounded-lg border border-sky-200/70 shadow-2xs">
                <div className="text-slate-500 text-[10px]">Standard</div>
                <div className="font-bold font-mono text-slate-900">OIML R-76-1:2006</div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-sky-200/70 shadow-2xs">
                <div className="text-slate-500 text-[10px]">MPE Metric</div>
                <div className="font-bold font-mono text-slate-900">Table 6 Statutory</div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-sky-200/70 shadow-2xs">
                <div className="text-slate-500 text-[10px]">Audit Protocol</div>
                <div className="font-bold font-mono text-slate-900">ISO/IEC 17025</div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-sky-200/70 shadow-2xs">
                <div className="text-slate-500 text-[10px]">Cryptographic Seal</div>
                <div className="font-bold font-mono text-slate-900">HMAC-SHA256</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Getting Started Interactive Tooltip Tour Overlay */}
      <GettingStartedTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onNavigateTab={onNavigateTab}
        onNewSession={onNewSession}
      />
    </div>
  );
};
