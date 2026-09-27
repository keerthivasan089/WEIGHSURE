import express, { Request, Response } from 'express';
import QRCode from 'qrcode';

import {
  User,
  Instrument,
  TestSession,
  Observation,
  SessionAttachment,
  OimlRuleConfiguration,
  AuditLog,
  VerificationLookupResult,
  OcrExtractionResult,
  CalculationDecision
} from '../types';

import {
  INITIAL_USERS,
  INITIAL_INSTRUMENTS,
  INITIAL_RULE_VERSIONS,
  INITIAL_TEST_SESSIONS,
  INITIAL_AUDIT_LOGS
} from '../lib/initialData';

import { executeTestSessionCalculation } from '../lib/oimlEngine';

const app = express();

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Global CORS & preflight header setup
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-user-id');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

let dbUsers: User[] = [...INITIAL_USERS];
let dbInstruments: Instrument[] = [...INITIAL_INSTRUMENTS];
let dbRuleVersions: OimlRuleConfiguration[] = [...INITIAL_RULE_VERSIONS];
let dbTestSessions: TestSession[] = [...INITIAL_TEST_SESSIONS];
let dbAuditLogs: AuditLog[] = [...INITIAL_AUDIT_LOGS];
let currentUser: User = dbUsers[0];

function recordAuditLog(
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
  dbAuditLogs.unshift(newLog);
  return newLog;
}

// Health check
app.get(['/api/health', '/health'], (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), platform: 'vercel-serverless' });
});

// Users
app.get(['/api/users', '/users'], (_req: Request, res: Response) => {
  res.json(dbUsers);
});

app.get(['/api/users/current', '/users/current', '/api/auth/me'], (_req: Request, res: Response) => {
  res.json(currentUser);
});

app.post(['/api/users/switch-role', '/users/switch-role', '/api/auth/switch-role'], (req: Request, res: Response) => {
  const { role } = req.body;
  const match = dbUsers.find(u => u.role === role);
  if (match) {
    currentUser = match;
    res.json({ success: true, user: currentUser });
  } else {
    res.status(400).json({ error: 'Role not found' });
  }
});

// Instruments
app.get(['/api/instruments', '/instruments'], (_req: Request, res: Response) => {
  res.json(dbInstruments);
});

app.post(['/api/instruments', '/instruments'], (req: Request, res: Response) => {
  const body = req.body;
  const newInst: Instrument = {
    id: `inst_${Date.now()}`,
    manufacturer: body.manufacturer,
    model: body.model,
    serialNo: body.serialNo,
    accuracyClass: body.accuracyClass,
    instrumentType: body.instrumentType || 'Bench Scale',
    maxCapacity: Number(body.maxCapacity),
    minCapacity: Number(body.minCapacity),
    scaleInterval_d: Number(body.scaleInterval_d),
    verificationInterval_e: Number(body.verificationInterval_e),
    unit: body.unit,
    location: body.location || 'Metrology Testing Bench',
    customerName: body.customerName,
    createdBy: currentUser.id,
    createdAt: new Date().toISOString()
  };
  dbInstruments.unshift(newInst);
  recordAuditLog(currentUser, 'INSTRUMENT_REGISTERED', 'instrument', newInst.id, undefined, {
    serialNo: newInst.serialNo,
    model: newInst.model
  });
  res.status(201).json(newInst);
});

// Rule Versions
app.get(['/api/rule-versions', '/rule-versions'], (_req: Request, res: Response) => {
  res.json(dbRuleVersions);
});

app.put(['/api/rule-versions/:id/activate', '/rule-versions/:id/activate'], (req: Request, res: Response) => {
  const { id } = req.params;
  const target = dbRuleVersions.find(r => r.id === id);
  if (!target) {
    res.status(404).json({ error: 'Rule version not found' });
    return;
  }
  dbRuleVersions.forEach(r => {
    r.isDefault = r.id === id;
  });
  recordAuditLog(currentUser, 'RULE_VERSION_ACTIVATED', 'rule_version', id, id);
  res.json({ success: true, activeRule: target });
});

// Test Sessions
app.get(['/api/test-sessions', '/test-sessions'], (_req: Request, res: Response) => {
  res.json(dbTestSessions);
});

