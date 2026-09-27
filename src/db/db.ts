import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import {
  User,
  Instrument,
  ReferenceStandard,
  OimlRuleConfiguration,
  TestSession,
  Observation,
  EnvironmentalConditions,
  CalculationResult,
  ApprovalRecord,
  ReportRecord,
  SessionAttachment,
  AuditLog
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_INSTRUMENTS,
  INITIAL_REFERENCE_STANDARDS,
  INITIAL_RULE_VERSIONS,
  INITIAL_TEST_SESSIONS,
  INITIAL_AUDIT_LOGS
} from '../lib/initialData';

// Ensure data directory exists for persistent PostgreSQL cluster
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new PGlite(path.join(DATA_DIR, 'pgdata'));

/**
 * Initialize PostgreSQL tables matching the existing data model exactly
 */
export async function initDatabase(): Promise<void> {
  // 1. users
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT NOT NULL,
      license_number TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // 2. instruments (with instrument_type and next_verification_due)
  await db.query(`
    CREATE TABLE IF NOT EXISTS instruments (
      id TEXT PRIMARY KEY,
      manufacturer TEXT NOT NULL,
      model TEXT NOT NULL,
      serial_no TEXT NOT NULL,
      accuracy_class TEXT NOT NULL,
      instrument_type TEXT NOT NULL DEFAULT 'Bench Scale',
      max_capacity NUMERIC NOT NULL,
      min_capacity NUMERIC NOT NULL,
      scale_interval_d NUMERIC NOT NULL,
      verification_interval_e NUMERIC NOT NULL,
      unit TEXT NOT NULL DEFAULT 'g',
      location TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      next_verification_due TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // 3. reference_standards
  await db.query(`
    CREATE TABLE IF NOT EXISTS reference_standards (
      id TEXT PRIMARY KEY,
      mass_value NUMERIC NOT NULL,
      unit TEXT NOT NULL,
      standard_class TEXT NOT NULL,
      traceability_number TEXT NOT NULL,
      calibration_certificate_number TEXT NOT NULL,
      calibration_expiry_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // 4. oiml_rule_configurations
  await db.query(`
    CREATE TABLE IF NOT EXISTS oiml_rule_configurations (
      id TEXT PRIMARY KEY,
      version_label TEXT NOT NULL,
      standard_title TEXT NOT NULL,
      is_default BOOLEAN NOT NULL DEFAULT false,
      effective_from TEXT NOT NULL,
      created_by TEXT NOT NULL,
      description TEXT NOT NULL,
      rules JSONB NOT NULL
    );
  `);

  // 5. test_sessions
  await db.query(`
    CREATE TABLE IF NOT EXISTS test_sessions (
      id TEXT PRIMARY KEY,
      instrument_id TEXT NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
      technician_id TEXT NOT NULL,
      technician_name TEXT NOT NULL,
      status TEXT NOT NULL,
      rule_version_id TEXT NOT NULL,
      report_number TEXT,
      qr_code_value TEXT,
      qr_code_data_url TEXT,
      signature_hash TEXT,
      report_generated_at TEXT,
      verified_count INTEGER DEFAULT 0,
      reference_standard_ids JSONB,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 6. environmental_conditions
  await db.query(`
    CREATE TABLE IF NOT EXISTS environmental_conditions (
      id TEXT PRIMARY KEY,
      test_session_id TEXT NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
      temperature_c NUMERIC NOT NULL,
      humidity_percent NUMERIC NOT NULL,
      pressure_hpa NUMERIC NOT NULL,
      location_notes TEXT
    );
  `);

  // 7. observations
  await db.query(`
    CREATE TABLE IF NOT EXISTS observations (
      id TEXT PRIMARY KEY,
      test_session_id TEXT NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
      test_type TEXT NOT NULL,
      direction TEXT,
      position TEXT,
      repetition_index INTEGER,
      tare_value NUMERIC,
      load_value NUMERIC NOT NULL,
      observed_reading NUMERIC NOT NULL,
      turning_point_l NUMERIC,
      delta_l NUMERIC,
      notes TEXT,
      timestamp TEXT NOT NULL
    );
  `);

  // 8. calculation_results
  await db.query(`
    CREATE TABLE IF NOT EXISTS calculation_results (
      id TEXT PRIMARY KEY,
      test_session_id TEXT NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
      overall_result TEXT NOT NULL,
      max_observed_error NUMERIC NOT NULL,
      max_permissible_error_observed NUMERIC NOT NULL,
      evaluated_at TEXT NOT NULL,
      rule_version_id TEXT NOT NULL,
      rule_version_label TEXT NOT NULL,
      test_group_results JSONB NOT NULL,
      evaluated_points JSONB NOT NULL
    );
  `);

  // 9. digital_approvals
  await db.query(`
    CREATE TABLE IF NOT EXISTS digital_approvals (
      id TEXT PRIMARY KEY,
      test_session_id TEXT NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
      approving_officer_id TEXT NOT NULL,
      approving_officer_name TEXT NOT NULL,
      approving_officer_license TEXT NOT NULL,
      status TEXT NOT NULL,
      comments TEXT NOT NULL,
      signature_hash TEXT NOT NULL,
      approved_at TEXT NOT NULL
    );
  `);

  // 10. session_attachments
  await db.query(`
    CREATE TABLE IF NOT EXISTS session_attachments (
      id TEXT PRIMARY KEY,
      test_session_id TEXT NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      file_size TEXT NOT NULL,
      data_url TEXT NOT NULL,
      notes TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      uploaded_at TEXT NOT NULL
    );
  `);

  // 11. audit_logs
  await db.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      rule_version_id TEXT,
      metadata_json JSONB NOT NULL DEFAULT '{}'
    );
  `);

  // 12. app_state
  await db.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Seed with example data if empty
  await seedInitialDataIfEmpty();
}

/**
 * Seed tables from initialData.ts if database has no records
 */
async function seedInitialDataIfEmpty(): Promise<void> {
  const usersCountRes = await db.query<{ count: string }>('SELECT COUNT(*) as count FROM users');
  const userCount = Number(usersCountRes.rows[0]?.count || 0);

  if (userCount > 0) {
    // Already seeded
    return;
  }

  console.log('Seeding PostgreSQL database with initial metrology records...');

  // Seed users
  for (const user of INITIAL_USERS) {
    await db.query(`
      INSERT INTO users (id, name, email, role, department, license_number, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING;
    `, [user.id, user.name, user.email, user.role, user.department, user.licenseNumber, user.createdAt]);
  }

  // Seed instruments
  for (const inst of INITIAL_INSTRUMENTS) {
    await db.query(`
      INSERT INTO instruments (
        id, manufacturer, model, serial_no, accuracy_class, instrument_type,
        max_capacity, min_capacity, scale_interval_d, verification_interval_e,
        unit, location, customer_name, next_verification_due, created_by, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO NOTHING;
    `, [
      inst.id,
      inst.manufacturer,
      inst.model,
      inst.serialNo,
      inst.accuracyClass,
      inst.instrumentType || 'Bench Scale',
      inst.maxCapacity,
      inst.minCapacity,
      inst.scaleInterval_d,
      inst.verificationInterval_e,
      inst.unit,
      inst.location,
      inst.customerName,
      inst.nextVerificationDue || null,
      inst.createdBy,
      inst.createdAt
    ]);
  }

  // Seed reference standards
  for (const std of INITIAL_REFERENCE_STANDARDS) {
    await db.query(`
      INSERT INTO reference_standards (
        id, mass_value, unit, standard_class, traceability_number,
        calibration_certificate_number, calibration_expiry_date, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING;
    `, [
      std.id,
      std.massValue,
      std.unit,
      std.standardClass,
      std.traceabilityNumber,
      std.calibrationCertificateNumber,
      std.calibrationExpiryDate,
      std.createdAt || new Date().toISOString()
    ]);
  }

  // Seed rule versions
  for (const rule of INITIAL_RULE_VERSIONS) {
    await db.query(`
      INSERT INTO oiml_rule_configurations (
        id, version_label, standard_title, is_default, effective_from, created_by, description, rules
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING;
    `, [
      rule.id,
      rule.versionLabel,
      rule.standardTitle,
      rule.isDefault,
      rule.effectiveFrom,
      rule.createdBy,
      rule.description,
      JSON.stringify(rule.rules)
    ]);
  }

  // Seed test sessions
  for (const sess of INITIAL_TEST_SESSIONS) {
    await db.query(`
      INSERT INTO test_sessions (
        id, instrument_id, technician_id, technician_name, status, rule_version_id,
        report_number, qr_code_value, qr_code_data_url, signature_hash, report_generated_at,
        verified_count, reference_standard_ids, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO NOTHING;
    `, [
      sess.id,
      sess.instrumentId,
      sess.technicianId,
      sess.technicianName,
      sess.status,
      sess.ruleVersionId,
      sess.report?.reportNumber || null,
      sess.report?.qrCodeValue || null,
      sess.report?.qrCodeDataUrl || null,
      sess.report?.signatureHash || null,
      sess.report?.generatedAt || null,
      sess.report?.verifiedCount || 0,
      sess.referenceStandardIds ? JSON.stringify(sess.referenceStandardIds) : null,
      sess.createdAt,
      sess.updatedAt
    ]);

    // Environmental conditions
    if (sess.environmentalConditions) {
      await db.query(`
        INSERT INTO environmental_conditions (
          id, test_session_id, temperature_c, humidity_percent, pressure_hpa, location_notes
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING;
      `, [
        `env_${sess.id}`,
        sess.id,
        sess.environmentalConditions.temperatureC,
        sess.environmentalConditions.humidityPercent,
        sess.environmentalConditions.pressureHpa,
        sess.environmentalConditions.locationNotes || null
      ]);
    }

    // Observations
    if (sess.observations && sess.observations.length > 0) {
      for (const obs of sess.observations) {
        await db.query(`
          INSERT INTO observations (
            id, test_session_id, test_type, direction, position, repetition_index,
            tare_value, load_value, observed_reading, turning_point_l, delta_l, notes, timestamp
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO NOTHING;
        `, [
          obs.id,
          sess.id,
          obs.testType,
          obs.direction || null,
          obs.position || null,
          obs.repetitionIndex || null,
          obs.tareValue || null,
          obs.loadValue,
          obs.observedReading,
          obs.turningPoint_L || null,
          obs.delta_L || null,
          obs.notes || null,
          obs.timestamp
        ]);
      }
    }

    // Calculation result
    if (sess.calculation) {
      await db.query(`
        INSERT INTO calculation_results (
          id, test_session_id, overall_result, max_observed_error, max_permissible_error_observed,
          evaluated_at, rule_version_id, rule_version_label, test_group_results, evaluated_points
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING;
      `, [
        sess.calculation.id,
        sess.id,
        sess.calculation.overallResult,
        sess.calculation.maxObservedError,
        sess.calculation.maxPermissibleErrorObserved,
        sess.calculation.evaluatedAt,
        sess.calculation.ruleVersionId,
        sess.calculation.ruleVersionLabel,
        JSON.stringify(sess.calculation.testGroupResults),
        JSON.stringify(sess.calculation.evaluatedPoints)
      ]);
    }

    // Approval
    if (sess.approval) {
      await db.query(`
        INSERT INTO digital_approvals (
          id, test_session_id, approving_officer_id, approving_officer_name,
          approving_officer_license, status, comments, signature_hash, approved_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING;
      `, [
        sess.approval.id,
        sess.id,
        sess.approval.approvingOfficerId,
        sess.approval.approvingOfficerName,
        sess.approval.approvingOfficerLicense,
        sess.approval.status,
        sess.approval.comments,
        sess.approval.signatureHash,
        sess.approval.approvedAt
      ]);
    }

    // Attachments
    if (sess.attachments && sess.attachments.length > 0) {
      for (const att of sess.attachments) {
        await db.query(`
          INSERT INTO session_attachments (
            id, test_session_id, name, category, file_size, data_url, notes, uploaded_by, uploaded_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING;
        `, [
          att.id,
          sess.id,
          att.name,
          att.category,
          att.fileSize,
          att.dataUrl,
          att.notes,
          att.uploadedBy,
          att.uploadedAt
        ]);
      }
    }
  }

  // Seed audit logs
  for (const log of INITIAL_AUDIT_LOGS) {
    await db.query(`
      INSERT INTO audit_logs (
        id, user_id, user_name, user_role, action, entity_type, entity_id, timestamp, rule_version_id, metadata_json
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING;
    `, [
      log.id,
      log.userId,
      log.userName,
      log.userRole,
      log.action,
      log.entityType,
      log.entityId,
      log.timestamp,
      log.ruleVersionId || null,
      JSON.stringify(log.metadataJson || {})
    ]);
  }

  // Set default current user
  await db.query(`
    INSERT INTO app_state (key, value)
    VALUES ('current_user_id', $1)
    ON CONFLICT (key) DO NOTHING;
  `, [INITIAL_USERS[0].id]);

  console.log('PostgreSQL database seeded successfully.');
}

// ==================== QUERY / MUTATION REPOSITORY METHODS ====================

// --- USERS ---
export async function getUsers(): Promise<User[]> {
  const res = await db.query<any>('SELECT * FROM users ORDER BY created_at ASC');
  return res.rows.map(row => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    department: row.department,
    licenseNumber: row.license_number,
    createdAt: row.created_at
  }));
}

