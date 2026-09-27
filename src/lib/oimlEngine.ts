/**
 * WeighSure - Deterministic OIML R-76 Rule Engine
 * Conforms strictly to OIML R-76-1:2006 (E)
 * Non-Automatic Weighing Instruments - Metrological and technical requirements - Tests
 *
 * All calculations are 100% deterministic from a versioned JSON rule configuration.
 */

import {
  AccuracyClass,
  Instrument,
  Observation,
  ObservationCalculation,
  OimlRuleConfiguration,
  TestSessionCalculation,
  CalculationDecision
} from '../types';

/**
 * Standard OIML R-76-1:2006 Table 6 Default Rule Configuration
 */
export const DEFAULT_OIML_R76_2006_RULE: OimlRuleConfiguration = {
  id: 'rule_oiml_r76_2006_v1_0',
  versionLabel: 'OIML R-76-1:2006 Table 6 (Initial Verification)',
  standardTitle: 'OIML R-76-1:2006 (E) Metrological Requirements - Initial Verification',
  isDefault: true,
  effectiveFrom: '2006-01-01T00:00:00.000Z',
  createdBy: 'system_oiml_committee',
  description: 'Standard Table 6 Maximum Permissible Errors (MPE) for Non-Automatic Weighing Instruments during initial verification or type-evaluation.',
  rules: {
    classes: {
      'Class I': {
        minScaleDivisions_n: 50000,
        maxScaleDivisions_n: 10000000,
        mpeBands: [
          { minM: 0, maxM: 50000, mpeInitial: 0.5, mpeService: 1.0 },
          { minM: 50000, maxM: 200000, mpeInitial: 1.0, mpeService: 2.0 },
          { minM: 200000, maxM: Infinity, mpeInitial: 1.5, mpeService: 3.0 }
        ]
      },
      'Class II': {
        minScaleDivisions_n: 100,
        maxScaleDivisions_n: 100000,
        mpeBands: [
          { minM: 0, maxM: 5000, mpeInitial: 0.5, mpeService: 1.0 },
          { minM: 5000, maxM: 20000, mpeInitial: 1.0, mpeService: 2.0 },
          { minM: 20000, maxM: 100000, mpeInitial: 1.5, mpeService: 3.0 }
        ]
      },
      'Class III': {
        minScaleDivisions_n: 500,
        maxScaleDivisions_n: 10000,
        mpeBands: [
          { minM: 0, maxM: 500, mpeInitial: 0.5, mpeService: 1.0 },
          { minM: 500, maxM: 2000, mpeInitial: 1.0, mpeService: 2.0 },
          { minM: 2000, maxM: 10000, mpeInitial: 1.5, mpeService: 3.0 }
        ]
      },
      'Class IIII': {
        minScaleDivisions_n: 100,
        maxScaleDivisions_n: 1000,
        mpeBands: [
          { minM: 0, maxM: 50, mpeInitial: 0.5, mpeService: 1.0 },
          { minM: 50, maxM: 200, mpeInitial: 1.0, mpeService: 2.0 },
          { minM: 200, maxM: 1000, mpeInitial: 1.5, mpeService: 3.0 }
        ]
      }
    },
    eccentricityFractionOfMax: 0.3333333333, // 1/3 of Max capacity applied to corners
    repeatabilityRuns: 3,
    hysteresisLimitMultiplier: 1.0
  }
};

/**
 * Secondary In-Service Inspection Rule Configuration (Double MPE)
 */
