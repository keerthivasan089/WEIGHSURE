# WeighSure — Technical Documentation & Metrological Specification

**SIH Problem Statement PS-26035**  
*Ministry of Consumer Affairs, Food & Public Distribution (DoCA)*  
*Platform: Non-Automatic Weighing Instruments (NAWI) Verification & Compliance System*  
*Standard: OIML R-76-1:2006 (E) / EN 45501:2015*

---

## 1. Executive Summary & SIH PS-26035 Mapping

WeighSure is an enterprise-grade legal metrology verification platform engineered specifically for Non-Automatic Weighing Instruments (NAWIs) undergoing type-evaluation, initial verification, and subsequent in-service conformity assessment.

### Official Requirement Compliance Matrix

| SIH PS-26035 Requirement | WeighSure Implementation | Architecture / Engine Module |
| :--- | :--- | :--- |
| **Capture instrument details & technical specs** | Full registry for Class I, II, III, and IIII instruments, tracking Max, Min, $e$, $d$, $n$, manufacturer, and serial numbers. | `src/components/InstrumentRegistry.tsx`, `/api/instruments` |
| **Record lab & environmental conditions** | Enforces OIML R-76 §3.9.2 baseline validation for ambient temperature, relative humidity, barometric pressure, and testing bay. | `src/components/TestSessionDetail.tsx`, `/api/test-sessions` |
| **Enter observations from OIML R-76 procedures** | Multi-procedure intake covering Weighing Performance (Inc/Dec), Eccentricity (Corner Load), and Repeatability (Runs 1–3). | `src/components/TestSessionDetail.tsx`, `src/lib/oimlEngine.ts` |
| **Auto-calculate permissible errors & compliance** | Pure, deterministic mathematical evaluation of load ratios ($m/e$), rounded turning point errors, and Table 6 bounds. | `src/lib/oimlEngine.ts` |
| **Validation checks on entered data** | Triple-tier validation: OCR confidence scoring, turning point $\Delta L$ range checks, and technician confirmation requirements. | `src/components/OcrSheetModal.tsx`, `src/lib/oimlEngine.ts` |
| **Auto pass/fail per OIML R-76** | Binary deterministic verdict with granular line-item PASS/FAIL and summary error limits. | `src/lib/oimlEngine.ts` |
| **Digital repository of completed reports** | Structured repository mimicking PostgreSQL schema with persistent query and filtering. | `/server.ts`, `/api/test-sessions` |
| **Secure role-based access control (RBAC)** | Strict four-tier hierarchy: Technician, Approving Officer, ISO/IEC 17025 Auditor, System Administrator. | `server.ts` (`requireRole`), `src/components/Header.tsx` |
| **Future OIML revision support** | Rule configuration versioning engine with effective dates, archived revisions, and administrative activation matrix. | `src/components/RuleManager.tsx`, `/api/rule-versions` |
| **Standardized report generation (PDF + Word)** | Native vector PDF generation (`jspdf`) + fully formatted Microsoft Word `.doc` report with table layouts. | `src/components/CertificateReport.tsx` |
| **Photograph & supporting document attachments** | Multi-category evidence repository for nameplates, leveling bubble alignment, scale setup, and calibration certs. | `src/components/SessionAttachments.tsx`, `/api/test-sessions/:id/attachments` |
| **Search & retrieval of past reports** | Real-time multi-attribute search across serial numbers, manufacturers, customer names, and verification numbers. | `src/components/InstrumentRegistry.tsx`, `src/components/AuditTrail.tsx` |
| **Cryptographic digital signatures** | SHA-256 HMAC digest binding instrument specs, officer license ID, and calculation results into tamper-proof QR tokens. | `/server.ts`, `src/components/PublicVerifyModal.tsx` |

---

## 2. Metrological Calculation Methodology (OIML R-76-1:2006)

### 2.1 Fundamental Parameters
Given a Non-Automatic Weighing Instrument with:
- Maximum capacity $\text{Max}$
- Minimum capacity $\text{Min}$
- Verification scale interval $e$
- Actual scale interval $d$ (where $d \le e$)

The number of verification scale intervals is:
$$n = \frac{\text{Max}}{e}$$

### 2.2 Accuracy Classification
In accordance with OIML R-76 Table 3:
- **Class I (Special):** $e \ge 0.001\text{ g}$, $n \ge 50,000$
- **Class II (High):** $0.001\text{ g} \le e \le 0.05\text{ g}$ ($n \ge 100$), or $e \ge 0.1\text{ g}$ ($n \ge 5,000$)
- **Class III (Medium):** $0.1\text{ g} \le e \le 2\text{ g}$ ($n \ge 100$), or $e \ge 5\text{ g}$ ($n \ge 500$, $n \le 10,000$)
- **Class IIII (Ordinary):** $e \ge 5\text{ g}$, $100 \le n \le 1,000$

### 2.3 Maximum Permissible Error (MPE) Table 6
For initial verification, maximum permissible errors are evaluated as a function of the test load expressed in multiples of $e$ ($m = L / e$):

| Multiples of $e$ ($m = L / e$) for Class I | Class II | Class III | Class IIII | Initial Verification MPE |
| :--- | :--- | :--- | :--- | :--- |
| $0 \le m \le 50,000$ | $0 \le m \le 5,000$ | $0 \le m \le 500$ | $0 \le m \le 50$ | **$\pm 0.5\,e$** |
| $50,000 < m \le 200,000$ | $5,000 < m \le 20,000$ | $500 < m \le 2,000$ | $50 < m \le 200$ | **$\pm 1.0\,e$** |
| $m > 200,000$ | $20,000 < m \le 100,000$ | $2,000 < m \le 10,000$ | $200 < m \le 1,000$ | **$\pm 1.5\,e$** |

