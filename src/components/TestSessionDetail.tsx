import React, { useState } from 'react';
import { 
  TestSession, 
  Instrument, 
  Observation, 
  TestType, 
  User, 
  OimlRuleConfiguration,
  CalculationDecision
} from '../types';
import { 
  Scale, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  FileCheck2, 
  Scan, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  FileText, 
  Layers, 
  Thermometer, 
  Droplets, 
  Gauge, 
  ArrowLeft,
  Award,
  Lock,
  ExternalLink,
  Printer,
  AlertTriangle,
  Camera,
  Sparkles,
  ArrowRight,
  Download,
  Table
} from 'lucide-react';
import { downloadCsv } from '../lib/downloadHelper';
import { SessionAttachments } from './SessionAttachments';

interface TestSessionDetailProps {
  session: TestSession;
  instruments: Instrument[];
  ruleVersions: OimlRuleConfiguration[];
  currentUser: User;
  onBack: () => void;
  onUpdateSession: (updated: Partial<TestSession>) => Promise<void>;
  onExecuteCalculation: () => Promise<void>;
  onSubmitForApproval: () => Promise<void>;
  onApproveSession: (comments: string) => Promise<void>;
  onRejectSession: (comments: string) => Promise<void>;
  onOpenOcr: () => void;
  onViewReport: () => void;
  onAddAttachment?: (data: {
    name: string;
    category: any;
    fileSize: string;
    dataUrl?: string;
    notes?: string;
  }) => Promise<void>;
  onDeleteAttachment?: (attachmentId: string) => Promise<void>;
}

