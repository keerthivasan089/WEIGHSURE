import React, { useState } from 'react';
import { OimlRuleConfiguration, User, AccuracyClass, OimlMpeBand } from '../types';
import { 
  Layers, 
  ShieldCheck, 
  CheckCircle2, 
  History, 
  AlertCircle, 
  Lock, 
  KeyRound, 
  Calendar, 
  FileText, 
  Check, 
  Scale, 
  Info,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

interface RuleManagerProps {
  ruleVersions: OimlRuleConfiguration[];
  currentUser: User;
  onActivateRule?: (ruleId: string) => Promise<void>;
}

export const RuleManager: React.FC<RuleManagerProps> = ({ 
  ruleVersions, 
  currentUser,
  onActivateRule 
}) => {
  const [selectedRuleId, setSelectedRuleId] = useState<string>(
    ruleVersions.find(r => r.isDefault)?.id || ruleVersions[0]?.id || ''
  );
  const [isActivating, setIsActivating] = useState(false);

  const activeRule = ruleVersions.find(r => r.id === selectedRuleId) || ruleVersions[0];
  const isAdmin = currentUser.role === 'admin';

  const handleActivate = async (ruleId: string) => {
    if (!isAdmin || !onActivateRule) return;
    setIsActivating(true);
    try {
      await onActivateRule(ruleId);
    } finally {
      setIsActivating(false);
    }
  };

  // Safe band range formatter handling JSON serialization of Infinity (null)
  const formatBandRange = (band: OimlMpeBand): string => {
    const isMaxInfinite = band.maxM === null || band.maxM === undefined || band.maxM === Infinity;
    const minText = band.minM !== undefined && band.minM !== null ? `${Number(band.minM).toLocaleString()} e` : '0 e';
    const maxText = isMaxInfinite ? 'Max' : `${Number(band.maxM).toLocaleString()} e`;
    return `${minText} < m ≤ ${maxText}`;
  };

  const getAccuracyClassTitle = (cls: AccuracyClass): string => {
    switch (cls) {
      case 'Class I':
        return 'Special Accuracy (Analytical / Fine balances)';
      case 'Class II':
        return 'High Accuracy (Precision laboratory balances)';
      case 'Class III':
        return 'Medium Accuracy (Commercial bench & floor scales)';
      case 'Class IIII':
        return 'Ordinary Accuracy (Industrial crane & hopper scales)';
      default:
        return cls;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              OIML R-76 Rule Engine Configuration
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Deterministic Metrology
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Table 6 Maximum Permissible Errors (MPE), test load ranges, repeatability tolerances, and eccentricity parameters.
          </p>
        </div>

        {/* Role Governance Status Badge */}
        <div className="flex items-center space-x-2">
          {isAdmin ? (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-2xs">
              <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
              <span>Admin Privileges: Full Edit & Activation Access</span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Read-Only Mode: {currentUser.role.replace('_', ' ').toUpperCase()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Role Access Notice Banner */}
      <div className={`p-4 rounded-xl border ${isAdmin ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-slate-100/90 border-slate-200 text-slate-800'}`}>
        <div className="flex items-start space-x-3">
          <Info className={`w-5 h-5 shrink-0 mt-0.5 ${isAdmin ? 'text-amber-600' : 'text-slate-500'}`} />
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider">
              {isAdmin ? 'Administrator Governance Control' : 'Metrological Compliance Notice — ISO/IEC 17025'}
            </div>
            <p className="text-xs leading-relaxed">
              {isAdmin ? (
                <>
                  You are logged in as <span className="font-semibold">{currentUser.name} (Admin)</span>. You have authorization to switch active rule configurations, commission revised MPE thresholds, and activate legal standard baselines.
                </>
              ) : (
                <>
                  Under ISO/IEC 17025 quality management and legal metrology standards, <span className="font-semibold">only System Administrators</span> can modify or activate OIML R-76 rule sets. All other roles (<span className="capitalize">{currentUser.role.replace('_', ' ')}</span>) have view-only access to verify calculation transparency and audit traceability.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Rule Versions List + Selected Rule MPE Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: List of OIML Rule Versions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-slate-600" />
              <span>OIML Rule Versions ({ruleVersions.length})</span>
            </h2>
            <span className="text-[11px] text-slate-500">Select to inspect</span>
          </div>

          <div className="space-y-3">
            {ruleVersions.map(rule => {
              const isSelected = activeRule?.id === rule.id;
              const isDefaultActive = Boolean(rule.isDefault);
              const effectiveDate = new Date(rule.effectiveFrom).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });

              return (
                <div
                  key={rule.id}
                  onClick={() => setSelectedRuleId(rule.id)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white border-slate-900 shadow-xs ring-1 ring-slate-900'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {rule.versionLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">
                        {rule.standardTitle}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isDefaultActive ? (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          <span>Archived</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Effective: {effectiveDate}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">
                      ID: {rule.id.substring(0, 14)}...
                    </span>
                  </div>

                  {/* Admin Activate Button inside card if not currently default */}
                  {isAdmin && !isDefaultActive && isSelected && onActivateRule && (
                    <div className="mt-3 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivate(rule.id);
                        }}
                        disabled={isActivating}
                        className="w-full py-1.5 px-3 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-2xs flex items-center justify-center space-x-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Activate as Primary Standard</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Role Permission Matrix Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
              <span>Role Permissions Matrix</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="font-medium text-slate-700">System Administrator</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Edit & Activate
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="font-medium text-slate-700">Testing Technician</span>
                <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  Read-Only (Auto-applied)
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="font-medium text-slate-700">Approving Officer</span>
                <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  Read-Only (Verification)
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="font-medium text-slate-700">Quality Auditor</span>
                <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  Read-Only (Traceability)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed MPE Table for Selected Version */}
        <div className="lg:col-span-2 space-y-6">
          {activeRule ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6">
              {/* Active Rule Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-slate-900">
                      {activeRule.standardTitle || activeRule.versionLabel}
                    </h2>
                    {activeRule.isDefault ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active Standard
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                        Archived Standard
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Rule ID: <span className="font-mono text-slate-700">{activeRule.id}</span> • Effective Date:{' '}
                    {new Date(activeRule.effectiveFrom).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                {/* Top Action for Admin */}
                {isAdmin && !activeRule.isDefault && onActivateRule && (
                  <button
                    onClick={() => handleActivate(activeRule.id)}
                    disabled={isActivating}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Set as Active Standard</span>
                  </button>
                )}
              </div>

              {/* Description */}
              <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100 leading-relaxed">
                {activeRule.description || 'Standard Maximum Permissible Errors under OIML R-76.'}
              </div>

              {/* MPE Table Breakdown by Accuracy Class */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <Scale className="w-4 h-4 text-slate-700" />
                    <span>Table 6: Maximum Permissible Error (MPE) Breakdown</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Values expressed in verification scale intervals (e)
                  </span>
                </div>

                <div className="space-y-4">
                  {(Object.entries(activeRule.rules?.classes || {}) as [AccuracyClass, { minScaleDivisions_n: number; maxScaleDivisions_n: number; mpeBands: OimlMpeBand[] }][]).map(([cls, classConfig]) => (
                    <div key={cls} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      {/* Class Header */}
                      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <span className="font-bold text-xs text-slate-900">{cls}</span>
                          <span className="text-slate-500 text-[11px] ml-2">
                            — {getAccuracyClassTitle(cls)}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                          Scale Divisions: {Number(classConfig.minScaleDivisions_n || 0).toLocaleString()} ≤ n ≤ {Number(classConfig.maxScaleDivisions_n || 0).toLocaleString()}
                        </div>
                      </div>

                      {/* Class MPE Table */}
                      <table className="w-full text-left text-xs">
                        <thead className="bg-white border-b border-slate-200 text-slate-500 text-[11px] uppercase">
                          <tr>
                            <th className="px-4 py-2 font-semibold">Load Range (m in e)</th>
                            <th className="px-4 py-2 font-semibold text-emerald-800">Initial Verification MPE</th>
                            <th className="px-4 py-2 font-semibold text-blue-800">In-Service Inspection MPE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {classConfig.mpeBands?.map((band: OimlMpeBand, bIdx: number) => (
                            <tr key={bIdx} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2.5 font-mono font-medium text-slate-800">
                                {formatBandRange(band)}
                              </td>
                              <td className="px-4 py-2.5 font-mono font-bold text-emerald-700">
                                ±{band.mpeInitial} e
                              </td>
                              <td className="px-4 py-2.5 font-mono font-semibold text-blue-700">
                                ±{band.mpeService} e
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>

              {/* Complementary Metrological Clauses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                  <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                    <History className="w-3.5 h-3.5 text-slate-600" />
                    <span>Repeatability Requirement (Clause A.4.4.1)</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    The difference between the results of several weighings ({activeRule.rules?.repeatabilityRuns || 3} sequential runs) of the same load applied under identical conditions shall not be greater than the absolute value of the MPE of the instrument for that load.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                  <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
                    <span>Eccentricity Tolerance (Clause A.4.7)</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Errors at any position on the load receptor shall not exceed the maximum permissible error for the applied test load ({Math.round((activeRule.rules?.eccentricityFractionOfMax || 0.333) * 100)}% Max capacity applied sequentially to corner quadrants).
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
              No rule configuration loaded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