export const IN_SERVICE_OIML_R76_RULE: OimlRuleConfiguration = {
  id: 'rule_oiml_r76_in_service_v1_1',
  versionLabel: 'OIML R-76-1:2006 (In-Service Inspection)',
  standardTitle: 'OIML R-76-1:2006 Section 3.5.2 In-Service Inspection',
  isDefault: false,
  effectiveFrom: '2010-06-01T00:00:00.000Z',
  createdBy: 'system_oiml_committee',
  description: 'In-service inspection maximum permissible errors (twice the initial verification MPE).',
  rules: {
    classes: {
      'Class I': {
        minScaleDivisions_n: 50000,
        maxScaleDivisions_n: 10000000,
        mpeBands: [
          { minM: 0, maxM: 50000, mpeInitial: 1.0, mpeService: 1.0 },
          { minM: 50000, maxM: 200000, mpeInitial: 2.0, mpeService: 2.0 },
          { minM: 200000, maxM: Infinity, mpeInitial: 3.0, mpeService: 3.0 }
        ]
      },
      'Class II': {
        minScaleDivisions_n: 100,
        maxScaleDivisions_n: 100000,
        mpeBands: [
          { minM: 0, maxM: 5000, mpeInitial: 1.0, mpeService: 1.0 },
          { minM: 5000, maxM: 20000, mpeInitial: 2.0, mpeService: 2.0 },
          { minM: 20000, maxM: 100000, mpeInitial: 3.0, mpeService: 3.0 }
        ]
      },
      'Class III': {
        minScaleDivisions_n: 500,
        maxScaleDivisions_n: 10000,
        mpeBands: [
          { minM: 0, maxM: 500, mpeInitial: 1.0, mpeService: 1.0 },
          { minM: 500, maxM: 2000, mpeInitial: 2.0, mpeService: 2.0 },
          { minM: 2000, maxM: 10000, mpeInitial: 3.0, mpeService: 3.0 }
        ]
      },
      'Class IIII': {
        minScaleDivisions_n: 100,
        maxScaleDivisions_n: 1000,
        mpeBands: [
          { minM: 0, maxM: 50, mpeInitial: 1.0, mpeService: 1.0 },
          { minM: 50, maxM: 200, mpeInitial: 2.0, mpeService: 2.0 },
          { minM: 200, maxM: 1000, mpeInitial: 3.0, mpeService: 3.0 }
        ]
      }
    },
    eccentricityFractionOfMax: 0.3333333333,
    repeatabilityRuns: 3,
    hysteresisLimitMultiplier: 1.0
  }
};

/**
 * Determine Maximum Permissible Error (in multiples of e) for a given load
 */
export function calculateMpeInMultiplesOfE(
  load: number,
  verificationInterval_e: number,
  accuracyClass: AccuracyClass,
  ruleConfig: OimlRuleConfiguration
): number {
  if (verificationInterval_e <= 0) {
    throw new Error('Verification scale interval e must be strictly positive');
  }

  const loadInE = Math.abs(load) / verificationInterval_e;
  const classRules = ruleConfig.rules.classes[accuracyClass];
  if (!classRules) {
    throw new Error(`Unsupported accuracy class: ${accuracyClass}`);
  }

  for (const band of classRules.mpeBands) {
    // Check range: minM <= loadInE <= maxM (with boundary inclusivity)
    if (loadInE >= band.minM && loadInE <= band.maxM) {
      return band.mpeInitial;
    }
  }

  // Fallback to highest band if slightly above range
  const lastBand = classRules.mpeBands[classRules.mpeBands.length - 1];
  return lastBand ? lastBand.mpeInitial : 1.5;
}

/**
 * Calculate single observation error & MPE evaluation
 *
 * Formula:
 * If turning-point deltaL is provided:
 *   Indication before rounding: P = I + 0.5e - deltaL
 *   Error: E = P - L
 * Else:
 *   Error: E = I - L
 */
