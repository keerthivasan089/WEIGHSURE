import React, { useState } from 'react';
import { Instrument, OcrExtractionResult, OcrExtractedObservation } from '../types';
import { 
  Scan, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Sparkles, 
  Edit3, 
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';

interface OcrIntakeModalProps {
  instruments: Instrument[];
  onClose: () => void;
  onImportExtractedObservations: (
    instrumentId: string,
    extractedData: OcrExtractionResult
  ) => void;
}

export const OcrIntakeModal: React.FC<OcrIntakeModalProps> = ({
  instruments,
  onClose,
  onImportExtractedObservations
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('mettler_class2');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>(instruments[1]?.id || instruments[0]?.id || '');
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractionResult, setExtractionResult] = useState<OcrExtractionResult | null>(null);

  // Editable state after extraction
  const [editableObservations, setEditableObservations] = useState<OcrExtractedObservation[]>([]);

  // Trigger OCR extraction
  const handleExtract = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/ocr/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presetId: selectedPreset,
          imageBase64: uploadedImagePreview,
          sheetType: 'analytical'
        })
      });

      if (!response.ok) throw new Error('OCR extraction failed');
      const data: OcrExtractionResult = await response.json();
      setExtractionResult(data);
      setEditableObservations(data.observations);

      // Match instrument if detected
      if (data.detectedInstrument?.serialNo) {
        const match = instruments.find(i => i.serialNo === data.detectedInstrument?.serialNo);
        if (match) setSelectedInstrumentId(match.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImagePreview(reader.result as string);
        setSelectedPreset('custom_upload');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateObservation = (index: number, field: keyof OcrExtractedObservation, value: any) => {
    const updated = [...editableObservations];
    updated[index] = { ...updated[index], [field]: value };
    // If technician edits an anomaly, clear the flagged status
    if (field === 'observedReading' || field === 'loadValue') {
      updated[index].isFlaggedAnomaly = false;
      updated[index].anomalyNote = 'Technician confirmed & verified';
    }
    setEditableObservations(updated);
  };

  const handleConfirmAndImport = () => {
    if (!extractionResult) return;
    const finalResult: OcrExtractionResult = {
      ...extractionResult,
      observations: editableObservations
    };
    onImportExtractedObservations(selectedInstrumentId, finalResult);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
              <Scan className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">
                  OCR Test Sheet Intake Pipeline
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  PaddleOCR + Vision Assist
                </span>
              </div>
              <p className="text-xs text-slate-500">
                AI extracts tabular values from physical sheets. Human technician must review and confirm.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Step 1: Sheet Selection */}
          {!extractionResult && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                1. Select Test Sheet Source
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Preset 1 */}
                <div
                  onClick={() => {
                    setSelectedPreset('mettler_class2');
                    setUploadedImagePreview(null);
                  }}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedPreset === 'mettler_class2'
                      ? 'border-slate-900 bg-slate-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-900">
                      Standard Analytical Balance Run
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Clean Type Eval
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Sartorius Class II calibration sheet. 8 test points (increasing, decreasing, corner loads). High clarity.
                  </p>
                </div>

                {/* Preset 2 */}
                <div
                  onClick={() => {
                    setSelectedPreset('industrial_handwritten');
                    setUploadedImagePreview(null);
                  }}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedPreset === 'industrial_handwritten'
                      ? 'border-slate-900 bg-slate-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-900">
                      Industrial Field Sheet (Handwritten)
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      Contains Anomaly
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Avery Weigh-Tronix Class III sheet. Includes a low-confidence decimal reading requiring technician scrutiny.
                  </p>
                </div>
              </div>

              {/* Upload Custom File */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-slate-400 transition-colors bg-slate-50/40">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <div className="text-xs font-semibold text-slate-800">
                  Upload Scanned Test Sheet or Calibration PDF/Image
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Supports PNG, JPG, or PDF test records. Max 20MB.
                </p>
                <label className="mt-3 inline-block px-4 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs">
                  Browse File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                </label>
                {uploadedImagePreview && (
                  <div className="mt-3 text-xs text-emerald-600 font-semibold flex items-center justify-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Custom image loaded</span>
                  </div>
                )}
              </div>

              {/* Target Instrument Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Instrument in Registry
                </label>
                <select
                  value={selectedInstrumentId}
                  onChange={e => setSelectedInstrumentId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 font-medium"
                >
                  {instruments.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.model} ({inst.serialNo}) - {inst.accuracyClass} (Max {inst.maxCapacity} {inst.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3">
                <button
                  id="btn-run-ocr-extraction"
                  onClick={handleExtract}
                  disabled={isProcessing}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Extracting Metrological Data with OCR...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Extract Observations with OCR</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review Extracted Data (Human-in-the-Loop) */}
          {extractionResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {extractionResult.sheetType}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Extracted {editableObservations.length} points • Avg Confidence:{' '}
                    <span className="font-bold text-emerald-700">
                      {Math.round(extractionResult.averageConfidence * 100)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {editableObservations.some(o => o.isFlaggedAnomaly) ? (
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Anomaly Flagged: Review values below</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>High Extraction Confidence</span>
                    </div>
                  )}

                  <button
                    onClick={() => setExtractionResult(null)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1"
                  >
                    Rescan
                  </button>
                </div>
              </div>

              {/* Warning Notice */}
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-start space-x-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Legal Metrology Protocol:</strong> AI assists extraction. Verify each reading against the original sheet before importing to the deterministic OIML rule engine.
                </span>
              </div>

              {/* Extracted Observations Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                      <tr>
                        <th className="px-3 py-2.5">#</th>
                        <th className="px-3 py-2.5">Test Type</th>
                        <th className="px-3 py-2.5">Load Value (L)</th>
                        <th className="px-3 py-2.5">Observed Reading (I)</th>
                        <th className="px-3 py-2.5">Confidence</th>
                        <th className="px-3 py-2.5">Notes / Anomaly</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {editableObservations.map((obs, idx) => (
                        <tr
                          key={obs.tempId}
                          className={obs.isFlaggedAnomaly ? 'bg-amber-50/50' : 'hover:bg-slate-50/60'}
                        >
                          <td className="px-3 py-2 font-mono text-slate-500">{idx + 1}</td>
                          <td className="px-3 py-2 font-medium capitalize text-slate-800">
                            {obs.testType.replace('_', ' ')}
                            {obs.direction && ` (${obs.direction})`}
                            {obs.position && ` [${obs.position}]`}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="any"
                              value={obs.loadValue}
                              onChange={e => handleUpdateObservation(idx, 'loadValue', Number(e.target.value))}
                              className="w-24 p-1 text-xs border border-slate-300 rounded font-mono font-medium focus:ring-1 focus:ring-slate-400"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="any"
                              value={obs.observedReading}
                              onChange={e => handleUpdateObservation(idx, 'observedReading', Number(e.target.value))}
                              className={`w-28 p-1 text-xs border rounded font-mono font-bold ${
                                obs.isFlaggedAnomaly
                                  ? 'border-amber-400 bg-amber-50 focus:ring-amber-500'
                                  : 'border-slate-300 focus:ring-slate-400'
                              }`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center space-x-1.5">
                              <span
                                className={`text-[11px] font-bold font-mono ${
                                  obs.confidence >= 0.95
                                    ? 'text-emerald-700'
                                    : obs.confidence >= 0.85
                                    ? 'text-blue-700'
                                    : 'text-amber-700'
                                }`}
                              >
                                {Math.round(obs.confidence * 100)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-500 text-[11px]">
                            {obs.isFlaggedAnomaly ? (
                              <span className="text-amber-800 font-medium">
                                ⚠ {obs.anomalyNote || 'Check manual reading'}
                              </span>
                            ) : (
                              <span className="text-emerald-600">✓ Verified</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setExtractionResult(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  ← Back to Source Selection
                </button>

                <button
                  id="btn-confirm-import-observations"
                  type="button"
                  onClick={handleConfirmAndImport}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Import {editableObservations.length} Observations</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
