import express, { Request, Response } from 'express';
import QRCode from 'qrcode';

import {
  User,
  Instrument,
  TestSession,
  Observation,
  OimlRuleConfiguration,
  AuditLog,
  VerificationLookupResult,
  OcrExtractionResult
} from '../src/types';

import {
  INITIAL_USERS,
  INITIAL_INSTRUMENTS,
  INITIAL_RULE_VERSIONS,
  INITIAL_TEST_SESSIONS,
  INITIAL_AUDIT_LOGS
} from '../src/lib/initialData';

import { executeTestSessionCalculation } from '../src/lib/oimlEngine';

const app = express();
app.use(express.json({ limit: '20mb' }));

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

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/users', (_req: Request, res: Response) => {
  res.json(dbUsers);
});

app.get('/api/users/current', (_req: Request, res: Response) => {
  res.json(currentUser);
});

app.post('/api/users/switch-role', (req: Request, res: Response) => {
  const { userId } = req.body;
  const target = dbUsers.find(u => u.id === userId);
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  currentUser = target;
  res.json({ success: true, activeUser: currentUser });
});

app.get('/api/instruments', (_req: Request, res: Response) => {
  res.json(dbInstruments);
});

app.post('/api/instruments', (req: Request, res: Response) => {
  const data = req.body;
  const newInst: Instrument = {
    id: `inst_${Date.now()}`,
    manufacturer: data.manufacturer || 'Custom Manufacturer',
    model: data.model || 'Standard Industrial',
    serialNo: data.serialNo || `SN-${Date.now().toString().slice(-6)}`,
    accuracyClass: data.accuracyClass || 'Class III',
    maxCapacity: Number(data.maxCapacity) || 1000,
    minCapacity: Number(data.minCapacity) || (Number(data.scaleInterval_d) ? Number(data.scaleInterval_d) * 20 : 10),
    scaleInterval_d: Number(data.scaleInterval_d) || 0.1,
    verificationInterval_e: Number(data.verificationInterval_e) || Number(data.scaleInterval_d) || 0.1,
    unit: data.unit || 'g',
    customerName: data.customerName || 'Standard Client',
    createdAt: new Date().toISOString()
  };
  dbInstruments.unshift(newInst);
  recordAuditLog(currentUser, 'INSTRUMENT_REGISTERED', 'instrument', newInst.id, undefined, {
    serialNo: newInst.serialNo,
    model: newInst.model
  });
  res.status(201).json(newInst);
});

app.get('/api/rule-versions', (_req: Request, res: Response) => {
  res.json(dbRuleVersions);
});

app.get('/api/test-sessions', (_req: Request, res: Response) => {
  res.json(dbTestSessions);
});

