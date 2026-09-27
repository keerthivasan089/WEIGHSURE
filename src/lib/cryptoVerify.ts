/**
 * WeighSure - Cryptographic Verification and Digital Signature Utilities
 */

import QRCode from 'qrcode';
import { Instrument, TestSession, TestSessionCalculation, VerificationLookupResult } from '../types';

/**
 * Generate a SHA-256 digital signature hash for an approved test session
 * Uses browser-compatible Web Crypto API (SubtleCrypto) so it works in both Node.js and browser
 */
export async function generateDigitalSignatureHash(
  session: TestSession,
  calculation: TestSessionCalculation,
  instrument: Instrument,
  officerId: string,
  officerLicense: string,
  timestamp: string
): Promise<string> {
  const canonicalPayload = JSON.stringify({
    sessionId: session.id,
    instrumentSerial: instrument.serialNo,
    instrumentModel: instrument.model,
    accuracyClass: instrument.accuracyClass,
    maxCapacity: instrument.maxCapacity,
    unit: instrument.unit,
    calculationResult: calculation.overallResult,
    maxObservedError: calculation.maxObservedError,
    ruleVersionId: calculation.ruleVersionId,
    officerId,
    officerLicense,
    timestamp
  });

  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalPayload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate standardized Certificate / Report Number
 */
export function generateReportNumber(serialNo: string, year = 2026): string {
  const cleanSerial = serialNo.replace(/[^A-Za-z0-9]/g, '').slice(-4).toUpperCase();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `WS-R76-${year}-${cleanSerial || 'NAWI'}-${randomSuffix}`;
}

/**
 * Generate high-resolution QR code Data URL for report verification
 */
export async function generateQrCodeDataUrl(verificationUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 280,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Failed to generate QR code data URL:', err);
    return '';
  }
}

/**
 * Verify integrity of a report record payload
 */
export async function verifyReportIntegrity(
  expectedHash: string,
  session: TestSession,
  calculation: TestSessionCalculation,
  instrument: Instrument,
  officerId: string,
  officerLicense: string,
  approvedAt: string
): Promise<boolean> {
  const computed = await generateDigitalSignatureHash(
    session,
    calculation,
    instrument,
    officerId,
    officerLicense,
    approvedAt
  );
  return computed.toLowerCase() === expectedHash.toLowerCase();
}
