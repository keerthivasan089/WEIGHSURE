import React from 'react';

interface MetrologyEmblemProps {
  className?: string;
  size?: number;
}

/**
 * Official Legal Metrology Authority Emblem (WeighSure / OIML R-76)
 * Designed with precision balance beam, verification fulcrum, calibration notches,
 * and royal blue & gold crest aesthetics — distinctly NOT an AI sparkle or robot icon.
 */
export const MetrologyEmblem: React.FC<MetrologyEmblemProps> = ({ 
  className = "w-10 h-10", 
  size = 40 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-md ${className}`}
      aria-label="Legal Metrology Bureau Certified Seal"
    >
      <defs>
        {/* Deep Royal to Azure Gradient */}
        <linearGradient id="emblemRoyalDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0a2558" />
          <stop offset="50%" stopColor="#1e40af" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        {/* Light Royal Blue to Ice Blue highlight */}
        <linearGradient id="emblemLightBlue" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#bae6fd" />
        </linearGradient>

        {/* Legal Metrology Gold accent for Class I/II standards */}
        <linearGradient id="emblemGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>

        {/* Platinum White shine */}
        <linearGradient id="emblemWhite" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>

      {/* Outer Hexagonal Shield Frame (Legal Metrology Verification Seal) */}
      <polygon
        points="24,2 44,9 44,27 38,40 24,46 10,40 4,27 4,9"
        fill="url(#emblemRoyalDark)"
        stroke="url(#emblemLightBlue)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Inner Precision Inset Rim */}
      <polygon
        points="24,5 41,11 41,26 36,37 24,42 12,37 7,26 7,11"
        fill="none"
        stroke="rgba(255, 255, 255, 0.25)"
        strokeWidth="1"
        strokeDasharray="2 1.5"
      />

      {/* Central Precision Pillar (Fulcrum Stand) */}
      <rect x="22.5" y="14" width="3" height="20" rx="1" fill="url(#emblemWhite)" />
      <path d="M19 34 L29 34 L28 36 L20 36 Z" fill="url(#emblemGold)" />
      
      {/* Precision Knife-Edge Pivot (Fulcrum Triangle) */}
      <polygon points="24,13 21,17 27,17" fill="url(#emblemGold)" />

      {/* Horizontal Precision Balance Beam */}
      <rect x="9" y="15.5" width="30" height="2.5" rx="1.25" fill="url(#emblemLightBlue)" />
      
      {/* Beam Vernier Calibration Notches */}
      <line x1="14" y1="15" x2="14" y2="18.5" stroke="url(#emblemRoyalDark)" strokeWidth="1" />
      <line x1="19" y1="15" x2="19" y2="18.5" stroke="url(#emblemRoyalDark)" strokeWidth="1" />
      <line x1="24" y1="14.5" x2="24" y2="19" stroke="#ffffff" strokeWidth="1.2" />
      <line x1="29" y1="15" x2="29" y2="18.5" stroke="url(#emblemRoyalDark)" strokeWidth="1" />
      <line x1="34" y1="15" x2="34" y2="18.5" stroke="url(#emblemRoyalDark)" strokeWidth="1" />

      {/* Left Suspension Link & Weighing Pan */}
      <line x1="11" y1="18" x2="8" y2="25" stroke="url(#emblemWhite)" strokeWidth="1.2" />
      <line x1="11" y1="18" x2="14" y2="25" stroke="url(#emblemWhite)" strokeWidth="1.2" />
      {/* Left Pan (Concave precision metrology dish) */}
      <path
        d="M6 25 Q11 29 16 25 Z"
        fill="url(#emblemGold)"
        stroke="url(#emblemWhite)"
        strokeWidth="0.8"
      />

      {/* Right Suspension Link & Weighing Pan */}
      <line x1="37" y1="18" x2="34" y2="25" stroke="url(#emblemWhite)" strokeWidth="1.2" />
      <line x1="37" y1="18" x2="40" y2="25" stroke="url(#emblemWhite)" strokeWidth="1.2" />
      {/* Right Pan */}
      <path
        d="M32 25 Q37 29 42 25 Z"
        fill="url(#emblemGold)"
        stroke="url(#emblemWhite)"
        strokeWidth="0.8"
      />

      {/* Center Verification Checkmark Plaque (Stamp of Legal Authenticity) */}
      <circle cx="24" cy="27" r="4.5" fill="#0f172a" stroke="url(#emblemLightBlue)" strokeWidth="1" />
      <path
        d="M22 27 L23.5 28.5 L26.5 25.5"
        stroke="#38bdf8"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Metrology Crown Indicator at Top Apex */}
      <circle cx="24" cy="9" r="1.8" fill="url(#emblemGold)" />
    </svg>
  );
};