export async function getUserById(id: string): Promise<User | null> {
  const res = await db.query<any>('SELECT * FROM users WHERE id = $1', [id]);
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    department: row.department,
    licenseNumber: row.license_number,
    createdAt: row.created_at
  };
}

export async function getUserByRole(role: string): Promise<User | null> {
  const res = await db.query<any>('SELECT * FROM users WHERE role = $1 LIMIT 1', [role]);
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    department: row.department,
    licenseNumber: row.license_number,
    createdAt: row.created_at
  };
}

export async function createUser(user: User): Promise<User> {
  await db.query(`
    INSERT INTO users (id, name, email, role, department, license_number, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [user.id, user.name, user.email, user.role, user.department, user.licenseNumber, user.createdAt]);
  return user;
}

export async function getCurrentUser(): Promise<User> {
  const stateRes = await db.query<any>('SELECT value FROM app_state WHERE key = $1', ['current_user_id']);
  const currentUserId = stateRes.rows[0]?.value;
  if (currentUserId) {
    const u = await getUserById(currentUserId);
    if (u) return u;
  }
  const all = await getUsers();
  return all[0];
}

export async function setCurrentUserId(userId: string): Promise<void> {
  await db.query(`
    INSERT INTO app_state (key, value)
    VALUES ('current_user_id', $1)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `, [userId]);
}

// --- INSTRUMENTS ---
export async function getInstruments(): Promise<Instrument[]> {
  const res = await db.query<any>('SELECT * FROM instruments ORDER BY created_at DESC');
  return res.rows.map(mapInstrumentRow);
}

export async function getInstrumentById(id: string): Promise<Instrument | null> {
  const res = await db.query<any>('SELECT * FROM instruments WHERE id = $1', [id]);
  if (res.rows.length === 0) return null;
  return mapInstrumentRow(res.rows[0]);
}

export async function createInstrument(inst: Instrument): Promise<Instrument> {
  await db.query(`
    INSERT INTO instruments (
      id, manufacturer, model, serial_no, accuracy_class, instrument_type,
      max_capacity, min_capacity, scale_interval_d, verification_interval_e,
      unit, location, customer_name, next_verification_due, created_by, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
  `, [
    inst.id,
    inst.manufacturer,
    inst.model,
    inst.serialNo,
    inst.accuracyClass,
    inst.instrumentType || 'Bench Scale',
    inst.maxCapacity,
    inst.minCapacity,
    inst.scaleInterval_d,
    inst.verificationInterval_e,
    inst.unit,
    inst.location,
    inst.customerName,
    inst.nextVerificationDue || null,
    inst.createdBy,
    inst.createdAt
  ]);
  return inst;
}

function mapInstrumentRow(row: any): Instrument {
  return {
    id: row.id,
    manufacturer: row.manufacturer,
    model: row.model,
    serialNo: row.serial_no,
    accuracyClass: row.accuracy_class,
    instrumentType: row.instrument_type || 'Bench Scale',
    maxCapacity: Number(row.max_capacity),
    minCapacity: Number(row.min_capacity),
    scaleInterval_d: Number(row.scale_interval_d),
    verificationInterval_e: Number(row.verification_interval_e),
    unit: row.unit,
    location: row.location,
    customerName: row.customer_name,
    nextVerificationDue: row.next_verification_due || undefined,
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

// --- REFERENCE STANDARDS ---
export async function getReferenceStandards(): Promise<ReferenceStandard[]> {
  const res = await db.query<any>('SELECT * FROM reference_standards ORDER BY mass_value ASC');
  return res.rows.map(row => ({
    id: row.id,
    massValue: Number(row.mass_value),
    unit: row.unit,
    standardClass: row.standard_class,
    traceabilityNumber: row.traceability_number,
    calibrationCertificateNumber: row.calibration_certificate_number,
    calibrationExpiryDate: row.calibration_expiry_date,
    createdAt: row.created_at
  }));
}

export async function createReferenceStandard(std: ReferenceStandard): Promise<ReferenceStandard> {
  await db.query(`
    INSERT INTO reference_standards (
      id, mass_value, unit, standard_class, traceability_number,
      calibration_certificate_number, calibration_expiry_date, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    std.id,
    std.massValue,
    std.unit,
    std.standardClass,
    std.traceabilityNumber,
    std.calibrationCertificateNumber,
    std.calibrationExpiryDate,
    std.createdAt || new Date().toISOString()
  ]);
  return std;
}

// --- RULE VERSIONS ---
export async function getRuleVersions(): Promise<OimlRuleConfiguration[]> {
  const res = await db.query<any>('SELECT * FROM oiml_rule_configurations ORDER BY effective_from DESC');
  return res.rows.map(row => ({
    id: row.id,
    versionLabel: row.version_label,
    standardTitle: row.standard_title,
    isDefault: Boolean(row.is_default),
    effectiveFrom: row.effective_from,
    createdBy: row.created_by,
    description: row.description,
    rules: typeof row.rules === 'string' ? JSON.parse(row.rules) : row.rules
  }));
}

export async function getRuleVersionById(id: string): Promise<OimlRuleConfiguration | null> {
  const res = await db.query<any>('SELECT * FROM oiml_rule_configurations WHERE id = $1', [id]);
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return {
    id: row.id,
    versionLabel: row.version_label,
    standardTitle: row.standard_title,
    isDefault: Boolean(row.is_default),
    effectiveFrom: row.effective_from,
    createdBy: row.created_by,
    description: row.description,
    rules: typeof row.rules === 'string' ? JSON.parse(row.rules) : row.rules
  };
}

export async function createRuleVersion(rule: OimlRuleConfiguration): Promise<OimlRuleConfiguration> {
  if (rule.isDefault) {
    await db.query('UPDATE oiml_rule_configurations SET is_default = false');
  }
  await db.query(`
    INSERT INTO oiml_rule_configurations (
      id, version_label, standard_title, is_default, effective_from, created_by, description, rules
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    rule.id,
    rule.versionLabel,
    rule.standardTitle,
    rule.isDefault,
    rule.effectiveFrom,
    rule.createdBy,
    rule.description,
    JSON.stringify(rule.rules)
  ]);
  return rule;
}

export async function activateRuleVersion(id: string): Promise<OimlRuleConfiguration | null> {
  await db.query('UPDATE oiml_rule_configurations SET is_default = false');
  await db.query('UPDATE oiml_rule_configurations SET is_default = true WHERE id = $1', [id]);
  return getRuleVersionById(id);
}

// --- TEST SESSIONS ---
export async function getTestSessions(): Promise<TestSession[]> {
  const sessionsRes = await db.query<any>('SELECT * FROM test_sessions ORDER BY created_at DESC');
  const instruments = await getInstruments();
  const instMap = new Map(instruments.map(i => [i.id, i]));

  const sessions: TestSession[] = [];
  for (const sRow of sessionsRes.rows) {
    const session = await buildCompleteSession(sRow, instMap.get(sRow.instrument_id));
    sessions.push(session);
  }
  return sessions;
}

export async function getTestSessionById(id: string): Promise<TestSession | null> {
  const res = await db.query<any>('SELECT * FROM test_sessions WHERE id = $1', [id]);
  if (res.rows.length === 0) return null;
  const sRow = res.rows[0];
  const inst = await getInstrumentById(sRow.instrument_id);
  return buildCompleteSession(sRow, inst || undefined);
}

async function buildCompleteSession(sRow: any, instrument?: Instrument): Promise<TestSession> {
  const sessionId = sRow.id;

  // Environmental conditions
  const envRes = await db.query<any>('SELECT * FROM environmental_conditions WHERE test_session_id = $1 LIMIT 1', [sessionId]);
  let environmentalConditions: EnvironmentalConditions = {
    temperatureC: 20.0,
    humidityPercent: 50.0,
    pressureHpa: 1013.25,
    locationNotes: 'Standard lab conditions'
  };
  if (envRes.rows.length > 0) {
    const e = envRes.rows[0];
    environmentalConditions = {
      temperatureC: Number(e.temperature_c),
      humidityPercent: Number(e.humidity_percent),
      pressureHpa: Number(e.pressure_hpa),
      locationNotes: e.location_notes || undefined
    };
  }

  // Observations
  const obsRes = await db.query<any>('SELECT * FROM observations WHERE test_session_id = $1 ORDER BY timestamp ASC', [sessionId]);
  const observations: Observation[] = obsRes.rows.map((o, idx) => ({
    id: o.id,
    testSessionId: o.test_session_id || sessionId,
    testType: o.test_type,
    testPointIndex: o.test_point_index != null ? Number(o.test_point_index) : idx,
    source: (o.source as any) || 'manual',
    confirmedByTechnician: Boolean(o.confirmed_by_technician ?? true),
    createdAt: o.created_at || o.timestamp || new Date().toISOString(),
    direction: o.direction || undefined,
    position: o.position || undefined,
    repetitionIndex: o.repetition_index != null ? Number(o.repetition_index) : undefined,
    tareValue: o.tare_value != null ? Number(o.tare_value) : undefined,
    loadValue: Number(o.load_value),
    observedReading: Number(o.observed_reading),
    turningPoint_L: o.turning_point_l != null ? Number(o.turning_point_l) : undefined,
    delta_L: o.delta_l != null ? Number(o.delta_l) : undefined,
    notes: o.notes || undefined,
    timestamp: o.timestamp
  }));

  // Calculation
  const calcRes = await db.query<any>('SELECT * FROM calculation_results WHERE test_session_id = $1 LIMIT 1', [sessionId]);
  let calculation: CalculationResult | undefined;
  if (calcRes.rows.length > 0) {
    const c = calcRes.rows[0];
    calculation = {
      id: c.id,
      testSessionId: sessionId,
      overallResult: c.overall_result,
      maxObservedError: Number(c.max_observed_error),
      maxPermissibleErrorObserved: Number(c.max_permissible_error_observed),
      evaluatedAt: c.evaluated_at,
      calculatedAt: c.calculated_at || c.evaluated_at || new Date().toISOString(),
      ruleVersionId: c.rule_version_id || 'oiml-r76-2006',
      ruleVersionLabel: c.rule_version_label || 'OIML R-76-1:2006 Standard Table 6',
      summaryText: c.summary_text || `Verification evaluation: ${c.overall_result}`,
      detailedResults: typeof c.detailed_results === 'string' ? JSON.parse(c.detailed_results) : (c.detailed_results || []),
      testGroupResults: typeof c.test_group_results === 'string' ? JSON.parse(c.test_group_results) : c.test_group_results,
      evaluatedPoints: typeof c.evaluated_points === 'string' ? JSON.parse(c.evaluated_points) : c.evaluated_points
    };
  }

  // Digital Approval
  const apprRes = await db.query<any>('SELECT * FROM digital_approvals WHERE test_session_id = $1 LIMIT 1', [sessionId]);
  let approval: ApprovalRecord | undefined;
  if (apprRes.rows.length > 0) {
    const a = apprRes.rows[0];
    approval = {
      id: a.id,
      testSessionId: sessionId,
      approvingOfficerId: a.approving_officer_id,
      approvingOfficerName: a.approving_officer_name,
      approvingOfficerLicense: a.approving_officer_license,
      status: a.status,
      comments: a.comments,
      signatureHash: a.signature_hash,
      approvedAt: a.approved_at
    };
  }

  // Report
  let report: ReportRecord | undefined;
  if (sRow.report_number) {
    report = {
      id: `rep_${sessionId}`,
      testSessionId: sessionId,
      reportNumber: sRow.report_number,
      qrCodeValue: sRow.qr_code_value || '',
      qrCodeDataUrl: sRow.qr_code_data_url || '',
      signatureHash: sRow.signature_hash || '',
      generatedAt: sRow.report_generated_at || sRow.created_at,
      verifiedCount: sRow.verified_count != null ? Number(sRow.verified_count) : 0
    };
  }

  // Attachments
  const attRes = await db.query<any>('SELECT * FROM session_attachments WHERE test_session_id = $1 ORDER BY uploaded_at ASC', [sessionId]);
  const attachments: SessionAttachment[] = attRes.rows.map(a => ({
    id: a.id,
    testSessionId: sessionId,
    name: a.name,
    category: a.category,
    fileSize: a.file_size,
    dataUrl: a.data_url,
    notes: a.notes,
    uploadedBy: a.uploaded_by,
    uploadedAt: a.uploaded_at
  }));

  const refIds = sRow.reference_standard_ids
    ? (typeof sRow.reference_standard_ids === 'string' ? JSON.parse(sRow.reference_standard_ids) : sRow.reference_standard_ids)
    : undefined;

  return {
    id: sRow.id,
    instrumentId: sRow.instrument_id,
    instrument,
    technicianId: sRow.technician_id,
    technicianName: sRow.technician_name,
    environmentalConditions,
    status: sRow.status,
    ruleVersionId: sRow.rule_version_id,
    createdAt: sRow.created_at,
    updatedAt: sRow.updated_at,
    observations,
    calculation,
    approval,
    report,
    attachments,
    referenceStandardIds: refIds
  };
}

export async function createTestSession(session: TestSession): Promise<TestSession> {
  await db.query(`
    INSERT INTO test_sessions (
      id, instrument_id, technician_id, technician_name, status, rule_version_id,
      report_number, qr_code_value, qr_code_data_url, signature_hash, report_generated_at,
      verified_count, reference_standard_ids, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
  `, [
    session.id,
    session.instrumentId,
    session.technicianId,
    session.technicianName,
    session.status,
    session.ruleVersionId,
    session.report?.reportNumber || null,
    session.report?.qrCodeValue || null,
    session.report?.qrCodeDataUrl || null,
    session.report?.signatureHash || null,
    session.report?.generatedAt || null,
    session.report?.verifiedCount || 0,
    session.referenceStandardIds ? JSON.stringify(session.referenceStandardIds) : null,
    session.createdAt,
    session.updatedAt
  ]);

  if (session.environmentalConditions) {
    await db.query(`
      INSERT INTO environmental_conditions (
        id, test_session_id, temperature_c, humidity_percent, pressure_hpa, location_notes
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      `env_${session.id}`,
      session.id,
      session.environmentalConditions.temperatureC,
      session.environmentalConditions.humidityPercent,
      session.environmentalConditions.pressureHpa,
      session.environmentalConditions.locationNotes || null
    ]);
  }

  return session;
}

export async function updateTestSessionData(
  sessionId: string,
  environmentalConditions?: EnvironmentalConditions,
  observations?: Observation[],
  ruleVersionId?: string
): Promise<TestSession | null> {
  const updatedAt = new Date().toISOString();

  // Check if observations changed -> invalidate calculation
  let newStatus: string | undefined;
  if (observations) {
    const curRes = await db.query<any>('SELECT status FROM test_sessions WHERE id = $1', [sessionId]);
    const curStatus = curRes.rows[0]?.status;
    if (curStatus === 'calculated' || curStatus === 'pending_approval') {
      newStatus = 'observations_recorded';
    }
    // Remove calculation
    await db.query('DELETE FROM calculation_results WHERE test_session_id = $1', [sessionId]);
  }

  // Update session record
  if (ruleVersionId && newStatus) {
    await db.query(`
      UPDATE test_sessions SET rule_version_id = $1, status = $2, updated_at = $3 WHERE id = $4
    `, [ruleVersionId, newStatus, updatedAt, sessionId]);
  } else if (ruleVersionId) {
    await db.query(`
      UPDATE test_sessions SET rule_version_id = $1, updated_at = $2 WHERE id = $3
    `, [ruleVersionId, updatedAt, sessionId]);
  } else if (newStatus) {
    await db.query(`
      UPDATE test_sessions SET status = $1, updated_at = $2 WHERE id = $3
    `, [newStatus, updatedAt, sessionId]);
  } else {
    await db.query(`
      UPDATE test_sessions SET updated_at = $1 WHERE id = $2
    `, [updatedAt, sessionId]);
  }

  // Update environmental conditions
  if (environmentalConditions) {
    await db.query(`
      INSERT INTO environmental_conditions (id, test_session_id, temperature_c, humidity_percent, pressure_hpa, location_notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        temperature_c = EXCLUDED.temperature_c,
        humidity_percent = EXCLUDED.humidity_percent,
        pressure_hpa = EXCLUDED.pressure_hpa,
        location_notes = EXCLUDED.location_notes;
    `, [
      `env_${sessionId}`,
      sessionId,
      environmentalConditions.temperatureC,
      environmentalConditions.humidityPercent,
      environmentalConditions.pressureHpa,
      environmentalConditions.locationNotes || null
    ]);
  }

  // Replace observations
  if (observations) {
    await db.query('DELETE FROM observations WHERE test_session_id = $1', [sessionId]);
    for (const obs of observations) {
      await db.query(`
        INSERT INTO observations (
          id, test_session_id, test_type, direction, position, repetition_index,
          tare_value, load_value, observed_reading, turning_point_l, delta_l, notes, timestamp
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        obs.id || `obs_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sessionId,
        obs.testType,
        obs.direction || null,
        obs.position || null,
        obs.repetitionIndex || null,
        obs.tareValue || null,
        obs.loadValue,
        obs.observedReading,
        obs.turningPoint_L || null,
        obs.delta_L || null,
        obs.notes || null,
        obs.timestamp || new Date().toISOString()
      ]);
    }
  }

  return getTestSessionById(sessionId);
}

