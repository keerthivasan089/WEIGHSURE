import React, { useState } from 'react';
import { Instrument, AccuracyClass, InstrumentType, User } from '../types';
import { Scale, Plus, Search, Filter, CheckCircle2, AlertCircle, Info, Building2, MapPin, Calendar, Clock, AlertTriangle } from 'lucide-react';

interface InstrumentListProps {
  instruments: Instrument[];
  currentUser: User;
  onRegisterInstrument: (instrumentData: Partial<Instrument>) => Promise<void>;
  onStartSessionWithInstrument: (instrument: Instrument) => void;
}

const INSTRUMENT_TYPE_PROFILES: Record<InstrumentType, {
  defaultMax: number;
  defaultMin: number;
  defaultUnit: string;
  defaultD: number;
  defaultE: number;
  defaultClass: AccuracyClass;
  placeholderRange: string;
  badgeClass: string;
}> = {
  'Laboratory Balance': {
    defaultMax: 220,
    defaultMin: 0.01,
    defaultUnit: 'g',
    defaultD: 0.0001,
    defaultE: 0.001,
    defaultClass: 'Class I',
    placeholderRange: 'Typical: 1 – 500 g (Micro/Analytical/Precision)',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  'Bench Scale': {
    defaultMax: 5000,
    defaultMin: 5,
    defaultUnit: 'g',
    defaultD: 0.01,
    defaultE: 0.1,
    defaultClass: 'Class II',
    placeholderRange: 'Typical: 1,000 – 30,000 g (Compact / Industrial Bench)',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  'Electronic Counter Scale': {
    defaultMax: 30,
    defaultMin: 0.1,
    defaultUnit: 'kg',
    defaultD: 0.002,
    defaultE: 0.005,
    defaultClass: 'Class III',
    placeholderRange: 'Typical: 15 – 30 kg (Commercial Tabletop Counter)',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  'Retail/POS Scale': {
    defaultMax: 15,
    defaultMin: 0.04,
    defaultUnit: 'kg',
    defaultD: 0.001,
    defaultE: 0.002,
    defaultClass: 'Class III',
    placeholderRange: 'Typical: 6 – 30 kg (Price Computing / Checkout)',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200'
  },
  'Platform Scale': {
    defaultMax: 300,
    defaultMin: 1,
    defaultUnit: 'kg',
    defaultD: 0.02,
    defaultE: 0.05,
    defaultClass: 'Class III',
    placeholderRange: 'Typical: 60 – 3,000 kg (Floor / Warehouse Platform)',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200'
  },
  'Crane Scale': {
    defaultMax: 5000,
    defaultMin: 40,
    defaultUnit: 'kg',
    defaultD: 1,
    defaultE: 2,
    defaultClass: 'Class III',
    placeholderRange: 'Typical: 1,000 – 50,000 kg (Suspended Hook / Crane)',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  'Weighbridge': {
    defaultMax: 60000,
    defaultMin: 400,
    defaultUnit: 'kg',
    defaultD: 10,
    defaultE: 20,
    defaultClass: 'Class III',
    placeholderRange: 'Typical: 20,000 – 100,000 kg (Road / Rail Vehicle)',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300'
  }
};

export const InstrumentList: React.FC<InstrumentListProps> = ({
  instruments,
  currentUser,
  onRegisterInstrument,
  onStartSessionWithInstrument
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for new instrument
  const [formData, setFormData] = useState({
    manufacturer: '',
    model: '',
    serialNo: '',
    instrumentType: 'Bench Scale' as InstrumentType,
    accuracyClass: 'Class II' as AccuracyClass,
    maxCapacity: 5000,
    minCapacity: 5,
    scaleInterval_d: 0.01,
    verificationInterval_e: 0.1,
    unit: 'g',
    location: 'Primary Testing Bay',
    customerName: 'Astra Biotech Formulation Labs',
    nextVerificationDue: ''
  });

  const canRegister = currentUser.role === 'technician' || currentUser.role === 'admin';

  // Compute scale divisions n = Max / e
  const computedN = formData.verificationInterval_e > 0
    ? Math.round(formData.maxCapacity / formData.verificationInterval_e)
    : 0;

  const handleTypeChange = (newType: InstrumentType) => {
    const profile = INSTRUMENT_TYPE_PROFILES[newType];
    setFormData(prev => ({
      ...prev,
      instrumentType: newType,
      accuracyClass: profile.defaultClass,
      maxCapacity: profile.defaultMax,
      minCapacity: profile.defaultMin,
      unit: profile.defaultUnit,
      scaleInterval_d: profile.defaultD,
      verificationInterval_e: profile.defaultE
    }));
  };

  // Filtered instruments
  const filtered = instruments.filter(inst => {
    const matchesSearch =
      inst.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.serialNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inst.instrumentType && inst.instrumentType.toLowerCase().includes(searchTerm.toLowerCase())) ||
      inst.customerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass = selectedClass === 'all' || inst.accuracyClass === selectedClass;
    const matchesType = selectedType === 'all' || inst.instrumentType === selectedType;
    return matchesSearch && matchesClass && matchesType;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onRegisterInstrument({
        ...formData,
        maxCapacity: Number(formData.maxCapacity),
        minCapacity: Number(formData.minCapacity),
        scaleInterval_d: Number(formData.scaleInterval_d),
        verificationInterval_e: Number(formData.verificationInterval_e),
        nextVerificationDue: formData.nextVerificationDue || undefined
      });
      setIsRegisterModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getClassBadge = (cls: AccuracyClass) => {
    switch (cls) {
      case 'Class I':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Class II':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Class III':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Class IIII':
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const getTypeBadge = (type?: InstrumentType | string) => {
    if (!type) return 'bg-slate-50 text-slate-700 border-slate-200';
    const profile = INSTRUMENT_TYPE_PROFILES[type as InstrumentType];
    return profile ? profile.badgeClass : 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getDueStatus = (dueStr?: string) => {
    if (!dueStr) return null;
    const dueDate = new Date(dueStr);
    const now = new Date();
    // Normalize to midnight UTC
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: 'overdue',
        label: `Overdue by ${Math.abs(diffDays)}d`,
        dateStr: dueStr,
        badge: 'bg-rose-50 text-rose-700 border-rose-300 font-bold',
        icon: '🚨'
      };
    } else if (diffDays <= 30) {
      return {
        status: 'due_soon',
        label: `Due in ${diffDays}d`,
        dateStr: dueStr,
        badge: 'bg-amber-50 text-amber-800 border-amber-300 font-bold animate-pulse',
        icon: '⚠️'
      };
    } else {
      return {
        status: 'valid',
        label: `Due in ${diffDays}d`,
        dateStr: dueStr,
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
        icon: '✓'
      };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Instrument Registry (NAWIs)
          </h1>
          <p className="text-sm text-slate-500">
            Verified Non-Automatic Weighing Instruments under OIML R-76 metrological rules.
          </p>
        </div>

        {canRegister && (
          <button
            id="btn-register-instrument"
            onClick={() => setIsRegisterModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Register Instrument</span>
          </button>
        )}
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by model, serial, type, client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          
          {/* Instrument Type Filter */}
          <select
            id="filter-instrument-type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-slate-400 font-medium"
          >
            <option value="all">All NAWI Types ({instruments.length})</option>
            <option value="Electronic Counter Scale">Electronic Counter Scale</option>
            <option value="Platform Scale">Platform Scale</option>
            <option value="Bench Scale">Bench Scale</option>
            <option value="Weighbridge">Weighbridge</option>
            <option value="Crane Scale">Crane Scale</option>
            <option value="Retail/POS Scale">Retail/POS Scale</option>
            <option value="Laboratory Balance">Laboratory Balance</option>
          </select>

          {/* Accuracy Class Filter */}
          <select
            id="filter-accuracy-class"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-slate-400 font-medium"
          >
            <option value="all">All Accuracy Classes</option>
            <option value="Class I">Class I (Special)</option>
            <option value="Class II">Class II (High)</option>
            <option value="Class III">Class III (Medium)</option>
            <option value="Class IIII">Class IIII (Ordinary)</option>
          </select>
        </div>
      </div>

      {/* Instruments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Instrument & Model</th>
                <th className="px-4 py-3">Serial No</th>
                <th className="px-4 py-3">NAWI Type</th>
                <th className="px-4 py-3">OIML Class</th>
                <th className="px-4 py-3">Capacity (Max / Min)</th>
                <th className="px-4 py-3">Intervals (e / d)</th>
                <th className="px-4 py-3">Divisions (n)</th>
                <th className="px-4 py-3">Re-verification Due</th>
                <th className="px-4 py-3">Client & Bay</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((inst) => {
                const n = inst.verificationInterval_e > 0
                  ? Math.round(inst.maxCapacity / inst.verificationInterval_e)
                  : 0;
                const due = getDueStatus(inst.nextVerificationDue);

                return (
                  <tr key={inst.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{inst.model}</div>
                      <div className="text-[11px] text-slate-500">{inst.manufacturer}</div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-700 font-medium">
                      {inst.serialNo}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded-md font-semibold text-[11px] border ${getTypeBadge(inst.instrumentType)}`}>
                        {inst.instrumentType || 'Bench Scale'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded-md font-semibold text-[11px] border ${getClassBadge(inst.accuracyClass)}`}>
                        {inst.accuracyClass}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">
                        Max: {inst.maxCapacity} {inst.unit}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Min: {inst.minCapacity} {inst.unit}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono">
                      <div>e = {inst.verificationInterval_e} {inst.unit}</div>
                      <div className="text-[11px] text-slate-500">d = {inst.scaleInterval_d} {inst.unit}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-slate-800">
                        n = {n.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400">Max / e</div>
                    </td>
                    <td className="px-4 py-3.5">
                      {due ? (
                        <div className="space-y-0.5">
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] border ${due.badge}`}>
                            <span>{due.icon}</span>
                            <span>{due.label}</span>
                          </span>
                          <div className="text-[10px] text-slate-400 font-mono">{due.dateStr}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Not scheduled</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-slate-800 font-medium truncate max-w-[130px]">{inst.customerName}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[130px]">{inst.location}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => onStartSessionWithInstrument(inst)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-md border border-emerald-200 transition-colors cursor-pointer"
                      >
                        Start Test
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    No instruments match your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Instrument Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Register New Weighing Instrument (NAWI)
                </h3>
                <p className="text-xs text-slate-500">
                  Metrological parameter intake under OIML R-76-1:2006.
                </p>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Manufacturer *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mettler Toledo, Sartorius, Avery"
                    value={formData.manufacturer}
                    onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Model Designation *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cubis II MCA5202S / ZK830"
                    value={formData.model}
                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400"
                  />
                </div>
              </div>

              {/* Instrument Type & Accuracy Class */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Instrument Type (NAWI Category) *
                  </label>
                  <select
                    id="input-instrument-type"
                    required
                    value={formData.instrumentType}
                    onChange={e => handleTypeChange(e.target.value as InstrumentType)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 font-semibold bg-white"
                  >
                    <option value="Electronic Counter Scale">Electronic Counter Scale</option>
                    <option value="Platform Scale">Platform Scale</option>
                    <option value="Bench Scale">Bench Scale</option>
                    <option value="Weighbridge">Weighbridge</option>
                    <option value="Crane Scale">Crane Scale</option>
                    <option value="Retail/POS Scale">Retail/POS Scale</option>
                    <option value="Laboratory Balance">Laboratory Balance</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Sets capacity presets & standard unit defaults.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Accuracy Class *
                  </label>
                  <select
                    id="input-accuracy-class"
                    value={formData.accuracyClass}
                    onChange={e => setFormData({ ...formData, accuracyClass: e.target.value as AccuracyClass })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 font-semibold bg-white"
                  >
                    <option value="Class I">Class I (Special)</option>
                    <option value="Class II">Class II (High)</option>
                    <option value="Class III">Class III (Medium)</option>
                    <option value="Class IIII">Class IIII (Ordinary)</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    OIML R-76 Table 3 hierarchy.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Serial Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SART-CB-449102"
                    value={formData.serialNo}
                    onChange={e => setFormData({ ...formData, serialNo: e.target.value })}
                    className="w-full text-xs p-2.5 font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Next Re-verification Due (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.nextVerificationDue}
                    onChange={e => setFormData({ ...formData, nextVerificationDue: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Max Capacity *
                    </label>
                  </div>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.maxCapacity}
                    onChange={e => setFormData({ ...formData, maxCapacity: Number(e.target.value) })}
                    placeholder={INSTRUMENT_TYPE_PROFILES[formData.instrumentType]?.placeholderRange}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Min Capacity
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.minCapacity}
                    onChange={e => setFormData({ ...formData, minCapacity: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="g">Grams (g)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="mg">Milligrams (mg)</option>
                    <option value="t">Tonnes (t)</option>
                  </select>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                Range guidance for {formData.instrumentType}: <span className="font-medium text-slate-700">{INSTRUMENT_TYPE_PROFILES[formData.instrumentType]?.placeholderRange}</span>. Manual override permitted.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Verification Interval e *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.verificationInterval_e}
                    onChange={e => setFormData({ ...formData, verificationInterval_e: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Value of verification scale division e</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Scale Interval d *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.scaleInterval_d}
                    onChange={e => setFormData({ ...formData, scaleInterval_d: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Actual scale division d displayed</p>
                </div>
              </div>

              {/* OIML Compliance Check Preview */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-700">Calculated Divisions (n):</span>{' '}
                  <span className="font-mono font-bold text-slate-900">{computedN.toLocaleString()}</span>
                </div>
                <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                  Valid for {formData.accuracyClass} ({formData.instrumentType})
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Client / Organization
                  </label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Physical Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Registering...' : 'Save to Registry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

