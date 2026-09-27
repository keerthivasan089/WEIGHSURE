import React, { useState, useRef } from 'react';
import { SessionAttachment, User } from '../types';
import { downloadDataUrlFile, downloadBlob } from '../lib/downloadHelper';
import { 
  Camera, 
  FileText, 
  Upload, 
  Trash2, 
  Eye, 
  Download, 
  ShieldCheck, 
  Plus, 
  X,
  FileCheck,
  AlertCircle,
  Tag,
  CheckCircle2
} from 'lucide-react';

interface SessionAttachmentsProps {
  sessionId: string;
  attachments: SessionAttachment[];
  currentUser: User;
  onAddAttachment: (attachmentData: {
    name: string;
    category: SessionAttachment['category'];
    fileSize: string;
    dataUrl?: string;
    notes?: string;
  }) => Promise<void>;
  onDeleteAttachment: (attachmentId: string) => Promise<void>;
}

export const SessionAttachments: React.FC<SessionAttachmentsProps> = ({
  sessionId,
  attachments = [],
  currentUser,
  onAddAttachment,
  onDeleteAttachment
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SessionAttachment['category']>('instrument_photograph');
  const [fileName, setFileName] = useState('');
  const [fileNotes, setFileNotes] = useState('');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [detectedFileSize, setDetectedFileSize] = useState('1.5 MB');
  const [previewModalAttachment, setPreviewModalAttachment] = useState<SessionAttachment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoryLabels: Record<SessionAttachment['category'], { label: string; icon: React.ReactNode; color: string }> = {
    instrument_photograph: {
      label: 'Scale Photograph',
      icon: <Camera className="w-3.5 h-3.5 text-blue-600" />,
      color: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    nameplate_tag: {
      label: 'Nameplate & Markings',
      icon: <Tag className="w-3.5 h-3.5 text-purple-600" />,
      color: 'bg-purple-50 text-purple-700 border-purple-200'
    },
    leveling_bubble: {
      label: 'Spirit Level Bubble',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    calibration_certificate: {
      label: 'Weight Calibration Cert',
      icon: <FileCheck className="w-3.5 h-3.5 text-amber-600" />,
      color: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    supporting_document: {
      label: 'Supporting Document',
      icon: <FileText className="w-3.5 h-3.5 text-slate-600" />,
      color: 'bg-slate-100 text-slate-700 border-slate-200'
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    // Format size
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    setDetectedFileSize(`${sizeInMb} MB`);

    // Read as Data URL
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName) return;

    setIsSubmitting(true);
    try {
      await onAddAttachment({
        name: fileName,
        category: selectedCategory,
        fileSize: detectedFileSize,
        dataUrl: previewDataUrl || undefined,
        notes: fileNotes
      });
      // Reset
      setIsUploading(false);
      setFileName('');
      setFileNotes('');
      setPreviewDataUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Preset Samples for Demo
  const loadPreset = (preset: 'nameplate' | 'level' | 'cert') => {
    if (preset === 'nameplate') {
      setSelectedCategory('nameplate_tag');
      setFileName('Metrological_Nameplate_Inspection.jpg');
      setDetectedFileSize('2.1 MB');
      setFileNotes('Verified: Class II, Max 5000g, e=0.1g, CE M26 stamp, Serial match confirmed.');
    } else if (preset === 'level') {
      setSelectedCategory('leveling_bubble');
      setFileName('Spirit_Level_Centering_Verification.jpg');
      setDetectedFileSize('1.4 MB');
      setFileNotes('Spirit level indicator bubble inspected and verified dead-center within the ring before zero tare.');
    } else {
      setSelectedCategory('calibration_certificate');
      setFileName('Traceable_E2_Weights_Cert_2026.pdf');
      setDetectedFileSize('780 KB');
      setFileNotes('NIST/DKD Class E2 standard test weights calibration cert (Ref: CAL-2026-DKD-8821).');
    }
  };

  return (
    <div className="space-y-6">
      {/* Evidence & Attachment Compliance Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              Official Photographic & Document Evidence Repository
            </h3>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            Complies with OIML R-76 mandatory verification requirements: all type-evaluation sessions must archive photographic evidence of the instrument nameplate, spirit level bubble, testing bay, and traceable calibration certificates.
          </p>
        </div>

        <button
          onClick={() => setIsUploading(!isUploading)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors inline-flex items-center space-x-1.5 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Evidence / Attachment</span>
        </button>
      </div>

      {/* Upload Drawer / Modal Form */}
      {isUploading && (
        <form onSubmit={handleUploadSubmit} className="bg-white rounded-xl border border-slate-300 p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2">
              <Upload className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Upload New Verification Evidence
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsUploading(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Demo Presets */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 font-semibold">Quick Demo Presets:</span>
            <button
              type="button"
              onClick={() => loadPreset('nameplate')}
              className="px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded border border-purple-200 font-medium text-[11px]"
            >
              + Nameplate Photo
            </button>
            <button
              type="button"
              onClick={() => loadPreset('level')}
              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200 font-medium text-[11px]"
            >
              + Spirit Level Bubble
            </button>
            <button
              type="button"
              onClick={() => loadPreset('cert')}
              className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded border border-amber-200 font-medium text-[11px]"
            >
              + Calibration Cert
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Evidence Category *
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as SessionAttachment['category'])}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="nameplate_tag">Nameplate & Metrological Markings (Class, Max, e, d, CE/OIML)</option>
                <option value="leveling_bubble">Spirit Level Bubble Centering</option>
                <option value="instrument_photograph">Scale Overview & Platform Receiver Setup</option>
                <option value="calibration_certificate">Traceable Standard Weights Calibration Certificate</option>
                <option value="supporting_document">Supporting Technical / Inspection Document</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Document / Image File *
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileChange}
                className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                File Title / Display Name *
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g. Sartorius_Nameplate_ClassII_Marking.jpg"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Technician Inspection Notes / Verification Details
              </label>
              <input
                type="text"
                value={fileNotes}
                onChange={(e) => setFileNotes(e.target.value)}
                placeholder="e.g. Visual markings checked against OIML certificate..."
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setIsUploading(false)}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !fileName}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Commit Evidence to Session'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Attachments List / Grid */}
      {attachments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-3">
          <Camera className="w-10 h-10 text-slate-300 mx-auto" />
          <div>
            <h4 className="text-sm font-bold text-slate-800">No Photographic Evidence Uploaded Yet</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              DoCA and OIML R-76 require photographic verification of the scale nameplate and leveling bubble alignment prior to issuing official verification certificates.
            </p>
          </div>
          <button
            onClick={() => setIsUploading(true)}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs hover:bg-slate-800 transition-colors"
          >
            Attach First Photograph or Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {attachments.map((att) => {
            const categoryMeta = categoryLabels[att.category] || categoryLabels.supporting_document;
            const isImage = att.name.match(/\.(jpg|jpeg|png|webp|gif)$/i) || att.dataUrl?.startsWith('data:image');

            return (
              <div
                key={att.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  {/* Category Pill */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${categoryMeta.color}`}>
                      {categoryMeta.icon}
                      <span>{categoryMeta.label}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {att.fileSize}
                    </span>
                  </div>

                  {/* Thumbnail / Graphic Preview */}
                  <div 
                    onClick={() => setPreviewModalAttachment(att)}
                    className="h-32 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center cursor-pointer overflow-hidden group relative"
                  >
                    {att.dataUrl ? (
                      <img
                        src={att.dataUrl}
                        alt={att.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : isImage ? (
                      <div className="text-center space-y-1">
                        <Camera className="w-8 h-8 text-slate-400 mx-auto group-hover:text-emerald-600 transition-colors" />
                        <span className="text-[10px] text-slate-400 font-semibold block">Photograph Evidence</span>
                      </div>
                    ) : (
                      <div className="text-center space-y-1">
                        <FileCheck className="w-8 h-8 text-slate-400 mx-auto group-hover:text-emerald-600 transition-colors" />
                        <span className="text-[10px] text-slate-400 font-semibold block">Calibration Document</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>Inspect Evidence</span>
                    </div>
                  </div>

                  {/* Title and Notes */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 truncate" title={att.name}>
                      {att.name}
                    </h4>
                    {att.notes && (
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 italic">
                        "{att.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer details & actions */}
                <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between text-[10px] text-slate-500">
                  <div>
                    <div>By: <span className="font-semibold text-slate-700">{att.uploadedBy}</span></div>
                    <div>{new Date(att.uploadedAt).toLocaleDateString()}</div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        if (att.dataUrl) {
                          downloadDataUrlFile(att.dataUrl, att.name);
                        } else {
                          const text = `WeighSure Evidence Attachment\nName: ${att.name}\nCategory: ${att.category}\nUploaded By: ${att.uploadedBy}\nUploaded At: ${att.uploadedAt}\nNotes: ${att.notes || 'None'}`;
                          const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                          downloadBlob(blob, `${att.name}.txt`);
                        }
                      }}
                      className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                      title="Download Evidence File to Computer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setPreviewModalAttachment(att)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteAttachment(att.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      title="Remove Attachment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Preview Modal */}
      {previewModalAttachment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-300 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {previewModalAttachment.name}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Uploaded by {previewModalAttachment.uploadedBy} on {new Date(previewModalAttachment.uploadedAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPreviewModalAttachment(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Image or Document Visualizer */}
            <div className="bg-slate-900 rounded-xl p-4 flex items-center justify-center min-h-[220px]">
              {previewModalAttachment.dataUrl ? (
                <img
                  src={previewModalAttachment.dataUrl}
                  alt={previewModalAttachment.name}
                  className="max-h-[350px] object-contain rounded"
                />
              ) : (
                <div className="text-center text-white space-y-2 p-6">
                  <FileCheck className="w-12 h-12 text-emerald-400 mx-auto" />
                  <div className="text-sm font-bold">{previewModalAttachment.name}</div>
                  <div className="text-xs text-slate-400">
                    Binary Metrological Document • {previewModalAttachment.fileSize}
                  </div>
                  <div className="text-[11px] text-emerald-400 font-mono">
                    SHA-256 Verified Authenticity Token
                  </div>
                </div>
              )}
            </div>

            {/* Description & Metrology Notes */}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-slate-700">Metrological Field Observations:</span>
              <p className="text-slate-600">
                {previewModalAttachment.notes || 'Evidence verified by certified weights & measures technician.'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Archived in Legal Verification Repository</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    if (previewModalAttachment.dataUrl) {
                      downloadDataUrlFile(previewModalAttachment.dataUrl, previewModalAttachment.name);
                    } else {
                      const text = `WeighSure Evidence Attachment\nName: ${previewModalAttachment.name}\nCategory: ${previewModalAttachment.category}\nUploaded By: ${previewModalAttachment.uploadedBy}\nUploaded At: ${previewModalAttachment.uploadedAt}\nNotes: ${previewModalAttachment.notes || 'None'}`;
                      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                      downloadBlob(blob, `${previewModalAttachment.name}.txt`);
                    }
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs inline-flex items-center space-x-1.5 cursor-pointer"
                  title="Save original evidence file to your system"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Download File</span>
                </button>
                <button
                  onClick={() => setPreviewModalAttachment(null)}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs hover:bg-slate-800 cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