export const TestSessionDetail: React.FC<TestSessionDetailProps> = ({
  session,
  instruments,
  ruleVersions,
  currentUser,
  onBack,
  onUpdateSession,
  onExecuteCalculation,
  onSubmitForApproval,
  onApproveSession,
  onRejectSession,
  onOpenOcr,
  onViewReport,
  onAddAttachment,
  onDeleteAttachment
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'observations' | 'calculations' | 'approval' | 'attachments'>('observations');
  const [isAddingObservation, setIsAddingObservation] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // New observation form
  const [newObs, setNewObs] = useState<{
    testType: TestType;
    loadValue: number;
    observedReading: number;
    direction: 'increasing' | 'decreasing';
    deltaL?: number;
    position?: 'center' | 'front-left' | 'front-right' | 'rear-left' | 'rear-right';
  }>({
    testType: 'weighing_performance',
    loadValue: 100,
    observedReading: 100.01,
    direction: 'increasing',
    deltaL: undefined,
    position: 'center'
  });

  const instrument = instruments.find(i => i.id === session.instrumentId) || session.instrument;
  const activeRule = ruleVersions.find(r => r.id === session.ruleVersionId) || ruleVersions[0];

  // Environmental Rated Operating Range Check (OIML R-76 clause 3.9.2)
  const getRatedLimits = (accClass?: string) => {
    switch (accClass) {
      case 'Class I':
        return {
          tempMin: 15,
          tempMax: 25,
          humidityMin: 30,
          humidityMax: 70,
          pressureMin: 900,
          pressureMax: 1050,
          standardRef: 'Class I rated operating range: 15°C – 25°C, 30% – 70% RH, 900 – 1050 hPa (OIML R-76 §3.9.2.1)'
        };
      case 'Class II':
        return {
          tempMin: 10,
          tempMax: 30,
          humidityMin: 25,
          humidityMax: 75,
          pressureMin: 860,
          pressureMax: 1060,
          standardRef: 'Class II rated operating range: 10°C – 30°C, 25% – 75% RH, 860 – 1060 hPa (OIML R-76 §3.9.2.2)'
        };
      case 'Class III':
      case 'Class IIII':
      default:
        return {
          tempMin: -10,
          tempMax: 40,
          humidityMin: 20,
          humidityMax: 85,
          pressureMin: 800,
          pressureMax: 1100,
          standardRef: 'Class III/IIII rated operating range: -10°C – 40°C, 20% – 85% RH, 800 – 1100 hPa (OIML R-76 §3.9.2.3)'
        };
    }
  };

  const ratedEnv = getRatedLimits(instrument?.accuracyClass);
  const isTempOutOfRange = session.environmentalConditions.temperatureC < ratedEnv.tempMin || session.environmentalConditions.temperatureC > ratedEnv.tempMax;
  const isHumOutOfRange = session.environmentalConditions.humidityPercent < ratedEnv.humidityMin || session.environmentalConditions.humidityPercent > ratedEnv.humidityMax;
  const isPressOutOfRange = session.environmentalConditions.pressureHpa < ratedEnv.pressureMin || session.environmentalConditions.pressureHpa > ratedEnv.pressureMax;

  const envWarningReasons: string[] = [];
  if (isTempOutOfRange) envWarningReasons.push(`Temp ${session.environmentalConditions.temperatureC}°C (Rated: ${ratedEnv.tempMin}–${ratedEnv.tempMax}°C)`);
  if (isHumOutOfRange) envWarningReasons.push(`Humidity ${session.environmentalConditions.humidityPercent}% RH (Rated: ${ratedEnv.humidityMin}–${ratedEnv.humidityMax}%)`);
  if (isPressOutOfRange) envWarningReasons.push(`Pressure ${session.environmentalConditions.pressureHpa} hPa (Rated: ${ratedEnv.pressureMin}–${ratedEnv.pressureMax} hPa)`);
  const hasEnvWarning = envWarningReasons.length > 0;

  const isApproved = session.status === 'approved';
  const isPendingApproval = session.status === 'pending_approval';
  const canEdit = !isApproved && (currentUser.role === 'technician' || currentUser.role === 'admin');
  const canApprove = (currentUser.role === 'approving_officer' || currentUser.role === 'admin') && isPendingApproval;

  const getSingleNextAction = () => {
    if (session.status === 'approved') {
      return {
        title: 'Verification Approved & Digitally Certified',
        description: 'Standardized OIML R-76 Certificate is finalized with cryptographic SHA-256 HMAC signature and tamper-evident QR verification code.',
        buttonText: 'View & Export Certificate (PDF / Word)',
        icon: <Award className="w-5 h-5 text-emerald-400" />,
        badge: 'Completed & Certified',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        action: onViewReport,
        buttonStyle: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
      };
    }

    if (session.status === 'pending_approval') {
      const isApprover = currentUser.role === 'approving_officer' || currentUser.role === 'admin';
      return {
        title: isApprover ? 'Sign & Issue Verification Certificate' : 'Awaiting Legal Metrology Officer Review',
        description: isApprover 
          ? 'Observations and MPE calculations have been validated. Review legal metrology declaration and apply cryptographic digital signature.'
          : 'Session submitted to Legal Metrology Officer for formal review and digital signature under OIML R-76.',
        buttonText: isApprover ? 'Review & Formally Sign' : 'Inspect Approval Status',
        icon: <ShieldCheck className="w-5 h-5 text-amber-400" />,
        badge: 'Single Next Action',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse',
        action: () => setActiveSubTab('approval'),
        buttonStyle: 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg ring-2 ring-amber-400/50 font-bold'
      };
    }

    if (session.status === 'calculated') {
      return {
        title: 'Submit Verification for Formal Approval',
        description: `Deterministic evaluation complete (${session.calculation?.overallResult || 'PASS'}). Ready to transmit report to the legal metrology officer.`,
        buttonText: 'Submit for Approval',
        icon: <FileCheck2 className="w-5 h-5 text-blue-400" />,
        badge: 'Single Next Action',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30 animate-pulse',
        action: async () => {
          setActiveSubTab('approval');
          await onSubmitForApproval();
        },
        buttonStyle: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg ring-2 ring-blue-400/50 font-bold'
      };
    }

    // Draft session:
    if (session.observations.length === 0) {
      return {
        title: 'Intake Laboratory Observations',
        description: 'No observations recorded yet. Enter test points manually or scan a physical laboratory test sheet with the OCR Assistant.',
        buttonText: 'Scan Test Sheet (OCR Intake)',
        icon: <Scan className="w-5 h-5 text-purple-400" />,
        badge: 'Initial Intake',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        action: onOpenOcr,
        buttonStyle: 'bg-purple-600 hover:bg-purple-500 text-white shadow-md font-bold'
      };
    }

    // Has observations, needs calculation:
    return {
      title: 'Execute Deterministic OIML Calculation',
      description: `${session.observations.length} test points recorded. Run pure mathematical evaluation against OIML R-76 Table 6 MPE limits.`,
      buttonText: '⚡ Execute OIML Calculation',
      icon: <Scale className="w-5 h-5 text-emerald-400" />,
      badge: 'Single Next Action',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 animate-pulse',
      action: async () => {
        setActiveSubTab('calculations');
        await onExecuteCalculation();
      },
      buttonStyle: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl ring-4 ring-emerald-400/50 font-black text-sm'
    };
  };

  const nextAction = getSingleNextAction();

  const handleExportObservationsCsv = () => {
    const headers = [
      'Index',
      'Test Type',
      'Load Value',
      'Unit',
      'Observed Reading',
      'Direction',
      'Position',
      'Source',
      'Confirmed',
      'Created At'
    ];
    const rows = session.observations.map(o => [
      o.testPointIndex,
      o.testType,
      o.loadValue,
      instrument?.unit || 'g',
      o.observedReading,
      o.direction || 'N/A',
      o.position || 'N/A',
      o.source,
      o.confirmedByTechnician ? 'Yes' : 'No',
      o.createdAt
    ]);
    downloadCsv(`WeighSure-Observations-${session.id}.csv`, headers, rows);
  };

  const handleAddObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    const newObservation: Observation = {
      id: `obs_${Date.now()}`,
      testSessionId: session.id,
      testType: newObs.testType,
      testPointIndex: session.observations.length + 1,
      loadValue: Number(newObs.loadValue),
      observedReading: Number(newObs.observedReading),
      direction: newObs.testType === 'weighing_performance' ? newObs.direction : undefined,
      position: newObs.testType === 'eccentricity' ? newObs.position : undefined,
      deltaL: newObs.deltaL !== undefined && !isNaN(newObs.deltaL) ? Number(newObs.deltaL) : undefined,
      source: 'manual',
      confirmedByTechnician: true,
      createdAt: new Date().toISOString()
    };

    const updatedObservations = [...session.observations, newObservation];
    await onUpdateSession({ observations: updatedObservations });
    setIsAddingObservation(false);
  };

  const handleDeleteObservation = async (obsId: string) => {
    if (!canEdit) return;
    const filtered = session.observations.filter(o => o.id !== obsId);
    await onUpdateSession({ observations: filtered });
  };

  const handleRunCalculation = async () => {
    setIsProcessing(true);
    try {
      await onExecuteCalculation();
      setActiveSubTab('calculations');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitApproval = async () => {
    setIsProcessing(true);
    try {
      await onSubmitForApproval();
      setActiveSubTab('approval');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await onApproveSession(approvalComments);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!approvalComments) {
      alert('Please provide justification comments for rejection.');
      return;
    }
    setIsProcessing(true);
    try {
      await onRejectSession(approvalComments);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-600 transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-1.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {instrument?.model || 'Test Session'}
              </h1>
              {instrument?.instrumentType && (
                <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                  {instrument.instrumentType}
                </span>
              )}
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                SN: {instrument?.serialNo}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Session ID: <span className="font-mono">{session.id}</span> • Tech: {session.technicianName}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Status Badge */}
          {session.status === 'approved' && (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Approved & Digitally Signed</span>
            </div>
          )}
          {session.status === 'pending_approval' && (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold shadow-2xs">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Pending Officer Review</span>
            </div>
          )}
          {session.status === 'calculated' && (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold shadow-2xs">
              <Scale className="w-4 h-4 text-blue-600" />
              <span>Calculated ({session.calculation?.overallResult})</span>
            </div>
          )}
          {session.status === 'draft' && (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold">
              <span>Draft Intake</span>
            </div>
          )}

          {/* View Report Button */}
          {session.status === 'approved' && (
            <button
              onClick={onViewReport}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
            >
              <Award className="w-3.5 h-3.5" />
              <span>View Certificate & QR</span>
            </button>
          )}
        </div>
      </div>

      {/* Instrument & Environmental Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metrological Specs */}
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            NAWI Type & Accuracy Class
          </div>
          <div className="flex items-center space-x-2 flex-wrap gap-1">
            <span className="text-sm font-bold text-slate-900">
              {instrument?.accuracyClass}
            </span>
            {instrument?.instrumentType && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold">
                {instrument.instrumentType}
              </span>
            )}
            <span className="text-xs text-slate-500">
              (Max {instrument?.maxCapacity} {instrument?.unit})
            </span>
          </div>
          <div className="text-xs text-slate-600 font-mono">
            e = {instrument?.verificationInterval_e} {instrument?.unit} | d = {instrument?.scaleInterval_d} {instrument?.unit}
          </div>
        </div>

        {/* Environmental Conditions */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Environmental Conditions
            </div>
            {hasEnvWarning ? (
              <span 
                className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold"
                title={`Warning: Environmental parameters out of rated operating limits under OIML R-76 §3.9.2: ${envWarningReasons.join('; ')}`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                <span>Out of Range</span>
              </span>
            ) : (
              <span 
                className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold"
                title={ratedEnv.standardRef}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>In Rated Range</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span 
              className={`inline-flex items-center space-x-1 font-mono ${isTempOutOfRange ? 'text-amber-800 font-bold bg-amber-50 px-1 py-0.5 rounded border border-amber-200' : 'text-slate-700'}`}
              title={isTempOutOfRange ? `Temperature ${session.environmentalConditions.temperatureC}°C is outside rated limit (${ratedEnv.tempMin}°C – ${ratedEnv.tempMax}°C)` : `Rated: ${ratedEnv.tempMin}°C – ${ratedEnv.tempMax}°C`}
            >
              <Thermometer className={`w-3.5 h-3.5 ${isTempOutOfRange ? 'text-amber-600 animate-pulse' : 'text-rose-500'}`} />
              <span>{session.environmentalConditions.temperatureC}°C</span>
            </span>

            <span 
              className={`inline-flex items-center space-x-1 font-mono ${isHumOutOfRange ? 'text-amber-800 font-bold bg-amber-50 px-1 py-0.5 rounded border border-amber-200' : 'text-slate-700'}`}
              title={isHumOutOfRange ? `Humidity ${session.environmentalConditions.humidityPercent}% is outside rated limit (${ratedEnv.humidityMin}% – ${ratedEnv.humidityMax}%)` : `Rated: ${ratedEnv.humidityMin}% – ${ratedEnv.humidityMax}%`}
            >
              <Droplets className={`w-3.5 h-3.5 ${isHumOutOfRange ? 'text-amber-600 animate-pulse' : 'text-blue-500'}`} />
              <span>{session.environmentalConditions.humidityPercent}% RH</span>
            </span>

            <span 
              className={`inline-flex items-center space-x-1 font-mono ${isPressOutOfRange ? 'text-amber-800 font-bold bg-amber-50 px-1 py-0.5 rounded border border-amber-200' : 'text-slate-700'}`}
              title={isPressOutOfRange ? `Pressure ${session.environmentalConditions.pressureHpa} hPa is outside rated limit (${ratedEnv.pressureMin} – ${ratedEnv.pressureMax} hPa)` : `Rated: ${ratedEnv.pressureMin} – ${ratedEnv.pressureMax} hPa`}
            >
              <Gauge className={`w-3.5 h-3.5 ${isPressOutOfRange ? 'text-amber-600 animate-pulse' : 'text-slate-500'}`} />
              <span>{session.environmentalConditions.pressureHpa} hPa</span>
            </span>
          </div>

          <div className="text-[11px] text-slate-500 truncate max-w-[220px]" title={session.environmentalConditions.locationNotes || ratedEnv.standardRef}>
            {hasEnvWarning ? (
              <span className="text-amber-700 font-medium">⚠️ {envWarningReasons[0]}</span>
            ) : (
              session.environmentalConditions.locationNotes || 'Standard test cell'
            )}
          </div>
        </div>

        {/* Versioned Rule Active */}
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            OIML Rule Version
          </div>
          <div className="text-xs font-semibold text-slate-900 truncate">
            {activeRule.versionLabel}
          </div>
          <div className="text-[11px] text-slate-500">
            Effective: {new Date(activeRule.effectiveFrom).toLocaleDateString()}
          </div>
        </div>

        {/* Client / Location */}
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Client & Bay
          </div>
          <div className="text-xs font-semibold text-slate-900 truncate">
            {instrument?.customerName}
          </div>
          <div className="text-[11px] text-slate-500 truncate">
            {instrument?.location}
          </div>
        </div>
      </div>

      {/* SINGLE NEXT ACTION PROMINENT BANNER (SIH PS-26035 Metrological Workflow) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-xl p-4 sm:p-5 shadow-md border-2 border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="p-3 bg-white/10 rounded-xl shrink-0 backdrop-blur-xs">
            {nextAction.icon}
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${nextAction.badgeColor}`}>
                {nextAction.badge}
              </span>
              <h3 className="text-sm font-bold text-white tracking-tight">
                {nextAction.title}
              </h3>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              {nextAction.description}
            </p>
          </div>
        </div>

        <button
          id="btn-single-next-action"
          onClick={nextAction.action}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all transform active:scale-95 inline-flex items-center space-x-2 shrink-0 cursor-pointer ${nextAction.buttonStyle}`}
        >
          <span>{nextAction.buttonText}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Sub-Tabs */}
      <div className="border-b border-slate-200 flex items-center justify-between">
        <div className="flex space-x-6 overflow-x-auto">
          <button
            id="subtab-observations"
            onClick={() => setActiveSubTab('observations')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'observations'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Observations Intake</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {session.observations.length}
            </span>
          </button>

          <button
            id="subtab-calculations"
            onClick={() => setActiveSubTab('calculations')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'calculations'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Deterministic Rule Engine</span>
            {session.calculation && (
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  session.calculation.overallResult === 'PASS'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {session.calculation.overallResult}
              </span>
            )}
          </button>

          <button
            id="subtab-approval"
            onClick={() => setActiveSubTab('approval')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'approval'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Legal Approval & Signature</span>
            {session.approval && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Signed
              </span>
            )}
          </button>

          <button
            id="subtab-attachments"
            onClick={() => setActiveSubTab('attachments')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'attachments'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            title="Photographs of nameplate, spirit level, and calibration certs"
          >
            <Camera className="w-4 h-4 text-slate-500" />
            <span>Photographs & Evidence</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {session.attachments?.length || 0}
            </span>
          </button>
        </div>

        {/* Primary Action Button based on current stage */}
        <div className="pb-2">
          {activeSubTab === 'observations' && canEdit && (
            <div className="flex items-center space-x-2">
              <button
                onClick={onOpenOcr}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 transition-colors"
              >
                <Scan className="w-3.5 h-3.5 text-emerald-600" />
                <span>OCR Intake</span>
              </button>
              <button
                onClick={() => setIsAddingObservation(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add Observation</span>
              </button>
              {session.observations.length > 0 && (
                <>
                  <button
                    onClick={handleExportObservationsCsv}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                    title="Download CSV spreadsheet of observations to your system"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={handleRunCalculation}
                    disabled={isProcessing}
                    className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>Execute OIML Calculation →</span>
                  </button>
                </>
              )}
            </div>
          )}

          {activeSubTab === 'calculations' && (
            <div className="flex items-center space-x-2">
              {canEdit && (
                <button
                  onClick={handleRunCalculation}
                  disabled={isProcessing}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 transition-colors"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Recalculate</span>
                </button>
              )}

              {canEdit && session.calculation && session.status !== 'pending_approval' && !isApproved && (
                <button
                  onClick={handleSubmitApproval}
                  disabled={isProcessing}
                  className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Submit for Legal Approval</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: OBSERVATIONS INTAKE */}
      {activeSubTab === 'observations' && (
        <div className="space-y-4">
          {session.observations.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4">
              <Scale className="w-10 h-10 text-slate-400 mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">No test observations recorded yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Enter readings manually or use the OCR assistant to scan values directly from an uploaded test sheet.
                </p>
              </div>
              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={onOpenOcr}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs"
                >
                  <Scan className="w-4 h-4 text-emerald-400" />
                  <span>Scan / OCR Test Sheet</span>
                </button>
                <button
                  onClick={() => setIsAddingObservation(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Enter Manually</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Test Type</th>
                      <th className="px-4 py-3">Load Applied (L)</th>
                      <th className="px-4 py-3">Observed Reading (I)</th>
                      <th className="px-4 py-3" title="Turning point weight ΔL (OIML R-76 clause A.4.4.3) or eccentricity/repeatability delta deviation">Turning Pt / Δ Dev</th>
                      <th className="px-4 py-3">Source & Confidence</th>
                      <th className="px-4 py-3">Status</th>
                      {canEdit && <th className="px-4 py-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {session.observations.map((obs, idx) => (
                      <tr key={obs.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800 capitalize">
                          {obs.testType.replace('_', ' ')}
                          {obs.direction && ` (${obs.direction})`}
                          {obs.position && ` [${obs.position}]`}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {obs.loadValue} {instrument?.unit}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {obs.observedReading} {instrument?.unit}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {(() => {
                            if (obs.deltaL !== undefined && obs.deltaL !== null && !isNaN(obs.deltaL)) {
                              const sign = obs.deltaL > 0 ? '+' : '';
                              return (
                                <span 
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  title={`Turning point weight ΔL = ${obs.deltaL} ${instrument?.unit} (clause A.4.4.3)`}
                                >
                                  ΔL: {sign}{obs.deltaL} {instrument?.unit}
                                </span>
                              );
                            }

                            if (obs.testType === 'eccentricity') {
                              const centerObs = session.observations.find(
                                o => o.testType === 'eccentricity' && (o.position === 'center' || !o.position)
                              );
                              if (obs.position === 'center' || !obs.position) {
                                return (
                                  <span className="text-[11px] text-slate-500 italic font-mono">
                                    0.00 (Center ref)
                                  </span>
                                );
                              } else if (centerObs) {
                                const delta = Number((obs.observedReading - centerObs.observedReading).toFixed(4));
                                const sign = delta >= 0 ? '+' : '';
                                return (
                                  <span 
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200"
                                    title={`Eccentricity Corner Deviation from Center Reading (Δ = ${sign}${delta} ${instrument?.unit})`}
                                  >
                                    Δ: {sign}{delta} {instrument?.unit}
                                  </span>
                                );
                              }
                            }

                            if (obs.testType === 'repeatability') {
                              const firstRun = session.observations.find(
                                o => o.testType === 'repeatability' && o.loadValue === obs.loadValue
                              );
                              if (firstRun && firstRun.id === obs.id) {
                                return (
                                  <span className="text-[11px] text-slate-500 italic font-mono">
                                    Run 1 (ref)
                                  </span>
                                );
                              } else if (firstRun) {
                                const delta = Number((obs.observedReading - firstRun.observedReading).toFixed(4));
                                const sign = delta >= 0 ? '+' : '';
                                return (
                                  <span 
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold font-mono bg-purple-50 text-purple-700 border border-purple-200"
                                    title={`Repeatability Deviation from Run 1 (Δ = ${sign}${delta} ${instrument?.unit})`}
                                  >
                                    Δ: {sign}{delta} {instrument?.unit}
                                  </span>
                                );
                              }
                            }

                            return (
                              <span className="text-slate-400 text-[11px] italic">
                                N/A (direct)
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-1.5">
                            <span className="capitalize font-semibold text-slate-700">
                              {obs.source}
                            </span>
                            {obs.rawOcrConfidence !== undefined && obs.rawOcrConfidence !== null && (
                              (() => {
                                const pct = Math.round(obs.rawOcrConfidence * 100);
                                if (pct >= 95) {
                                  return (
                                    <span 
                                      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap"
                                      title={`OCR Confidence: ${pct}% (High: ≥95%)`}
                                    >
                                      {pct}% OCR
                                    </span>
                                  );
                                } else if (pct >= 85) {
                                  return (
                                    <span 
                                      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap"
                                      title={`OCR Confidence: ${pct}% (Moderate: 85–94%)`}
                                    >
                                      {pct}% OCR
                                    </span>
                                  );
                                } else {
                                  return (
                                    <span 
                                      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap"
                                      title={`OCR Confidence: ${pct}% (Low: <85% — Human Verification Required)`}
                                    >
                                      {pct}% OCR
                                    </span>
                                  );
                                }
                              })()
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {obs.confirmedByTechnician ? (
                            <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Confirmed</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                              <span>Requires review</span>
                            </span>
                          )}
                        </td>
                        {canEdit && (
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDeleteObservation(obs.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Delete observation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Add Observation Modal */}
          {isAddingObservation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    Add Observation Point
                  </h3>
                  <button onClick={() => setIsAddingObservation(false)} className="text-slate-400 font-bold">✕</button>
                </div>

                <form onSubmit={handleAddObservation} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Test Procedure Type
                    </label>
                    <select
                      value={newObs.testType}
                      onChange={e => setNewObs({ ...newObs, testType: e.target.value as TestType })}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                    >
                      <option value="weighing_performance">Weighing Performance (Linearity)</option>
                      <option value="repeatability">Repeatability Test (3 runs)</option>
                      <option value="eccentricity">Eccentricity (Corner Load)</option>
                      <option value="tare_zero">Tare / Zero Setting</option>
                    </select>
                  </div>

                  {newObs.testType === 'weighing_performance' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Direction
                      </label>
                      <div className="flex items-center space-x-4 text-xs font-medium">
                        <label className="flex items-center space-x-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="dir"
                            checked={newObs.direction === 'increasing'}
                            onChange={() => setNewObs({ ...newObs, direction: 'increasing' })}
                          />
                          <span>Increasing Load</span>
                        </label>
                        <label className="flex items-center space-x-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="dir"
                            checked={newObs.direction === 'decreasing'}
                            onChange={() => setNewObs({ ...newObs, direction: 'decreasing' })}
                          />
                          <span>Decreasing Load</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {newObs.testType === 'eccentricity' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Plate Position
                      </label>
                      <select
                        value={newObs.position}
                        onChange={e => setNewObs({ ...newObs, position: e.target.value as any })}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                      >
                        <option value="center">Center</option>
                        <option value="front-left">Front-Left Corner</option>
                        <option value="front-right">Front-Right Corner</option>
                        <option value="rear-left">Rear-Left Corner</option>
                        <option value="rear-right">Rear-Right Corner</option>
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Load Applied L ({instrument?.unit}) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={newObs.loadValue}
                        onChange={e => setNewObs({ ...newObs, loadValue: Number(e.target.value) })}
                        className="w-full text-xs p-2 font-mono border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Observed Reading I ({instrument?.unit}) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={newObs.observedReading}
                        onChange={e => setNewObs({ ...newObs, observedReading: Number(e.target.value) })}
                        className="w-full text-xs p-2 font-mono border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Turning Point Weight ΔL (optional, for rounding error elimination)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Optional, e.g. 0.003"
                      value={newObs.deltaL ?? ''}
                      onChange={e => setNewObs({ ...newObs, deltaL: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full text-xs p-2 font-mono border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingObservation(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs"
                    >
                      Save Observation
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DETERMINISTIC RULE ENGINE CALCULATIONS */}
      {activeSubTab === 'calculations' && (
        <div className="space-y-6">
          {!session.calculation ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4">
              <Scale className="w-10 h-10 text-slate-400 mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Calculations have not been executed yet
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Run the deterministic OIML R-76 rule engine against the {session.observations.length} observations 
                  using the active {activeRule.versionLabel}.
                </p>
              </div>
              <button
                onClick={handleRunCalculation}
                disabled={session.observations.length === 0 || isProcessing}
                className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 inline-flex items-center space-x-2"
              >
                <Scale className="w-4 h-4 text-emerald-400" />
                <span>Execute Deterministic OIML Calculation</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overall Decision Banner */}
              <div
                className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  session.calculation.overallResult === 'PASS'
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : session.calculation.overallResult === 'FAIL'
                    ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                    : 'bg-amber-50/70 border-amber-200 text-amber-900'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      OIML Compliance Decision:
                    </span>
                    <span
                      className={`text-sm font-black px-2.5 py-0.5 rounded-md ${
                        session.calculation.overallResult === 'PASS'
                          ? 'bg-emerald-600 text-white'
                          : session.calculation.overallResult === 'FAIL'
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {session.calculation.overallResult}
                    </span>
                  </div>
                  <p className="text-xs max-w-3xl leading-relaxed">
                    {session.calculation.summaryText}
                  </p>
                </div>

                <div className="text-right sm:border-l sm:border-emerald-200/60 sm:pl-4">
                  <div className="text-[11px] font-semibold text-slate-500">Max Error / Max MPE</div>
                  <div className="text-base font-bold font-mono text-slate-900">
                    {session.calculation.maxObservedError.toFixed(4)} / {session.calculation.maxPermissibleErrorObserved.toFixed(4)} {instrument?.unit}
                  </div>
                </div>
              </div>

              {/* Detailed Calculation Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Table 6 Error & MPE Evaluation Matrix
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Rule Version: <span className="font-mono text-blue-700">{session.calculation.ruleVersionId}</span>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                      <tr>
                        <th className="px-3 py-2.5">#</th>
                        <th className="px-3 py-2.5">Load L ({instrument?.unit})</th>
                        <th className="px-3 py-2.5">m / e (Divisions)</th>
                        <th className="px-3 py-2.5">Indication I ({instrument?.unit})</th>
                        <th className="px-3 py-2.5">Error E ({instrument?.unit})</th>
                        <th className="px-3 py-2.5">MPE Limit (±e)</th>
                        <th className="px-3 py-2.5">MPE (±{instrument?.unit})</th>
                        <th className="px-3 py-2.5 text-center">Compliance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {session.calculation.detailedResults.map((calc, idx) => (
                        <tr
                          key={calc.observationId}
                          className={calc.isWithinMpe ? 'hover:bg-slate-50/60' : 'bg-rose-50/50'}
                        >
                          <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                          <td className="px-3 py-2 font-bold text-slate-900">
                            {calc.loadValue}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {calc.loadInMultiplesOfE.toLocaleString()} e
                          </td>
                          <td className="px-3 py-2 text-slate-900">
                            {calc.observedReading}
                          </td>
                          <td className={`px-3 py-2 font-bold ${calc.isWithinMpe ? 'text-slate-900' : 'text-rose-600'}`}>
                            {calc.errorValue > 0 ? `+${calc.errorValue}` : calc.errorValue}
                          </td>
                          <td className="px-3 py-2 text-slate-700 font-semibold">
                            ±{calc.mpeValue} e
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            ±{calc.mpeInUnits}
                          </td>
                          <td className="px-3 py-2 text-center font-sans font-bold">
                            {calc.isWithinMpe ? (
                              <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>PASS</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                                <XCircle className="w-3 h-3" />
                                <span>FAIL</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Special Metrological Checks (Repeatability, Eccentricity, Hysteresis) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Repeatability (Clause A.4.4.1)
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {session.calculation.repeatabilityError !== undefined
                      ? `ΔI = ${session.calculation.repeatabilityError} ${instrument?.unit}`
                      : 'Verified from data'}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-semibold">
                    ✓ Within tolerance limit
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Eccentricity (Clause A.4.7)
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {session.calculation.eccentricityMaxError !== undefined
                      ? `Max Corner Err: ${session.calculation.eccentricityMaxError} ${instrument?.unit}`
                      : 'Corner loads tested'}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-semibold">
                    ✓ 4 Quadrants ≤ MPE
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Hysteresis Error
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {session.calculation.hysteresisMaxError !== undefined
                      ? `Max Hysteresis: ${session.calculation.hysteresisMaxError} ${instrument?.unit}`
                      : 'Inc/Dec comparison'}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-semibold">
                    ✓ Compliant with limits
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: APPROVAL & DIGITAL SIGNATURE */}
      {activeSubTab === 'approval' && (
        <div className="space-y-6">
          {session.approval ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
              <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Digitally Signed & Legally Approved
                    </h3>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      AUTHENTIC
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Approved by {session.approval.approvingOfficerName} ({session.approval.approvingOfficerLicense})
                  </p>
                </div>
              </div>

              {/* Cryptographic Proof Details */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cryptographic Digital Signature Payload (SHA-256)</span>
                </div>
                <div className="font-mono text-[11px] p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 break-all select-all">
                  {session.approval.signatureHash}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-slate-500 text-[11px] pt-1">
                  <span>Timestamp: {new Date(session.approval.approvedAt).toUTCString()}</span>
                  {session.report?.reportNumber && (
                    <span className="font-mono font-bold text-blue-700">
                      Report Ref: {session.report.reportNumber}
                    </span>
                  )}
                </div>
              </div>

              {session.approval.comments && (
                <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-900">Reviewer Notes:</span> {session.approval.comments}
                </div>
              )}

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={onViewReport}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center space-x-2"
                >
                  <Award className="w-4 h-4" />
                  <span>Open Official Certificate & QR Verification</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
              <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Awaiting Approving Officer Sign-off
                  </h3>
                  <p className="text-xs text-slate-500">
                    Under OIML R-76, type-evaluation reports require authorized review and digital signature.
                  </p>
                </div>
              </div>

              {canApprove ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Reviewer Assessment / Endorsement Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Type-evaluation compliance verified. Linearity and repeatability satisfy Table 6 requirements."
                      value={approvalComments}
                      onChange={e => setApprovalComments(e.target.value)}
                      className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-400"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                    <button
                      onClick={handleReject}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-colors"
                    >
                      Reject Submission
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={isProcessing}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center space-x-2"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Approve & Apply Digital Signature</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
                  <p>
                    <strong>Approving Officer Required:</strong> Your current role is <em>{currentUser.role}</em>. 
                    Switch to <strong>Approving Officer (Dr. Selvi Rajendran)</strong> in the top-right role switcher to test the digital approval workflow.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PHOTOGRAPHS & SUPPORTING EVIDENCE REPOSITORY */}
      {activeSubTab === 'attachments' && (
        <SessionAttachments
          sessionId={session.id}
          attachments={session.attachments || []}
          currentUser={currentUser}
          onAddAttachment={async (attachmentData) => {
            if (onAddAttachment) {
              await onAddAttachment(attachmentData);
            }
          }}
          onDeleteAttachment={async (attId) => {
            if (onDeleteAttachment) {
              await onDeleteAttachment(attId);
            }
          }}
        />
      )}
    </div>
  );
};