app.post('/api/test-sessions', (req: Request, res: Response) => {
  const { instrumentId, ruleVersionId, environmentalConditions } = req.body;
  const inst = dbInstruments.find(i => i.id === instrumentId);
  if (!inst) {
    res.status(404).json({ error: 'Instrument not found' });
    return;
  }
  const newSession: TestSession = {
    id: `ts_${Date.now()}`,
    instrumentId,
    instrument: inst,
    technicianId: currentUser.id,
    technicianName: currentUser.name,
    technicianLicense: currentUser.licenseNumber || 'TECH-UNKNOWN',
    status: 'draft',
    environmentalConditions: environmentalConditions || {
      temperatureC: 20.0,
      humidityPercent: 50.0,
      pressureHpa: 1013.25,
      locationNotes: 'Standard Test Bay'
    },
    observations: [],
    attachments: [],
    ruleVersionId: ruleVersionId || dbRuleVersions[0].id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  dbTestSessions.unshift(newSession);
  recordAuditLog(currentUser, 'SESSION_CREATED', 'test_session', newSession.id, newSession.ruleVersionId);
  res.status(201).json(newSession);
});

app.get('/api/test-sessions/:id', (req: Request, res: Response) => {
  const session = dbTestSessions.find(s => s.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json(session);
});

app.put('/api/test-sessions/:id', (req: Request, res: Response) => {
  const session = dbTestSessions.find(s => s.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  if (req.body.observations) session.observations = req.body.observations;
  if (req.body.environmentalConditions) session.environmentalConditions = req.body.environmentalConditions;
  if (req.body.status) session.status = req.body.status;
  session.updatedAt = new Date().toISOString();
  res.json(session);
});

app.post('/api/test-sessions/:id/calculate', (req: Request, res: Response) => {
  const session = dbTestSessions.find(s => s.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  const inst = dbInstruments.find(i => i.id === session.instrumentId) || session.instrument;
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

app.post('/api/test-sessions/:id/submit-approval', (req: Request, res: Response) => {
  const session = dbTestSessions.find(s => s.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  session.status = 'pending_approval';
  session.updatedAt = new Date().toISOString();
  recordAuditLog(currentUser, 'SESSION_SUBMITTED_FOR_APPROVAL', 'test_session', session.id, session.ruleVersionId);
  res.json(session);
});

app.post('/api/test-sessions/:id/approve', async (req: Request, res: Response) => {
  const session = dbTestSessions.find(s => s.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  const inst = dbInstruments.find(i => i.id === session.instrumentId) || session.instrument;
  const { comments } = req.body;
  const now = new Date();
  const certNumber = `CERT-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const qrValue = `https://weighsure.metrology.gov.in/verify/${certNumber}`;
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(qrValue, { margin: 2, width: 260 });
  } catch {}

  session.status = 'approved';
  session.approval = {
    id: `appr_${Date.now()}`,
    testSessionId: session.id,
    approvingOfficerId: currentUser.id,
    approvingOfficerName: currentUser.name,
    approvingOfficerLicense: currentUser.licenseNumber || 'OIML-VER-OFFICER',
    status: 'approved',
    comments: comments || 'Verified in compliance with OIML R-76 statutory standards.',
    signatureHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    approvedAt: now.toISOString()
  };

  const validUntil = new Date(now);
  validUntil.setFullYear(validUntil.getFullYear() + 1);

  session.report = {
    id: `rep_${Date.now()}`,
    testSessionId: session.id,
    reportNumber: certNumber,
    certificateNumber: certNumber,
    signatureHash: session.approval.signatureHash,
    generatedAt: now.toISOString(),
    issuedAt: now.toISOString(),
    validUntil: validUntil.toISOString().split('T')[0],
    decision: session.calculation?.overallResult || 'PASS',
    summaryText: session.calculation?.summaryText || 'Instrument passed all metrological tests.',
    qrCodeValue: qrValue,
    qrCodeDataUrl,
    verificationLookupCode: certNumber,
    tamperEvidentHash: 'a89c7d42f9b231ea4510bcde8912ef45'
  };

  session.updatedAt = now.toISOString();
  recordAuditLog(currentUser, 'SESSION_APPROVED', 'test_session', session.id, session.ruleVersionId, {
    certificateNumber: certNumber
  });
  res.json(session);
});

app.post('/api/test-sessions/:id/reject', (req: Request, res: Response) => {
  const session = dbTestSessions.find(s => s.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  const { comments } = req.body;
  session.status = 'rejected';
  session.approval = {
    id: `appr_${Date.now()}`,
    testSessionId: session.id,
    approvingOfficerId: currentUser.id,
    approvingOfficerName: currentUser.name,
    approvingOfficerLicense: currentUser.licenseNumber || 'OIML-VER-OFFICER',
    status: 'rejected',
    comments: comments || 'Non-compliance detected.',
    signatureHash: '',
    approvedAt: new Date().toISOString()
  };
  session.updatedAt = new Date().toISOString();
  recordAuditLog(currentUser, 'SESSION_REJECTED', 'test_session', session.id, session.ruleVersionId, { comments });
  res.json(session);
});

app.get('/api/audit-logs', (_req: Request, res: Response) => {
  res.json(dbAuditLogs);
});

app.get('/api/stats', (_req: Request, res: Response) => {
  res.json({
    totalSessions: dbTestSessions.length,
    pendingApprovals: dbTestSessions.filter(s => s.status === 'pending_approval').length,
    approvedCount: dbTestSessions.filter(s => s.status === 'approved').length,
    rejectedCount: dbTestSessions.filter(s => s.status === 'rejected').length,
    totalInstruments: dbInstruments.length,
    totalAuditLogs: dbAuditLogs.length,
    currentRole: currentUser.role,
    activeRulesCount: dbRuleVersions.length
  });
});

app.get('/api/verify/:code', (req: Request, res: Response) => {
  const code = req.params.code.trim();
  const session = dbTestSessions.find(s => 
    s.id === code || 
    s.report?.certificateNumber === code || 
    s.report?.qrCodeValue === code ||
    s.report?.verificationLookupCode === code
  );
  if (session && session.report) {
    const inst = dbInstruments.find(i => i.id === session.instrumentId) || session.instrument;
    const lookup: VerificationLookupResult = {
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
    res.json(lookup);
    return;
  }
  res.status(404).json({ error: 'Certificate or record not found', isValid: false });
});

export default app;
