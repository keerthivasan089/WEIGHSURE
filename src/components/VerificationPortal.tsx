import React, { useState, useEffect } from 'react';
import { VerificationLookupResult, TestSession, Instrument } from '../types';
import { verifyCodeLocally } from '../lib/standaloneStore';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Award, 
  Calendar, 
  Scale, 
  ArrowRight,
  ExternalLink,
  Camera,
  QrCode,
  Scan,
  RefreshCw,
  FileCheck2,
  Check,
  Download,
  Printer
} from 'lucide-react';
import { downloadJson } from '../lib/downloadHelper';
import { QrCameraScanner } from './QrCameraScanner';

interface VerificationPortalProps {
  initialCode?: string;
  onClose: () => void;
  sessions?: TestSession[];
  instruments?: Instrument[];
}

export const VerificationPortal: React.FC<VerificationPortalProps> = ({
  initialCode = '',
  onClose,
  sessions = [],
  instruments = []
}) => {
  const [code, setCode] = useState(initialCode);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VerificationLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Default to real-time camera scanner as requested
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [scanNotification, setScanNotification] = useState<string | null>(null);

  const handleVerify = async (codeToVerify: string) => {
    if (!codeToVerify.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(codeToVerify.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        return;
      }
    } catch {
      // Backend unavailable or static host
    }

    // Universal local lookup fallback
    try {
      const fallbackResult = verifyCodeLocally(codeToVerify, sessions, instruments);
      if (fallbackResult && fallbackResult.isValid) {
        setResult(fallbackResult);
      } else {
        setError(`Certificate or record '${codeToVerify}' was not found in registered database.`);
        setResult(null);
      }
    } catch (err: any) {
      setError(err.message || 'Verification search failed');
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCameraScanSuccess = (scannedCode: string) => {
    setCode(scannedCode);
    setScanNotification(`Scanned QR: ${scannedCode}`);
    setTimeout(() => setScanNotification(null), 5000);
    handleVerify(scannedCode);
  };

  const handleResetForNewScan = () => {
    setResult(null);
    setError(null);
    setCode('');
    setActiveTab('camera');
  };

  useEffect(() => {
    if (initialCode) {
      handleVerify(initialCode);
    }
  }, [initialCode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] overflow-y-auto flex flex-col my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-sky-200 flex items-center justify-between bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 text-white rounded-t-2xl shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-xs shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm sm:text-base font-extrabold text-white font-display tracking-tight">
                  Public Authenticity & QR Verification Portal
                </h3>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30 font-mono">
                  OIML R-76
                </span>
              </div>
              <p className="text-xs text-sky-100 font-normal">
                Real-time camera validation for weighing instruments & statutory certificates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors font-bold cursor-pointer shrink-0"
            title="Close Portal"
          >
            ✕
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-5 pt-4 pb-0 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <button
              id="tab-qr-camera"
              onClick={() => setActiveTab('camera')}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center space-x-2 border-t-2 transition-all cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-white text-slate-900 border-sky-500 shadow-xs'
                  : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              <Camera className="w-4 h-4 text-sky-600" />
              <span>Real-Time Camera Scanner</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Live Camera Active" />
            </button>

            <button
              id="tab-qr-manual"
              onClick={() => setActiveTab('manual')}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center space-x-2 border-t-2 transition-all cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-white text-slate-900 border-sky-500 shadow-xs'
                  : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              <Search className="w-4 h-4 text-slate-500" />
              <span>Manual Certificate Lookup</span>
            </button>
          </div>

          <span className="hidden sm:inline text-[11px] text-slate-500 font-medium">
            Standard: OIML R-76-1:2006
          </span>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5 flex-1">
          {/* Notification banner on scan */}
          {scanNotification && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-center space-x-2 shadow-xs animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{scanNotification}</span>
            </div>
          )}

          {/* TAB 1: Real-Time Camera Scanner */}
          {activeTab === 'camera' && !result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                  <Scan className="w-4 h-4 text-sky-600" />
                  <span>Align QR Code in Live Viewfinder</span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Auto-detects Table 6 Seals & Serial Plates
                </span>
              </div>

              {/* Real-time QR Camera Scanner Component */}
              <QrCameraScanner
                onScanSuccess={handleCameraScanSuccess}
                onClose={() => setActiveTab('manual')}
              />

              {/* Quick Sample Links below camera for instant testing */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-700">Quick Test Samples:</span>
                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                  <button
                    onClick={() => {
                      setCode('WS-R76-2026-9102-4018');
                      handleVerify('WS-R76-2026-9102-4018');
                    }}
                    className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded font-bold transition-colors cursor-pointer"
                    title="Approved Verification Certificate QR"
                  >
                    Certificate: WS-R76-2026-9102-4018
                  </button>
                  <button
                    onClick={() => {
                      setCode('SART-CB-449102');
                      handleVerify('SART-CB-449102');
                    }}
                    className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded font-bold transition-colors cursor-pointer"
                    title="Instrument Nameplate Serial QR"
                  >
                    Instrument: SART-CB-449102
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Manual Certificate Lookup */}
          {activeTab === 'manual' && !result && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Enter QR Verification Reference or Instrument Serial
                </label>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. WS-R76-2026-9102-4018 or SART-CB-449102"
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleVerify(code)}
                      className="w-full text-xs font-mono pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-hidden"
                    />
                  </div>
                  <button
                    id="btn-run-verify-lookup"
                    onClick={() => handleVerify(code)}
                    disabled={isLoading || !code}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isLoading ? 'Verifying...' : 'Authenticate'}
                  </button>
                </div>

                {/* Sample Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                  <span>Samples:</span>
                  <button
                    onClick={() => {
                      setCode('WS-R76-2026-9102-4018');
                      handleVerify('WS-R76-2026-9102-4018');
                    }}
                    className="underline hover:text-slate-800 font-mono text-emerald-700 font-bold cursor-pointer"
                  >
                    WS-R76-2026-9102-4018
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => {
                      setCode('SART-CB-449102');
                      handleVerify('SART-CB-449102');
                    }}
                    className="underline hover:text-slate-800 font-mono text-blue-700 font-bold cursor-pointer"
                  >
                    SART-CB-449102
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => {
                      setCode('sess_approved_001');
                      handleVerify('sess_approved_001');
                    }}
                    className="underline hover:text-slate-800 font-mono text-slate-700 cursor-pointer"
                  >
                    sess_approved_001
                  </button>
                </div>
              </div>

              {/* Shortcut to switch to real-time camera */}
              <div 
                onClick={() => setActiveTab('camera')}
                className="p-4 rounded-xl bg-sky-50/60 border border-sky-200 flex items-center justify-between cursor-pointer hover:bg-sky-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-sky-950">Switch to Live Camera Scanner</div>
                    <div className="text-[11px] text-sky-800">Scan QR codes automatically using your device camera</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-sky-600" />
              </div>
            </div>
          )}

          {/* Verification Error Notification */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start space-x-2.5 shadow-xs">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-rose-900">Verification Lookup Failed</div>
                <p className="text-rose-700">{error}</p>
                <button
                  onClick={handleResetForNewScan}
                  className="mt-2 text-[11px] font-bold text-rose-900 underline hover:text-rose-950 flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Scan another QR code</span>
                </button>
              </div>
            </div>
          )}

          {/* Verified Successful Result Presentation */}
          {result && (
            <div className="space-y-4 animate-fadeIn">
              {/* Scan Another / New QR Code Action Bar */}
              <div className="flex items-center justify-between bg-slate-100 p-2.5 px-3 rounded-xl text-xs">
                <div className="flex items-center space-x-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">Lookup matched official government records</span>
                </div>
                <button
                  id="btn-scan-another-qr"
                  onClick={handleResetForNewScan}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Camera className="w-3.5 h-3.5 text-sky-300" />
                  <span>Scan Another Code</span>
                </button>
              </div>

              {/* Status Header Banner */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border-2 flex items-center justify-between ${
                  result.verified
                    ? 'bg-emerald-50/80 border-emerald-400'
                    : 'bg-rose-50/80 border-rose-400'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      result.verified ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}
                  >
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-base font-black text-slate-900 uppercase tracking-tight font-display">
                      {result.verified ? 'Verified Authentic OIML R-76 Certificate' : 'Invalid or Unapproved Certificate'}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Statutory Status: <strong className="font-mono text-emerald-800 font-bold">{result.status}</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Report No</div>
                  <div className="font-mono text-xs font-extrabold px-3 py-1 bg-white rounded-lg border border-slate-300 shadow-2xs">
                    {result.reportNumber}
                  </div>
                </div>
              </div>

              {/* Instrument & Validation Details */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 text-xs shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Instrument</div>
                    <div className="font-bold text-slate-900 text-sm">{result.instrument.manufacturer} {result.instrument.model}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Serial Number</div>
                    <div className="font-mono font-bold text-slate-900 text-sm">{result.instrument.serialNo}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Accuracy Class & Max</div>
                    <div className="font-bold text-blue-700">
                      {result.instrument.accuracyClass} · Max {result.instrument.maxCapacity} {result.instrument.unit}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Statutory Result</div>
                    <div className="font-bold text-emerald-700 flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{result.verification.result} (Compliant with Table 6 MPE)</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Date of Verification</div>
                    <div className="font-medium text-slate-800">
                      {new Date(result.verification.verifiedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Validity Period</div>
                    <div className="font-bold text-emerald-700">
                      Valid Through: {new Date(result.verification.validUntil).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Legal Metrology Approving Officer:</span>
                    <span className="font-bold text-slate-900">{result.verification.approvingOfficer}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Official License Number:</span>
                    <span className="font-mono font-bold text-slate-700">{result.verification.licenseNo}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Governing Standard:</span>
                    <span className="font-mono text-slate-700">{result.verification.standard} ({result.verification.ruleVersion})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] font-medium">Cryptographic HMAC-SHA256 Signature Hash:</span>
                    <div className="mt-1 font-mono text-[10px] bg-slate-50 p-2.5 rounded-lg border border-slate-200 break-all text-slate-700 select-all">
                      {result.verification.signatureHash}
                    </div>
                  </div>
                </div>

                {/* Direct Download & Hardcopy Verification Actions */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => {
                      downloadJson(result, `WeighSure-Verification-Proof-${result.certificateNumber || result.reportNumber || code}.json`);
                    }}
                    className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs inline-flex items-center space-x-1.5 cursor-pointer"
                    title="Download JSON proof to your system"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download Verification Proof</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs inline-flex items-center space-x-1.5 cursor-pointer"
                    title="Print official legal metrology verification proof"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Print Proof</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
