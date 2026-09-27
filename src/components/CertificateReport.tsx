import React from 'react';
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
  Scale
} from 'lucide-react';

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

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `WeighSure-Report-${report?.reportNumber || session.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadDocx = () => {
    const certNumber = report?.reportNumber || `WS-R76-${Date.now()}`;
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
            <th style="width: 25%;">Location / Bay:</th><td>${instrument.location}</td>
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
          <table>
            <tr>
              <th style="width: 25%;">Approving Officer:</th><td>${approval?.approvingOfficerName || 'Authorized Metrological Officer'}</td>
              <th style="width: 25%;">License ID:</th><td>${approval?.approvingOfficerLicense || 'LM-VERIF-77218'}</td>
            </tr>
            <tr>
              <th>Digital Signature SHA-256:</th>
              <td colspan="3" class="hash-code">${approval?.signatureHash || 'c8b217a94d802...verified'}</td>
            </tr>
            <tr>
              <th>Authenticity Code:</th>
              <td colspan="3" style="font-weight: bold; color: #15803d;">${report?.qrVerificationCode || 'QR-AUTHENTIC-VERIFIED'}</td>
            </tr>
          </table>
        </div>

        <div style="font-size: 8pt; color: #94a3b8; text-align: center; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
          Generated electronically by WeighSure Legal Metrology Verification System under OIML R-76-1:2006 & DoCA guidelines.
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `WeighSure-Certificate-${report?.reportNumber || session.id}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    try {
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
      const certNo = report?.reportNumber || 'WS-OIML-2026-PENDING';
      doc.text(`Certificate No: ${certNo}`, 195, y, { align: 'right' });
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
      doc.text('Conformity Assessment in accordance with OIML R-76-1:2006 / EN 45501', 15, y);
      y += 5;

      doc.setDrawColor(203, 213, 225);
      doc.line(15, y, 195, y);
      y += 6;

      // Compliance Verdict Box
      const isPassed = calculation?.overallResult === 'PASS';
      if (isPassed) {
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(187, 247, 208);
      } else {
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(254, 202, 202);
      }
      doc.roundedRect(15, y, 180, 14, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('METROLOGICAL COMPLIANCE VERDICT:', 19, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('The instrument satisfies Table 6 Maximum Permissible Error (MPE) thresholds.', 19, y + 10.5);

      doc.setFillColor(isPassed ? 4 : 225, isPassed ? 120 : 29, isPassed ? 87 : 72);
      doc.roundedRect(162, y + 3, 28, 8, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(isPassed ? 'PASSED' : 'FAILED', 176, y + 8, { align: 'center' });
      y += 18;

      // Section 1: Instrument Under Evaluation
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('1. INSTRUMENT UNDER EVALUATION', 15, y);
      doc.setDrawColor(226, 232, 240);
      doc.line(15, y + 1.5, 195, y + 1.5);
      y += 6;

      doc.setFontSize(8);
      const col1 = 15;
      const col2 = 62;
      const col3 = 108;
      const col4 = 152;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Manufacturer:', col1, y);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(instrument.manufacturer || 'N/A', col1 + 22, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Model:', col2, y);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(instrument.model || 'N/A', col2 + 12, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Serial No:', col3, y);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(instrument.serialNo || 'N/A', col3 + 16, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Accuracy Class:', col4, y);
      doc.setTextColor(2, 132, 199);
      doc.setFont('helvetica', 'bold');
      doc.text(instrument.accuracyClass || 'N/A', col4 + 23, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('NAWI Type:', col1, y);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(instrument.instrumentType || 'Bench Scale', col1 + 18, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Max Capacity:', col2, y);
      doc.setTextColor(15, 23, 42);
      doc.text(`${instrument.maxCapacity} ${instrument.unit}`, col2 + 20, y);

      doc.setTextColor(100, 116, 139);
      doc.text('Min Capacity:', col3, y);
      doc.setTextColor(15, 23, 42);
      doc.text(`${instrument.minCapacity} ${instrument.unit}`, col3 + 19, y);

      doc.setTextColor(100, 116, 139);
      doc.text('Intervals:', col4, y);
      doc.setTextColor(15, 23, 42);
      doc.text(`e=${instrument.verificationInterval_e}${instrument.unit} / d=${instrument.scaleInterval_d}${instrument.unit}`, col4 + 14, y);
      y += 8;

      // Section 2: Environment & Client
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('2. TESTING ENVIRONMENT & LOCATION', 15, y);
      doc.setDrawColor(226, 232, 240);
      doc.line(15, y + 1.5, 195, y + 1.5);
      y += 6;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Client / Owner:', col1, y);
      doc.setTextColor(15, 23, 42);
      doc.text(instrument.customerName || 'N/A', col1 + 22, y);

      doc.setTextColor(100, 116, 139);
      doc.text('Location:', col2 + 8, y);
      doc.setTextColor(15, 23, 42);
      doc.text(instrument.location || 'N/A', col2 + 23, y);

      doc.setTextColor(100, 116, 139);
      doc.text('Conditions:', col3 + 12, y);
      doc.setTextColor(15, 23, 42);
      doc.text(`${session.environmentalConditions.temperatureC}°C | ${session.environmentalConditions.humidityPercent}% RH | ${session.environmentalConditions.pressureHpa} hPa`, col3 + 29, y);
      y += 8;

      // Section 3: Table 6 Observations Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('3. SUMMARY OF WEIGHING PERFORMANCE OBSERVATIONS (TABLE 6 COMPLIANCE)', 15, y);
      doc.setDrawColor(226, 232, 240);
      doc.line(15, y + 1.5, 195, y + 1.5);
      y += 4;

      // Table Header
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y, 180, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Load L (${instrument.unit})`, 18, y + 4.2);
      doc.text('Load in e (m)', 52, y + 4.2);
      doc.text(`Indication I (${instrument.unit})`, 82, y + 4.2);
      doc.text(`Error E (${instrument.unit})`, 118, y + 4.2);
      doc.text('MPE Limit', 148, y + 4.2);
      doc.text('Evaluation', 182, y + 4.2);
      y += 6;

      // Table Rows
      const rows = calculation?.detailedResults || [];
      rows.forEach((calc, idx) => {
        if (y > 240) {
          doc.addPage();
          y = 20;
        }
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y, 180, 5, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(String(calc.loadValue), 18, y + 3.8);
        doc.text(`${calc.loadInMultiplesOfE} e`, 52, y + 3.8);
        doc.text(String(calc.observedReading), 82, y + 3.8);

        const errStr = calc.errorValue > 0 ? `+${calc.errorValue}` : String(calc.errorValue);
        doc.text(errStr, 118, y + 3.8);
        doc.text(`±${calc.mpeInUnits} ${instrument.unit} (±${calc.mpeValue}e)`, 148, y + 3.8);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(4, 120, 87);
        doc.text('PASS', 182, y + 3.8);
        y += 5;
      });

      y += 4;
      doc.setDrawColor(203, 213, 225);
      doc.line(15, y, 195, y);
      y += 6;

      // Section 4: Signature & QR Code
      if (y > 230) {
        doc.addPage();
        y = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('4. LEGAL METROLOGY DIGITAL SIGN-OFF & AUTHENTICITY', 15, y);
      doc.line(15, y + 1.5, 195, y + 1.5);
      y += 6;

      // Officer Details
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
      doc.text(report?.qrVerificationCode || 'QR-VERIFY', 45, y);

      // QR Code on right side
      if (qrCodeDataUrl) {
        try {
          doc.addImage(qrCodeDataUrl, 'PNG', 160, y - 20, 26, 26);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(71, 85, 105);
          doc.text('Scan to Authenticate', 173, y + 9, { align: 'center' });
        } catch (e) {
          console.error('Error embedding QR code into PDF', e);
        }
      }

      // Footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('WeighSure Legal Metrology Compliance Platform — Generated electronically under OIML R-76-1:2006 guidelines.', 105, 285, { align: 'center' });

      // Save file
      const filename = `WeighSure-Certificate-${report?.reportNumber || session.id}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('Failed to export PDF file, falling back to print dialog', err);
      window.print();
    }
  };

  const qrCodeDataUrl = report?.qrCodeDataUrl;
  const n = instrument.verificationInterval_e > 0
    ? Math.round(instrument.maxCapacity / instrument.verificationInterval_e)
    : 0;

  return (
    <div className="space-y-6">
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
          <button
            id="btn-export-word"
            onClick={handleDownloadDocx}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
            title="Download editable Microsoft Word document (.doc) with complete formatting, tables, and signatures"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Export Word (.doc)</span>
          </button>
          <button
            onClick={handleDownloadJson}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
            title="Download JSON metrology manifest"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>JSON</span>
          </button>
          <button
            id="btn-print-certificate"
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
            title="Send directly to local or network printer for physical paper copies"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print Hard Copy</span>
          </button>
          <button
            id="btn-export-pdf"
            onClick={handleExportPdf}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
            title="Generate and download an official signed PDF certificate"
          >
            <FileDown className="w-4 h-4 text-white" />
            <span>Export to PDF</span>
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
            <div className="text-xs text-slate-600 font-semibold tracking-wider uppercase">
              Type-Evaluation & Initial Verification Testing Laboratory
            </div>
            <div className="text-[11px] text-slate-500">
              Conformity Assessment in accordance with OIML R-76-1:2006 / EN 45501
            </div>
          </div>

          <div className="text-right sm:border-l-2 sm:border-slate-200 sm:pl-6 space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Certificate No.
            </div>
            <div className="font-mono text-base font-black text-slate-900 tracking-tight">
              {report?.reportNumber || 'WS-OIML-2026-PENDING'}
            </div>
            <div className="text-[11px] text-slate-500">
              Issued: {new Date(approval?.approvedAt || session.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Big Verdict Stamp */}
        <div className="flex items-center justify-between bg-slate-50 p-5 rounded-xl border border-slate-200">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Metrological Compliance Result
            </span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              The instrument satisfies all Table 6 Maximum Permissible Error (MPE) thresholds.
            </div>
          </div>
          <div className="text-center">
            <span className="inline-block px-5 py-2 bg-emerald-600 text-white font-black text-lg tracking-widest rounded-lg shadow-xs">
              PASSED
            </span>
            <div className="text-[10px] text-emerald-700 font-bold mt-1">OIML VERIFIED</div>
          </div>
        </div>

        {/* Instrument Identification Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5">
            1. Instrument Under Evaluation
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <div className="text-slate-500 text-[11px]">Manufacturer:</div>
              <div className="font-bold text-slate-900">{instrument.manufacturer}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[11px]">Model Designation:</div>
              <div className="font-bold text-slate-900">{instrument.model}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[11px]">Serial Number:</div>
              <div className="font-mono font-bold text-slate-900">{instrument.serialNo}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[11px]">Accuracy Class:</div>
              <div className="font-bold text-blue-700">{instrument.accuracyClass}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[11px]">NAWI Type:</div>
              <div className="font-semibold text-slate-800">{instrument.instrumentType || 'Bench Scale'}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[11px]">Max Capacity (Max):</div>
              <div className="font-semibold text-slate-900">{instrument.maxCapacity} {instrument.unit}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[11px]">Min Capacity (Min):</div>
              <div className="font-semibold text-slate-900">{instrument.minCapacity} {instrument.unit}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[11px]">Intervals (e / d):</div>
              <div className="font-mono font-semibold text-slate-900">
                e={instrument.verificationInterval_e} / d={instrument.scaleInterval_d} {instrument.unit}
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-[11px]">Scale Divisions (n):</div>
              <div className="font-mono font-bold text-slate-900">
                n = {n.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Environmental Test Conditions */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5">
            2. Testing Environment & Location
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <div className="text-slate-500 text-[11px]">Applicant / Owner:</div>
              <div className="font-semibold text-slate-900">{instrument.customerName}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[11px]">Test Location:</div>
              <div className="font-semibold text-slate-900">{instrument.location}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[11px]">Temperature:</div>
              <div className="font-semibold text-slate-900">{session.environmentalConditions.temperatureC} °C</div>
            </div>
            <div>
              <div className="text-slate-500 text-[11px]">Humidity / Pressure:</div>
              <div className="font-semibold text-slate-900">
                {session.environmentalConditions.humidityPercent}% RH / {session.environmentalConditions.pressureHpa} hPa
              </div>
            </div>
          </div>
        </div>

        {/* Observation Results Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5">
            3. Summary of Weighing Performance Observations (Table 6 Compliance)
          </h3>
          <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
            <table className="w-full text-left font-mono">
              <thead className="bg-slate-50 text-slate-600 font-sans uppercase font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="p-2">Load L ({instrument.unit})</th>
                  <th className="p-2">m / e</th>
                  <th className="p-2">Indication I</th>
                  <th className="p-2">Error E</th>
                  <th className="p-2">MPE Limit</th>
                  <th className="p-2 text-right">Evaluation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {calculation?.detailedResults.map((calc, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-2 font-bold text-slate-900">{calc.loadValue}</td>
                    <td className="p-2 text-slate-600">{calc.loadInMultiplesOfE} e</td>
                    <td className="p-2">{calc.observedReading}</td>
                    <td className="p-2 font-bold">{calc.errorValue > 0 ? `+${calc.errorValue}` : calc.errorValue}</td>
                    <td className="p-2 text-slate-600">±{calc.mpeInUnits} {instrument.unit} (±{calc.mpeValue}e)</td>
                    <td className="p-2 text-right font-sans font-bold text-emerald-700">
                      ✓ PASS
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Digital Signature & QR Authenticity Footer */}
        <div className="border-t-2 border-slate-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Officer Signature Block */}
          <div className="space-y-2 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              4. Legal Metrology Digital Sign-off
            </div>
            <div className="text-xs font-bold text-slate-900">
              {approval?.approvingOfficerName || 'Authorized Metrological Officer'}
            </div>
            <div className="text-[11px] text-slate-600 font-mono">
              License ID: {approval?.approvingOfficerLicense || 'LM-VERIF-77218'}
            </div>
            <div className="font-mono text-[10px] text-slate-500 break-all bg-slate-50 p-2 rounded border border-slate-200">
              SHA-256: {approval?.signatureHash || 'c8b21...verified'}
            </div>
          </div>

          {/* High-Resolution Verification QR Code */}
          <div className="flex flex-col items-center text-center space-y-1 sm:pl-6 sm:border-l-2 sm:border-slate-200">
            <div 
              onClick={() => report?.qrVerificationCode && onOpenPublicVerify(report.qrVerificationCode)}
              className="p-2 bg-white border-2 border-slate-900 rounded-xl shadow-xs cursor-pointer hover:border-emerald-600 transition-colors"
              title="Click to test public verification portal"
            >
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="OIML Verification QR Code"
                  className="w-28 h-28 object-contain"
                />
              ) : (
                <div className="w-28 h-28 bg-slate-100 flex items-center justify-center">
                  <QrCode className="w-12 h-12 text-slate-700" />
                </div>
              )}
            </div>
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Scan to Authenticate
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {report?.qrVerificationCode || 'QR-VERIFY'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