app.post(['/api/test-sessions', '/test-sessions'], (req: Request, res: Response) => {
  const body = req.body;
  const inst = dbInstruments.find(i => i.id === body.instrumentId) || dbInstruments[0];
  const activeRule = dbRuleVersions.find(r => r.isDefault) || dbRuleVersions[0];

  const newSession: TestSession = {
    id: `sess_${Date.now()}`,
    instrumentId: inst.id,
    technicianId: currentUser.id,
    technicianName: currentUser.name,
    ruleVersionId: activeRule.id,
    status: 'draft',
    environmentalConditions: body.environmentalConditions || {
      temperatureC: 20.0,
      humidityPercent: 50,
      pressureHpa: 1013.25
    },
    observations: [],
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  dbTestSessions.unshift(newSession);
  recordAuditLog(currentUser, 'SESSION_CREATED', 'test_session', newSession.id, activeRule.id);
  res.status(201).json(newSession);
});

app.get(['/api/test-sessions/:id', '/test-sessions/:id'], (req: Request, res: Response) => {
  const session = dbTestSessions.find(s => s.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json(session);
});

app.put(['/api/test-sessions/:id', '/test-sessions/:id'], (req: Request, res: Response) => {
  const index = dbTestSessions.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  const updated = {
    ...dbTestSessions[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  dbTestSessions[index] = updated;
  res.json(updated);
});

// Calculate
app.post(['/api/test-sessions/:id/calculate', '/test-sessions/:id/calculate'], (req: Request, res: Response) => {
  const session = dbTestSessions.find(s => s.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  const inst = dbInstruments.find(i => i.id === session.instrumentId) || session.instrument || dbInstruments[0];
  const rule = dbRuleVersions.find(r => r.id === session.ruleVersionId) || dbRuleVersions[0];
  const calculation = executeTestSessionCalculation(session.id, session.observations, inst, rule);
  session.calculation = calculation;
  session.status = 'calculated';
  session.updatedAt = new Date().toISOString();
  recordAuditLog(currentUser, 'CALCULATION_EXECUTED', 'test_session', session.id, rule.id, {
    overallResult: calculation.overallResult
  });
  res.json(session);
});

// Submit approval
app.post(['/api/test-sessions/:id/submit-approval', '/api/test-sessions/:id/submit', '/test-sessions/:id/submit-approval'], (req: Request, res: Response) => {
  const session = dbTestSessions.find(s => s.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  session.status = 'pending_approval';
  session.updatedAt = new Date().toISOString();
  recordAuditLog(currentUser, 'SUBMITTED_FOR_APPROVAL', 'test_session', session.id, session.ruleVersionId);
  res.json(session);
});

// Approve & Sign
app.post(['/api/test-sessions/:id/approve', '/test-sessions/:id/approve'], async (req: Request, res: Response) => {
  const session = dbTestSessions.find(s => s.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setFullYear(validUntil.getFullYear() + 1);

  const certNumber = `WS-R76-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}-${session.id.slice(-4).toUpperCase()}`;
  const verificationUrl = `https://weighsure.vercel.app/verify/${encodeURIComponent(certNumber)}`;
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, { width: 320, margin: 1 });

  session.status = 'approved';
  session.approval = {
    id: `appr_${Date.now()}`,
    testSessionId: session.id,
    approvingOfficerId: currentUser.id,
    approvingOfficerName: currentUser.name,
    approvingOfficerLicense: currentUser.licenseNumber || 'LM-VERIF-77218',
    status: 'approved',
    comments: req.body.comments || 'Metrological compliance confirmed with OIML R-76-1:2006 Table 6.',
    signatureHash: `sha256_${Date.now().toString(16)}_${Math.random().toString(16).substring(2, 10)}`,
    approvedAt: now.toISOString()
  };

  session.report = {
    id: `rep_${Date.now()}`,
    testSessionId: session.id,
    reportNumber: certNumber,
    certificateNumber: certNumber,
    signatureHash: session.approval.signatureHash,
    generatedAt: now.toISOString(),
    issuedAt: now.toISOString(),
    validUntil: validUntil.toISOString().split('T')[0],
    decision: (session.calculation?.overallResult as CalculationDecision) || 'PASS',
    summaryText: 'Instrument complies with OIML R-76 Table 6 Maximum Permissible Error (MPE) thresholds.',
    qrCodeValue: verificationUrl,
    qrCodeDataUrl,
    qrVerificationCode: certNumber,
    verificationLookupCode: certNumber,
    tamperEvidentHash: session.approval.signatureHash
  };
  session.updatedAt = now.toISOString();

  recordAuditLog(currentUser, 'CERTIFICATE_ISSUED', 'test_session', session.id, session.ruleVersionId, {
    certificateNumber: certNumber,
    officer: currentUser.name
  });

  res.json(session);
});

// Reject
app.post(['/api/test-sessions/:id/reject', '/test-sessions/:id/reject'], (req: Request, res: Response) => {
  const session = dbTestSessions.find(s => s.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  session.status = 'rejected';
  session.approval = {
    id: `appr_${Date.now()}`,
    testSessionId: session.id,
    approvingOfficerId: currentUser.id,
    approvingOfficerName: currentUser.name,
    approvingOfficerLicense: currentUser.licenseNumber || 'LM-VERIF-77218',
    status: 'rejected',
    comments: req.body.comments || 'Rejected: Does not meet OIML R-76 statutory compliance.',
    signatureHash: `reject_${Date.now().toString(16)}`,
    approvedAt: new Date().toISOString()
  };
  session.updatedAt = new Date().toISOString();
  recordAuditLog(currentUser, 'SESSION_REJECTED', 'test_session', session.id, session.ruleVersionId, {
    comments: req.body.comments
  });
  res.json(session);
});

// Attachments
app.post(['/api/test-sessions/:id/attachments', '/test-sessions/:id/attachments'], (req: Request, res: Response) => {
  const session = dbTestSessions.find(s => s.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  const body = req.body;
  const newAttachment: SessionAttachment = {
    id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    testSessionId: session.id,
    name: body.name,
    category: body.category,
    fileSize: body.fileSize || '1.2 MB',
    dataUrl: body.dataUrl,
    notes: body.notes,
    uploadedBy: currentUser.name,
    uploadedAt: new Date().toISOString()
  };
  if (!session.attachments) session.attachments = [];
  session.attachments.unshift(newAttachment);
  session.updatedAt = new Date().toISOString();

  recordAuditLog(currentUser, 'EVIDENCE_ATTACHED', 'test_session', session.id, session.ruleVersionId, {
    attachmentId: newAttachment.id,
    category: newAttachment.category,
    name: newAttachment.name
  });

  res.status(201).json(newAttachment);
});

app.delete(['/api/test-sessions/:id/attachments/:attachmentId', '/test-sessions/:id/attachments/:attachmentId'], (req: Request, res: Response) => {
  const session = dbTestSessions.find(s => s.id === req.params.id);
  if (!session || !session.attachments) {
    res.status(404).json({ error: 'Session or attachments not found' });
    return;
  }
  const attIndex = session.attachments.findIndex(a => a.id === req.params.attachmentId);
  if (attIndex === -1) {
    res.status(404).json({ error: 'Attachment not found' });
    return;
  }
  const removed = session.attachments.splice(attIndex, 1)[0];
  session.updatedAt = new Date().toISOString();

  recordAuditLog(currentUser, 'EVIDENCE_REMOVED', 'test_session', session.id, session.ruleVersionId, {
    attachmentId: req.params.attachmentId,
    name: removed.name
  });

  res.json({ success: true, removedId: req.params.attachmentId });
});

// Audit Logs
app.get(['/api/audit-logs', '/audit-logs'], (_req: Request, res: Response) => {
  res.json(dbAuditLogs);
});

// Stats
app.get(['/api/stats', '/stats'], (_req: Request, res: Response) => {
  const totalInstruments = dbInstruments.length;
  const verifiedSessions = dbTestSessions.filter(s => s.status === 'approved').length;
  const pendingSessions = dbTestSessions.filter(s => s.status === 'pending_approval' || s.status === 'calculated').length;
  res.json({
    totalInstruments,
    verifiedSessions,
    pendingSessions,
    totalAuditEntries: dbAuditLogs.length,
    activeRuleVersion: dbRuleVersions.find(r => r.isDefault)?.versionLabel || 'OIML R-76-1:2006'
  });
});

// Verify QR / Certificate Lookup
app.get(['/api/verify/:code', '/verify/:code'], (req: Request, res: Response) => {
  const code = decodeURIComponent(req.params.code).trim().toLowerCase();
  const session = dbTestSessions.find(s => {
    if (!s.report) return false;
    const cert = (s.report.certificateNumber || s.report.reportNumber || '').toLowerCase();
    const qrCode = (s.report.qrVerificationCode || s.report.verificationLookupCode || '').toLowerCase();
    const qrVal = (s.report.qrCodeValue || '').toLowerCase();
    const sessId = s.id.toLowerCase();
    return cert === code || qrCode === code || qrVal.includes(code) || sessId === code;
  });

  if (session && session.report) {
    const inst = dbInstruments.find(i => i.id === session.instrumentId) || session.instrument || dbInstruments[0];
    const lookup: VerificationLookupResult = {
      isValid: true,
      status: 'AUTHENTIC_AND_VALID',
      reportNumber: session.report.reportNumber || session.report.certificateNumber || 'WS-VERIFIED',
      certificateNumber: session.report.certificateNumber || session.report.reportNumber,
      issuedAt: session.report.issuedAt || session.report.generatedAt,
      validUntil: session.report.validUntil || '2027-03-05',
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
      verification: {
        result: session.report.decision || 'PASS',
        verifiedAt: session.report.issuedAt || session.report.generatedAt || new Date().toISOString(),
        validUntil: session.report.validUntil || '2027-03-05',
        ruleVersion: session.calculation?.ruleVersionLabel || 'OIML R-76-1:2006 Table 6',
        standard: 'OIML R-76-1:2006 (E)',
        approvingOfficer: session.approval?.approvingOfficerName || 'Dr. Selvi Rajendran',
        licenseNo: session.approval?.approvingOfficerLicense || 'OIML-VER-4012',
        signatureHash: session.report.tamperEvidentHash || session.approval?.signatureHash || 'c8b21...verified'
      },
      officer: {
        name: session.approval?.approvingOfficerName || 'Dr. Selvi Rajendran',
        license: session.approval?.approvingOfficerLicense || 'OIML-VER-4012'
      },
      tamperEvidentHash: session.report.tamperEvidentHash || session.approval?.signatureHash || 'c8b217a9...verified',
      ruleVersionLabel: session.calculation?.ruleVersionLabel || 'OIML R-76 Standard'
    };
    res.json(lookup);
    return;
  }
  res.status(404).json({ error: 'Certificate or record not found', isValid: false });
});

export default app;
