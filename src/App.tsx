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

export const App: React.FC = () => {
  // Core Server State
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [ruleVersions, setRuleVersions] = useState<OimlRuleConfiguration[]>([]);
  const [testSessions, setTestSessions] = useState<TestSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  // Fetch initial data
  const fetchData = async () => {
    try {
      const [usersRes, instRes, rulesRes, sessionsRes, auditRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/instruments'),
        fetch('/api/rule-versions'),
        fetch('/api/test-sessions'),
        fetch('/api/audit-logs')
      ]);

      const [usersData, instData, rulesData, sessionsData, auditData] = await Promise.all([
        usersRes.json(),
        instRes.json(),
        rulesRes.json(),
        sessionsRes.json(),
        auditRes.json()
      ]);

      setUsers(usersData);
      if (!currentUser && usersData.length > 0) {
        // Default to Technician Marco Rossi for initial testing
        setCurrentUser(usersData[0]);
      }
      setInstruments(instData);
      setRuleVersions(rulesData);
      setTestSessions(sessionsData);
      setAuditLogs(auditData);
    } catch (err) {
      console.error('Failed to load initial data:', err);
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
      const [sessionsData, auditData] = await Promise.all([
        sessionsRes.json(),
        auditRes.json()
      ]);
      setTestSessions(sessionsData);
      setAuditLogs(auditData);
    } catch (err) {
      console.error(err);
    }
  };

  // Register Instrument
  const handleRegisterInstrument = async (data: Partial<Instrument>) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/instruments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to register instrument');
      const newInst = await res.json();
      setInstruments(prev => [newInst, ...prev]);
      await refreshSessionsAndAudit();
      showToast(`Registered instrument: ${newInst.model} (${newInst.serialNo})`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Error registering instrument', 'error');
    }
  };

  // Create Test Session
  const handleCreateSession = async (sessionData: {
    instrumentId: string;
    ruleVersionId: string;
    environmentalConditions: any;
  }) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/test-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify(sessionData)
      });
      if (!res.ok) throw new Error('Failed to create session');
      const newSession: TestSession = await res.json();
      setTestSessions(prev => [newSession, ...prev]);
      setSelectedSessionId(newSession.id);
      setIsViewingReport(false);
      setActiveTab('sessions');
      await refreshSessionsAndAudit();
      showToast('New test session created', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error creating test session', 'error');
    }
  };

  // Update Session
  const handleUpdateSession = async (updated: Partial<TestSession>) => {
    if (!currentUser || !selectedSessionId) return;
    try {
      const res = await fetch(`/api/test-sessions/${selectedSessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify(updated)
      });
      if (!res.ok) throw new Error('Failed to update session');
      const savedSession: TestSession = await res.json();
      setTestSessions(prev => prev.map(s => s.id === savedSession.id ? savedSession : s));
      await refreshSessionsAndAudit();
      showToast('Observations updated successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error updating session', 'error');
    }
  };

  // Execute Deterministic Calculation
  const handleExecuteCalculation = async () => {
    if (!currentUser || !selectedSessionId) return;
    try {
      const res = await fetch(`/api/test-sessions/${selectedSessionId}/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({})
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Calculation failed');
      }
      const updatedSession: TestSession = await res.json();
      setTestSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
      await refreshSessionsAndAudit();
      showToast(
        `OIML Rule Engine Decision: ${updatedSession.calculation?.overallResult}`,
        updatedSession.calculation?.overallResult === 'PASS' ? 'success' : 'error'
      );
    } catch (err: any) {
      showToast(err.message || 'Error executing calculation', 'error');
    }
  };

  // Submit for approval
  const handleSubmitForApproval = async () => {
    if (!currentUser || !selectedSessionId) return;
    try {
      const res = await fetch(`/api/test-sessions/${selectedSessionId}/submit-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        }
      });
      if (!res.ok) throw new Error('Failed to submit');
      const updatedSession: TestSession = await res.json();
      setTestSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
      await refreshSessionsAndAudit();
      showToast('Submitted to Approving Officer Queue', 'success');
    } catch (err: any) {
      showToast(err.message || 'Submission error', 'error');
    }
  };

  // Approve session
  const handleApproveSession = async (comments: string) => {
    if (!currentUser || !selectedSessionId) return;
    try {
      const res = await fetch(`/api/test-sessions/${selectedSessionId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({ comments })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Approval failed');
      }
      const updatedSession: TestSession = await res.json();
      setTestSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
      await refreshSessionsAndAudit();
      showToast('Report Approved & Digitally Signed (SHA-256 generated)', 'success');
      setIsViewingReport(true);
    } catch (err: any) {
      showToast(err.message || 'Approval error', 'error');
    }
  };

  // Reject session
  const handleRejectSession = async (comments: string) => {
    if (!currentUser || !selectedSessionId) return;
    try {
      const res = await fetch(`/api/test-sessions/${selectedSessionId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({ comments })
      });
      if (!res.ok) throw new Error('Rejection failed');
      const updatedSession: TestSession = await res.json();
      setTestSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
      await refreshSessionsAndAudit();
      showToast('Session returned with rejection comments', 'info');
    } catch (err: any) {
      showToast(err.message || 'Rejection error', 'error');
    }
  };

  // Import OCR Extracted Observations
  const handleImportExtractedObservations = async (
    targetInstrumentId: string,
    extractedData: OcrExtractionResult
  ) => {
    if (!currentUser) return;
    try {
      // If we are currently viewing an unapproved session for this instrument, append or replace
      let targetSession = testSessions.find(s => s.id === selectedSessionId && s.status !== 'approved');

      if (!targetSession) {
        // Create new session for this instrument
        const sessionRes = await fetch('/api/test-sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id
          },
          body: JSON.stringify({
            instrumentId: targetInstrumentId,
            ruleVersionId: ruleVersions[0]?.id || 'oiml-r76-2006-table6-initial',
            environmentalConditions: {
              temperatureC: 20.0,
              humidityPercent: 50.0,
              pressureHpa: 1013.25,
              locationNotes: 'Imported via OCR Scanned Test Sheet Intake'
            }
          })
        });
        targetSession = await sessionRes.json();
      }

      // Convert OCR observations to confirmed test observations
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

      // Update session with imported observations
      const updateRes = await fetch(`/api/test-sessions/${targetSession!.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({
          observations: formattedObs
        })
      });

      const updated = await updateRes.json();
      setTestSessions(prev => [updated, ...prev.filter(s => s.id !== updated.id)]);
      setSelectedSessionId(updated.id);
      setActiveTab('sessions');
      setIsViewingReport(false);
      await refreshSessionsAndAudit();
      showToast(`Imported ${formattedObs.length} observations from OCR sheet`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Error importing OCR data', 'error');
    }
  };

  // Activate Rule Version (Admin only)
  const handleActivateRule = async (ruleId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/rule-versions/${ruleId}/activate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to activate rule');
      }
      const data = await res.json();
      setRuleVersions(data.allRules);
      await refreshSessionsAndAudit();
      showToast('OIML R-76 rule version activated as active standard', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error activating rule', 'error');
    }
  };

  // Add Attachment to Session (SIH PS-26035)
  const handleAddAttachment = async (attachmentData: {
    name: string;
    category: any;
    fileSize: string;
    dataUrl?: string;
    notes?: string;
  }) => {
    if (!selectedSessionId || !currentUser) return;
    try {
      const res = await fetch(`/api/test-sessions/${selectedSessionId}/attachments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify(attachmentData)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to upload attachment');
      }
      const data = await res.json();
      setTestSessions(prev => prev.map(s => s.id === data.session.id ? data.session : s));
      await refreshSessionsAndAudit();
      showToast('Evidence attachment archived to test session', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error saving attachment', 'error');
    }
  };

  // Delete Attachment from Session
  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!selectedSessionId || !currentUser) return;
    try {
      const res = await fetch(`/api/test-sessions/${selectedSessionId}/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser.id
        }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete attachment');
      }
      const data = await res.json();
      setTestSessions(prev => prev.map(s => s.id === data.session.id ? data.session : s));
      await refreshSessionsAndAudit();
      showToast('Evidence attachment removed', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error deleting attachment', 'error');
    }
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
