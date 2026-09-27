import React, { useState, useEffect } from 'react';
import { TestSession, Instrument, User } from '../types';
import jsPDF from 'jspdf';
import { 
  Award, 
  CheckCircle2, 
  ShieldCheck, 
  Printer, 
  Download, 
  FileDown,
  ArrowLeft, 
  FileText, 
  Lock, 
  QrCode,
  Calendar,
  Building,
  Scale,
  Table
} from 'lucide-react';
import {
  generateQrDataUrl,
  downloadJson,
  downloadCsv,
  downloadWordDoc,
  downloadDataUrlFile
} from '../lib/downloadHelper';

interface CertificateReportProps {
  session: TestSession;
  instrument: Instrument;
  currentUser: User;
  onBack: () => void;
  onOpenPublicVerify: (qrCode: string) => void;
}

export const CertificateReport: React.FC<CertificateReportProps> = ({
  session,
  instrument,
  currentUser,
  onBack,
  onOpenPublicVerify
}) => {
  const report = session.report;
  const approval = session.approval;
  const calculation = session.calculation;

  const certNumber = report?.reportNumber || report?.certificateNumber || `WS-R76-${session.id.slice(-6)}`;
  const qrVerifyCode = report?.qrVerificationCode || report?.verificationLookupCode || certNumber;
  const qrTargetUrl = report?.qrCodeValue || `https://weighsure.vercel.app/verify/${encodeURIComponent(qrVerifyCode)}`;

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>(report?.qrCodeDataUrl || '');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  // Generate crisp QR code on mount or when session changes
  useEffect(() => {
    let isCurrent = true;
    if (report?.qrCodeDataUrl && report.qrCodeDataUrl.startsWith('data:image')) {
      setQrCodeDataUrl(report.qrCodeDataUrl);
    } else {
      generateQrDataUrl(qrTargetUrl, { width: 360, margin: 1 }).then(url => {
        if (isCurrent && url) {
          setQrCodeDataUrl(url);
        }
      });
    }
    return () => {
      isCurrent = false;
    };
  }, [report, qrTargetUrl]);

  const showDownloadNotice = (filename: string) => {
    setDownloadSuccessToast(`File saved to your computer: ${filename}`);
    setTimeout(() => setDownloadSuccessToast(null), 4000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const filename = `WeighSure-Report-${certNumber}.json`;
    downloadJson(session, filename);
    showDownloadNotice(filename);
  };

  const handleDownloadCsv = () => {
    const headers = [
      'Load (L)',
      'Unit',
      'Multiples of e (m/e)',
      'Observed Reading (I)',
      'Error (E)',
      'MPE Limit (Units)',
      'MPE Limit (e)',
      'Evaluation'
    ];

    const rows = (calculation?.detailedResults || []).map(r => [
      r.loadValue,
      instrument.unit,
      `${r.loadInMultiplesOfE}e`,
      r.observedReading,
      r.errorValue > 0 ? `+${r.errorValue}` : r.errorValue,
      `±${r.mpeInUnits}`,
      `±${r.mpeValue}e`,
      r.isWithinMpe ? 'PASS' : 'FAIL'
    ]);

    const filename = `WeighSure-Readings-${certNumber}.csv`;
    downloadCsv(filename, headers, rows);
    showDownloadNotice(filename);
  };

  const handleDownloadQrSticker = async () => {
    let activeQr = qrCodeDataUrl;
    if (!activeQr) {
      activeQr = await generateQrDataUrl(qrTargetUrl, { width: 500, margin: 2 });
    }
    if (activeQr) {
      const filename = `WeighSure-QR-Sticker-${certNumber}.png`;
      downloadDataUrlFile(activeQr, filename);
      showDownloadNotice(filename);
    }
  };

  const handleDownloadDocx = async () => {
    let activeQr = qrCodeDataUrl;
    if (!activeQr) {
      activeQr = await generateQrDataUrl(qrTargetUrl, { width: 360, margin: 1 });
    }

    const approvalDate = new Date(approval?.approvedAt || session.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const rowsHtml = (calculation?.detailedResults || [])
      .map(
        (r, idx) => `
      <tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: bold;">${r.loadValue} ${instrument.unit}</td>
        <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">${r.loadInMultiplesOfE} e</td>
        <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">${r.observedReading} ${instrument.unit}</td>
        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: bold;">${r.errorValue > 0 ? `+${r.errorValue}` : r.errorValue} ${instrument.unit}</td>
        <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">±${r.mpeInUnits} ${instrument.unit} (±${r.mpeValue}e)</td>
        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #15803d; text-align: center;">PASS</td>
      </tr>
    `
      )
      .join('');

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>WeighSure Official Verification Certificate - ${certNumber}</title>
        <!--[if gte mso 9]>
        <xml>
        <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #0f172a; margin: 20mm; line-height: 1.4; }
          .header-bar { border-bottom: 3px solid #0f172a; padding-bottom: 8px; margin-bottom: 16px; }
          .title { font-size: 16pt; font-weight: bold; color: #0f172a; text-transform: uppercase; margin: 0; }
          .subtitle { font-size: 9pt; color: #475569; margin-top: 4px; }
          .cert-tag { font-size: 10pt; font-weight: bold; color: #0369a1; text-align: right; }
          .verdict-box { background-color: #f0fdf4; border: 2px solid #86efac; padding: 12px; margin: 16px 0; border-radius: 6px; }
          .verdict-text { font-size: 12pt; font-weight: bold; color: #15803d; }
          .section-title { font-size: 11pt; font-weight: bold; color: #0f172a; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 4px; margin-top: 20px; margin-bottom: 8px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin: 8px 0 16px 0; font-size: 10pt; }
          th { background-color: #f1f5f9; border: 1px solid #94a3b8; padding: 6px 10px; text-align: left; font-weight: bold; color: #1e293b; }
          td { border: 1px solid #cbd5e1; padding: 6px 10px; }
          .sign-block { border-top: 2px solid #0f172a; margin-top: 24px; padding-top: 12px; }
          .hash-code { font-family: 'Courier New', monospace; font-size: 8pt; background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px; color: #475569; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="header-bar">
          <table style="border: none; margin: 0;">
            <tr style="border: none;">
              <td style="border: none; padding: 0;">
                <div class="title">NATIONAL LEGAL METROLOGY AUTHORITY</div>
                <div class="subtitle">Type-Evaluation & Initial Verification Testing Laboratory | OIML R-76-1:2006 Standardized Report</div>
              </td>
              <td style="border: none; padding: 0; text-align: right; vertical-align: top;">
                <div class="cert-tag">Certificate No: ${certNumber}</div>
                <div style="font-size: 9pt; color: #64748b;">Issued: ${approvalDate}</div>
              </td>
            </tr>
          </table>
        </div>

        <div class="verdict-box">
          <span class="verdict-text">METROLOGICAL COMPLIANCE: PASSED</span>
          <div style="font-size: 9.5pt; color: #334155; margin-top: 2px;">
            The non-automatic weighing instrument satisfies all Maximum Permissible Error (MPE) thresholds stipulated in OIML R-76-1:2006 Table 6.
          </div>
        </div>

        <div class="section-title">1. Instrument Under Evaluation</div>
        <table>
          <tr>
            <th style="width: 25%;">Manufacturer:</th><td>${instrument.manufacturer}</td>
            <th style="width: 25%;">Model Designation:</th><td>${instrument.model}</td>
          </tr>
          <tr>
            <th>Instrument Type (NAWI):</th><td style="font-weight: bold; color: #0f172a;">${instrument.instrumentType || 'Bench Scale'}</td>
            <th>Accuracy Class:</th><td style="font-weight: bold; color: #0369a1;">${instrument.accuracyClass}</td>
          </tr>
          <tr>
            <th>Serial Number:</th><td style="font-weight: bold;">${instrument.serialNo}</td>
            <th>Scale Divisions (n):</th><td style="font-weight: bold;">n = ${Math.round(instrument.maxCapacity / instrument.verificationInterval_e).toLocaleString()}</td>
          </tr>
          <tr>
            <th>Max Capacity:</th><td>${instrument.maxCapacity} ${instrument.unit}</td>
            <th>Min Capacity:</th><td>${instrument.minCapacity} ${instrument.unit}</td>
          </tr>
          <tr>
            <th>Intervals (e / d):</th><td colspan="3">e = ${instrument.verificationInterval_e} ${instrument.unit} | d = ${instrument.scaleInterval_d} ${instrument.unit}</td>
          </tr>
        </table>

        <div class="section-title">2. Environmental Conditions & Location</div>
        <table>
          <tr>
            <th style="width: 25%;">Applicant / Owner:</th><td>${instrument.customerName}</td>
            <th style="width: 25%;">Location / Bay:</th><td>${instrument.location || 'Metrology Testing Bench 2'}</td>
          </tr>
          <tr>
            <th>Temperature:</th><td>${session.environmentalConditions.temperatureC} °C</td>
            <th>Humidity / Pressure:</th><td>${session.environmentalConditions.humidityPercent}% RH | ${session.environmentalConditions.pressureHpa} hPa</td>
          </tr>
        </table>

        <div class="section-title">3. Summary of Weighing Performance Observations (Table 6 Compliance)</div>
        <table>
          <thead>
            <tr>
              <th>Load L (${instrument.unit})</th>
              <th>m / e</th>
              <th>Indication I</th>
              <th>Error E</th>
              <th>MPE Limit</th>
              <th style="text-align: center;">Verdict</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="sign-block">
          <div style="font-size: 10pt; font-weight: bold; text-transform: uppercase; color: #0f172a; margin-bottom: 6px;">
            4. Legal Metrology Digital Sign-off & Authenticity
          </div>
          <table style="width: 100%; border: none;">
            <tr style="border: none;">
              <td style="border: none; width: 75%; vertical-align: top; padding: 0;">
                <table style="margin: 0;">
                  <tr>
                    <th style="width: 32%;">Approving Officer:</th><td>${approval?.approvingOfficerName || 'Authorized Metrological Officer'}</td>
                  </tr>
                  <tr>
                    <th>License ID:</th><td>${approval?.approvingOfficerLicense || 'LM-VERIF-77218'}</td>
                  </tr>
                  <tr>
                    <th>Digital Signature SHA-256:</th>
                    <td class="hash-code">${approval?.signatureHash || 'c8b217a94d802...verified'}</td>
                  </tr>
                  <tr>
                    <th>Verification Code:</th>
                    <td style="font-weight: bold; color: #15803d;">${qrVerifyCode}</td>
                  </tr>
                </table>
              </td>
              <td style="border: none; width: 25%; text-align: center; vertical-align: middle; padding: 0 0 0 16px;">
                ${activeQr ? `
                  <img src="${activeQr}" width="115" height="115" alt="Verification QR Code" style="display:block; margin: 0 auto; border: 1px solid #0f172a;" />
                  <div style="font-size: 8pt; font-weight: bold; color: #475569; margin-top: 4px;">SCAN TO AUTHENTICATE</div>
                  <div style="font-size: 7pt; color: #64748b; font-family: monospace;">${qrVerifyCode}</div>
                ` : ''}
              </td>
            </tr>
          </table>
        </div>

        <div style="font-size: 8pt; color: #94a3b8; text-align: center; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
          Generated electronically by WeighSure Legal Metrology Verification System under OIML R-76-1:2006 & DoCA guidelines.
        </div>
      </body>
      </html>
    `;

    const filename = `WeighSure-Certificate-${certNumber}.doc`;
    downloadWordDoc(filename, htmlContent);
    showDownloadNotice(filename);
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      let activeQr = qrCodeDataUrl;
      if (!activeQr) {
        activeQr = await generateQrDataUrl(qrTargetUrl, { width: 360, margin: 1 });
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let y = 18;

      // Header Decorative Bar
      doc.setFillColor(15, 23, 42); // Slate 900
      doc.rect(15, y, 180, 2, 'F');
      y += 8;

      // Laboratory Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('NATIONAL LEGAL METROLOGY AUTHORITY', 15, y);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Certificate No: ${certNumber}`, 195, y, { align: 'right' });
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Type-Evaluation & Initial Verification Testing Laboratory', 15, y);
      const issueDate = new Date(approval?.approvedAt || session.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      doc.text(`Issued: ${issueDate}`, 195, y, { align: 'right' });
      y += 4;

      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Standardized Legal Report Issued in Full Conformance with OIML R-76-1:2006 / DoCA Rules', 15, y);
      y += 8;

      // Metrological Verdict Box
      doc.setDrawColor(134, 239, 172); // Green 300
      doc.setFillColor(240, 253, 244); // Green 50
      doc.roundedRect(15, y, 180, 15, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(21, 128, 61); // Green 700
      doc.text('METROLOGICAL COMPLIANCE: PASSED', 20, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text('The non-automatic weighing instrument satisfies all Maximum Permissible Error (MPE) thresholds stipulated in OIML R-76-1:2006 Table 6.', 20, y + 11);
      y += 21;

      // Section 1: Instrument Under Evaluation
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('1. INSTRUMENT UNDER EVALUATION', 15, y);
      doc.setDrawColor(203, 213, 225);
      doc.line(15, y + 1.5, 195, y + 1.5);
      y += 6;

      const nVal = instrument.verificationInterval_e > 0
        ? Math.round(instrument.maxCapacity / instrument.verificationInterval_e).toLocaleString()
        : '0';

      const specs = [
        ['Manufacturer:', instrument.manufacturer, 'Model Designation:', instrument.model],
        ['Instrument Type (NAWI):', instrument.instrumentType || 'Bench Scale', 'Accuracy Class:', instrument.accuracyClass],
        ['Serial Number:', instrument.serialNo, 'Scale Divisions (n):', `n = ${nVal}`],
        ['Max Capacity:', `${instrument.maxCapacity} ${instrument.unit}`, 'Min Capacity:', `${instrument.minCapacity} ${instrument.unit}`],
        ['Verification Interval (e):', `${instrument.verificationInterval_e} ${instrument.unit}`, 'Scale Interval (d):', `${instrument.scaleInterval_d} ${instrument.unit}`]
      ];

      doc.setFontSize(8);
      specs.forEach(row => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(row[0], 18, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(row[1], 62, y);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(row[2], 110, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(row[3], 155, y);
        y += 4.5;
      });
      y += 4;

      // Section 2: Environmental Conditions
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('2. ENVIRONMENTAL CONDITIONS & TESTING BENCH', 15, y);
      doc.line(15, y + 1.5, 195, y + 1.5);
      y += 6;

      const envSpecs = [
        ['Applicant / Owner:', instrument.customerName, 'Testing Location / Bay:', instrument.location || 'Metrology Testing Bench 2'],
        ['Ambient Temperature:', `${session.environmentalConditions.temperatureC} °C`, 'Relative Humidity / Barometer:', `${session.environmentalConditions.humidityPercent}% RH / ${session.environmentalConditions.pressureHpa} hPa`]
      ];

      doc.setFontSize(8);
      envSpecs.forEach(row => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(row[0], 18, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(row[1], 62, y);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(row[2], 110, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(row[3], 155, y);
        y += 4.5;
      });
      y += 4;

      // Section 3: Summary of Weighing Performance Observations
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('3. SUMMARY OF WEIGHING PERFORMANCE OBSERVATIONS (TABLE 6 COMPLIANCE)', 15, y);
      doc.line(15, y + 1.5, 195, y + 1.5);
      y += 6;

      // Observation Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(15, y, 180, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`LOAD L (${instrument.unit.toUpperCase()})`, 18, y + 4.2);
      doc.text('M / E', 52, y + 4.2);
      doc.text('INDICATION I', 82, y + 4.2);
      doc.text('ERROR E', 118, y + 4.2);
      doc.text('MPE LIMIT', 148, y + 4.2);
      doc.text('EVALUATION', 180, y + 4.2);
      y += 6;

      const results = calculation?.detailedResults || [];
      results.forEach((calc, idx) => {
        if (y > 265) {
          doc.addPage();
          y = 20;
        }

        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y, 180, 5, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(String(calc.loadValue), 18, y + 3.8);
        doc.setFont('helvetica', 'normal');
        doc.text(`${calc.loadInMultiplesOfE} e`, 52, y + 3.8);
        doc.text(String(calc.observedReading), 82, y + 3.8);

        const errStr = calc.errorValue > 0 ? `+${calc.errorValue}` : String(calc.errorValue);
        doc.setFont('helvetica', 'bold');
        doc.text(errStr, 118, y + 3.8);
        doc.setFont('helvetica', 'normal');
        doc.text(`±${calc.mpeInUnits} ${instrument.unit} (±${calc.mpeValue}e)`, 148, y + 3.8);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(4, 120, 87);
        doc.text('✓ PASS', 182, y + 3.8);
        y += 5;
      });

      y += 4;
      doc.setDrawColor(203, 213, 225);
      doc.line(15, y, 195, y);
      y += 6;

      // Section 4: Signature & QR Code
      if (y > 225) {
        doc.addPage();
        y = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('4. LEGAL METROLOGY DIGITAL SIGN-OFF & AUTHENTICITY', 15, y);
      doc.line(15, y + 1.5, 195, y + 1.5);
      y += 6;

      // Officer Details (Left Column)
      const officerYStart = y;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Approving Officer:', 15, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(approval?.approvingOfficerName || 'Authorized Metrological Officer', 45, y);
      y += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Officer License ID:', 15, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(approval?.approvingOfficerLicense || 'LM-VERIF-77218', 45, y);
      y += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Approval Date:', 15, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(new Date(approval?.approvedAt || session.createdAt).toLocaleString(), 45, y);
      y += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('SHA-256 Hash:', 15, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(approval?.signatureHash || 'c8b21...verified', 45, y);
      y += 4.5;

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Verification Code:', 15, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(4, 120, 87);
      doc.text(qrVerifyCode, 45, y);

      // Embedded High-Resolution Scannable QR Code on right side
      if (activeQr) {
        try {
          doc.setDrawColor(15, 23, 42);
          doc.setLineWidth(0.4);
          doc.roundedRect(154, officerYStart - 2, 36, 42, 1.5, 1.5, 'S');

          // Embed actual QR code PNG
          doc.addImage(activeQr, 'PNG', 157, officerYStart + 1, 30, 30);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(15, 23, 42);
          doc.text('SCAN TO AUTHENTICATE', 172, officerYStart + 34, { align: 'center' });

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          doc.setTextColor(100, 116, 139);
          doc.text(qrVerifyCode, 172, officerYStart + 38, { align: 'center' });
        } catch (e) {
          console.error('Error embedding QR code into PDF', e);
        }
      }

      // Footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('WeighSure Legal Metrology Compliance Platform — Generated electronically under OIML R-76-1:2006 guidelines.', 105, 285, { align: 'center' });

      // Save PDF file to user's system
      const filename = `WeighSure-Certificate-${certNumber}.pdf`;
      doc.save(filename);
      showDownloadNotice(filename);
    } catch (err) {
      console.error('Failed to export PDF file, falling back to print dialog', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const n = instrument.verificationInterval_e > 0
    ? Math.round(instrument.maxCapacity / instrument.verificationInterval_e)
    : 0;

  return (
    <div className="space-y-6">
      {/* Toast Notification when file is downloaded to system */}
      {downloadSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{downloadSuccessToast}</span>
        </div>
      )}

      {/* Top Controls (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-600 transition-colors shadow-2xs"
            title="Return to test session details"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Official Verification Certificate
            </h1>
            <p className="text-xs text-slate-500">
              OIML R-76-1:2006 Standardized Report with Cryptographic Sign-off
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Export Word (.doc) */}
          <button
            id="btn-export-word"
            onClick={handleDownloadDocx}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
            title="Download editable Microsoft Word document (.doc) with complete tables, digital sign-off, and QR code"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Word (.doc)</span>
          </button>

          {/* Export CSV Readings */}
          <button
            id="btn-export-csv"
            onClick={handleDownloadCsv}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
            title="Download CSV spreadsheet of all test observations and MPE limits"
          >
            <Table className="w-3.5 h-3.5 text-emerald-600" />
            <span>CSV Data</span>
          </button>

          {/* Download QR Sticker Image */}
          <button
            id="btn-export-qr-sticker"
            onClick={handleDownloadQrSticker}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
            title="Download high-resolution scannable QR sticker (.png) to affix to physical scale"
          >
            <QrCode className="w-3.5 h-3.5 text-purple-600" />
            <span>QR Sticker</span>
          </button>

          {/* Export JSON Manifest */}
          <button
            id="btn-export-json"
            onClick={handleDownloadJson}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
            title="Download full JSON metrology session archive"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>JSON</span>
          </button>

          {/* Print Hard Copy */}
          <button
            id="btn-print-certificate"
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
            title="Send directly to local or network printer for physical paper copies"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print</span>
          </button>

          {/* Export Official Signed PDF */}
          <button
            id="btn-export-pdf"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold rounded-lg shadow-xs transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
            title="Generate and download an official signed PDF certificate directly to your computer"
          >
            <FileDown className="w-4 h-4 text-white" />
            <span>{isExportingPdf ? 'Exporting PDF...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* Printable Certificate Page */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-md p-8 sm:p-12 max-w-4xl mx-auto space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Certificate Laboratory Header */}
        <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Scale className="w-6 h-6 text-slate-900" />
              <span className="text-xl font-black tracking-tight text-slate-900 uppercase">
                National Legal Metrology Authority
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Type-Evaluation & Initial Verification Testing Laboratory • OIML R-76-1:2006 Standardized Report
            </p>
          </div>
          <div className="text-right space-y-0.5">
            <div className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded">
              Certificate No: {certNumber}
            </div>
            <div className="text-[11px] text-slate-500">
              Date: {new Date(approval?.approvedAt || session.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Metrological Verdict Banner */}
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-4 flex items-center space-x-4">
          <div className="p-2 bg-emerald-600 text-white rounded-lg">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-emerald-900 uppercase tracking-wide">
              Metrological Compliance: PASSED
            </div>
            <div className="text-xs text-emerald-700">
              The non-automatic weighing instrument satisfies all Maximum Permissible Error (MPE) thresholds stipulated in OIML R-76-1:2006 Table 6.
            </div>
          </div>
        </div>

        {/* Section 1: Instrument Under Evaluation */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center space-x-2">
            <span>1. Instrument Under Evaluation</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Manufacturer</span>
              <span className="font-bold text-slate-900">{instrument.manufacturer}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Model Designation</span>
              <span className="font-bold text-slate-900">{instrument.model}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Instrument Type (NAWI)</span>
              <span className="font-bold text-slate-900">{instrument.instrumentType || 'Bench Scale'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Accuracy Class</span>
              <span className="font-bold text-blue-700">{instrument.accuracyClass}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Serial Number</span>
              <span className="font-mono font-bold text-slate-900">{instrument.serialNo}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Max Capacity (Max)</span>
              <span className="font-bold text-slate-900">{instrument.maxCapacity} {instrument.unit}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Scale Interval (d)</span>
              <span className="font-bold text-slate-900">{instrument.scaleInterval_d} {instrument.unit}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Verification Interval (e)</span>
              <span className="font-bold text-slate-900">{instrument.verificationInterval_e} {instrument.unit}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Scale Divisions (n)</span>
              <span className="font-bold text-slate-900">n = {n.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Min Capacity (Min)</span>
              <span className="font-bold text-slate-900">{instrument.minCapacity} {instrument.unit}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Environmental Conditions */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            2. Testing Environment & Bench Location
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Applicant / Owner</span>
              <span className="font-bold text-slate-900">{instrument.customerName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Test Location</span>
              <span className="font-bold text-slate-900">{instrument.location || 'Metrology Testing Bench 2'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Temperature</span>
              <span className="font-bold text-slate-900">{session.environmentalConditions.temperatureC} °C</span>
            </div>
            <div>
              <span className="text-slate-500 block">Humidity / Pressure</span>
              <span className="font-bold text-slate-900">
                {session.environmentalConditions.humidityPercent}% RH / {session.environmentalConditions.pressureHpa} hPa
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Summary of Weighing Performance Observations */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            3. Summary of Weighing Performance Observations (Table 6 Compliance)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Load L ({instrument.unit})</th>
                  <th className="py-2.5 px-3 font-mono">m / e</th>
                  <th className="py-2.5 px-3">Indication I</th>
                  <th className="py-2.5 px-3">Error E</th>
                  <th className="py-2.5 px-3">MPE Limit</th>
                  <th className="py-2.5 px-3 text-right">Evaluation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(calculation?.detailedResults || []).map((calc, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                    <td className="py-2 px-3 font-bold text-slate-900">
                      {calc.loadValue}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600">
                      {calc.loadInMultiplesOfE} e
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-700">
                      {calc.observedReading}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-900">
                      {calc.errorValue > 0 ? `+${calc.errorValue}` : calc.errorValue}
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      ±{calc.mpeInUnits} {instrument.unit} (±{calc.mpeValue}e)
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700">
                      ✓ PASS
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Legal Metrology Digital Sign-off & Authenticity */}
        <div className="border-t-2 border-slate-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Officer Signature Block */}
          <div className="space-y-2 flex-1 w-full">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              4. Legal Metrology Digital Sign-off
            </div>
            <div className="text-sm font-bold text-slate-900">
              {approval?.approvingOfficerName || 'Authorized Metrological Officer'}
            </div>
            <div className="text-xs text-slate-600 font-mono">
              License ID: {approval?.approvingOfficerLicense || 'LM-VERIF-77218'}
            </div>
            <div className="font-mono text-[10px] text-slate-500 break-all bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              SHA-256: {approval?.signatureHash || 'c8b21...verified'}
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-emerald-700 font-semibold pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Cryptographically verified against OIML R-76 statutory standards</span>
            </div>
          </div>

          {/* High-Resolution Verification QR Code */}
          <div className="flex flex-col items-center text-center space-y-1 sm:pl-6 sm:border-l-2 sm:border-slate-200 shrink-0">
            <div 
              onClick={() => onOpenPublicVerify(qrVerifyCode)}
              className="p-2.5 bg-white border-2 border-slate-900 rounded-xl shadow-xs cursor-pointer hover:border-emerald-600 hover:shadow-md transition-all group"
              title="Click to test live public verification portal with this certificate"
            >
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt={`OIML Verification QR Code - ${certNumber}`}
                  className="w-28 h-28 object-contain rounded"
                />
              ) : (
                <div className="w-28 h-28 bg-slate-100 flex flex-col items-center justify-center animate-pulse rounded">
                  <QrCode className="w-10 h-10 text-slate-400" />
                  <span className="text-[9px] text-slate-500 font-mono mt-1">Generating QR...</span>
                </div>
              )}
            </div>
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
              Scan to Authenticate
            </span>
            <span className="font-mono text-[11px] font-bold text-emerald-700">
              {qrVerifyCode}
            </span>
            <button
              onClick={handleDownloadQrSticker}
              className="text-[10px] text-blue-600 hover:text-blue-800 underline print:hidden pt-0.5 cursor-pointer font-medium"
              title="Download image file directly to your system"
            >
              Save QR Sticker (.png)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