export async function saveSessionCalculation(sessionId: string, calculation: CalculationResult): Promise<void> {
  const updatedAt = new Date().toISOString();
  await db.query(`
    UPDATE test_sessions SET status = 'calculated', updated_at = $1 WHERE id = $2
  `, [updatedAt, sessionId]);

  await db.query('DELETE FROM calculation_results WHERE test_session_id = $1', [sessionId]);
  await db.query(`
    INSERT INTO calculation_results (
      id, test_session_id, overall_result, max_observed_error, max_permissible_error_observed,
      evaluated_at, rule_version_id, rule_version_label, test_group_results, evaluated_points
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [
    calculation.id,
    sessionId,
    calculation.overallResult,
    calculation.maxObservedError,
    calculation.maxPermissibleErrorObserved,
    calculation.evaluatedAt,
    calculation.ruleVersionId,
    calculation.ruleVersionLabel,
    JSON.stringify(calculation.testGroupResults),
    JSON.stringify(calculation.evaluatedPoints)
  ]);
}

export async function submitSessionForApproval(sessionId: string): Promise<void> {
  const updatedAt = new Date().toISOString();
  await db.query(`
    UPDATE test_sessions SET status = 'pending_approval', updated_at = $1 WHERE id = $2
  `, [updatedAt, sessionId]);
}

export async function approveSession(
  sessionId: string,
  approval: ApprovalRecord,
  report: ReportRecord
): Promise<void> {
  const approvedAt = approval.approvedAt;
  await db.query(`
    UPDATE test_sessions SET
      status = 'approved',
      report_number = $1,
      qr_code_value = $2,
      qr_code_data_url = $3,
      signature_hash = $4,
      report_generated_at = $5,
      verified_count = 0,
      updated_at = $6
    WHERE id = $7
  `, [
    report.reportNumber,
    report.qrCodeValue,
    report.qrCodeDataUrl || '',
    report.signatureHash,
    report.generatedAt,
    approvedAt,
    sessionId
  ]);

  await db.query('DELETE FROM digital_approvals WHERE test_session_id = $1', [sessionId]);
  await db.query(`
    INSERT INTO digital_approvals (
      id, test_session_id, approving_officer_id, approving_officer_name,
      approving_officer_license, status, comments, signature_hash, approved_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [
    approval.id,
    sessionId,
    approval.approvingOfficerId,
    approval.approvingOfficerName,
    approval.approvingOfficerLicense,
    approval.status,
    approval.comments,
    approval.signatureHash,
    approval.approvedAt
  ]);
}

export async function rejectSession(sessionId: string, approval: ApprovalRecord): Promise<void> {
  const rejectedAt = approval.approvedAt;
  await db.query(`
    UPDATE test_sessions SET status = 'rejected', updated_at = $1 WHERE id = $2
  `, [rejectedAt, sessionId]);

  await db.query('DELETE FROM digital_approvals WHERE test_session_id = $1', [sessionId]);
  await db.query(`
    INSERT INTO digital_approvals (
      id, test_session_id, approving_officer_id, approving_officer_name,
      approving_officer_license, status, comments, signature_hash, approved_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [
    approval.id,
    sessionId,
    approval.approvingOfficerId,
    approval.approvingOfficerName,
    approval.approvingOfficerLicense,
    approval.status,
    approval.comments,
    approval.signatureHash,
    approval.approvedAt
  ]);
}

export async function addSessionAttachment(sessionId: string, attachment: SessionAttachment): Promise<void> {
  await db.query(`
    INSERT INTO session_attachments (
      id, test_session_id, name, category, file_size, data_url, notes, uploaded_by, uploaded_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [
    attachment.id,
    sessionId,
    attachment.name,
    attachment.category,
    attachment.fileSize,
    attachment.dataUrl,
    attachment.notes,
    attachment.uploadedBy,
    attachment.uploadedAt
  ]);

  await db.query(`UPDATE test_sessions SET updated_at = $1 WHERE id = $2`, [new Date().toISOString(), sessionId]);
}

export async function deleteSessionAttachment(sessionId: string, attachmentId: string): Promise<void> {
  await db.query(`DELETE FROM session_attachments WHERE id = $1 AND test_session_id = $2`, [attachmentId, sessionId]);
  await db.query(`UPDATE test_sessions SET updated_at = $1 WHERE id = $2`, [new Date().toISOString(), sessionId]);
}

export async function incrementVerificationCount(sessionId: string): Promise<number> {
  const res = await db.query<any>(`
    UPDATE test_sessions
    SET verified_count = COALESCE(verified_count, 0) + 1
    WHERE id = $1
    RETURNING verified_count
  `, [sessionId]);
  return Number(res.rows[0]?.verified_count || 1);
}

// --- AUDIT LOGS ---
export async function getAuditLogs(filter?: { entityType?: string; action?: string; search?: string }): Promise<AuditLog[]> {
  let query = 'SELECT * FROM audit_logs';
  const params: any[] = [];
  const conditions: string[] = [];

  if (filter?.entityType) {
    params.push(filter.entityType);
    conditions.push(`entity_type = $${params.length}`);
  }

  if (filter?.action) {
    params.push(`%${filter.action.toLowerCase()}%`);
    conditions.push(`LOWER(action) LIKE $${params.length}`);
  }

  if (filter?.search) {
    const q = `%${filter.search.toLowerCase()}%`;
    params.push(q);
    const pIdx = params.length;
    conditions.push(`(
      LOWER(action) LIKE $${pIdx} OR
      LOWER(user_name) LIKE $${pIdx} OR
      LOWER(entity_id) LIKE $${pIdx} OR
      LOWER(metadata_json::text) LIKE $${pIdx}
    )`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY timestamp DESC';

  const res = await db.query<any>(query, params);
  return res.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userRole: row.user_role,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    timestamp: row.timestamp,
    ruleVersionId: row.rule_version_id || undefined,
    metadataJson: typeof row.metadata_json === 'string' ? JSON.parse(row.metadata_json) : (row.metadata_json || {})
  }));
}

export async function addAuditLog(log: AuditLog): Promise<AuditLog> {
  await db.query(`
    INSERT INTO audit_logs (
      id, user_id, user_name, user_role, action, entity_type, entity_id, timestamp, rule_version_id, metadata_json
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [
    log.id,
    log.userId,
    log.userName,
    log.userRole,
    log.action,
    log.entityType,
    log.entityId,
    log.timestamp,
    log.ruleVersionId || null,
    JSON.stringify(log.metadataJson || {})
  ]);
  return log;
}

// --- STATS ---
export async function getDashboardStats(): Promise<{
  totalSessions: number;
  pendingApprovals: number;
  approvedCount: number;
  rejectedCount: number;
  totalInstruments: number;
  totalAuditLogs: number;
  activeRulesCount: number;
}> {
  const [sessRes, instRes, logsRes, rulesRes] = await Promise.all([
    db.query<any>('SELECT status, COUNT(*) as count FROM test_sessions GROUP BY status'),
    db.query<any>('SELECT COUNT(*) as count FROM instruments'),
    db.query<any>('SELECT COUNT(*) as count FROM audit_logs'),
    db.query<any>('SELECT COUNT(*) as count FROM oiml_rule_configurations')
  ]);

  let totalSessions = 0;
  let pendingApprovals = 0;
  let approvedCount = 0;
  let rejectedCount = 0;

  for (const row of sessRes.rows) {
    const c = Number(row.count);
    totalSessions += c;
    if (row.status === 'pending_approval') pendingApprovals += c;
    if (row.status === 'approved') approvedCount += c;
    if (row.status === 'rejected') rejectedCount += c;
  }

  return {
    totalSessions,
    pendingApprovals,
    approvedCount,
    rejectedCount,
    totalInstruments: Number(instRes.rows[0]?.count || 0),
    totalAuditLogs: Number(logsRes.rows[0]?.count || 0),
    activeRulesCount: Number(rulesRes.rows[0]?.count || 0)
  };
}
