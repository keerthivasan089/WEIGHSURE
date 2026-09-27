/**
 * WeighSure - Initial Metrological Seed Data & Demo State
 */

import {
  User,
  Instrument,
  TestSession,
  OimlRuleConfiguration,
  AuditLog,
  ReferenceStandard
} from '../types';
import { DEFAULT_OIML_R76_2006_RULE, IN_SERVICE_OIML_R76_RULE } from './oimlEngine';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr_tech_01',
    name: 'Karthikeyan Selvam',
    email: 'karthik.selvam@metrology.gov.in',
    role: 'technician',
    department: 'Metrology Lab - Testing Section',
    licenseNumber: 'TECH-MET-9941',
    createdAt: '2026-01-10T08:00:00.000Z'
  },
  {
    id: 'usr_approver_01',
    name: 'Dr. Selvi Rajendran',
    email: 'selvi.rajendran@metrology.gov.in',
    role: 'approving_officer',
    department: 'Legal Metrology Approvals Directorate',
    licenseNumber: 'OIML-VER-4012',
    createdAt: '2026-01-05T08:00:00.000Z'
  },
  {
    id: 'usr_auditor_01',
    name: 'Meenakshi Natarajan',
    email: 'meenakshi.natarajan@metrology.gov.in',
    role: 'auditor',
    department: 'ISO/IEC 17025 Quality Assurance',
    licenseNumber: 'AUD-QUAL-7703',
    createdAt: '2026-01-08T08:00:00.000Z'
  },
  {
    id: 'usr_admin_01',
    name: 'Saravanan Ramakrishnan',
    email: 'saravanan.r@metrology.gov.in',
    role: 'admin',
    department: 'System Architecture & Metrology Rules Admin',
    licenseNumber: 'ADM-SYS-0001',
    createdAt: '2026-01-01T08:00:00.000Z'
  }
];

