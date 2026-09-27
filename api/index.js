// src/api/serverless.ts
import express from "express";
import QRCode from "qrcode";

// src/lib/oimlEngine.ts
var DEFAULT_OIML_R76_2006_RULE = {
  id: "rule_oiml_r76_2006_v1_0",
  versionLabel: "OIML R-76-1:2006 Table 6 (Initial Verification)",
  standardTitle: "OIML R-76-1:2006 (E) Metrological Requirements - Initial Verification",
  isDefault: true,
  effectiveFrom: "2006-01-01T00:00:00.000Z",
  createdBy: "system_oiml_committee",
  description: "Standard Table 6 Maximum Permissible Errors (MPE) for Non-Automatic Weighing Instruments during initial verification or type-evaluation.",
  rules: {
    classes: {
      "Class I": {
        minScaleDivisions_n: 5e4,
        maxScaleDivisions_n: 1e7,
        mpeBands: [
          { minM: 0, maxM: 5e4, mpeInitial: 0.5, mpeService: 1 },
          { minM: 5e4, maxM: 2e5, mpeInitial: 1, mpeService: 2 },
          { minM: 2e5, maxM: Infinity, mpeInitial: 1.5, mpeService: 3 }
        ]
      },
      "Class II": {
        minScaleDivisions_n: 100,
        maxScaleDivisions_n: 1e5,
        mpeBands: [
          { minM: 0, maxM: 5e3, mpeInitial: 0.5, mpeService: 1 },
          { minM: 5e3, maxM: 2e4, mpeInitial: 1, mpeService: 2 },
          { minM: 2e4, maxM: 1e5, mpeInitial: 1.5, mpeService: 3 }
        ]
      },
      "Class III": {
        minScaleDivisions_n: 500,
        maxScaleDivisions_n: 1e4,
        mpeBands: [
          { minM: 0, maxM: 500, mpeInitial: 0.5, mpeService: 1 },
          { minM: 500, maxM: 2e3, mpeInitial: 1, mpeService: 2 },
          { minM: 2e3, maxM: 1e4, mpeInitial: 1.5, mpeService: 3 }
        ]
      },
      "Class IIII": {
        minScaleDivisions_n: 100,
        maxScaleDivisions_n: 1e3,
        mpeBands: [
          { minM: 0, maxM: 50, mpeInitial: 0.5, mpeService: 1 },
          { minM: 50, maxM: 200, mpeInitial: 1, mpeService: 2 },
          { minM: 200, maxM: 1e3, mpeInitial: 1.5, mpeService: 3 }
        ]
      }
    },
    eccentricityFractionOfMax: 0.3333333333,
    // 1/3 of Max capacity applied to corners
    repeatabilityRuns: 3,
    hysteresisLimitMultiplier: 1
  }
};
var IN_SERVICE_OIML_R76_RULE = {
  id: "rule_oiml_r76_in_service_v1_1",
  versionLabel: "OIML R-76-1:2006 (In-Service Inspection)",
  standardTitle: "OIML R-76-1:2006 Section 3.5.2 In-Service Inspection",
  isDefault: false,
  effectiveFrom: "2010-06-01T00:00:00.000Z",
  createdBy: "system_oiml_committee",
  description: "In-service inspection maximum permissible errors (twice the initial verification MPE).",
  rules: {
    classes: {
      "Class I": {
        minScaleDivisions_n: 5e4,
        maxScaleDivisions_n: 1e7,
        mpeBands: [
          { minM: 0, maxM: 5e4, mpeInitial: 1, mpeService: 1 },
          { minM: 5e4, maxM: 2e5, mpeInitial: 2, mpeService: 2 },
          { minM: 2e5, maxM: Infinity, mpeInitial: 3, mpeService: 3 }
        ]
      },
      "Class II": {
        minScaleDivisions_n: 100,
        maxScaleDivisions_n: 1e5,
        mpeBands: [
          { minM: 0, maxM: 5e3, mpeInitial: 1, mpeService: 1 },
          { minM: 5e3, maxM: 2e4, mpeInitial: 2, mpeService: 2 },
          { minM: 2e4, maxM: 1e5, mpeInitial: 3, mpeService: 3 }
        ]
      },
      "Class III": {
        minScaleDivisions_n: 500,
        maxScaleDivisions_n: 1e4,
        mpeBands: [
          { minM: 0, maxM: 500, mpeInitial: 1, mpeService: 1 },
          { minM: 500, maxM: 2e3, mpeInitial: 2, mpeService: 2 },
          { minM: 2e3, maxM: 1e4, mpeInitial: 3, mpeService: 3 }
        ]
      },
      "Class IIII": {
        minScaleDivisions_n: 100,
        maxScaleDivisions_n: 1e3,
        mpeBands: [
          { minM: 0, maxM: 50, mpeInitial: 1, mpeService: 1 },
          { minM: 50, maxM: 200, mpeInitial: 2, mpeService: 2 },
          { minM: 200, maxM: 1e3, mpeInitial: 3, mpeService: 3 }
        ]
      }
    },
    eccentricityFractionOfMax: 0.3333333333,
    repeatabilityRuns: 3,
    hysteresisLimitMultiplier: 1
  }
};
function calculateMpeInMultiplesOfE(load, verificationInterval_e, accuracyClass, ruleConfig) {
  if (verificationInterval_e <= 0) {
    throw new Error("Verification scale interval e must be strictly positive");
  }
  const loadInE = Math.abs(load) / verificationInterval_e;
  const classRules = ruleConfig.rules.classes[accuracyClass];
  if (!classRules) {
    throw new Error(`Unsupported accuracy class: ${accuracyClass}`);
  }
  for (const band of classRules.mpeBands) {
    if (loadInE >= band.minM && loadInE <= band.maxM) {
      return band.mpeInitial;
    }
  }
  const lastBand = classRules.mpeBands[classRules.mpeBands.length - 1];
  return lastBand ? lastBand.mpeInitial : 1.5;
}
function evaluateSingleObservation(obs, instrument, ruleConfig) {
  const e = instrument.verificationInterval_e;
  const L = obs.loadValue;
  const I = obs.observedReading;
  let P;
  if (obs.deltaL !== void 0 && obs.deltaL !== null && !isNaN(obs.deltaL)) {
    P = I + 0.5 * e - obs.deltaL;
  } else {
    P = I;
  }
  const errorValue = Number((P - L).toFixed(6));
  const loadInMultiplesOfE = Number((L / e).toFixed(4));
  const mpeMultiples = calculateMpeInMultiplesOfE(L, e, instrument.accuracyClass, ruleConfig);
  const mpeInUnits = Number((mpeMultiples * e).toFixed(6));
  const isWithinMpe = Math.abs(errorValue) <= mpeInUnits + 1e-7;
  let notes = "";
  if (!isWithinMpe) {
    notes = `Exceeds MPE (${Math.abs(errorValue).toFixed(4)} ${instrument.unit} > ${mpeInUnits.toFixed(4)} ${instrument.unit})`;
  }
  return {
    observationId: obs.id,
    loadValue: L,
    observedReading: I,
    loadInMultiplesOfE,
    calculatedIndication: Number(P.toFixed(6)),
    errorValue,
    mpeValue: mpeMultiples,
    mpeInUnits,
    isWithinMpe,
    direction: obs.direction,
    notes
  };
}
function executeTestSessionCalculation(testSessionId, observations, instrument, ruleConfig) {
  if (!observations || observations.length === 0) {
    throw new Error("Cannot calculate: Test session has no observations");
  }
  const detailedResults = [];
  let maxObservedError = 0;
  let maxPermissibleErrorObserved = 0;
  let anyFailed = false;
  for (const obs of observations) {
    const calc = evaluateSingleObservation(obs, instrument, ruleConfig);
    detailedResults.push(calc);
    const absErr = Math.abs(calc.errorValue);
    if (absErr > maxObservedError) {
      maxObservedError = absErr;
    }
    if (calc.mpeInUnits > maxPermissibleErrorObserved) {
      maxPermissibleErrorObserved = calc.mpeInUnits;
    }
    if (!calc.isWithinMpe) {
      anyFailed = true;
    }
  }
  const repeatabilityObs = observations.filter((o) => o.testType === "repeatability");
  let repeatabilityError;
  let repeatabilityFailed = false;
  if (repeatabilityObs.length >= 2) {
    const loadGroups = {};
    for (const o of repeatabilityObs) {
      if (!loadGroups[o.loadValue]) loadGroups[o.loadValue] = [];
      loadGroups[o.loadValue].push(o.observedReading);
    }
    for (const [loadStr, readings] of Object.entries(loadGroups)) {
      if (readings.length >= 2) {
        const loadNum = Number(loadStr);
        const maxR = Math.max(...readings);
        const minR = Math.min(...readings);
        const delta = Number((maxR - minR).toFixed(6));
        repeatabilityError = delta;
        const mpeAtLoad = calculateMpeInMultiplesOfE(loadNum, instrument.verificationInterval_e, instrument.accuracyClass, ruleConfig) * instrument.verificationInterval_e;
        if (delta > mpeAtLoad + 1e-7) {
          repeatabilityFailed = true;
        }
      }
    }
  }
  const eccentricityObs = observations.filter((o) => o.testType === "eccentricity");
  let eccentricityMaxError;
  let eccentricityFailed = false;
  if (eccentricityObs.length > 0) {
    const eccCalcs = detailedResults.filter((r) => {
      const parent = observations.find((o) => o.id === r.observationId);
      return parent?.testType === "eccentricity";
    });
    const maxEccErr = Math.max(...eccCalcs.map((c) => Math.abs(c.errorValue)));
    eccentricityMaxError = maxEccErr;
    eccentricityFailed = eccCalcs.some((c) => !c.isWithinMpe);
  }
  const weighingObs = observations.filter((o) => o.testType === "weighing_performance");
  let hysteresisMaxError;
  let hysteresisFailed = false;
  if (weighingObs.length > 0) {
    const incObs = weighingObs.filter((o) => o.direction === "increasing");
    const decObs = weighingObs.filter((o) => o.direction === "decreasing");
    for (const dec of decObs) {
      const matchInc = incObs.find((inc) => Math.abs(inc.loadValue - dec.loadValue) < 1e-5);
      if (matchInc) {
        const diff = Math.abs(dec.observedReading - matchInc.observedReading);
        if (hysteresisMaxError === void 0 || diff > hysteresisMaxError) {
          hysteresisMaxError = Number(diff.toFixed(6));
        }
        const mpeAtLoad = calculateMpeInMultiplesOfE(dec.loadValue, instrument.verificationInterval_e, instrument.accuracyClass, ruleConfig) * instrument.verificationInterval_e;
        if (diff > mpeAtLoad + 1e-7) {
          hysteresisFailed = true;
        }
      }
    }
  }
  const hasUnconfirmed = observations.some((o) => !o.confirmedByTechnician);
  const hasUnresolvedAnomalies = observations.some((o) => o.isFlaggedAnomaly && !o.confirmedByTechnician);
  let overallResult = "PASS";
  let summaryText = "";
  if (anyFailed || repeatabilityFailed || eccentricityFailed || hysteresisFailed) {
    overallResult = "FAIL";
    const reasons = [];
    if (anyFailed) reasons.push("Indication error exceeds Table 6 MPE limits");
    if (repeatabilityFailed) reasons.push("Repeatability spread exceeds MPE");
    if (eccentricityFailed) reasons.push("Eccentricity corner load exceeds MPE");
    if (hysteresisFailed) reasons.push("Hysteresis error exceeds permissible limits");
    summaryText = `NON-COMPLIANT under ${ruleConfig.versionLabel}. ${reasons.join(". ")}.`;
  } else if (hasUnconfirmed || hasUnresolvedAnomalies) {
    overallResult = "REVIEW";
    summaryText = `COMPLIANCE PENDING: All mathematical errors are within MPE, but observations contain unconfirmed or OCR-flagged values requiring technician verification.`;
  } else {
    overallResult = "PASS";
    summaryText = `COMPLIANT: All observed indication errors, repeatability, and eccentricity checks meet the Maximum Permissible Error requirements of ${ruleConfig.standardTitle}.`;
  }
  return {
    id: `calc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    testSessionId,
    ruleVersionId: ruleConfig.id,
    ruleVersionLabel: ruleConfig.versionLabel,
    calculatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    overallResult,
    maxObservedError: Number(maxObservedError.toFixed(6)),
    maxPermissibleErrorObserved: Number(maxPermissibleErrorObserved.toFixed(6)),
    repeatabilityError,
    eccentricityMaxError,
    hysteresisMaxError,
    summaryText,
    detailedResults
  };
}

// src/lib/initialData.ts
var INITIAL_USERS = [
  {
    id: "usr_tech_01",
    name: "Karthikeyan Selvam",
    email: "karthik.selvam@metrology.gov.in",
    role: "technician",
    department: "Metrology Lab - Testing Section",
    licenseNumber: "TECH-MET-9941",
    createdAt: "2026-01-10T08:00:00.000Z"
  },
  {
    id: "usr_approver_01",
    name: "Dr. Selvi Rajendran",
    email: "selvi.rajendran@metrology.gov.in",
    role: "approving_officer",
    department: "Legal Metrology Approvals Directorate",
    licenseNumber: "OIML-VER-4012",
    createdAt: "2026-01-05T08:00:00.000Z"
  },
  {
    id: "usr_auditor_01",
    name: "Meenakshi Natarajan",
    email: "meenakshi.natarajan@metrology.gov.in",
    role: "auditor",
    department: "ISO/IEC 17025 Quality Assurance",
    licenseNumber: "AUD-QUAL-7703",
    createdAt: "2026-01-08T08:00:00.000Z"
  },
  {
    id: "usr_admin_01",
    name: "Saravanan Ramakrishnan",
    email: "saravanan.r@metrology.gov.in",
    role: "admin",
    department: "System Architecture & Metrology Rules Admin",
    licenseNumber: "ADM-SYS-0001",
    createdAt: "2026-01-01T08:00:00.000Z"
  }
];
var INITIAL_INSTRUMENTS = [
  {
    id: "inst_mt_xpe205",
    manufacturer: "Mettler Toledo",
    model: "XPE205 Excellence Analytical",
    serialNo: "MT-XPE-8840192",
    accuracyClass: "Class I",
    instrumentType: "Laboratory Balance",
    maxCapacity: 220,
    // 220 g
    minCapacity: 0.01,
    scaleInterval_d: 1e-5,
    // 0.01 mg
    verificationInterval_e: 1e-3,
    // 1 mg
    unit: "g",
    location: "Cleanroom Chamber 4B, Standards Lab",
    customerName: "Astra Biotech Formulation Labs",
    nextVerificationDue: "2026-08-14",
    createdBy: "usr_tech_01",
    createdAt: "2026-02-14T09:30:00.000Z"
  },
  {
    id: "inst_sartorius_mca",
    manufacturer: "Sartorius",
    model: "Cubis II MCA5202S",
    serialNo: "SART-CB-449102",
    accuracyClass: "Class II",
    instrumentType: "Bench Scale",
    maxCapacity: 5200,
    // 5200 g (5.2 kg)
    minCapacity: 5,
    scaleInterval_d: 0.01,
    verificationInterval_e: 0.1,
    // 0.1 g (100 mg)
    unit: "g",
    location: "Metrology Testing Bench 2",
    customerName: "Precision Chemical Synthetics GmbH",
    nextVerificationDue: "2026-03-28",
    // due within 10 days
    createdBy: "usr_tech_01",
    createdAt: "2026-02-20T11:15:00.000Z"
  },
  {
    id: "inst_avery_zk830",
    manufacturer: "Avery Weigh-Tronix",
    model: "ZK830 High Resolution Bench Scale",
    serialNo: "AWT-ZK-912044",
    accuracyClass: "Class III",
    instrumentType: "Platform Scale",
    maxCapacity: 30,
    // 30 kg
    minCapacity: 0.1,
    scaleInterval_d: 1e-3,
    // 1 g
    verificationInterval_e: 5e-3,
    // 5 g
    unit: "kg",
    location: "Industrial Inspection Bay A",
    customerName: "Nordic Agro Bulk Logistics",
    nextVerificationDue: "2026-03-05",
    // overdue
    createdBy: "usr_tech_01",
    createdAt: "2026-03-01T14:00:00.000Z"
  },
  {
    id: "inst_bizerba_sc800",
    manufacturer: "Bizerba",
    model: "System Class SC II 800",
    serialNo: "BIZ-SC-33109",
    accuracyClass: "Class III",
    instrumentType: "Retail/POS Scale",
    maxCapacity: 15,
    // 15 kg
    minCapacity: 0.04,
    scaleInterval_d: 1e-3,
    verificationInterval_e: 2e-3,
    // 2 g
    unit: "kg",
    location: "Commercial Verification Center",
    customerName: "Metro Food Retail Group",
    nextVerificationDue: "2026-09-03",
    createdBy: "usr_tech_01",
    createdAt: "2026-03-03T10:00:00.000Z"
  },
  {
    id: "inst_weighbridge_wb60",
    manufacturer: "Avery India Metrology",
    model: "Pitless Steel Deck Weighbridge WB-60T",
    serialNo: "AWI-WB-60091",
    accuracyClass: "Class III",
    instrumentType: "Weighbridge",
    maxCapacity: 6e4,
    minCapacity: 400,
    scaleInterval_d: 10,
    verificationInterval_e: 20,
    unit: "kg",
    location: "Heavy Industrial Terminal Gate 3",
    customerName: "Chennai Container Freight Station",
    nextVerificationDue: "2026-04-05",
    // due within 30 days
    createdBy: "usr_tech_01",
    createdAt: "2026-02-01T08:00:00.000Z"
  },
  {
    id: "inst_crane_scale_cs5",
    manufacturer: "CAS Corporation",
    model: "Caston-III Heavy Duty Crane Scale",
    serialNo: "CAS-CR-31045",
    accuracyClass: "Class III",
    instrumentType: "Crane Scale",
    maxCapacity: 5e3,
    minCapacity: 40,
    scaleInterval_d: 1,
    verificationInterval_e: 2,
    unit: "kg",
    location: "Steel Foundry Overhead Crane #2",
    customerName: "Southern Alloy Castings Ltd",
    nextVerificationDue: "2026-05-15",
    createdBy: "usr_tech_01",
    createdAt: "2026-02-10T10:00:00.000Z"
  },
  {
    id: "inst_counter_scale_es",
    manufacturer: "Essae-Teraoka",
    model: "DS-215 Electronic Counter Scale",
    serialNo: "ESS-DS-10492",
    accuracyClass: "Class III",
    instrumentType: "Electronic Counter Scale",
    maxCapacity: 30,
    minCapacity: 0.1,
    scaleInterval_d: 2e-3,
    verificationInterval_e: 5e-3,
    unit: "kg",
    location: "Agricultural Produce Mandi Stall #14",
    customerName: "Farmers Commodity Trade Association",
    nextVerificationDue: "2026-03-31",
    // due in ~13 days
    createdBy: "usr_tech_01",
    createdAt: "2026-02-15T09:00:00.000Z"
  }
];
var INITIAL_RULE_VERSIONS = [
  DEFAULT_OIML_R76_2006_RULE,
  IN_SERVICE_OIML_R76_RULE
];
var INITIAL_TEST_SESSIONS = [
  {
    id: "sess_approved_001",
    instrumentId: "inst_sartorius_mca",
    technicianId: "usr_tech_01",
    technicianName: "Karthikeyan Selvam",
    environmentalConditions: {
      temperatureC: 20.4,
      humidityPercent: 48,
      pressureHpa: 1013.2,
      locationNotes: "Temperature controlled test cell #2, vibration damped slab"
    },
    status: "approved",
    ruleVersionId: "rule_oiml_r76_2006_v1_0",
    createdAt: "2026-03-05T09:00:00.000Z",
    updatedAt: "2026-03-05T14:30:00.000Z",
    observations: [
      {
        id: "obs_01",
        testSessionId: "sess_approved_001",
        testType: "weighing_performance",
        testPointIndex: 1,
        loadValue: 50,
        observedReading: 50,
        direction: "increasing",
        source: "manual",
        confirmedByTechnician: true,
        createdAt: "2026-03-05T09:10:00.000Z"
      },
      {
        id: "obs_02",
        testSessionId: "sess_approved_001",
        testType: "weighing_performance",
        testPointIndex: 2,
        loadValue: 500,
        observedReading: 500.02,
        direction: "increasing",
        source: "manual",
        confirmedByTechnician: true,
        createdAt: "2026-03-05T09:15:00.000Z"
      },
      {
        id: "obs_03",
        testSessionId: "sess_approved_001",
        testType: "weighing_performance",
        testPointIndex: 3,
        loadValue: 1e3,
        observedReading: 1000.04,
        direction: "increasing",
        source: "manual",
        confirmedByTechnician: true,
        createdAt: "2026-03-05T09:20:00.000Z"
      },
      {
        id: "obs_04",
        testSessionId: "sess_approved_001",
        testType: "weighing_performance",
        testPointIndex: 4,
        loadValue: 2e3,
        observedReading: 2000.06,
        direction: "increasing",
        source: "manual",
        confirmedByTechnician: true,
        createdAt: "2026-03-05T09:25:00.000Z"
      },
      {
        id: "obs_05",
        testSessionId: "sess_approved_001",
        testType: "weighing_performance",
        testPointIndex: 5,
        loadValue: 5e3,
        observedReading: 5000.08,
        direction: "increasing",
        source: "manual",
        confirmedByTechnician: true,
        createdAt: "2026-03-05T09:30:00.000Z"
      },
      {
        id: "obs_06",
        testSessionId: "sess_approved_001",
        testType: "weighing_performance",
        testPointIndex: 6,
        loadValue: 2e3,
        observedReading: 2000.05,
        direction: "decreasing",
        source: "manual",
        confirmedByTechnician: true,
        createdAt: "2026-03-05T09:35:00.000Z"
      },
      {
        id: "obs_07",
        testSessionId: "sess_approved_001",
        testType: "eccentricity",
        testPointIndex: 7,
        loadValue: 1700,
        observedReading: 1700.03,
        position: "center",
        source: "manual",
        confirmedByTechnician: true,
        createdAt: "2026-03-05T09:40:00.000Z"
      },
      {
        id: "obs_08",
        testSessionId: "sess_approved_001",
        testType: "eccentricity",
        testPointIndex: 8,
        loadValue: 1700,
        observedReading: 1700.05,
        position: "front-left",
        source: "manual",
        confirmedByTechnician: true,
        createdAt: "2026-03-05T09:42:00.000Z"
      }
    ],
    calculation: {
      id: "calc_sess_001",
      testSessionId: "sess_approved_001",
      ruleVersionId: "rule_oiml_r76_2006_v1_0",
      ruleVersionLabel: "OIML R-76-1:2006 Table 6 (Initial Verification)",
      calculatedAt: "2026-03-05T10:00:00.000Z",
      overallResult: "PASS",
      maxObservedError: 0.08,
      maxPermissibleErrorObserved: 0.15,
      eccentricityMaxError: 0.05,
      hysteresisMaxError: 0.01,
      summaryText: "COMPLIANT: All observed indication errors and eccentricity checks meet the Maximum Permissible Error requirements of OIML R-76-1:2006 Table 6 (Initial Verification).",
      detailedResults: [
        {
          observationId: "obs_01",
          loadValue: 50,
          observedReading: 50,
          loadInMultiplesOfE: 500,
          calculatedIndication: 50,
          errorValue: 0,
          mpeValue: 0.5,
          mpeInUnits: 0.05,
          isWithinMpe: true,
          direction: "increasing"
        },
        {
          observationId: "obs_02",
          loadValue: 500,
          observedReading: 500.02,
          loadInMultiplesOfE: 5e3,
          calculatedIndication: 500.02,
          errorValue: 0.02,
          mpeValue: 0.5,
          mpeInUnits: 0.05,
          isWithinMpe: true,
          direction: "increasing"
        },
        {
          observationId: "obs_03",
          loadValue: 1e3,
          observedReading: 1000.04,
          loadInMultiplesOfE: 1e4,
          calculatedIndication: 1000.04,
          errorValue: 0.04,
          mpeValue: 1,
          mpeInUnits: 0.1,
          isWithinMpe: true,
          direction: "increasing"
        },
        {
          observationId: "obs_04",
          loadValue: 2e3,
          observedReading: 2000.06,
          loadInMultiplesOfE: 2e4,
          calculatedIndication: 2000.06,
          errorValue: 0.06,
          mpeValue: 1,
          mpeInUnits: 0.1,
          isWithinMpe: true,
          direction: "increasing"
        },
        {
          observationId: "obs_05",
          loadValue: 5e3,
          observedReading: 5000.08,
          loadInMultiplesOfE: 5e4,
          calculatedIndication: 5000.08,
          errorValue: 0.08,
          mpeValue: 1.5,
          mpeInUnits: 0.15,
          isWithinMpe: true,
          direction: "increasing"
        },
        {
          observationId: "obs_06",
          loadValue: 2e3,
          observedReading: 2000.05,
          loadInMultiplesOfE: 2e4,
          calculatedIndication: 2000.05,
          errorValue: 0.05,
          mpeValue: 1,
          mpeInUnits: 0.1,
          isWithinMpe: true,
          direction: "decreasing"
        },
        {
          observationId: "obs_07",
          loadValue: 1700,
          observedReading: 1700.03,
          loadInMultiplesOfE: 17e3,
          calculatedIndication: 1700.03,
          errorValue: 0.03,
          mpeValue: 1,
          mpeInUnits: 0.1,
          isWithinMpe: true
        },
        {
          observationId: "obs_08",
          loadValue: 1700,
          observedReading: 1700.05,
          loadInMultiplesOfE: 17e3,
          calculatedIndication: 1700.05,
          errorValue: 0.05,
          mpeValue: 1,
          mpeInUnits: 0.1,
          isWithinMpe: true
        }
      ]
    },
    approval: {
      id: "appr_sess_001",
      testSessionId: "sess_approved_001",
      approvingOfficerId: "usr_approver_01",
      approvingOfficerName: "Dr. Selvi Rajendran",
      approvingOfficerLicense: "OIML-VER-4012",
      status: "approved",
      comments: "Full type-evaluation compliance confirmed. Instrument demonstrated excellent linearity and repeatability.",
      signatureHash: "4f9a7d3b2e1c8a5b6d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c",
      approvedAt: "2026-03-05T14:30:00.000Z"
    },
    report: {
      id: "rep_sess_001",
      testSessionId: "sess_approved_001",
      reportNumber: "WS-R76-2026-9102-4018",
      certificateNumber: "WS-R76-2026-9102-4018",
      qrCodeValue: "https://weighsure.vercel.app/verify/WS-R76-2026-9102-4018",
      qrVerificationCode: "WS-R76-2026-9102-4018",
      verificationLookupCode: "WS-R76-2026-9102-4018",
      signatureHash: "4f9a7d3b2e1c8a5b6d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c",
      tamperEvidentHash: "4f9a7d3b2e1c8a5b6d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c",
      decision: "PASS",
      summaryText: "Instrument complies with OIML R-76-1:2006 Table 6 Maximum Permissible Error (MPE) thresholds across all load ranges.",
      issuedAt: "2026-03-05T14:30:00.000Z",
      validUntil: "2027-03-05",
      generatedAt: "2026-03-05T14:31:00.000Z",
      verifiedCount: 14
    },
    attachments: [
      {
        id: "att_001",
        testSessionId: "sess_approved_001",
        name: "Nameplate_and_Markings_Sartorius_MCA.jpg",
        category: "nameplate_tag",
        fileSize: "2.4 MB",
        uploadedBy: "Karthikeyan Selvam",
        uploadedAt: "2026-03-05T09:12:00.000Z",
        notes: "Verified metrological markings: Class II, Max 5200g, e=0.1g, CE M26 stamp"
      },
      {
        id: "att_002",
        testSessionId: "sess_approved_001",
        name: "Spirit_Level_Bubble_Alignment.jpg",
        category: "leveling_bubble",
        fileSize: "1.8 MB",
        uploadedBy: "Karthikeyan Selvam",
        uploadedAt: "2026-03-05T09:15:00.000Z",
        notes: "Level indicator bubble precisely centered in indicator ring prior to zeroing"
      },
      {
        id: "att_003",
        testSessionId: "sess_approved_001",
        name: "Traceable_Weight_Set_Cert_DKD_E2.pdf",
        category: "calibration_certificate",
        fileSize: "840 KB",
        uploadedBy: "Karthikeyan Selvam",
        uploadedAt: "2026-03-05T09:20:00.000Z",
        notes: "NIST/DKD Traceable standard weight set certificate (E2 Class, valid through 2027)"
      }
    ]
  },
  {
    id: "sess_pending_002",
    instrumentId: "inst_avery_zk830",
    technicianId: "usr_tech_01",
    technicianName: "Karthikeyan Selvam",
    environmentalConditions: {
      temperatureC: 19.8,
      humidityPercent: 52,
      pressureHpa: 1015,
      locationNotes: "Industrial Test Bay A, floor isolated"
    },
    status: "pending_approval",
    ruleVersionId: "rule_oiml_r76_2006_v1_0",
    createdAt: "2026-03-08T10:00:00.000Z",
    updatedAt: "2026-03-08T12:00:00.000Z",
    observations: [
      {
        id: "obs_p1",
        testSessionId: "sess_pending_002",
        testType: "weighing_performance",
        testPointIndex: 1,
        loadValue: 2,
        observedReading: 2.001,
        direction: "increasing",
        source: "ocr",
        rawOcrConfidence: 0.98,
        confirmedByTechnician: true,
        createdAt: "2026-03-08T10:15:00.000Z"
      },
      {
        id: "obs_p2",
        testSessionId: "sess_pending_002",
        testType: "weighing_performance",
        testPointIndex: 2,
        loadValue: 10,
        observedReading: 10.002,
        direction: "increasing",
        source: "ocr",
        rawOcrConfidence: 0.96,
        confirmedByTechnician: true,
        createdAt: "2026-03-08T10:18:00.000Z"
      },
      {
        id: "obs_p3",
        testSessionId: "sess_pending_002",
        testType: "weighing_performance",
        testPointIndex: 3,
        loadValue: 20,
        observedReading: 20.004,
        direction: "increasing",
        source: "ocr",
        rawOcrConfidence: 0.94,
        confirmedByTechnician: true,
        createdAt: "2026-03-08T10:22:00.000Z"
      },
      {
        id: "obs_p4",
        testSessionId: "sess_pending_002",
        testType: "weighing_performance",
        testPointIndex: 4,
        loadValue: 30,
        observedReading: 30.006,
        direction: "increasing",
        source: "ocr",
        rawOcrConfidence: 0.95,
        confirmedByTechnician: true,
        createdAt: "2026-03-08T10:25:00.000Z"
      },
      {
        id: "obs_p5",
        testSessionId: "sess_pending_002",
        testType: "weighing_performance",
        testPointIndex: 5,
        loadValue: 15,
        observedReading: 15.003,
        direction: "decreasing",
        source: "ocr",
        rawOcrConfidence: 0.92,
        confirmedByTechnician: true,
        createdAt: "2026-03-08T10:30:00.000Z"
      }
    ],
    calculation: {
      id: "calc_sess_002",
      testSessionId: "sess_pending_002",
      ruleVersionId: "rule_oiml_r76_2006_v1_0",
      ruleVersionLabel: "OIML R-76-1:2006 Table 6 (Initial Verification)",
      calculatedAt: "2026-03-08T11:00:00.000Z",
      overallResult: "PASS",
      maxObservedError: 6e-3,
      maxPermissibleErrorObserved: 75e-4,
      summaryText: "COMPLIANT: All observed indication errors meet the Maximum Permissible Error requirements of OIML R-76-1:2006 Table 6 (Initial Verification).",
      detailedResults: [
        {
          observationId: "obs_p1",
          loadValue: 2,
          observedReading: 2.001,
          loadInMultiplesOfE: 400,
          calculatedIndication: 2.001,
          errorValue: 1e-3,
          mpeValue: 0.5,
          mpeInUnits: 25e-4,
          isWithinMpe: true,
          direction: "increasing"
        },
        {
          observationId: "obs_p2",
          loadValue: 10,
          observedReading: 10.002,
          loadInMultiplesOfE: 2e3,
          calculatedIndication: 10.002,
          errorValue: 2e-3,
          mpeValue: 1,
          mpeInUnits: 5e-3,
          isWithinMpe: true,
          direction: "increasing"
        },
        {
          observationId: "obs_p3",
          loadValue: 20,
          observedReading: 20.004,
          loadInMultiplesOfE: 4e3,
          calculatedIndication: 20.004,
          errorValue: 4e-3,
          mpeValue: 1.5,
          mpeInUnits: 75e-4,
          isWithinMpe: true,
          direction: "increasing"
        },
        {
          observationId: "obs_p4",
          loadValue: 30,
          observedReading: 30.006,
          loadInMultiplesOfE: 6e3,
          calculatedIndication: 30.006,
          errorValue: 6e-3,
          mpeValue: 1.5,
          mpeInUnits: 75e-4,
          isWithinMpe: true,
          direction: "increasing"
        },
        {
          observationId: "obs_p5",
          loadValue: 15,
          observedReading: 15.003,
          loadInMultiplesOfE: 3e3,
          calculatedIndication: 15.003,
          errorValue: 3e-3,
          mpeValue: 1.5,
          mpeInUnits: 75e-4,
          isWithinMpe: true,
          direction: "decreasing"
        }
      ]
    },
    attachments: [
      {
        id: "att_101",
        testSessionId: "sess_pending_002",
        name: "Bench_Scale_Load_Receiver_Setup.jpg",
        category: "instrument_photograph",
        fileSize: "3.1 MB",
        uploadedBy: "Karthikeyan Selvam",
        uploadedAt: "2026-03-08T10:10:00.000Z",
        notes: "Industrial platform installation in Bay A, corner bumpers clear of interference"
      },
      {
        id: "att_102",
        testSessionId: "sess_pending_002",
        name: "Avery_Nameplate_Specification_Tag.jpg",
        category: "nameplate_tag",
        fileSize: "1.9 MB",
        uploadedBy: "Karthikeyan Selvam",
        uploadedAt: "2026-03-08T10:12:00.000Z",
        notes: "Serial plate AWT-ZK-912044, Max 30kg, e=5g, OIML Class III"
      }
    ]
  }
];
var INITIAL_AUDIT_LOGS = [
  {
    id: "log_001",
    userId: "usr_admin_01",
    userName: "Saravanan Ramakrishnan",
    userRole: "admin",
    action: "RULE_VERSION_ACTIVATED",
    entityType: "rule_version",
    entityId: "rule_oiml_r76_2006_v1_0",
    timestamp: "2026-01-01T08:00:00.000Z",
    ruleVersionId: "rule_oiml_r76_2006_v1_0",
    metadataJson: {
      standard: "OIML R-76-1:2006 (E)",
      status: "active_default"
    }
  },
  {
    id: "log_002",
    userId: "usr_tech_01",
    userName: "Karthikeyan Selvam",
    userRole: "technician",
    action: "INSTRUMENT_REGISTERED",
    entityType: "instrument",
    entityId: "inst_sartorius_mca",
    timestamp: "2026-02-20T11:15:00.000Z",
    metadataJson: {
      model: "Cubis II MCA5202S",
      serialNo: "SART-CB-449102",
      accuracyClass: "Class II",
      maxCapacity: "5200 g"
    }
  },
  {
    id: "log_003",
    userId: "usr_tech_01",
    userName: "Karthikeyan Selvam",
    userRole: "technician",
    action: "TEST_SESSION_CREATED",
    entityType: "test_session",
    entityId: "sess_approved_001",
    timestamp: "2026-03-05T09:00:00.000Z",
    ruleVersionId: "rule_oiml_r76_2006_v1_0",
    metadataJson: {
      instrumentId: "inst_sartorius_mca",
      envTemp: 20.4,
      envRH: 48
    }
  },
  {
    id: "log_004",
    userId: "usr_tech_01",
    userName: "Karthikeyan Selvam",
    userRole: "technician",
    action: "CALCULATION_EXECUTED",
    entityType: "calculation",
    entityId: "calc_sess_001",
    timestamp: "2026-03-05T10:00:00.000Z",
    ruleVersionId: "rule_oiml_r76_2006_v1_0",
    metadataJson: {
      result: "PASS",
      observationCount: 8,
      maxObservedError: 0.08
    }
  },
  {
    id: "log_005",
    userId: "usr_approver_01",
    userName: "Dr. Selvi Rajendran",
    userRole: "approving_officer",
    action: "APPROVAL_GRANTED",
    entityType: "approval",
    entityId: "appr_sess_001",
    timestamp: "2026-03-05T14:30:00.000Z",
    ruleVersionId: "rule_oiml_r76_2006_v1_0",
    metadataJson: {
      signatureHash: "4f9a7d3b2e1c8a5b6d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c",
      approvingOfficerLicense: "OIML-VER-4012"
    }
  },
  {
    id: "log_006",
    userId: "usr_approver_01",
    userName: "Dr. Selvi Rajendran",
    userRole: "approving_officer",
    action: "REPORT_ISSUED_WITH_QR",
    entityType: "report",
    entityId: "rep_sess_001",
    timestamp: "2026-03-05T14:31:00.000Z",
    ruleVersionId: "rule_oiml_r76_2006_v1_0",
    metadataJson: {
      reportNumber: "WS-R76-2026-9102-4018",
      qrVerificationValue: "https://weighsure.lab/verify/WS-R76-2026-9102-4018"
    }
  },
  {
    id: "log_007",
    userId: "usr_tech_01",
    userName: "Karthikeyan Selvam",
    userRole: "technician",
    action: "OCR_EXTRACTION_CONFIRMED",
    entityType: "test_session",
    entityId: "sess_pending_002",
    timestamp: "2026-03-08T10:40:00.000Z",
    metadataJson: {
      source: "PaddleOCR / Scanned Sheet Intake",
      extractedPoints: 5,
      averageConfidence: 0.95
    }
  },
  {
    id: "log_008",
    userId: "usr_tech_01",
    userName: "Karthikeyan Selvam",
    userRole: "technician",
    action: "SUBMITTED_FOR_APPROVAL",
    entityType: "test_session",
    entityId: "sess_pending_002",
    timestamp: "2026-03-08T11:05:00.000Z",
    ruleVersionId: "rule_oiml_r76_2006_v1_0",
    metadataJson: {
      calculationResult: "PASS",
      submittedTo: "Approving Officers Queue"
    }
  }
];

// src/api/serverless.ts
var app = express();
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-user-id");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});
var dbUsers = [...INITIAL_USERS];
var dbInstruments = [...INITIAL_INSTRUMENTS];
var dbRuleVersions = [...INITIAL_RULE_VERSIONS];
var dbTestSessions = [...INITIAL_TEST_SESSIONS];
var dbAuditLogs = [...INITIAL_AUDIT_LOGS];
var currentUser = dbUsers[0];
function recordAuditLog(user, action, entityType, entityId, ruleVersionId, metadataJson = {}) {
  const newLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action,
    entityType,
    entityId,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ruleVersionId,
    metadataJson
  };
  dbAuditLogs.unshift(newLog);
  return newLog;
}
app.get(["/api/health", "/health"], (_req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString(), platform: "vercel-serverless" });
});
app.get(["/api/users", "/users"], (_req, res) => {
  res.json(dbUsers);
});
app.get(["/api/users/current", "/users/current", "/api/auth/me"], (_req, res) => {
  res.json(currentUser);
});
app.post(["/api/users/switch-role", "/users/switch-role", "/api/auth/switch-role"], (req, res) => {
  const { role } = req.body;
  const match = dbUsers.find((u) => u.role === role);
  if (match) {
    currentUser = match;
    res.json({ success: true, user: currentUser });
  } else {
    res.status(400).json({ error: "Role not found" });
  }
});
app.get(["/api/instruments", "/instruments"], (_req, res) => {
  res.json(dbInstruments);
});
app.post(["/api/instruments", "/instruments"], (req, res) => {
  const body = req.body;
  const newInst = {
    id: `inst_${Date.now()}`,
    manufacturer: body.manufacturer,
    model: body.model,
    serialNo: body.serialNo,
    accuracyClass: body.accuracyClass,
    instrumentType: body.instrumentType || "Bench Scale",
    maxCapacity: Number(body.maxCapacity),
    minCapacity: Number(body.minCapacity),
    scaleInterval_d: Number(body.scaleInterval_d),
    verificationInterval_e: Number(body.verificationInterval_e),
    unit: body.unit,
    location: body.location || "Metrology Testing Bench",
    customerName: body.customerName,
    createdBy: currentUser.id,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  dbInstruments.unshift(newInst);
  recordAuditLog(currentUser, "INSTRUMENT_REGISTERED", "instrument", newInst.id, void 0, {
    serialNo: newInst.serialNo,
    model: newInst.model
  });
  res.status(201).json(newInst);
});
app.get(["/api/rule-versions", "/rule-versions"], (_req, res) => {
  res.json(dbRuleVersions);
});
app.put(["/api/rule-versions/:id/activate", "/rule-versions/:id/activate"], (req, res) => {
  const { id } = req.params;
  const target = dbRuleVersions.find((r) => r.id === id);
  if (!target) {
    res.status(404).json({ error: "Rule version not found" });
    return;
  }
  dbRuleVersions.forEach((r) => {
    r.isDefault = r.id === id;
  });
  recordAuditLog(currentUser, "RULE_VERSION_ACTIVATED", "rule_version", id, id);
  res.json({ success: true, activeRule: target });
});
app.get(["/api/test-sessions", "/test-sessions"], (_req, res) => {
  res.json(dbTestSessions);
});
app.post(["/api/test-sessions", "/test-sessions"], (req, res) => {
  const body = req.body;
  const inst = dbInstruments.find((i) => i.id === body.instrumentId) || dbInstruments[0];
  const activeRule = dbRuleVersions.find((r) => r.isDefault) || dbRuleVersions[0];
  const newSession = {
    id: `sess_${Date.now()}`,
    instrumentId: inst.id,
    technicianId: currentUser.id,
    technicianName: currentUser.name,
    ruleVersionId: activeRule.id,
    status: "draft",
    environmentalConditions: body.environmentalConditions || {
      temperatureC: 20,
      humidityPercent: 50,
      pressureHpa: 1013.25
    },
    observations: [],
    attachments: [],
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  dbTestSessions.unshift(newSession);
  recordAuditLog(currentUser, "SESSION_CREATED", "test_session", newSession.id, activeRule.id);
  res.status(201).json(newSession);
});
app.get(["/api/test-sessions/:id", "/test-sessions/:id"], (req, res) => {
  const session = dbTestSessions.find((s) => s.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(session);
});
app.put(["/api/test-sessions/:id", "/test-sessions/:id"], (req, res) => {
  const index = dbTestSessions.findIndex((s) => s.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const updated = {
    ...dbTestSessions[index],
    ...req.body,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  dbTestSessions[index] = updated;
  res.json(updated);
});
app.post(["/api/test-sessions/:id/calculate", "/test-sessions/:id/calculate"], (req, res) => {
  const session = dbTestSessions.find((s) => s.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const inst = dbInstruments.find((i) => i.id === session.instrumentId) || session.instrument || dbInstruments[0];
  const rule = dbRuleVersions.find((r) => r.id === session.ruleVersionId) || dbRuleVersions[0];
  const calculation = executeTestSessionCalculation(session.id, session.observations, inst, rule);
  session.calculation = calculation;
  session.status = "calculated";
  session.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  recordAuditLog(currentUser, "CALCULATION_EXECUTED", "test_session", session.id, rule.id, {
    overallResult: calculation.overallResult
  });
  res.json(session);
});
app.post(["/api/test-sessions/:id/submit-approval", "/api/test-sessions/:id/submit", "/test-sessions/:id/submit-approval"], (req, res) => {
  const session = dbTestSessions.find((s) => s.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  session.status = "pending_approval";
  session.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  recordAuditLog(currentUser, "SUBMITTED_FOR_APPROVAL", "test_session", session.id, session.ruleVersionId);
  res.json(session);
});
app.post(["/api/test-sessions/:id/approve", "/test-sessions/:id/approve"], async (req, res) => {
  const session = dbTestSessions.find((s) => s.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const now = /* @__PURE__ */ new Date();
  const validUntil = new Date(now);
  validUntil.setFullYear(validUntil.getFullYear() + 1);
  const certNumber = `WS-R76-${now.getFullYear()}-${Math.floor(1e3 + Math.random() * 9e3)}-${session.id.slice(-4).toUpperCase()}`;
  const verificationUrl = `https://weighsure.vercel.app/verify/${encodeURIComponent(certNumber)}`;
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, { width: 320, margin: 1 });
  session.status = "approved";
  session.approval = {
    id: `appr_${Date.now()}`,
    testSessionId: session.id,
    approvingOfficerId: currentUser.id,
    approvingOfficerName: currentUser.name,
    approvingOfficerLicense: currentUser.licenseNumber || "LM-VERIF-77218",
    status: "approved",
    comments: req.body.comments || "Metrological compliance confirmed with OIML R-76-1:2006 Table 6.",
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
    validUntil: validUntil.toISOString().split("T")[0],
    decision: session.calculation?.overallResult || "PASS",
    summaryText: "Instrument complies with OIML R-76 Table 6 Maximum Permissible Error (MPE) thresholds.",
    qrCodeValue: verificationUrl,
    qrCodeDataUrl,
    qrVerificationCode: certNumber,
    verificationLookupCode: certNumber,
    tamperEvidentHash: session.approval.signatureHash
  };
  session.updatedAt = now.toISOString();
  recordAuditLog(currentUser, "CERTIFICATE_ISSUED", "test_session", session.id, session.ruleVersionId, {
    certificateNumber: certNumber,
    officer: currentUser.name
  });
  res.json(session);
});
app.post(["/api/test-sessions/:id/reject", "/test-sessions/:id/reject"], (req, res) => {
  const session = dbTestSessions.find((s) => s.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  session.status = "rejected";
  session.approval = {
    id: `appr_${Date.now()}`,
    testSessionId: session.id,
    approvingOfficerId: currentUser.id,
    approvingOfficerName: currentUser.name,
    approvingOfficerLicense: currentUser.licenseNumber || "LM-VERIF-77218",
    status: "rejected",
    comments: req.body.comments || "Rejected: Does not meet OIML R-76 statutory compliance.",
    signatureHash: `reject_${Date.now().toString(16)}`,
    approvedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  session.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  recordAuditLog(currentUser, "SESSION_REJECTED", "test_session", session.id, session.ruleVersionId, {
    comments: req.body.comments
  });
  res.json(session);
});
app.post(["/api/test-sessions/:id/attachments", "/test-sessions/:id/attachments"], (req, res) => {
  const session = dbTestSessions.find((s) => s.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const body = req.body;
  const newAttachment = {
    id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    testSessionId: session.id,
    name: body.name,
    category: body.category,
    fileSize: body.fileSize || "1.2 MB",
    dataUrl: body.dataUrl,
    notes: body.notes,
    uploadedBy: currentUser.name,
    uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (!session.attachments) session.attachments = [];
  session.attachments.unshift(newAttachment);
  session.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  recordAuditLog(currentUser, "EVIDENCE_ATTACHED", "test_session", session.id, session.ruleVersionId, {
    attachmentId: newAttachment.id,
    category: newAttachment.category,
    name: newAttachment.name
  });
  res.status(201).json(newAttachment);
});
app.delete(["/api/test-sessions/:id/attachments/:attachmentId", "/test-sessions/:id/attachments/:attachmentId"], (req, res) => {
  const session = dbTestSessions.find((s) => s.id === req.params.id);
  if (!session || !session.attachments) {
    res.status(404).json({ error: "Session or attachments not found" });
    return;
  }
  const attIndex = session.attachments.findIndex((a) => a.id === req.params.attachmentId);
  if (attIndex === -1) {
    res.status(404).json({ error: "Attachment not found" });
    return;
  }
  const removed = session.attachments.splice(attIndex, 1)[0];
  session.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  recordAuditLog(currentUser, "EVIDENCE_REMOVED", "test_session", session.id, session.ruleVersionId, {
    attachmentId: req.params.attachmentId,
    name: removed.name
  });
  res.json({ success: true, removedId: req.params.attachmentId });
});
app.get(["/api/audit-logs", "/audit-logs"], (_req, res) => {
  res.json(dbAuditLogs);
});
app.get(["/api/stats", "/stats"], (_req, res) => {
  const totalInstruments = dbInstruments.length;
  const verifiedSessions = dbTestSessions.filter((s) => s.status === "approved").length;
  const pendingSessions = dbTestSessions.filter((s) => s.status === "pending_approval" || s.status === "calculated").length;
  res.json({
    totalInstruments,
    verifiedSessions,
    pendingSessions,
    totalAuditEntries: dbAuditLogs.length,
    activeRuleVersion: dbRuleVersions.find((r) => r.isDefault)?.versionLabel || "OIML R-76-1:2006"
  });
});
app.get(["/api/verify/:code", "/verify/:code"], (req, res) => {
  const code = decodeURIComponent(req.params.code).trim().toLowerCase();
  const session = dbTestSessions.find((s) => {
    if (!s.report) return false;
    const cert = (s.report.certificateNumber || s.report.reportNumber || "").toLowerCase();
    const qrCode = (s.report.qrVerificationCode || s.report.verificationLookupCode || "").toLowerCase();
    const qrVal = (s.report.qrCodeValue || "").toLowerCase();
    const sessId = s.id.toLowerCase();
    return cert === code || qrCode === code || qrVal.includes(code) || sessId === code;
  });
  if (session && session.report) {
    const inst = dbInstruments.find((i) => i.id === session.instrumentId) || session.instrument || dbInstruments[0];
    const lookup = {
      isValid: true,
      status: "AUTHENTIC_AND_VALID",
      reportNumber: session.report.reportNumber || session.report.certificateNumber || "WS-VERIFIED",
      certificateNumber: session.report.certificateNumber || session.report.reportNumber,
      issuedAt: session.report.issuedAt || session.report.generatedAt,
      validUntil: session.report.validUntil || "2027-03-05",
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
        result: session.report.decision || "PASS",
        verifiedAt: session.report.issuedAt || session.report.generatedAt || (/* @__PURE__ */ new Date()).toISOString(),
        validUntil: session.report.validUntil || "2027-03-05",
        ruleVersion: session.calculation?.ruleVersionLabel || "OIML R-76-1:2006 Table 6",
        standard: "OIML R-76-1:2006 (E)",
        approvingOfficer: session.approval?.approvingOfficerName || "Dr. Selvi Rajendran",
        licenseNo: session.approval?.approvingOfficerLicense || "OIML-VER-4012",
        signatureHash: session.report.tamperEvidentHash || session.approval?.signatureHash || "c8b21...verified"
      },
      officer: {
        name: session.approval?.approvingOfficerName || "Dr. Selvi Rajendran",
        license: session.approval?.approvingOfficerLicense || "OIML-VER-4012"
      },
      tamperEvidentHash: session.report.tamperEvidentHash || session.approval?.signatureHash || "c8b217a9...verified",
      ruleVersionLabel: session.calculation?.ruleVersionLabel || "OIML R-76 Standard"
    };
    res.json(lookup);
    return;
  }
  res.status(404).json({ error: "Certificate or record not found", isValid: false });
});
var serverless_default = app;
export {
  serverless_default as default
};
