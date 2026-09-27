import React, { useState } from 'react';
import { Instrument, OimlRuleConfiguration } from '../types';
import { Scale, Thermometer, Droplets, Gauge, Plus } from 'lucide-react';

interface NewSessionModalProps {
  instruments: Instrument[];
  ruleVersions: OimlRuleConfiguration[];
  preselectedInstrumentId?: string;
  onClose: () => void;
  onCreateSession: (sessionData: {
    instrumentId: string;
    ruleVersionId: string;
    environmentalConditions: {
      temperatureC: number;
      humidityPercent: number;
      pressureHpa: number;
      locationNotes?: string;
    };
  }) => Promise<void>;
}

export const NewSessionModal: React.FC<NewSessionModalProps> = ({
  instruments,
  ruleVersions,
  preselectedInstrumentId,
  onClose,
  onCreateSession
}) => {
  const [instrumentId, setInstrumentId] = useState(preselectedInstrumentId || instruments[0]?.id || '');
  const [ruleVersionId, setRuleVersionId] = useState(ruleVersions[0]?.id || '');
  const [temperatureC, setTemperatureC] = useState(20.4);
  const [humidityPercent, setHumidityPercent] = useState(48.2);
  const [pressureHpa, setPressureHpa] = useState(1013.25);
  const [locationNotes, setLocationNotes] = useState('Cleanroom Metrology Cell B-4');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onCreateSession({
        instrumentId,
        ruleVersionId,
        environmentalConditions: {
          temperatureC: Number(temperatureC),
          humidityPercent: Number(humidityPercent),
          pressureHpa: Number(pressureHpa),
          locationNotes
        }
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedInst = instruments.find(i => i.id === instrumentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Initialize New Metrological Test Session
            </h3>
            <p className="text-xs text-slate-500">
              Set up instrument baseline & environmental conditions under OIML R-76.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Instrument Under Test *
            </label>
            <select
              required
              value={instrumentId}
              onChange={e => setInstrumentId(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-400 font-medium"
            >
              {instruments.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.model} [{inst.instrumentType || 'Bench Scale'}] ({inst.serialNo}) — {inst.accuracyClass} (Max {inst.maxCapacity} {inst.unit})
                </option>
              ))}
            </select>
            {selectedInst && (
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                Type: {selectedInst.instrumentType || 'Bench Scale'} • Interval e={selectedInst.verificationInterval_e}{selectedInst.unit} • Client: {selectedInst.customerName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              OIML Rule Engine Standard *
            </label>
            <select
              value={ruleVersionId}
              onChange={e => setRuleVersionId(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-400 font-medium"
            >
              {ruleVersions.map(rule => (
                <option key={rule.id} value={rule.id}>
                  {rule.versionLabel} — ({rule.standardName})
                </option>
              ))}
            </select>
          </div>

          {/* Environmental Conditions */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Environmental Baseline Conditions
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1 flex items-center space-x-1">
                  <Thermometer className="w-3 h-3 text-rose-500" />
                  <span>Temp (°C)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={temperatureC}
                  onChange={e => setTemperatureC(Number(e.target.value))}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1 flex items-center space-x-1">
                  <Droplets className="w-3 h-3 text-blue-500" />
                  <span>Humidity (%RH)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={humidityPercent}
                  onChange={e => setHumidityPercent(Number(e.target.value))}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1 flex items-center space-x-1">
                  <Gauge className="w-3 h-3 text-slate-500" />
                  <span>Pressure (hPa)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={pressureHpa}
                  onChange={e => setPressureHpa(Number(e.target.value))}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Testing Cell / Location Notes
            </label>
            <input
              type="text"
              value={locationNotes}
              onChange={e => setLocationNotes(e.target.value)}
              placeholder="e.g. Primary Metrology Lab Bay 4, Granite Anti-Vibration Table"
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-create-session"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Initialize Test Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