export const INITIAL_INSTRUMENTS: Instrument[] = [
  {
    id: 'inst_mt_xpe205',
    manufacturer: 'Mettler Toledo',
    model: 'XPE205 Excellence Analytical',
    serialNo: 'MT-XPE-8840192',
    accuracyClass: 'Class I',
    instrumentType: 'Laboratory Balance',
    maxCapacity: 220, // 220 g
    minCapacity: 0.01,
    scaleInterval_d: 0.00001, // 0.01 mg
    verificationInterval_e: 0.001, // 1 mg
    unit: 'g',
    location: 'Cleanroom Chamber 4B, Standards Lab',
    customerName: 'Astra Biotech Formulation Labs',
    nextVerificationDue: '2026-08-14',
    createdBy: 'usr_tech_01',
    createdAt: '2026-02-14T09:30:00.000Z'
  },
  {
    id: 'inst_sartorius_mca',
    manufacturer: 'Sartorius',
    model: 'Cubis II MCA5202S',
    serialNo: 'SART-CB-449102',
    accuracyClass: 'Class II',
    instrumentType: 'Bench Scale',
    maxCapacity: 5200, // 5200 g (5.2 kg)
    minCapacity: 5,
    scaleInterval_d: 0.01,
    verificationInterval_e: 0.1, // 0.1 g (100 mg)
    unit: 'g',
    location: 'Metrology Testing Bench 2',
    customerName: 'Precision Chemical Synthetics GmbH',
    nextVerificationDue: '2026-03-28', // due within 10 days
    createdBy: 'usr_tech_01',
    createdAt: '2026-02-20T11:15:00.000Z'
  },
  {
    id: 'inst_avery_zk830',
    manufacturer: 'Avery Weigh-Tronix',
    model: 'ZK830 High Resolution Bench Scale',
    serialNo: 'AWT-ZK-912044',
    accuracyClass: 'Class III',
    instrumentType: 'Platform Scale',
    maxCapacity: 30, // 30 kg
    minCapacity: 0.1,
    scaleInterval_d: 0.001, // 1 g
    verificationInterval_e: 0.005, // 5 g
    unit: 'kg',
    location: 'Industrial Inspection Bay A',
    customerName: 'Nordic Agro Bulk Logistics',
    nextVerificationDue: '2026-03-05', // overdue
    createdBy: 'usr_tech_01',
    createdAt: '2026-03-01T14:00:00.000Z'
  },
  {
    id: 'inst_bizerba_sc800',
    manufacturer: 'Bizerba',
    model: 'System Class SC II 800',
    serialNo: 'BIZ-SC-33109',
    accuracyClass: 'Class III',
    instrumentType: 'Retail/POS Scale',
    maxCapacity: 15, // 15 kg
    minCapacity: 0.04,
    scaleInterval_d: 0.001,
    verificationInterval_e: 0.002, // 2 g
    unit: 'kg',
    location: 'Commercial Verification Center',
    customerName: 'Metro Food Retail Group',
    nextVerificationDue: '2026-09-03',
    createdBy: 'usr_tech_01',
    createdAt: '2026-03-03T10:00:00.000Z'
  },
  {
    id: 'inst_weighbridge_wb60',
    manufacturer: 'Avery India Metrology',
    model: 'Pitless Steel Deck Weighbridge WB-60T',
    serialNo: 'AWI-WB-60091',
    accuracyClass: 'Class III',
    instrumentType: 'Weighbridge',
    maxCapacity: 60000,
    minCapacity: 400,
    scaleInterval_d: 10,
    verificationInterval_e: 20,
    unit: 'kg',
    location: 'Heavy Industrial Terminal Gate 3',
    customerName: 'Chennai Container Freight Station',
    nextVerificationDue: '2026-04-05', // due within 30 days
    createdBy: 'usr_tech_01',
    createdAt: '2026-02-01T08:00:00.000Z'
  },
  {
    id: 'inst_crane_scale_cs5',
    manufacturer: 'CAS Corporation',
    model: 'Caston-III Heavy Duty Crane Scale',
    serialNo: 'CAS-CR-31045',
    accuracyClass: 'Class III',
    instrumentType: 'Crane Scale',
    maxCapacity: 5000,
    minCapacity: 40,
    scaleInterval_d: 1,
    verificationInterval_e: 2,
    unit: 'kg',
    location: 'Steel Foundry Overhead Crane #2',
    customerName: 'Southern Alloy Castings Ltd',
    nextVerificationDue: '2026-05-15',
    createdBy: 'usr_tech_01',
    createdAt: '2026-02-10T10:00:00.000Z'
  },
  {
    id: 'inst_counter_scale_es',
    manufacturer: 'Essae-Teraoka',
    model: 'DS-215 Electronic Counter Scale',
    serialNo: 'ESS-DS-10492',
    accuracyClass: 'Class III',
    instrumentType: 'Electronic Counter Scale',
    maxCapacity: 30,
    minCapacity: 0.1,
    scaleInterval_d: 0.002,
    verificationInterval_e: 0.005,
    unit: 'kg',
    location: 'Agricultural Produce Mandi Stall #14',
    customerName: 'Farmers Commodity Trade Association',
    nextVerificationDue: '2026-03-31', // due in ~13 days
    createdBy: 'usr_tech_01',
    createdAt: '2026-02-15T09:00:00.000Z'
  }
];

export const INITIAL_REFERENCE_STANDARDS: ReferenceStandard[] = [
  {
    id: 'std_e2_set_01',
    massValue: 1,
    unit: 'kg',
    standardClass: 'E2',
    traceabilityNumber: 'NPLI-MASS-E2-2025-081',
    calibrationCertificateNumber: 'CERT-NPLI-882194',
    calibrationExpiryDate: '2026-11-30',
    createdAt: '2025-12-01T00:00:00.000Z'
  },
  {
    id: 'std_f1_set_02',
    massValue: 5,
    unit: 'kg',
    standardClass: 'F1',
    traceabilityNumber: 'RRSL-MASS-F1-2025-419',
    calibrationCertificateNumber: 'CERT-RRSL-44102',
    calibrationExpiryDate: '2026-08-15',
    createdAt: '2025-08-20T00:00:00.000Z'
  },
  {
    id: 'std_f2_set_03',
    massValue: 20,
    unit: 'kg',
    standardClass: 'F2',
    traceabilityNumber: 'LM-STAND-F2-2025-102',
    calibrationCertificateNumber: 'CERT-LM-99031',
    calibrationExpiryDate: '2026-03-25', // Due soon within 30 days
    createdAt: '2025-03-25T00:00:00.000Z'
  },
  {
    id: 'std_m1_bulk_04',
    massValue: 500,
    unit: 'kg',
    standardClass: 'M1',
    traceabilityNumber: 'LM-HEAVY-M1-2024-009',
    calibrationCertificateNumber: 'CERT-LM-20019',
    calibrationExpiryDate: '2026-02-28', // Expired
    createdAt: '2024-03-01T00:00:00.000Z'
  },
  {
    id: 'std_m1_set_05',
    massValue: 50,
    unit: 'kg',
    standardClass: 'M1',
    traceabilityNumber: 'RRSL-MASS-M1-2025-782',
    calibrationCertificateNumber: 'CERT-RRSL-78210',
    calibrationExpiryDate: '2026-12-31',
    createdAt: '2026-01-05T00:00:00.000Z'
  }
];

