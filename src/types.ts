/**
 * WeighSure - OIML R-76 NAWI Verification Platform
 * Shared TypeScript Types and Interfaces
 */

export type UserRole = 'technician' | 'approving_officer' | 'auditor' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  licenseNumber?: string;
  createdAt: string;
}

export type AccuracyClass = 'Class I' | 'Class II' | 'Class III' | 'Class IIII';

export type InstrumentType = 
  | 'Electronic Counter Scale' 
  | 'Platform Scale' 
  | 'Bench Scale' 
  | 'Weighbridge' 
  | 'Crane Scale' 
  | 'Retail/POS Scale' 
  | 'Laboratory Balance';

export type StandardClass = 'E2' | 'F1' | 'F2' | 'M1';

export interface ReferenceStandard {
  id: string;
  massValue: number;
  unit: string;
  standardClass: StandardClass;
  traceabilityNumber: string;
  calibrationCertificateNumber: string;
  calibrationExpiryDate: string; // ISO format: YYYY-MM-DD
  createdAt?: string;
}

export interface Instrument {
  id: string;
  manufacturer: string;
  model: string;
  serialNo: string;
  accuracyClass: AccuracyClass;
  instrumentType: InstrumentType;
  maxCapacity: number; // in unit (e.g., g, kg)
  minCapacity: number; // in unit
  scaleInterval_d: number; // actual scale interval d
  verificationInterval_e: number; // verification scale interval e
  unit: string; // 'g', 'kg', 'mg'
  location: string;
  customerName: string;
  nextVerificationDue?: string; // ISO date string (YYYY-MM-DD)
  createdBy: string;
  createdAt: string;
}

export type TestSessionStatus = 
  | 'draft'
  | 'ocr_pending_review'
  | 'observations_recorded'
  | 'calculated'
  | 'pending_approval'
  | 'approved'
  | 'rejected';

export interface EnvironmentalConditions {
  temperatureC: number;
  humidityPercent: number;
  pressureHpa: number;
  locationNotes?: string;
}

export type ObservationSource = 'manual' | 'ocr';
export type TestType = 'weighing_performance' | 'repeatability' | 'eccentricity' | 'tare_zero';

export interface Observation {
  id: string;
  testSessionId: string;
  testType: TestType;
  testPointIndex: number;
  loadValue: number; // Load applied L (e.g. in g or kg)
  observedReading: number; // Indication I
  direction?: 'increasing' | 'decreasing'; // For weighing performance
  tareValue?: number; // In tare test
  deltaL?: number; // Additional small weights to find turning point (optional)
  delta_L?: number;
  turningPoint_L?: number;
  repetitionIndex?: number;
  notes?: string;
  timestamp?: string;
  position?: 'center' | 'front-left' | 'front-right' | 'rear-left' | 'rear-right'; // For eccentricity
  source: ObservationSource;
  rawOcrConfidence?: number; // 0 to 1
  isFlaggedAnomaly?: boolean;
  anomalyNote?: string;
  confirmedByTechnician: boolean;
  createdAt: string;
}

export type CalculationDecision = 'PASS' | 'FAIL' | 'REVIEW';

export interface ObservationCalculation {
  observationId: string;
  loadValue: number;
  observedReading: number;
  loadInMultiplesOfE: number; // m / e
  calculatedIndication: number; // P = I + 0.5e - deltaL
  errorValue: number; // E = P - L or I - L
  mpeValue: number; // Maximum Permissible Error (+/- e)
  mpeInUnits: number; // MPE in g or kg
  isWithinMpe: boolean;
  direction?: 'increasing' | 'decreasing';
  notes?: string;
}

export interface TestSessionCalculation {
  id: string;
  testSessionId: string;
  ruleVersionId: string;
  ruleVersionLabel: string;
  calculatedAt: string;
  evaluatedAt?: string;
  testGroupResults?: any;
  evaluatedPoints?: any;
  overallResult: CalculationDecision;
  maxObservedError: number;
  maxPermissibleErrorObserved: number;
  repeatabilityError?: number;
  eccentricityMaxError?: number;
  hysteresisMaxError?: number;
  summaryText: string;
  detailedResults: ObservationCalculation[];
}

export type CalculationResult = TestSessionCalculation;

