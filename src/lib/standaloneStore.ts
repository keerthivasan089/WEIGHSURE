/**
 * WeighSure - Standalone Client Storage & Fallback Engine
 * Enables 100% full-functionality offline & on static hosts (like Vercel, Netlify, GitHub Pages)
 * when a persistent backend API is not present or returns 404.
 */

import {
  User,
  Instrument,
  TestSession,
  OimlRuleConfiguration,
  AuditLog,
  VerificationLookupResult,
  OcrExtractionResult,
  SessionAttachment,
  ApprovalRecord
} from '../types';

import {
  INITIAL_USERS,
  INITIAL_INSTRUMENTS,
  INITIAL_RULE_VERSIONS,
  INITIAL_TEST_SESSIONS,
  INITIAL_AUDIT_LOGS
} from './initialData';

import { executeTestSessionCalculation } from './oimlEngine';

const STORAGE_PREFIX = 'weighsure_v2_';

function getStorageItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`Failed to parse localStorage key ${key}:`, e);
    return fallback;
  }
}

function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to save localStorage key ${key}:`, e);
  }
}

export function loadStandaloneData() {
  const users = getStorageItem<User[]>('users', INITIAL_USERS);
  const instruments = getStorageItem<Instrument[]>('instruments', INITIAL_INSTRUMENTS);
  const ruleVersions = getStorageItem<OimlRuleConfiguration[]>('rule_versions', INITIAL_RULE_VERSIONS);
  const testSessions = getStorageItem<TestSession[]>('test_sessions', INITIAL_TEST_SESSIONS);
  const auditLogs = getStorageItem<AuditLog[]>('audit_logs', INITIAL_AUDIT_LOGS);

  return {
    users,
    currentUser: users[0] || INITIAL_USERS[0],
    instruments,
    ruleVersions,
    testSessions,
    auditLogs
  };
}

export function saveStandaloneInstruments(instruments: Instrument[]) {
  setStorageItem('instruments', instruments);
}

export function saveStandaloneSessions(sessions: TestSession[]) {
  setStorageItem('test_sessions', sessions);
}

export function saveStandaloneRules(rules: OimlRuleConfiguration[]) {
  setStorageItem('rule_versions', rules);
}

export function saveStandaloneAuditLogs(logs: AuditLog[]) {
  setStorageItem('audit_logs', logs);
}

export function createStandaloneAuditLog(
  user: User,
  action: string,
  entityType: AuditLog['entityType'],
  entityId: string,
  ruleVersionId?: string,
  metadataJson: Record<string, any> = {}
): AuditLog {
  const newLog: AuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action,
    entityType,
    entityId,
    timestamp: new Date().toISOString(),
    ruleVersionId,
    metadataJson
  };
  return newLog;
}

export function verifyCodeLocally(
  code: string,
  sessions: TestSession[],
  instruments: Instrument[]
): VerificationLookupResult {
  const cleanCode = code.trim().toLowerCase();

  const session = sessions.find(s => {
    if (s.id.toLowerCase() === cleanCode) return true;
    if (s.report?.certificateNumber.toLowerCase() === cleanCode) return true;
    if (s.report?.qrCodeValue.toLowerCase() === cleanCode) return true;
    if (s.report?.verificationLookupCode?.toLowerCase() === cleanCode) return true;
    return false;
  });

  if (session && session.report) {
    const inst = instruments.find(i => i.id === session.instrumentId) || session.instrument;
    return {
      isValid: true,
      certificateNumber: session.report.certificateNumber,
      issuedAt: session.report.issuedAt,
      validUntil: session.report.validUntil,
      status: session.status === 'approved' ? 'valid' : 'pending',
      decision: session.report.decision,
      summaryText: session.report.summaryText,
      instrument: {
        manufacturer: inst.manufacturer,
        model: inst.model,
        serialNo: inst.serialNo,
        accuracyClass: inst.accuracyClass,
        maxCapacity: inst.maxCapacity,
        scaleInterval_d: inst.scaleInterval_d,
        verificationInterval_e: inst.verificationInterval_e,
        unit: inst.unit,
        customerName: inst.customerName
      },
      officer: {
        name: session.approval?.approvingOfficerName || 'Legal Metrology Officer',
        license: session.approval?.approvingOfficerLicense || 'OIML-VER-CERT'
      },
      tamperEvidentHash: session.report.tamperEvidentHash,
      ruleVersionLabel: session.calculation?.ruleVersionLabel || 'OIML R-76 Standard'
    };
  }

  // Also check if matches instrument serial directly
  const inst = instruments.find(i => i.serialNo.toLowerCase() === cleanCode);
  if (inst) {
    const latestApproved = sessions
      .filter(s => s.instrumentId === inst.id && s.status === 'approved' && s.report)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (latestApproved && latestApproved.report) {
      return {
        isValid: true,
        certificateNumber: latestApproved.report.certificateNumber,
        issuedAt: latestApproved.report.issuedAt,
        validUntil: latestApproved.report.validUntil,
        status: 'valid',
        decision: latestApproved.report.decision,
        summaryText: latestApproved.report.summaryText,
        instrument: {
          manufacturer: inst.manufacturer,
          model: inst.model,
          serialNo: inst.serialNo,
          accuracyClass: inst.accuracyClass,
          maxCapacity: inst.maxCapacity,
          scaleInterval_d: inst.scaleInterval_d,
          verificationInterval_e: inst.verificationInterval_e,
          unit: inst.unit,
          customerName: inst.customerName
        },
        officer: {
          name: latestApproved.approval?.approvingOfficerName || 'Legal Metrology Officer',
          license: latestApproved.approval?.approvingOfficerLicense || 'OIML-VER-CERT'
        },
        tamperEvidentHash: latestApproved.report.tamperEvidentHash,
        ruleVersionLabel: latestApproved.calculation?.ruleVersionLabel || 'OIML R-76 Standard'
      };
    }
  }

  return {
    isValid: false,
    certificateNumber: code,
    issuedAt: '',
    validUntil: '',
    status: 'invalid',
    decision: 'FAIL',
    summaryText: `Verification query for '${code}' was not found in registered metrological records.`,
    instrument: {
      manufacturer: 'Unknown',
      model: 'Unknown',
      serialNo: code,
      accuracyClass: 'Class II',
      maxCapacity: 0,
      scaleInterval_d: 0,
      verificationInterval_e: 0,
      unit: 'g',
      customerName: 'Unknown'
    },
    officer: { name: '', license: '' },
    tamperEvidentHash: 'UNVERIFIED',
    ruleVersionLabel: ''
  };
}

export function extractMockOcr(presetId: string, sheetType?: string): OcrExtractionResult {
  if (presetId === 'mettler_class2' || (!presetId && sheetType === 'analytical')) {
    return {
      sheetType: 'Mettler Toledo Analytical Type Evaluation Sheet',
      detectedInstrument: {
        model: 'Cubis II MCA5202S',
        serialNo: 'SART-CB-449102',
        accuracyClass: 'Class II',
        maxCapacity: 5000,
        unit: 'g'
      },
      environmentalConditions: {
        temperatureC: 20.2,
        humidityPercent: 49,
        pressureHpa: 1014.1,
        locationNotes: 'Extracted from sheet header: Test Cell 2'
      },
      observations: [
        {
          testType: 'weighing_performance',
          loadValue: 50,
          observedReading: 50.000,
          direction: 'increasing',
          turningPoint_L: 50.000,
          deltaL: 0.004,
          confidence: 0.99
        },
        {
          testType: 'weighing_performance',
          loadValue: 1000,
          observedReading: 1000.001,
          direction: 'increasing',
          turningPoint_L: 1000.001,
          deltaL: 0.005,
          confidence: 0.98
        },
        {
          testType: 'weighing_performance',
          loadValue: 2000,
          observedReading: 2000.002,
          direction: 'increasing',
          turningPoint_L: 2000.002,
          deltaL: 0.006,
          confidence: 0.96
        },
        {
          testType: 'weighing_performance',
          loadValue: 3500,
          observedReading: 3500.003,
          direction: 'increasing',
          turningPoint_L: 3500.003,
          deltaL: 0.005,
          confidence: 0.95
        },
        {
          testType: 'weighing_performance',
          loadValue: 5000,
          observedReading: 5000.004,
          direction: 'increasing',
          turningPoint_L: 5000.004,
          deltaL: 0.007,
          confidence: 0.99
        },
        {
          testType: 'repeatability',
          loadValue: 2500,
          observedReading: 2500.002,
          repetitionIndex: 1,
          confidence: 0.97
        },
        {
          testType: 'repeatability',
          loadValue: 2500,
          observedReading: 2500.003,
          repetitionIndex: 2,
          confidence: 0.98
        },
        {
          testType: 'repeatability',
          loadValue: 2500,
          observedReading: 2500.002,
          repetitionIndex: 3,
          confidence: 0.99
        },
        {
          testType: 'eccentricity',
          loadValue: 1600,
          observedReading: 1600.001,
          position: 'center',
          confidence: 0.98
        },
        {
          testType: 'eccentricity',
          loadValue: 1600,
          observedReading: 1600.003,
          position: 'front-left',
          confidence: 0.94
        },
        {
          testType: 'eccentricity',
          loadValue: 1600,
          observedReading: 1600.002,
          position: 'rear-right',
          confidence: 0.96
        }
      ],
      overallConfidence: 0.97,
      extractionTimestamp: new Date().toISOString()
    };
  }

  // Default industrial platform test sheet preset
  return {
    sheetType: 'Avery Weigh-Tronix Industrial Calibration Sheet (OIML R-76)',
    detectedInstrument: {
      model: 'Defender 5000 D52P',
      serialNo: 'OH-DEF-901182',
      accuracyClass: 'Class III',
      maxCapacity: 60,
      unit: 'kg'
    },
    environmentalConditions: {
      temperatureC: 22.4,
      humidityPercent: 54,
      pressureHpa: 1011.8,
      locationNotes: 'Testing Floor Bay 4'
    },
    observations: [
      {
        testType: 'weighing_performance',
        loadValue: 5,
        observedReading: 5.002,
        direction: 'increasing',
        confidence: 0.99
      },
      {
        testType: 'weighing_performance',
        loadValue: 20,
        observedReading: 20.006,
        direction: 'increasing',
        confidence: 0.98
      },
      {
        testType: 'weighing_performance',
        loadValue: 40,
        observedReading: 40.010,
        direction: 'increasing',
        confidence: 0.96
      },
      {
        testType: 'weighing_performance',
        loadValue: 60,
        observedReading: 60.012,
        direction: 'increasing',
        confidence: 0.95
      },
      {
        testType: 'repeatability',
        loadValue: 30,
        observedReading: 30.006,
        repetitionIndex: 1,
        confidence: 0.98
      },
      {
        testType: 'repeatability',
        loadValue: 30,
        observedReading: 30.008,
        repetitionIndex: 2,
        confidence: 0.97
      },
      {
        testType: 'eccentricity',
        loadValue: 20,
        observedReading: 20.006,
        position: 'center',
        confidence: 0.98
      },
      {
        testType: 'eccentricity',
        loadValue: 20,
        observedReading: 20.008,
        position: 'front-left',
        confidence: 0.95
      }
    ],
    overallConfidence: 0.96,
    extractionTimestamp: new Date().toISOString()
  };
}