export const INITIAL_RULE_VERSIONS: OimlRuleConfiguration[] = [
  DEFAULT_OIML_R76_2006_RULE,
  IN_SERVICE_OIML_R76_RULE
];

export const INITIAL_TEST_SESSIONS: TestSession[] = [
  {
    id: 'sess_approved_001',
    instrumentId: 'inst_sartorius_mca',
    technicianId: 'usr_tech_01',
    technicianName: 'Karthikeyan Selvam',
    environmentalConditions: {
      temperatureC: 20.4,
      humidityPercent: 48,
      pressureHpa: 1013.2,
      locationNotes: 'Temperature controlled test cell #2, vibration damped slab'
    },
    status: 'approved',
    ruleVersionId: 'rule_oiml_r76_2006_v1_0',
    createdAt: '2026-03-05T09:00:00.000Z',
    updatedAt: '2026-03-05T14:30:00.000Z',
    observations: [
      {
        id: 'obs_01',
        testSessionId: 'sess_approved_001',
        testType: 'weighing_performance',
        testPointIndex: 1,
        loadValue: 50,
        observedReading: 50.00,
        direction: 'increasing',
        source: 'manual',
        confirmedByTechnician: true,
        createdAt: '2026-03-05T09:10:00.000Z'
      },
      {
        id: 'obs_02',
        testSessionId: 'sess_approved_001',
        testType: 'weighing_performance',
        testPointIndex: 2,
        loadValue: 500,
        observedReading: 500.02,
        direction: 'increasing',
        source: 'manual',
        confirmedByTechnician: true,
        createdAt: '2026-03-05T09:15:00.000Z'
      },
      {
        id: 'obs_03',
        testSessionId: 'sess_approved_001',
        testType: 'weighing_performance',
        testPointIndex: 3,
        loadValue: 1000,
        observedReading: 1000.04,
        direction: 'increasing',
        source: 'manual',
        confirmedByTechnician: true,
        createdAt: '2026-03-05T09:20:00.000Z'
      },
      {
        id: 'obs_04',
        testSessionId: 'sess_approved_001',
        testType: 'weighing_performance',
        testPointIndex: 4,
        loadValue: 2000,
        observedReading: 2000.06,
        direction: 'increasing',
        source: 'manual',
        confirmedByTechnician: true,
        createdAt: '2026-03-05T09:25:00.000Z'
      },
      {
        id: 'obs_05',
        testSessionId: 'sess_approved_001',
        testType: 'weighing_performance',
        testPointIndex: 5,
        loadValue: 5000,
        observedReading: 5000.08,
        direction: 'increasing',
        source: 'manual',
        confirmedByTechnician: true,
        createdAt: '2026-03-05T09:30:00.000Z'
      },
      {
        id: 'obs_06',
        testSessionId: 'sess_approved_001',
        testType: 'weighing_performance',
        testPointIndex: 6,
        loadValue: 2000,
        observedReading: 2000.05,
        direction: 'decreasing',
        source: 'manual',
        confirmedByTechnician: true,
        createdAt: '2026-03-05T09:35:00.000Z'
      },
      {
        id: 'obs_07',
        testSessionId: 'sess_approved_001',
        testType: 'eccentricity',
        testPointIndex: 7,
        loadValue: 1700,
        observedReading: 1700.03,
        position: 'center',
        source: 'manual',
        confirmedByTechnician: true,
        createdAt: '2026-03-05T09:40:00.000Z'
      },
      {
        id: 'obs_08',
        testSessionId: 'sess_approved_001',
        testType: 'eccentricity',
        testPointIndex: 8,
        loadValue: 1700,
        observedReading: 1700.05,
        position: 'front-left',
        source: 'manual',
        confirmedByTechnician: true,
        createdAt: '2026-03-05T09:42:00.000Z'
      }
    ],
    calculation: {
      id: 'calc_sess_001',
      testSessionId: 'sess_approved_001',
      ruleVersionId: 'rule_oiml_r76_2006_v1_0',
      ruleVersionLabel: 'OIML R-76-1:2006 Table 6 (Initial Verification)',
      calculatedAt: '2026-03-05T10:00:00.000Z',
      overallResult: 'PASS',
      maxObservedError: 0.08,
      maxPermissibleErrorObserved: 0.15,
      eccentricityMaxError: 0.05,
      hysteresisMaxError: 0.01,
      summaryText: 'COMPLIANT: All observed indication errors and eccentricity checks meet the Maximum Permissible Error requirements of OIML R-76-1:2006 Table 6 (Initial Verification).',
      detailedResults: [
        {
          observationId: 'obs_01',
          loadValue: 50,
          observedReading: 50.00,
          loadInMultiplesOfE: 500,
          calculatedIndication: 50.00,
          errorValue: 0.0,
          mpeValue: 0.5,
          mpeInUnits: 0.05,
          isWithinMpe: true,
          direction: 'increasing'
        },
        {
          observationId: 'obs_02',
          loadValue: 500,
          observedReading: 500.02,
          loadInMultiplesOfE: 5000,
          calculatedIndication: 500.02,
          errorValue: 0.02,
          mpeValue: 0.5,
          mpeInUnits: 0.05,
          isWithinMpe: true,
          direction: 'increasing'
        },
        {
          observationId: 'obs_03',
          loadValue: 1000,
          observedReading: 1000.04,
          loadInMultiplesOfE: 10000,
          calculatedIndication: 1000.04,
          errorValue: 0.04,
          mpeValue: 1.0,
          mpeInUnits: 0.1,
          isWithinMpe: true,
          direction: 'increasing'
        },
        {
          observationId: 'obs_04',
          loadValue: 2000,
          observedReading: 2000.06,
          loadInMultiplesOfE: 20000,
          calculatedIndication: 2000.06,
          errorValue: 0.06,
          mpeValue: 1.0,
          mpeInUnits: 0.1,
          isWithinMpe: true,
          direction: 'increasing'
        },
        {
          observationId: 'obs_05',
          loadValue: 5000,
          observedReading: 5000.08,
          loadInMultiplesOfE: 50000,
          calculatedIndication: 5000.08,
          errorValue: 0.08,
          mpeValue: 1.5,
          mpeInUnits: 0.15,
          isWithinMpe: true,
          direction: 'increasing'
        },
        {
          observationId: 'obs_06',
          loadValue: 2000,
          observedReading: 2000.05,
          loadInMultiplesOfE: 20000,
          calculatedIndication: 2000.05,
          errorValue: 0.05,
          mpeValue: 1.0,
          mpeInUnits: 0.1,
          isWithinMpe: true,
          direction: 'decreasing'
        },
        {
          observationId: 'obs_07',
          loadValue: 1700,
          observedReading: 1700.03,
          loadInMultiplesOfE: 17000,
          calculatedIndication: 1700.03,
          errorValue: 0.03,
          mpeValue: 1.0,
          mpeInUnits: 0.1,
          isWithinMpe: true
        },
        {
          observationId: 'obs_08',
          loadValue: 1700,
          observedReading: 1700.05,
          loadInMultiplesOfE: 17000,
          calculatedIndication: 1700.05,
          errorValue: 0.05,
          mpeValue: 1.0,
          mpeInUnits: 0.1,
          isWithinMpe: true
        }
      ]
    },
    approval: {
      id: 'appr_sess_001',
      testSessionId: 'sess_approved_001',
      approvingOfficerId: 'usr_approver_01',
      approvingOfficerName: 'Dr. Selvi Rajendran',
      approvingOfficerLicense: 'OIML-VER-4012',
      status: 'approved',
      comments: 'Full type-evaluation compliance confirmed. Instrument demonstrated excellent linearity and repeatability.',
      signatureHash: '4f9a7d3b2e1c8a5b6d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
      approvedAt: '2026-03-05T14:30:00.000Z'
    },
    report: {
      id: 'rep_sess_001',
      testSessionId: 'sess_approved_001',
      reportNumber: 'WS-R76-2026-9102-4018',
      certificateNumber: 'WS-R76-2026-9102-4018',
      qrCodeValue: 'https://weighsure.vercel.app/verify/WS-R76-2026-9102-4018',
      qrVerificationCode: 'WS-R76-2026-9102-4018',
      verificationLookupCode: 'WS-R76-2026-9102-4018',
      signatureHash: '4f9a7d3b2e1c8a5b6d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
      tamperEvidentHash: '4f9a7d3b2e1c8a5b6d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
      decision: 'PASS',
      summaryText: 'Instrument complies with OIML R-76-1:2006 Table 6 Maximum Permissible Error (MPE) thresholds across all load ranges.',
      issuedAt: '2026-03-05T14:30:00.000Z',
      validUntil: '2027-03-05',
      generatedAt: '2026-03-05T14:31:00.000Z',
      verifiedCount: 14
    },
    attachments: [
      {
        id: 'att_001',
        testSessionId: 'sess_approved_001',
        name: 'Nameplate_and_Markings_Sartorius_MCA.jpg',
        category: 'nameplate_tag',
        fileSize: '2.4 MB',
        uploadedBy: 'Karthikeyan Selvam',
        uploadedAt: '2026-03-05T09:12:00.000Z',
        notes: 'Verified metrological markings: Class II, Max 5200g, e=0.1g, CE M26 stamp'
      },
      {
        id: 'att_002',
        testSessionId: 'sess_approved_001',
        name: 'Spirit_Level_Bubble_Alignment.jpg',
        category: 'leveling_bubble',
        fileSize: '1.8 MB',
        uploadedBy: 'Karthikeyan Selvam',
        uploadedAt: '2026-03-05T09:15:00.000Z',
        notes: 'Level indicator bubble precisely centered in indicator ring prior to zeroing'
      },
      {
        id: 'att_003',
        testSessionId: 'sess_approved_001',
        name: 'Traceable_Weight_Set_Cert_DKD_E2.pdf',
        category: 'calibration_certificate',
        fileSize: '840 KB',
        uploadedBy: 'Karthikeyan Selvam',
        uploadedAt: '2026-03-05T09:20:00.000Z',
        notes: 'NIST/DKD Traceable standard weight set certificate (E2 Class, valid through 2027)'
      }
    ]
  },
  {
    id: 'sess_pending_002',
    instrumentId: 'inst_avery_zk830',
    technicianId: 'usr_tech_01',
    technicianName: 'Karthikeyan Selvam',
    environmentalConditions: {
      temperatureC: 19.8,
      humidityPercent: 52,
      pressureHpa: 1015.0,
      locationNotes: 'Industrial Test Bay A, floor isolated'
    },
    status: 'pending_approval',
    ruleVersionId: 'rule_oiml_r76_2006_v1_0',
    createdAt: '2026-03-08T10:00:00.000Z',
    updatedAt: '2026-03-08T12:00:00.000Z',
    observations: [
      {
        id: 'obs_p1',
        testSessionId: 'sess_pending_002',
        testType: 'weighing_performance',
        testPointIndex: 1,
        loadValue: 2,
        observedReading: 2.001,
        direction: 'increasing',
        source: 'ocr',
        rawOcrConfidence: 0.98,
        confirmedByTechnician: true,
        createdAt: '2026-03-08T10:15:00.000Z'
      },
      {
        id: 'obs_p2',
        testSessionId: 'sess_pending_002',
        testType: 'weighing_performance',
        testPointIndex: 2,
        loadValue: 10,
        observedReading: 10.002,
        direction: 'increasing',
        source: 'ocr',
        rawOcrConfidence: 0.96,
        confirmedByTechnician: true,
        createdAt: '2026-03-08T10:18:00.000Z'
      },
      {
        id: 'obs_p3',
        testSessionId: 'sess_pending_002',
        testType: 'weighing_performance',
        testPointIndex: 3,
        loadValue: 20,
        observedReading: 20.004,
        direction: 'increasing',
        source: 'ocr',
        rawOcrConfidence: 0.94,
        confirmedByTechnician: true,
        createdAt: '2026-03-08T10:22:00.000Z'
      },
      {
        id: 'obs_p4',
        testSessionId: 'sess_pending_002',
        testType: 'weighing_performance',
        testPointIndex: 4,
        loadValue: 30,
        observedReading: 30.006,
        direction: 'increasing',
        source: 'ocr',
        rawOcrConfidence: 0.95,
        confirmedByTechnician: true,
        createdAt: '2026-03-08T10:25:00.000Z'
      },
      {
        id: 'obs_p5',
        testSessionId: 'sess_pending_002',
        testType: 'weighing_performance',
        testPointIndex: 5,
        loadValue: 15,
        observedReading: 15.003,
        direction: 'decreasing',
        source: 'ocr',
        rawOcrConfidence: 0.92,
        confirmedByTechnician: true,
        createdAt: '2026-03-08T10:30:00.000Z'
      }
    ],
    calculation: {
      id: 'calc_sess_002',
      testSessionId: 'sess_pending_002',
      ruleVersionId: 'rule_oiml_r76_2006_v1_0',
      ruleVersionLabel: 'OIML R-76-1:2006 Table 6 (Initial Verification)',
      calculatedAt: '2026-03-08T11:00:00.000Z',
      overallResult: 'PASS',
      maxObservedError: 0.006,
      maxPermissibleErrorObserved: 0.0075,
      summaryText: 'COMPLIANT: All observed indication errors meet the Maximum Permissible Error requirements of OIML R-76-1:2006 Table 6 (Initial Verification).',
      detailedResults: [
        {
          observationId: 'obs_p1',
          loadValue: 2,
          observedReading: 2.001,
          loadInMultiplesOfE: 400,
          calculatedIndication: 2.001,
          errorValue: 0.001,
          mpeValue: 0.5,
          mpeInUnits: 0.0025,
          isWithinMpe: true,
          direction: 'increasing'
        },
        {
          observationId: 'obs_p2',
          loadValue: 10,
          observedReading: 10.002,
          loadInMultiplesOfE: 2000,
          calculatedIndication: 10.002,
          errorValue: 0.002,
          mpeValue: 1.0,
          mpeInUnits: 0.005,
          isWithinMpe: true,
          direction: 'increasing'
        },
        {
          observationId: 'obs_p3',
          loadValue: 20,
          observedReading: 20.004,
          loadInMultiplesOfE: 4000,
          calculatedIndication: 20.004,
          errorValue: 0.004,
          mpeValue: 1.5,
          mpeInUnits: 0.0075,
          isWithinMpe: true,
          direction: 'increasing'
        },
        {
          observationId: 'obs_p4',
          loadValue: 30,
          observedReading: 30.006,
          loadInMultiplesOfE: 6000,
          calculatedIndication: 30.006,
          errorValue: 0.006,
          mpeValue: 1.5,
          mpeInUnits: 0.0075,
          isWithinMpe: true,
          direction: 'increasing'
        },
        {
          observationId: 'obs_p5',
          loadValue: 15,
          observedReading: 15.003,
          loadInMultiplesOfE: 3000,
          calculatedIndication: 15.003,
          errorValue: 0.003,
          mpeValue: 1.5,
          mpeInUnits: 0.0075,
          isWithinMpe: true,
          direction: 'decreasing'
        }
      ]
    },
    attachments: [
      {
        id: 'att_101',
        testSessionId: 'sess_pending_002',
        name: 'Bench_Scale_Load_Receiver_Setup.jpg',
        category: 'instrument_photograph',
        fileSize: '3.1 MB',
        uploadedBy: 'Karthikeyan Selvam',
        uploadedAt: '2026-03-08T10:10:00.000Z',
        notes: 'Industrial platform installation in Bay A, corner bumpers clear of interference'
      },
      {
        id: 'att_102',
        testSessionId: 'sess_pending_002',
        name: 'Avery_Nameplate_Specification_Tag.jpg',
        category: 'nameplate_tag',
        fileSize: '1.9 MB',
        uploadedBy: 'Karthikeyan Selvam',
        uploadedAt: '2026-03-08T10:12:00.000Z',
        notes: 'Serial plate AWT-ZK-912044, Max 30kg, e=5g, OIML Class III'
      }
    ]
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log_001',
    userId: 'usr_admin_01',
    userName: 'Saravanan Ramakrishnan',
    userRole: 'admin',
    action: 'RULE_VERSION_ACTIVATED',
    entityType: 'rule_version',
    entityId: 'rule_oiml_r76_2006_v1_0',
    timestamp: '2026-01-01T08:00:00.000Z',
    ruleVersionId: 'rule_oiml_r76_2006_v1_0',
    metadataJson: {
      standard: 'OIML R-76-1:2006 (E)',
      status: 'active_default'
    }
  },
  {
    id: 'log_002',
    userId: 'usr_tech_01',
    userName: 'Karthikeyan Selvam',
    userRole: 'technician',
    action: 'INSTRUMENT_REGISTERED',
    entityType: 'instrument',
    entityId: 'inst_sartorius_mca',
    timestamp: '2026-02-20T11:15:00.000Z',
    metadataJson: {
      model: 'Cubis II MCA5202S',
      serialNo: 'SART-CB-449102',
      accuracyClass: 'Class II',
      maxCapacity: '5200 g'
    }
  },
  {
    id: 'log_003',
    userId: 'usr_tech_01',
    userName: 'Karthikeyan Selvam',
    userRole: 'technician',
    action: 'TEST_SESSION_CREATED',
    entityType: 'test_session',
    entityId: 'sess_approved_001',
    timestamp: '2026-03-05T09:00:00.000Z',
    ruleVersionId: 'rule_oiml_r76_2006_v1_0',
    metadataJson: {
      instrumentId: 'inst_sartorius_mca',
      envTemp: 20.4,
      envRH: 48
    }
  },
  {
    id: 'log_004',
    userId: 'usr_tech_01',
    userName: 'Karthikeyan Selvam',
    userRole: 'technician',
    action: 'CALCULATION_EXECUTED',
    entityType: 'calculation',
    entityId: 'calc_sess_001',
    timestamp: '2026-03-05T10:00:00.000Z',
    ruleVersionId: 'rule_oiml_r76_2006_v1_0',
    metadataJson: {
      result: 'PASS',
      observationCount: 8,
      maxObservedError: 0.08
    }
  },
  {
    id: 'log_005',
    userId: 'usr_approver_01',
    userName: 'Dr. Selvi Rajendran',
    userRole: 'approving_officer',
    action: 'APPROVAL_GRANTED',
    entityType: 'approval',
    entityId: 'appr_sess_001',
    timestamp: '2026-03-05T14:30:00.000Z',
    ruleVersionId: 'rule_oiml_r76_2006_v1_0',
    metadataJson: {
      signatureHash: '4f9a7d3b2e1c8a5b6d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
      approvingOfficerLicense: 'OIML-VER-4012'
    }
  },
  {
    id: 'log_006',
    userId: 'usr_approver_01',
    userName: 'Dr. Selvi Rajendran',
    userRole: 'approving_officer',
    action: 'REPORT_ISSUED_WITH_QR',
    entityType: 'report',
    entityId: 'rep_sess_001',
    timestamp: '2026-03-05T14:31:00.000Z',
    ruleVersionId: 'rule_oiml_r76_2006_v1_0',
    metadataJson: {
      reportNumber: 'WS-R76-2026-9102-4018',
      qrVerificationValue: 'https://weighsure.lab/verify/WS-R76-2026-9102-4018'
    }
  },
  {
    id: 'log_007',
    userId: 'usr_tech_01',
    userName: 'Karthikeyan Selvam',
    userRole: 'technician',
    action: 'OCR_EXTRACTION_CONFIRMED',
    entityType: 'test_session',
    entityId: 'sess_pending_002',
    timestamp: '2026-03-08T10:40:00.000Z',
    metadataJson: {
      source: 'PaddleOCR / Scanned Sheet Intake',
      extractedPoints: 5,
      averageConfidence: 0.95
    }
  },
  {
    id: 'log_008',
    userId: 'usr_tech_01',
    userName: 'Karthikeyan Selvam',
    userRole: 'technician',
    action: 'SUBMITTED_FOR_APPROVAL',
    entityType: 'test_session',
    entityId: 'sess_pending_002',
    timestamp: '2026-03-08T11:05:00.000Z',
    ruleVersionId: 'rule_oiml_r76_2006_v1_0',
    metadataJson: {
      calculationResult: 'PASS',
      submittedTo: 'Approving Officers Queue'
    }
  }
];
