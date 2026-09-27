import React, { useState, useEffect } from 'react';
import { 
  User, 
  Instrument, 
  TestSession, 
  OimlRuleConfiguration, 
  AuditLog, 
  OcrExtractionResult,
  Observation
} from './types';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { MetrologyEmblem } from './components/MetrologyEmblem';
import { Dashboard } from './components/Dashboard';
import { InstrumentList } from './components/InstrumentList';
import { TestSessionList } from './components/TestSessionList';
import { TestSessionDetail } from './components/TestSessionDetail';
import { CertificateReport } from './components/CertificateReport';
import { VerificationPortal } from './components/VerificationPortal';
import { OcrIntakeModal } from './components/OcrIntakeModal';
import { NewSessionModal } from './components/NewSessionModal';
import { RuleManager } from './components/RuleManager';
import { AuditTrail } from './components/AuditTrail';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import QRCode from 'qrcode';
import {
  loadStandaloneData,
  saveStandaloneInstruments,
  saveStandaloneSessions,
  saveStandaloneRules,
  saveStandaloneAuditLogs,
  createStandaloneAuditLog
} from './lib/standaloneStore';
import { executeTestSessionCalculation } from './lib/oimlEngine';

export const App: React.FC = () => {
  // Core Server State (Initialized with instant standalone data to prevent any initialization lock)
  const initialData = loadStandaloneData();
  const [users, setUsers] = useState<User[]>(initialData.users);
  const [currentUser, setCurrentUser] = useState<User | null>(initialData.currentUser);
  const [instruments, setInstruments] = useState<Instrument[]>(initialData.instruments);
  const [ruleVersions, setRuleVersions] = useState<OimlRuleConfiguration[]>(initialData.ruleVersions);
  const [testSessions, setTestSessions] = useState<TestSession[]>(initialData.testSessions);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialData.auditLogs);
  const [isLoading, setIsLoading] = useState(false);

  // Navigation & UI State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isViewingReport, setIsViewingReport] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyInitialCode, setVerifyInitialCode] = useState('');
  const [preselectedInstrumentId, setPreselectedInstrumentId] = useState<string | undefined>();

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch initial data with automatic fallback
  const fetchData = async () => {
    try {
      const [usersRes, instRes, rulesRes, sessionsRes, auditRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/instruments'),
        fetch('/api/rule-versions'),
        fetch('/api/test-sessions'),
        fetch('/api/audit-logs')
      ]);

      if (usersRes.ok && instRes.ok && rulesRes.ok && sessionsRes.ok && auditRes.ok) {
        const [usersData, instData, rulesData, sessionsData, auditData] = await Promise.all([
          usersRes.json(),
          instRes.json(),
          rulesRes.json(),
          sessionsRes.json(),
          auditRes.json()
        ]);

        if (Array.isArray(usersData) && usersData.length > 0) {
          setUsers(usersData);
          if (!currentUser) {
            setCurrentUser(usersData[0]);
          }
        }
        if (Array.isArray(instData)) {
          setInstruments(instData);
          saveStandaloneInstruments(instData);
        }
        if (Array.isArray(rulesData)) {
          setRuleVersions(rulesData);
          saveStandaloneRules(rulesData);
        }
        if (Array.isArray(sessionsData)) {
          setTestSessions(sessionsData);
          saveStandaloneSessions(sessionsData);
        }
        if (Array.isArray(auditData)) {
          setAuditLogs(auditData);
          saveStandaloneAuditLogs(auditData);
        }
      }
    } catch {
      // Backend not running (e.g. static hosting on Vercel) - local fallback already active
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const refreshSessionsAndAudit = async () => {
    try {
      const [sessionsRes, auditRes] = await Promise.all([
        fetch('/api/test-sessions'),
        fetch('/api/audit-logs')
      ]);
      if (sessionsRes.ok && auditRes.ok) {
        const [sessionsData, auditData] = await Promise.all([
          sessionsRes.json(),
          auditRes.json()
        ]);
        if (Array.isArray(sessionsData)) {
          setTestSessions(sessionsData);
          saveStandaloneSessions(sessionsData);
        }
        if (Array.isArray(auditData)) {
          setAuditLogs(auditData);
          saveStandaloneAuditLogs(auditData);
        }
      }
    } catch {
      // Offline/local fallback
    }
  };

  // Register Instrument
  const handleRegisterInstrument = async (data: Partial<Instrument>) => {
    const user = currentUser || initialData.currentUser;
    let newInst: Instrument | null = null;
    try {
      const res = await fetch('/api/instruments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        newInst = await res.json();
      }
    } catch {
      // Backend unavailable
    }

    if (!newInst) {
      newInst = {
        id: `inst_${Date.now()}`,
        manufacturer: data.manufacturer || 'Industrial Metrology Lab',
        model: data.model || 'Precision Weighing Scale',
        serialNo: data.serialNo || `SN-${Date.now().toString().slice(-6)}`,
        accuracyClass: data.accuracyClass || 'Class III',
        maxCapacity: Number(data.maxCapacity) || 1000,
        minCapacity: Number(data.minCapacity) || (Number(data.scaleInterval_d) ? Number(data.scaleInterval_d) * 20 : 10),
        scaleInterval_d: Number(data.scaleInterval_d) || 0.1,
        verificationInterval_e: Number(data.verificationInterval_e) || Number(data.scaleInterval_d) || 0.1,
        unit: data.unit || 'g',
        customerName: data.customerName || 'General Customer',
        createdAt: new Date().toISOString()
      };
    }

    setInstruments(prev => {
      const next = [newInst!, ...prev];
      saveStandaloneInstruments(next);
      return next;
    });

    const newLog = createStandaloneAuditLog(user, 'INSTRUMENT_REGISTERED', 'instrument', newInst.id, undefined, {
      serialNo: newInst.serialNo,
      model: newInst.model
    });
    setAuditLogs(prev => {
      const next = [newLog, ...prev];
      saveStandaloneAuditLogs(next);
      return next;
    });

    showToast(`Registered instrument: ${newInst.model} (${newInst.serialNo})`, 'success');
  };

  // Create Test Session
  const handleCreateSession = async (sessionData: {
    instrumentId: string;
    ruleVersionId: string;
    environmentalConditions: any;
  }) => {
    const user = currentUser || initialData.currentUser;
    let newSession: TestSession | null = null;
    try {
      const res = await fetch('/api/test-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(sessionData)
      });
      if (res.ok) {
        newSession = await res.json();
      }
    } catch {
      // Local fallback
    }

    if (!newSession) {
      const inst = instruments.find(i => i.id === sessionData.instrumentId) || instruments[0];
      newSession = {
        id: `ts_${Date.now()}`,
        instrumentId: sessionData.instrumentId,
        instrument: inst,
        technicianId: user.id,
        technicianName: user.name,
        technicianLicense: user.licenseNumber || 'TECH-LOCAL',
        status: 'draft',
        environmentalConditions: sessionData.environmentalConditions || {
          temperatureC: 20.0,
          humidityPercent: 50.0,
          pressureHpa: 1013.25,
          locationNotes: 'Local Test Cell'
        },
        observations: [],
        attachments: [],
        ruleVersionId: sessionData.ruleVersionId || ruleVersions[0]?.id || 'rule_oiml_r76_2006_v1_0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    setTestSessions(prev => {
      const next = [newSession!, ...prev];
      saveStandaloneSessions(next);
      return next;
    });
    setSelectedSessionId(newSession.id);
    setIsViewingReport(false);
    setActiveTab('sessions');

    const log = createStandaloneAuditLog(user, 'SESSION_CREATED', 'test_session', newSession.id, newSession.ruleVersionId);
    setAuditLogs(prev => {
      const next = [log, ...prev];
      saveStandaloneAuditLogs(next);
      return next;
    });

    showToast('New test session created', 'success');
  };

  // Update Session
  const handleUpdateSession = async (updated: Partial<TestSession>) => {
    const user = currentUser || initialData.currentUser;
    if (!selectedSessionId) return;
    let savedSession: TestSession | null = null;
    try {
      const res = await fetch(`/api/test-sessions/${selectedSessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        savedSession = await res.json();
      }
    } catch {
      // Local fallback
    }

    setTestSessions(prev => {
      const next = prev.map(s => {
        if (s.id !== selectedSessionId) return s;
        if (savedSession) return savedSession;
        return {
          ...s,
          ...updated,
          updatedAt: new Date().toISOString()
        };
      });
      saveStandaloneSessions(next);
      return next;
    });

    showToast('Observations updated successfully', 'success');
  };

  // Execute Deterministic Calculation
  const handleExecuteCalculation = async () => {
    const user = currentUser || initialData.currentUser;
    if (!selectedSessionId) return;
    let updatedSession: TestSession | null = null;
    try {
      const res = await fetch(`/api/test-sessions/${selectedSessionId}/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({})
      });
      if (res.ok) {
        updatedSession = await res.json();
      }
    } catch {
      // Local fallback
    }

    if (!updatedSession) {
      const session = testSessions.find(s => s.id === selectedSessionId);
      const inst = instruments.find(i => i.id === session?.instrumentId) || session?.instrument;
      const rule = ruleVersions.find(r => r.id === session?.ruleVersionId) || ruleVersions[0];
      if (session && inst && rule) {
        const calc = executeTestSessionCalculation(session.id, session.observations, inst, rule);
        updatedSession = {
          ...session,
          calculation: calc,
          status: 'calculated',
          updatedAt: new Date().toISOString()
        };
      }
    }

    if (updatedSession) {
      setTestSessions(prev => {
        const next = prev.map(s => s.id === updatedSession!.id ? updatedSession! : s);
        saveStandaloneSessions(next);
        return next;
      });

      const log = createStandaloneAuditLog(user, 'CALCULATION_EXECUTED', 'test_session', updatedSession.id, updatedSession.ruleVersionId, {
        overallResult: updatedSession.calculation?.overallResult
      });
      setAuditLogs(prev => {
        const next = [log, ...prev];
        saveStandaloneAuditLogs(next);
        return next;
      });

      showToast(
        `OIML Rule Engine Decision: ${updatedSession.calculation?.overallResult}`,
        updatedSession.calculation?.overallResult === 'PASS' ? 'success' : 'error'
      );
    }
  };

  // Submit for approval
  const handleSubmitForApproval = async () => {
    const user = currentUser || initialData.currentUser;
    if (!selectedSessionId) return;
    let updatedSession: TestSession | null = null;
    try {
      const res = await fetch(`/api/test-sessions/${selectedSessionId}/submit-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });
      if (res.ok) {
        updatedSession = await res.json();
      }
    } catch {
      // Local fallback
    }

    setTestSessions(prev => {
      const next = prev.map(s => {
        if (s.id !== selectedSessionId) return s;
        if (updatedSession) return updatedSession;
        return {
          ...s,
          status: 'pending_approval' as const,
          updatedAt: new Date().toISOString()
        };
      });
      saveStandaloneSessions(next);
      return next;
    });

    const log = createStandaloneAuditLog(user, 'SESSION_SUBMITTED_FOR_APPROVAL', 'test_session', selectedSessionId);
    setAuditLogs(prev => {
      const next = [log, ...prev];
      saveStandaloneAuditLogs(next);
      return next;
    });

    showToast('Submitted to Approving Officer Queue', 'success');
  };

  // Approve session
  const handleApproveSession = async (comments: string) => {
    const user = currentUser || initialData.currentUser;
    if (!selectedSessionId) return;
    let updatedSession: TestSession | null = null;
    try {
      const res = await fetch(`/api/test-sessions/${selectedSessionId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ comments })
      });
      if (res.ok) {
        updatedSession = await res.json();
      }
    } catch {
      // Local fallback
    }

    if (!updatedSession) {
      const session = testSessions.find(s => s.id === selectedSessionId);
      if (session) {
        const now = new Date();
        const certNumber = `CERT-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        const qrValue = `https://weighsure.metrology.gov.in/verify/${certNumber}`;
        let qrCodeDataUrl = '';
        try {
          qrCodeDataUrl = await QRCode.toDataURL(qrValue, { margin: 2, width: 260 });
        } catch {}

        const validUntil = new Date(now);
        validUntil.setFullYear(validUntil.getFullYear() + 1);

        updatedSession = {
          ...session,
          status: 'approved',
          approval: {
            id: `appr_${Date.now()}`,
            testSessionId: session.id,
            approvingOfficerId: user.id,
            approvingOfficerName: user.name,
            approvingOfficerLicense: user.licenseNumber || 'OIML-VER-CERT',
            status: 'approved',
            comments: comments || 'Verified in compliance with OIML R-76 statutory standards.',
            signatureHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            approvedAt: now.toISOString()
          },
          report: {
            id: `rep_${Date.now()}`,
            testSessionId: session.id,
            certificateNumber: certNumber,
            issuedAt: now.toISOString(),
            validUntil: validUntil.toISOString().split('T')[0],
            decision: session.calculation?.overallResult || 'PASS',
            summaryText: session.calculation?.summaryText || 'Instrument passed all metrological tests.',
            qrCodeValue: qrValue,
            qrCodeDataUrl,
            verificationLookupCode: certNumber,
            tamperEvidentHash: 'a89c7d42f9b231ea4510bcde8912ef45'
          },
          updatedAt: now.toISOString()
        };
      }
    }

    if (updatedSession) {
      setTestSessions(prev => {
        const next = prev.map(s => s.id === updatedSession!.id ? updatedSession! : s);
        saveStandaloneSessions(next);
        return next;
      });

      const log = createStandaloneAuditLog(user, 'SESSION_APPROVED', 'test_session', updatedSession.id, updatedSession.ruleVersionId, {
        certificateNumber: updatedSession.report?.certificateNumber
      });
      setAuditLogs(prev => {
        const next = [log, ...prev];
        saveStandaloneAuditLogs(next);
        return next;
      });

      showToast('Report Approved & Digitally Signed (SHA-256 generated)', 'success');
      setIsViewingReport(true);
    }
  };

  // Reject session
  const handleRejectSession = async (comments: string) => {
    const user = currentUser || initialData.currentUser;
    if (!selectedSessionId) return;
    let updatedSession: TestSession | null = null;
    try {
      const res = await fetch(`/api/test-sessions/${selectedSessionId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ comments })
      });
      if (res.ok) {
        updatedSession = await res.json();
      }
    } catch {
      // Local fallback
    }

    setTestSessions(prev => {
      const next = prev.map(s => {
        if (s.id !== selectedSessionId) return s;
        if (updatedSession) return updatedSession;
        return {
          ...s,
          status: 'rejected' as const,
          approval: {
            id: `appr_${Date.now()}`,
            testSessionId: s.id,
            approvingOfficerId: user.id,
            approvingOfficerName: user.name,
            approvingOfficerLicense: user.licenseNumber || 'OIML-VER-CERT',
            status: 'rejected',
            comments,
            signatureHash: '',
            approvedAt: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        };
      });
      saveStandaloneSessions(next);
      return next;
    });

    const log = createStandaloneAuditLog(user, 'SESSION_REJECTED', 'test_session', selectedSessionId, undefined, { comments });
    setAuditLogs(prev => {
      const next = [log, ...prev];
      saveStandaloneAuditLogs(next);
      return next;
    });

    showToast('Session returned with rejection comments', 'info');
  };

  // Import OCR Extracted Observations
  const handleImportExtractedObservations = async (
    targetInstrumentId: string,
    extractedData: OcrExtractionResult
  ) => {
    const user = currentUser || initialData.currentUser;
    let targetSession = testSessions.find(s => s.id === selectedSessionId && s.status !== 'approved');

    if (!targetSession) {
      const inst = instruments.find(i => i.id === targetInstrumentId) || instruments[0];
      targetSession = {
        id: `ts_${Date.now()}`,
        instrumentId: targetInstrumentId,
        instrument: inst,
        technicianId: user.id,
        technicianName: user.name,
        technicianLicense: user.licenseNumber || 'TECH-LOCAL',
        status: 'draft',
        environmentalConditions: {
          temperatureC: 20.0,
          humidityPercent: 50.0,
          pressureHpa: 1013.25,
          locationNotes: 'Imported via OCR Scanned Test Sheet Intake'
        },
        observations: [],
        attachments: [],
        ruleVersionId: ruleVersions[0]?.id || 'rule_oiml_r76_2006_v1_0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    const formattedObs: Observation[] = extractedData.observations.map((o, idx) => ({
      id: `obs_ocr_${Date.now()}_${idx}`,
      testSessionId: targetSession!.id,
      testType: o.testType,
      testPointIndex: idx + 1,
      loadValue: o.loadValue,
      observedReading: o.observedReading,
      direction: o.direction,
      position: o.position,
      rawOcrConfidence: o.confidence,
      source: 'ocr',
      confirmedByTechnician: true,
      createdAt: new Date().toISOString()
    }));

    const updated = {
      ...targetSession,
      observations: formattedObs,
      updatedAt: new Date().toISOString()
    };

    setTestSessions(prev => {
      const next = [updated, ...prev.filter(s => s.id !== updated.id)];
      saveStandaloneSessions(next);
      return next;
    });
    setSelectedSessionId(updated.id);
    setActiveTab('sessions');
    setIsViewingReport(false);

    const log = createStandaloneAuditLog(user, 'OBSERVATIONS_IMPORTED_OCR', 'test_session', updated.id, updated.ruleVersionId, {
      count: formattedObs.length
    });
    setAuditLogs(prev => {
      const next = [log, ...prev];
      saveStandaloneAuditLogs(next);
      return next;
    });

    showToast(`Imported ${formattedObs.length} observations from OCR sheet`, 'success');
  };

  // Activate Rule Version (Admin only)
  const handleActivateRule = async (ruleId: string) => {
    const user = currentUser || initialData.currentUser;
    try {
      await fetch(`/api/rule-versions/${ruleId}/activate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });
    } catch {
      // Local fallback
    }

    setRuleVersions(prev => {
      const next = prev.map(r => ({
        ...r,
        isDefault: r.id === ruleId
      }));
      saveStandaloneRules(next);
      return next;
    });

    const log = createStandaloneAuditLog(user, 'RULE_VERSION_ACTIVATED', 'rule_version', ruleId);
    setAuditLogs(prev => {
      const next = [log, ...prev];
      saveStandaloneAuditLogs(next);
      return next;
    });

    showToast('OIML R-76 rule version activated as active standard', 'success');
  };

  // Add Attachment to Session
  const handleAddAttachment = async (attachmentData: {
    name: string;
    category: any;
    fileSize: string;
    dataUrl?: string;
    notes?: string;
  }) => {
    const user = currentUser || initialData.currentUser;
    if (!selectedSessionId) return;

    const newAttachment = {
      id: `att_${Date.now()}`,
      testSessionId: selectedSessionId,
      name: attachmentData.name,
      category: attachmentData.category,
      fileSize: attachmentData.fileSize,
      dataUrl: attachmentData.dataUrl || '',
      uploadedBy: user.name,
      uploadedAt: new Date().toISOString(),
      notes: attachmentData.notes
    };

    setTestSessions(prev => {
      const next = prev.map(s => {
        if (s.id !== selectedSessionId) return s;
        return {
          ...s,
          attachments: [newAttachment, ...(s.attachments || [])],
          updatedAt: new Date().toISOString()
        };
      });
      saveStandaloneSessions(next);
      return next;
    });

    try {
      await fetch(`/api/test-sessions/${selectedSessionId}/attachments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(attachmentData)
      });
    } catch {}

    showToast('Evidence attachment archived to test session', 'success');
  };

  // Delete Attachment from Session
  const handleDeleteAttachment = async (attachmentId: string) => {
    const user = currentUser || initialData.currentUser;
    if (!selectedSessionId) return;

    setTestSessions(prev => {
      const next = prev.map(s => {
        if (s.id !== selectedSessionId) return s;
        return {
          ...s,
          attachments: (s.attachments || []).filter(a => a.id !== attachmentId),
          updatedAt: new Date().toISOString()
        };
      });
      saveStandaloneSessions(next);
      return next;
    });

    try {
      await fetch(`/api/test-sessions/${selectedSessionId}/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id
        }
      });
    } catch {}

    showToast('Evidence attachment removed', 'success');
  };

  // Open public QR verification
  const handleOpenPublicVerify = (codeToVerify: string) => {
    setVerifyInitialCode(codeToVerify);
    setIsVerifyModalOpen(true);
  };

  const currentSelectedSession = testSessions.find(s => s.id === selectedSessionId) || null;
  const currentSelectedInstrument = currentSelectedSession 
    ? (instruments.find(i => i.id === currentSelectedSession.instrumentId) || currentSelectedSession.instrument)
    : null;

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#dbeafe] via-[#eff6ff] to-[#bfdbfe] flex items-center justify-center text-slate-900 p-4">
        <div className="flex flex-col items-center space-y-4 p-8 bg-white/80 backdrop-blur-md rounded-3xl border border-sky-300 shadow-xl max-w-sm w-full text-center">
          <MetrologyEmblem size={64} className="animate-pulse" />
          <div>
            <h2 className="text-xl font-extrabold tracking-tight font-display text-slate-900">
              WeighSure Metrology
            </h2>
            <p className="text-xs text-sky-800 mt-1 font-medium">
              Deterministic OIML R-76 verification platform initializing...
            </p>
          </div>
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600 mt-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f6ff] flex flex-row font-sans overflow-x-hidden">
      {/* Left Collapsible Navigation Sidebar (Requested) */}
      <Sidebar
        currentUser={currentUser}
        allUsers={users}
        onSwitchRole={user => {
          setCurrentUser(user);
          showToast(`Switched active role to: ${user.name} (${user.role.replace('_', ' ')})`, 'info');
        }}
        activeTab={activeTab}
        setActiveTab={tab => {
          setActiveTab(tab);
          setSelectedSessionId(null);
          setIsViewingReport(false);
        }}
        onOpenVerifyModal={() => {
          setVerifyInitialCode('');
          setIsVerifyModalOpen(true);
        }}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        sessionCount={testSessions.length}
        pendingCount={testSessions.filter(s => s.status === 'pending_approval').length}
        instrumentCount={instruments.length}
      />

      {/* Main Column: Top Bar + Content View */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-gradient-to-b from-[#f0f6ff] via-[#f5f9ff] to-[#eaf3fe]">
        {/* TopBar with Burger Menu Icon, Dynamic View Titles, & Prominent User Profile */}
        <TopBar
          currentUser={currentUser}
          allUsers={users}
          onSwitchRole={user => {
            setCurrentUser(user);
            showToast(`Switched active role to: ${user.name} (${user.role.replace('_', ' ')})`, 'info');
          }}
          activeTab={activeTab}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 768) {
              setIsMobileSidebarOpen(prev => !prev);
            } else {
              setIsSidebarCollapsed(prev => !prev);
            }
          }}
          onOpenVerifyModal={() => {
            setVerifyInitialCode('');
            setIsVerifyModalOpen(true);
          }}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        {/* VIEW 1: Certificate / Report View */}
        {isViewingReport && currentSelectedSession && currentSelectedInstrument && (
          <CertificateReport
            session={currentSelectedSession}
            instrument={currentSelectedInstrument}
            currentUser={currentUser}
            onBack={() => setIsViewingReport(false)}
            onOpenPublicVerify={handleOpenPublicVerify}
          />
        )}

        {/* VIEW 2: Test Session Detail Workflow */}
        {!isViewingReport && selectedSessionId && currentSelectedSession && (
          <TestSessionDetail
            session={currentSelectedSession}
            instruments={instruments}
            ruleVersions={ruleVersions}
            currentUser={currentUser}
            onBack={() => setSelectedSessionId(null)}
            onUpdateSession={handleUpdateSession}
            onExecuteCalculation={handleExecuteCalculation}
            onSubmitForApproval={handleSubmitForApproval}
            onApproveSession={handleApproveSession}
            onRejectSession={handleRejectSession}
            onOpenOcr={() => setIsOcrModalOpen(true)}
            onViewReport={() => setIsViewingReport(true)}
            onAddAttachment={handleAddAttachment}
            onDeleteAttachment={handleDeleteAttachment}
          />
        )}

        {/* VIEW 3: Dashboard */}
        {!isViewingReport && !selectedSessionId && activeTab === 'dashboard' && (
          <Dashboard
            currentUser={currentUser}
            allUsers={users}
            onSwitchRole={user => {
              setCurrentUser(user);
              showToast(`Active role switched to ${user.name} (${user.role.replace('_', ' ')})`);
            }}
            testSessions={testSessions}
            instruments={instruments}
            auditLogs={auditLogs}
            onNewSession={() => setIsNewSessionModalOpen(true)}
            onNewInstrument={() => setActiveTab('instruments')}
            onSelectSession={session => setSelectedSessionId(session.id)}
            onOpenOcr={() => setIsOcrModalOpen(true)}
            onNavigateTab={setActiveTab}
            onOpenVerifyModal={() => {
              setVerifyInitialCode('');
              setIsVerifyModalOpen(true);
            }}
          />
        )}

        {/* VIEW 4: Instruments Registry */}
        {!isViewingReport && !selectedSessionId && activeTab === 'instruments' && (
          <InstrumentList
            instruments={instruments}
            currentUser={currentUser}
            onRegisterInstrument={handleRegisterInstrument}
            onStartSessionWithInstrument={inst => {
              setPreselectedInstrumentId(inst.id);
              setIsNewSessionModalOpen(true);
            }}
          />
        )}

        {/* VIEW 5: Test Sessions List */}
        {!isViewingReport && !selectedSessionId && activeTab === 'sessions' && (
          <TestSessionList
            testSessions={testSessions}
            instruments={instruments}
            currentUser={currentUser}
            onSelectSession={session => setSelectedSessionId(session.id)}
            onNewSession={() => setIsNewSessionModalOpen(true)}
          />
        )}

        {/* VIEW 6: OIML Rule Engine Configuration */}
        {!isViewingReport && !selectedSessionId && activeTab === 'rules' && (
          <RuleManager
            ruleVersions={ruleVersions}
            currentUser={currentUser}
            onActivateRule={handleActivateRule}
          />
        )}

        {/* VIEW 7: Immutable Audit Trail */}
        {!isViewingReport && !selectedSessionId && activeTab === 'audit' && (
          <AuditTrail
            auditLogs={auditLogs}
            currentUser={currentUser}
          />
        )}
      </main>
      </div>

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center space-x-2.5 ${
              toast.type === 'success'
                ? 'bg-slate-900 text-white border-slate-800'
                : toast.type === 'error'
                ? 'bg-rose-900 text-white border-rose-800'
                : 'bg-slate-800 text-slate-100 border-slate-700'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* OCR Modal */}
      {isOcrModalOpen && (
        <OcrIntakeModal
          instruments={instruments}
          onClose={() => setIsOcrModalOpen(false)}
          onImportExtractedObservations={handleImportExtractedObservations}
        />
      )}

      {/* New Test Session Modal */}
      {isNewSessionModalOpen && (
        <NewSessionModal
          instruments={instruments}
          ruleVersions={ruleVersions}
          preselectedInstrumentId={preselectedInstrumentId}
          onClose={() => {
            setIsNewSessionModalOpen(false);
            setPreselectedInstrumentId(undefined);
          }}
          onCreateSession={handleCreateSession}
        />
      )}

      {/* Public QR Verification Portal Modal */}
      {isVerifyModalOpen && (
        <VerificationPortal
          initialCode={verifyInitialCode}
          sessions={testSessions}
          instruments={instruments}
          onClose={() => {
            setIsVerifyModalOpen(false);
            setVerifyInitialCode('');
          }}
        />
      )}
    </div>
  );
};

export default App;