export interface SessionAttachment {
  id: string;
  testSessionId: string;
  name: string;
  category: 'instrument_photograph' | 'nameplate_tag' | 'leveling_bubble' | 'calibration_certificate' | 'supporting_document';
  fileSize: string;
  dataUrl?: string;
  notes?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface TestSession {
  id: string;
  instrumentId: string;
  instrument?: Instrument;
  technicianId: string;
  technicianName: string;
  environmentalConditions: EnvironmentalConditions;
  status: TestSessionStatus;
  ruleVersionId: string;
  createdAt: string;
  updatedAt: string;
  observations: Observation[];
  calculation?: TestSessionCalculation;
  approval?: ApprovalRecord;
  report?: ReportRecord;
  attachments?: SessionAttachment[];
  referenceStandardIds?: string[];
  referenceStandards?: ReferenceStandard[];
}

export interface ApprovalRecord {
  id: string;
  testSessionId: string;
  approvingOfficerId: string;
  approvingOfficerName: string;
  approvingOfficerLicense: string;
  status: 'approved' | 'rejected';
  comments?: string;
  signatureHash: string; // Cryptographic SHA-256 HMAC
  approvedAt: string;
}

export interface ReportRecord {
  id: string;
  testSessionId: string;
  reportNumber: string;
  qrCodeValue: string; // URL / verification token
  qrVerificationCode?: string; // Human-readable token
  qrCodeDataUrl?: string; // Rendered QR Code PNG
  signatureHash: string;
  generatedAt: string;
  verifiedCount?: number;
}

export interface OimlMpeBand {
  minM: number; // in multiples of e (e.g. 0)
  maxM: number; // in multiples of e (e.g. 500, 50000)
  mpeInitial: number; // in multiples of e (e.g. 0.5, 1.0, 1.5)
  mpeService: number; // in multiples of e (e.g. 1.0, 2.0, 3.0)
}

export interface OimlRuleConfiguration {
  id: string;
  versionLabel: string;
  standardTitle: string; // "OIML R-76-1:2006 (E)"
  isDefault: boolean;
  effectiveFrom: string;
  createdBy: string;
  description: string;
  rules: {
    classes: Record<AccuracyClass, {
      minScaleDivisions_n: number;
      maxScaleDivisions_n: number;
      mpeBands: OimlMpeBand[];
    }>;
    eccentricityFractionOfMax: number; // Typically 1/3 or 1/4 Max
    repeatabilityRuns: number; // 3 runs at ~0.5 Max, 3 runs at ~Max
    hysteresisLimitMultiplier: number; // 1.0 x MPE
  };
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: 'instrument' | 'test_session' | 'observation' | 'calculation' | 'approval' | 'report' | 'rule_version' | 'auth';
  entityId: string;
  timestamp: string;
  ruleVersionId?: string;
  metadataJson: Record<string, any>;
}

export interface OcrExtractedObservation {
  tempId: string;
  testType: TestType;
  direction?: 'increasing' | 'decreasing';
  position?: 'center' | 'front-left' | 'front-right' | 'rear-left' | 'rear-right';
  loadValue: number;
  observedReading: number;
  deltaL?: number;
  confidence: number;
  isFlaggedAnomaly: boolean;
  anomalyNote?: string;
  originalText?: string;
}

export interface OcrExtractionResult {
  sheetType: string;
  detectedInstrument?: {
    model?: string;
    serialNo?: string;
    accuracyClass?: AccuracyClass;
    maxCapacity?: number;
    unit?: string;
  };
  environmentalConditions?: EnvironmentalConditions;
  observations: OcrExtractedObservation[];
  averageConfidence: number;
  flaggedCount: number;
  extractedAt: string;
}

export interface VerificationLookupResult {
  verified: boolean;
  reportNumber: string;
  status: 'AUTHENTIC_AND_VALID' | 'REVOKED' | 'EXPIRED' | 'NOT_FOUND';
  instrument: {
    manufacturer: string;
    model: string;
    serialNo: string;
    accuracyClass: AccuracyClass;
    instrumentType?: InstrumentType;
    maxCapacity: number;
    unit: string;
  };
  verification: {
    result: CalculationDecision;
    verifiedAt: string;
    validUntil: string;
    ruleVersion: string;
    standard: string;
    approvingOfficer: string;
    licenseNo: string;
    signatureHash: string;
  };
  environmentalConditions: EnvironmentalConditions;
  maxObservedError: number;
  toleranceThreshold: number;
  verifiedTimestamp: string;
}
