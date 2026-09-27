import React, { useState, useEffect, useCallback } from 'react';
import { 
  Compass, 
  Scale, 
  PlusCircle, 
  History, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  X, 
  ExternalLink,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export interface TourStep {
  id: string;
  targetId: string;
  title: string;
  badge: string;
  description: string;
  actionText?: string;
  icon: React.ReactNode;
  tabTarget?: string;
}

interface GettingStartedTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
  onNewSession: () => void;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'register_instrument',
    targetId: 'tour-step-register-instrument',
    title: '1. Register Instrument',
    badge: 'Step 1 of 3 · Instrument Catalog',
    description: 'Catalog Non-Automatic Weighing Instruments (NAWI) across Accuracy Classes I, II, and III. Set manufacturer, model, serial number, max capacity, and verification scale interval (e).',
    actionText: 'Open Instruments Catalog',
    tabTarget: 'instruments',
    icon: <Scale className="w-5 h-5 text-sky-400" />
  },
  {
    id: 'start_new_test',
    targetId: 'tour-step-start-test',
    title: '2. Start New Test',
    badge: 'Step 2 of 3 · Statutory Inspection',
    description: 'Initiate a formal verification inspection session. Evaluate repeatability, eccentricity, and tare weighing observations directly against statutory OIML R-76 Table 6 MPE thresholds.',
    actionText: 'Initiate Test Inspection',
    icon: <PlusCircle className="w-5 h-5 text-emerald-400" />
  },
  {
    id: 'review_audit_trail',
    targetId: 'tour-step-audit-trail',
    title: '3. Review Audit Trail',
    badge: 'Step 3 of 3 · ISO/IEC 17025 Integrity',
    description: 'Inspect the tamper-proof cryptographic audit ledger. Track every statutory calculation, digital approval signature, and verified QR-stamped report with immutable timestamps.',
    actionText: 'View Audit Ledger',
    tabTarget: 'audit',
    icon: <History className="w-5 h-5 text-purple-400" />
  }
];

export const GettingStartedTour: React.FC<GettingStartedTourProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onNewSession
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = TOUR_STEPS[currentStepIndex];

  // Update target bounding box on step change or window resize
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !step) return;

    const el = document.getElementById(step.targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      // Small timeout to allow smooth scroll to settle
      setTimeout(() => {
        const updated = el.getBoundingClientRect();
        setTargetRect(updated);
      }, 250);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (isOpen) {
      updateTargetRect();
      window.addEventListener('resize', updateTargetRect);
      window.addEventListener('scroll', updateTargetRect, true);
      return () => {
        window.removeEventListener('resize', updateTargetRect);
        window.removeEventListener('scroll', updateTargetRect, true);
      };
    }
  }, [isOpen, currentStepIndex, updateTargetRect]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('nawi_getting_started_tour_completed', 'true');
    onClose();
  };

  const handleStepAction = () => {
    if (step.id === 'register_instrument') {
      onNavigateTab('instruments');
      onClose();
    } else if (step.id === 'start_new_test') {
      onNewSession();
      onClose();
    } else if (step.id === 'review_audit_trail') {
      onNavigateTab('audit');
      onClose();
    }
  };

  // Calculate tooltip coordinates relative to window
  let tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    width: '380px',
    maxWidth: 'calc(100vw - 32px)'
  };

  let arrowPosition = 'top';

  if (targetRect) {
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;
    const tooltipHeight = 280;

    // Horizontally center relative to target, clamped to screen margins
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const leftPos = Math.max(16, Math.min(window.innerWidth - 396, targetCenterX - 190));
    tooltipStyle.left = `${leftPos}px`;

    if (spaceBelow >= tooltipHeight + 20 || spaceBelow >= spaceAbove) {
      // Position below target
      tooltipStyle.top = `${Math.min(window.innerHeight - tooltipHeight - 16, targetRect.bottom + 14)}px`;
      arrowPosition = 'top';
    } else {
      // Position above target
      tooltipStyle.top = `${Math.max(16, targetRect.top - tooltipHeight - 14)}px`;
      arrowPosition = 'bottom';
    }
  } else {
    // Fallback: Centered modal
    tooltipStyle.top = '50%';
    tooltipStyle.left = '50%';
    tooltipStyle.transform = 'translate(-50%, -50%)';
  }

  return (
    <div 
      id="getting-started-tour-overlay"
      className="fixed inset-0 z-50 overflow-hidden select-none pointer-events-auto transition-all"
    >
      {/* Dark backdrop overlay */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-[2px] transition-opacity duration-300"
      />

      {/* Target Spotlight Highlight Ring */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            borderRadius: '16px',
            pointerEvents: 'none',
            zIndex: 9998,
            boxShadow: '0 0 0 9999px rgba(3, 9, 20, 0.72), 0 0 30px rgba(56, 189, 248, 0.65)'
          }}
          className="border-2 border-sky-400 animate-pulse"
        />
      )}

      {/* Interactive Tooltip Card */}
      <div 
        style={tooltipStyle}
        className="bg-slate-900/95 border border-sky-500/40 rounded-2xl shadow-2xl shadow-blue-950/80 p-5 text-white backdrop-blur-xl transition-all duration-200"
      >
        {/* Pointer Arrow if positioned near target */}
        {targetRect && arrowPosition === 'top' && (
          <div 
            style={{
              left: Math.max(20, Math.min(350, targetRect.left + targetRect.width / 2 - (parseFloat(tooltipStyle.left as string) || 0) - 8))
            }}
            className="absolute -top-2 w-4 h-4 bg-slate-900 border-t border-l border-sky-500/40 transform rotate-45"
          />
        )}
        {targetRect && arrowPosition === 'bottom' && (
          <div 
            style={{
              left: Math.max(20, Math.min(350, targetRect.left + targetRect.width / 2 - (parseFloat(tooltipStyle.left as string) || 0) - 8))
            }}
            className="absolute -bottom-2 w-4 h-4 bg-slate-900 border-b border-r border-sky-500/40 transform rotate-45"
          />
        )}

        {/* Header: Title + Step Badge + Close */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center shrink-0">
              {step.icon}
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-sky-400 font-mono">
                {step.badge}
              </div>
              <h3 className="font-display font-bold text-base text-white tracking-tight">
                {step.title}
              </h3>
            </div>
          </div>

          <button
            id="btn-tour-close"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Description */}
        <div className="py-3.5 space-y-3">
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            {step.description}
          </p>

          {/* Interactive Trigger Button for This Step */}
          {step.actionText && (
            <button
              id={`btn-tour-action-${step.id}`}
              onClick={handleStepAction}
              className="w-full py-2 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 hover:border-sky-400/60 text-sky-200 text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer group"
            >
              <span>{step.actionText}</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>

        {/* Footer Navigation Controls */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          {/* Step Indicator Dots */}
          <div className="flex items-center space-x-1.5">
            {TOUR_STEPS.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex 
                    ? 'w-6 bg-sky-400' 
                    : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
                title={`Jump to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Prev / Next Buttons */}
          <div className="flex items-center space-x-2">
            {currentStepIndex > 0 && (
              <button
                id="btn-tour-prev"
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-slate-300 font-medium flex items-center space-x-1 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back</span>
              </button>
            )}

            <button
              id="btn-tour-next"
              onClick={handleNext}
              className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-md shadow-sky-500/20 transition-colors"
            >
              {currentStepIndex === TOUR_STEPS.length - 1 ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Finish</span>
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