*(Note: For in-service testing, MPE limits are doubled per OIML R-76 §3.5.2)*

### 2.4 True Indication & Error Calculation with Turning Points ($\Delta L$)
To eliminate digital rounding errors when $d < e$ or $d = e$, the turning-point procedure (OIML R-76 §A.4.4.3) is supported:
$$P = I + 0.5e - \Delta L$$
Where:
- $I$ = Observed indication
- $\Delta L$ = Additional fractional load placed on the load receptor until the indication changes to $I + e$
- $P$ = Calculated rounded indication before rounding

The true error of indication $E$ is:
$$E = P - L$$
*(Or $E = I - L$ when small weights method is omitted).*

### 2.5 Multi-Point Compliance Verification
- **Weighing Performance:** At least 5 test points ascending and descending, including Min, inflection points where MPE changes ($500e, 2000e$), and Max.
- **Eccentricity (Corner Load):** Test load equal to $\text{Max}/3$ or $\text{Max}/4$ applied to center and corners 1, 2, 3, 4. The error at each position shall not exceed the MPE for that load.
- **Repeatability:** 3 series of weighings at $\approx 0.5\,\text{Max}$ and $\text{Max}$. The difference between the maximum and minimum indications for the same load shall not exceed the absolute value of MPE for that load.

---

## 3. System Architecture & Component Design

```
┌────────────────────────────────────────────────────────────────────────┐
│                        WeighSure Client (SPA)                          │
│  React 19 • TypeScript • Tailwind CSS • Lucide Icons • Motion Transitions│
└───────────────────▲────────────────────────────────▲───────────────────┘
                    │ REST APIs                      │ Export Streams
                    ▼                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Express Full-Stack Application                      │
│                                                                        │
│  ┌───────────────────┐  ┌───────────────────┐  ┌────────────────────┐  │
│  │ OIML R-76 Engine  │  │ RBAC & Security   │  │ Document Generator │  │
│  │ Pure Deterministic│  │ Role Guards &     │  │ Vector PDF (jsPDF) │  │
│  │ MPE Table 6 Logic │  │ HMAC SHA-256 Sign │  │ Word (.doc) Engine │  │
│  └───────────────────┘  └───────────────────┘  └────────────────────┘  │
│  ┌───────────────────┐  ┌───────────────────┐  ┌────────────────────┐  │
│  │ OCR Assist Engine │  │ Audit Trail       │  │ Evidence Store     │  │
│  │ Sheet Extraction  │  │ ISO 17025 Log     │  │ Photos, Nameplate  │  │
│  │ Confidence Flag   │  │ Immutable Records │  │ Calibration Certs  │  │
│  └───────────────────┘  └───────────────────┘  └────────────────────┘  │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Data Storage Architecture                       │
│  Relational Entities (PostgreSQL schema format): Instruments, Sessions,│
│  Observations, Attachments, Rule Configurations, Immutable Audit Logs  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Human-in-the-Loop AI & OCR Intake

In strict compliance with Legal Metrology principles:
1. **AI / OCR Never Makes Compliance Decisions:** Optical character recognition serves exclusively as an intake accelerator.
2. **Confidence Stratification:**
   - **Green ($\ge 95\%$):** High-confidence field extraction.
   - **Amber ($85\% - 94\%$):** Marked for technician verification.
   - **Red ($< 85\%$):** Requires mandatory manual override and confirmation.
3. **Confirmed State:** No observation extracted via OCR can be committed to the official record without explicit confirmation by the licensed technician.

---

## 5. Security, Cryptographic Signatures & ISO/IEC 17025 Compliance

### 5.1 Digital Signature Protocol
When an authorized Approving Officer approves a session:
1. Canonical payload is synthesized:
   ```json
   {
     "sessionId": "sess_001",
     "serialNo": "MT-XPE-8840192",
     "accuracyClass": "Class I",
     "maxCapacity": 220,
     "unit": "g",
     "overallResult": "PASS",
     "officerLicense": "OIML-VER-4012",
     "timestamp": "2026-03-05T14:30:00.000Z"
   }
   ```
2. A cryptographic SHA-256 hash is generated using `node:crypto`.
3. An encrypted verification token is encoded into a high-resolution QR code (`QRCode.toDataURL`).
4. Scanning the QR code resolves to the public authentication portal verifying authenticity, certificate status, and tamper history.

### 5.2 Immutable Audit Trail (ISO/IEC 17025 §7.5)
Every transaction records:
- Timestamp (UTC ISO 8601)
- User ID, Name, Role, License Number
- Action Name (`INSTRUMENT_REGISTERED`, `CALCULATION_EXECUTED`, `ATTACHMENT_ADDED`, `SESSION_APPROVED`, `RULE_ACTIVATED`)
- Entity ID & Target Type
- Complete JSON metadata snapshot of before/after states

---

## 6. Deployment & Environment Setup

### 6.1 Container Specifications
- **Operating Environment:** Linux Container (Google Cloud Run / Docker)
- **Port:** Exclusively binds to `0.0.0.0:3000` behind Nginx reverse proxy
- **Build Step:** `npm run build` bundles React client into `dist/` and compiles TypeScript server into `dist/server.cjs` via `esbuild`.
- **Runtime Command:** `node dist/server.cjs`