export function evaluateSingleObservation(
  obs: Observation,
  instrument: Instrument,
  ruleConfig: OimlRuleConfiguration
): ObservationCalculation {
  const e = instrument.verificationInterval_e;
  const L = obs.loadValue;
  const I = obs.observedReading;

  // Turning point calculation if deltaL was recorded
  let P: number;
  if (obs.deltaL !== undefined && obs.deltaL !== null && !isNaN(obs.deltaL)) {
    P = I + 0.5 * e - obs.deltaL;
  } else {
    P = I;
  }

  const errorValue = Number((P - L).toFixed(6));
  const loadInMultiplesOfE = Number((L / e).toFixed(4));
  const mpeMultiples = calculateMpeInMultiplesOfE(L, e, instrument.accuracyClass, ruleConfig);
  const mpeInUnits = Number((mpeMultiples * e).toFixed(6));

  // OIML R-76 clause: |E| <= MPE
  // Include floating-point precision tolerance (1e-7)
  const isWithinMpe = Math.abs(errorValue) <= mpeInUnits + 1e-7;

  let notes = '';
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

/**
 * Execute full deterministic test session calculation under OIML R-76
 */
export function executeTestSessionCalculation(
  testSessionId: string,
  observations: Observation[],
  instrument: Instrument,
  ruleConfig: OimlRuleConfiguration
): TestSessionCalculation {
  if (!observations || observations.length === 0) {
    throw new Error('Cannot calculate: Test session has no observations');
  }

  const detailedResults: ObservationCalculation[] = [];
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

  // Check Repeatability Test (OIML R-76 clause A.4.4.1)
  // At a single test load, the difference between the extreme values observed shall not exceed the absolute value of the MPE for that load.
  const repeatabilityObs = observations.filter(o => o.testType === 'repeatability');
  let repeatabilityError: number | undefined;
  let repeatabilityFailed = false;

  if (repeatabilityObs.length >= 2) {
    // Group by load
    const loadGroups: Record<number, number[]> = {};
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

  // Check Eccentricity Test (OIML R-76 clause A.4.7)
  // Corner load errors must each be <= MPE
  const eccentricityObs = observations.filter(o => o.testType === 'eccentricity');
  let eccentricityMaxError: number | undefined;
  let eccentricityFailed = false;

  if (eccentricityObs.length > 0) {
    const eccCalcs = detailedResults.filter(r => {
      const parent = observations.find(o => o.id === r.observationId);
      return parent?.testType === 'eccentricity';
    });
    const maxEccErr = Math.max(...eccCalcs.map(c => Math.abs(c.errorValue)));
    eccentricityMaxError = maxEccErr;
    eccentricityFailed = eccCalcs.some(c => !c.isWithinMpe);
  }

  // Check Hysteresis (Weighing Performance decreasing vs increasing at same load)
  const weighingObs = observations.filter(o => o.testType === 'weighing_performance');
  let hysteresisMaxError: number | undefined;
  let hysteresisFailed = false;

  if (weighingObs.length > 0) {
    const incObs = weighingObs.filter(o => o.direction === 'increasing');
    const decObs = weighingObs.filter(o => o.direction === 'decreasing');

    for (const dec of decObs) {
      const matchInc = incObs.find(inc => Math.abs(inc.loadValue - dec.loadValue) < 1e-5);
      if (matchInc) {
        const diff = Math.abs(dec.observedReading - matchInc.observedReading);
        if (hysteresisMaxError === undefined || diff > hysteresisMaxError) {
          hysteresisMaxError = Number(diff.toFixed(6));
        }
        const mpeAtLoad = calculateMpeInMultiplesOfE(dec.loadValue, instrument.verificationInterval_e, instrument.accuracyClass, ruleConfig) * instrument.verificationInterval_e;
        if (diff > mpeAtLoad + 1e-7) {
          hysteresisFailed = true;
        }
      }
    }
  }

  // Check if any flagged anomalies or unconfirmed observations exist
  const hasUnconfirmed = observations.some(o => !o.confirmedByTechnician);
  const hasUnresolvedAnomalies = observations.some(o => o.isFlaggedAnomaly && !o.confirmedByTechnician);

  let overallResult: CalculationDecision = 'PASS';
  let summaryText = '';

  if (anyFailed || repeatabilityFailed || eccentricityFailed || hysteresisFailed) {
    overallResult = 'FAIL';
    const reasons: string[] = [];
    if (anyFailed) reasons.push('Indication error exceeds Table 6 MPE limits');
    if (repeatabilityFailed) reasons.push('Repeatability spread exceeds MPE');
    if (eccentricityFailed) reasons.push('Eccentricity corner load exceeds MPE');
    if (hysteresisFailed) reasons.push('Hysteresis error exceeds permissible limits');
    summaryText = `NON-COMPLIANT under ${ruleConfig.versionLabel}. ${reasons.join('. ')}.`;
  } else if (hasUnconfirmed || hasUnresolvedAnomalies) {
    overallResult = 'REVIEW';
    summaryText = `COMPLIANCE PENDING: All mathematical errors are within MPE, but observations contain unconfirmed or OCR-flagged values requiring technician verification.`;
  } else {
    overallResult = 'PASS';
    summaryText = `COMPLIANT: All observed indication errors, repeatability, and eccentricity checks meet the Maximum Permissible Error requirements of ${ruleConfig.standardTitle}.`;
  }

  return {
    id: `calc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    testSessionId,
    ruleVersionId: ruleConfig.id,
    ruleVersionLabel: ruleConfig.versionLabel,
    calculatedAt: new Date().toISOString(),
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
