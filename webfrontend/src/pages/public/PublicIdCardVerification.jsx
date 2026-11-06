import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  User,
  Phone,
  Building,
  Calendar,
  Sparkles,
  Printer,
  RotateCw,
  ExternalLink,
  Lock,
  ArrowLeft,
  Briefcase,
  Fingerprint,
  HeartPulse
} from 'lucide-react';
import { API_BASE_URL } from '../../services/api';
import QrCodeSvg from '../../components/common/QrCodeSvg';

/**
 * Deterministic Vector SVG Barcode generator
 */
function BarcodeSvg({ value, height = 28 }) {
  const bars = [];
  const seed = (value || 'GTE').split('').reduce((acc, char) => acc + char.charCodeAt(0), 17);
  let pos = 10;

  for (let i = 0; i < 48; i++) {
    const width = ((seed * (i + 13)) % 3) + 1;
    const isBar = (seed * (i + 7) + i * 3) % 2 === 0;
    if (isBar) {
      bars.push(<rect key={i} x={pos} y={0} width={width} height={height} fill="#111827" />);
    }
    pos += width + 1;
  }

  return (
    <div className="flex flex-col items-center">
      <svg width={pos + 10} height={height} viewBox={`0 0 ${pos + 10} ${height}`} className="w-full max-w-[170px] h-6">
        {bars}
      </svg>
      <span className="font-mono text-[9px] tracking-widest text-slate-700 uppercase mt-0.5">{value}</span>
    </div>
  );
}

export default function PublicIdCardVerification() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [viewSide, setViewSide] = useState('both'); // 'both' | 'front' | 'back'
  const [printSide, setPrintSide] = useState('both'); // 'both' | 'front' | 'back'

  useEffect(() => {
    let isMounted = true;
    async function fetchVerification() {
      if (!id) {
        setError('Missing employee identifier in verification URL');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/employees/verify/${encodeURIComponent(id)}`, {
          headers: {
            'ngrok-skip-browser-warning': 'true'
          }
        });

        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.message || 'Employee identity credential not found');
        }

        if (isMounted) {
          setData(json.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to connect to verification registry');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchVerification();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center animate-pulse mb-4">
          <ShieldCheck className="w-8 h-8 text-sky-400 animate-spin" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-100">Verifying Employee Credential</h2>
        <p className="text-sm text-slate-400 mt-1">Connecting to GT ERP Secure HR Registry...</p>
      </div>
    );
  }

  if (error || !data?.employee) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-rose-500" />
        </div>
        <h1 className="text-2xl font-black text-rose-400">Verification Failed</h1>
        <p className="text-slate-300 max-w-md mt-2 text-sm leading-relaxed">
          {error || 'The scanned employee credential was not found or is currently inactive in the GT ERP registry.'}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link
            to="/login"
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Portal Login
          </Link>
          <a
            href="tel:+251911234567"
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Phone className="w-4 h-4" />
            Contact HR Administration
          </a>
        </div>
      </div>
    );
  }

  const { employee, companyName, verifiedAt } = data;
  const employeeBadgeCode = employee.employeeCode || `GTE-${(employee._id || '').slice(-6).toUpperCase() || 'EMP901'}`;
  const issueDate = employee.hiredAt ? new Date(employee.hiredAt).toISOString().split('T')[0] : '2025-01-01';
  const expiryDate = employee.hiredAt
    ? new Date(new Date(employee.hiredAt).setFullYear(new Date(employee.hiredAt).getFullYear() + 3))
      .toISOString()
      .split('T')[0]
    : '2028-01-01';
  const emergencyPhone = employee.emergency?.contactPhone || '+251 911 234 567';
  const bloodGroup = employee.bloodGroup || 'O+';
  const qrVerificationUrl = window.location.href;

  const showFront = viewSide === 'both' || viewSide === 'front';
  const showBack = viewSide === 'both' || viewSide === 'back';
  const printFront = printSide === 'both' || printSide === 'front';
  const printBack = printSide === 'both' || printSide === 'back';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-sky-500 selection:text-white">
      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: auto;
            margin: 8mm;
          }
          body * {
            visibility: hidden !important;
          }
          #public-id-print-zone, #public-id-print-zone * {
            visibility: visible !important;
          }
          #public-id-print-zone {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
            justify-content: center !important;
            align-items: flex-start !important;
            gap: 10mm !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .id-card-container {
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
          .print-show {
            display: flex !important;
          }
          .print-hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Navigation / Branding Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <img src="/gt-logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 shadow-sm" />
          <div>
            <div className="font-black text-sm uppercase tracking-wide text-white">{companyName}</div>
            <div className="text-[10px] text-sky-400 font-medium tracking-wider">OFFICIAL DIGITAL IDENTITY PORTAL</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Card
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-10 mb-8 flex flex-col items-center">
        {/* Verification Status Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide mb-6 shadow-xs animate-fade-in no-print">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>OFFICIAL VERIFIED EMPLOYEE PASS</span>
          <span className="text-emerald-500/60">•</span>
          <span className="text-[11px] font-mono text-emerald-300">ACTIVE</span>
        </div>

        {/* View Toggle Tabs & Print Side Selector */}
        <div className="flex flex-wrap items-center justify-between w-full max-w-lg mb-6 gap-3 no-print">
          <div className="flex p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => setViewSide('both')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewSide === 'both'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Both Sides
            </button>
            <button
              type="button"
              onClick={() => setViewSide('front')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewSide === 'front'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Front Only
            </button>
            <button
              type="button"
              onClick={() => setViewSide('back')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewSide === 'back'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Back Only
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Print:</span>
            <select
              value={printSide}
              onChange={(e) => setPrintSide(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-sky-500"
            >
              <option value="both">Both Sides</option>
              <option value="front">Front Only</option>
              <option value="back">Back Only</option>
            </select>
          </div>
        </div>

        {/* THE ID CARD (Standard CR80 Portrait 300x460) */}
        <div
          id="public-id-print-zone"
          className="w-full flex flex-col sm:flex-row items-center justify-center gap-6 mb-8"
        >
          {/* ==================== FRONT SIDE ==================== */}
          {(showFront || printFront) && (
            <div
              className={`id-card-container w-[300px] h-[460px] bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-300 relative select-none flex flex-col justify-between shrink-0 ${
                !showFront ? 'hidden' : ''
              } ${printFront ? 'print-show' : 'print-hidden'}`}
            >
              {/* Optional Lanyard Punch Hole */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-2 bg-slate-300/80 rounded-full border border-slate-400/50 z-20 shadow-inner" />

              {/* Header Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 pt-5 pb-3 px-4 text-white text-center relative shadow-sm">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <img src="/gt-logo.jpg" alt="Logo" className="w-6 h-6 object-contain rounded-md bg-white p-0.5" />
                  <span className="font-black text-[12px] tracking-tight uppercase leading-tight">
                    {companyName}
                  </span>
                </div>
                <div className="text-[9px] font-bold tracking-widest text-sky-200 uppercase">
                  STAFF IDENTITY CARD
                </div>
              </div>

              {/* Accent Strip */}
              <div className="h-1.5 bg-sky-600 w-full" />

              {/* Card Body */}
              <div className="flex-1 p-3.5 flex flex-col items-center justify-between text-center bg-radial from-slate-50 to-white">
                {/* Photo Avatar with Hologram */}
                <div className="relative mt-1">
                  <div className="w-24 h-28 rounded-xl overflow-hidden border-2 border-slate-800 shadow-md bg-slate-100 flex items-center justify-center">
                    {employee.profileImage ? (
                      <img src={employee.profileImage} alt={employee.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-slate-300" />
                    )}
                  </div>
                  <div
                    className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 via-rose-300 to-sky-400 border border-white shadow-md flex items-center justify-center"
                    title="Tamper-evident holographic credential"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-slate-900" />
                  </div>
                </div>

                {/* Name & Title */}
                <div className="mt-1 space-y-0.5">
                  <h2 className="font-black text-base text-slate-900 leading-tight uppercase">
                    {employee.fullName}
                  </h2>
                  <p className="font-bold text-xs text-sky-700 uppercase">
                    {employee.position}
                  </p>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[9.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {employee.department} • {employee.branch || 'Main Plant'}
                  </span>
                </div>

                {/* Info Grid */}
                <div className="w-full grid grid-cols-2 gap-1 px-2 text-[9.5px] text-left border-y border-slate-100 py-1.5">
                  <div>
                    <span className="text-slate-400 block text-[7.5px] uppercase font-bold">Staff ID</span>
                    <span className="font-mono font-bold text-slate-800">{employeeBadgeCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[7.5px] uppercase font-bold">National ID</span>
                    <span className="font-mono font-bold text-slate-800 truncate block">
                      {employee.nationalId || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[7.5px] uppercase font-bold">Issued</span>
                    <span className="font-semibold text-slate-700">{issueDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[7.5px] uppercase font-bold">Valid Until</span>
                    <span className="font-semibold text-slate-700">{expiryDate}</span>
                  </div>
                </div>

                {/* Barcode */}
                <div className="w-full flex items-center justify-center pt-0.5">
                  <BarcodeSvg value={employeeBadgeCode} height={22} />
                </div>
              </div>

              {/* Bottom Footer Strip */}
              <div className="py-1 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-center">
                <span className="text-[8px] font-bold text-slate-300 tracking-wider">
                  OFFICIAL AUTHORIZED PERSONNEL
                </span>
              </div>
            </div>
          )}

          {/* ==================== BACK SIDE ==================== */}
          {(showBack || printBack) && (
            <div
              className={`id-card-container w-[300px] h-[460px] bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-300 relative select-none flex flex-col justify-between shrink-0 ${
                !showBack ? 'hidden' : ''
              } ${printBack ? 'print-show' : 'print-hidden'}`}
            >
              {/* Lanyard Punch Hole */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-2 bg-slate-300/80 rounded-full border border-slate-400/50 z-20 shadow-inner" />

              {/* Magnetic Stripe */}
              <div className="w-full h-6 bg-slate-900 shrink-0 mt-5" />

              {/* Back Content */}
              <div className="p-3.5 flex flex-col justify-between flex-1 overflow-hidden text-left text-xs bg-gradient-to-b from-slate-50 to-white">
                <div className="space-y-2">
                  <div className="text-[9.5px] text-slate-600 leading-snug">
                    <strong className="text-slate-800">TERMS OF USE:</strong> This credential is the exclusive property of{' '}
                    <span className="font-bold text-slate-900">{companyName}</span>. It must be displayed on premises at all times
                    and surrendered upon end of employment.
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-[9.5px] space-y-1 shadow-xs">
                    <div className="font-bold text-slate-800 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                      <span>IF FOUND, PLEASE RETURN TO:</span>
                    </div>
                    <div className="text-slate-600 pl-4 space-y-0.5 text-[9px] leading-tight">
                      <div>HR & Administration Directorate</div>
                      <div>GT Printing & Packaging Plant, Addis Ababa</div>
                      <div className="font-mono font-medium text-slate-800">Hotline: +251 911 234 567</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[9.5px] pt-1.5 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase font-bold">Emergency Phone</span>
                      <span className="font-mono font-bold text-slate-800 text-[10px]">{emergencyPhone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase font-bold">Medical / Blood</span>
                      <span className="font-bold text-rose-600 text-[10px]">{bloodGroup}</span>
                    </div>
                  </div>
                </div>

                {/* QR Code and Signatures */}
                <div className="flex items-end justify-between pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <QrCodeSvg text={qrVerificationUrl} size={46} />
                    <div className="text-[8px] text-slate-500 leading-tight">
                      <span className="font-bold block text-slate-700">Digital Seal</span>
                      GT ERP Secure
                      <br />
                      HR Registry
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="w-24 border-b border-slate-400 pb-0.5 mb-1 font-serif italic text-slate-600 text-[10px] text-center">
                      Authorized HR
                    </div>
                    <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider block">
                      Authorized Signatory
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="py-1 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-center shrink-0">
                <span className="text-[8px] font-bold text-slate-300 tracking-wider">
                  GT ENTERPRISE AUTHORIZED IDENTITY PASS
                </span>
              </div>
            </div>
          )}
        </div>

        {/* VERIFIED DETAILS CARD */}
        <div className="w-full max-w-xl bg-slate-900/80 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4 no-print">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
              <Fingerprint className="w-4 h-4" />
              <span>Official ERP Verification Record</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Verified {new Date(verifiedAt || Date.now()).toLocaleDateString()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                <User className="w-3 h-3 text-slate-500" /> Full Legal Name
              </span>
              <p className="font-bold text-slate-100 text-sm">{employee.fullName}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-slate-500" /> Employee Badge Code
              </span>
              <p className="font-mono font-bold text-sky-400 text-sm">{employeeBadgeCode}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-slate-500" /> Position / Designation
              </span>
              <p className="font-semibold text-slate-200">{employee.position}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                <Building className="w-3 h-3 text-slate-500" /> Department & Branch
              </span>
              <p className="font-semibold text-slate-200">
                {employee.department} • {employee.branch || 'Main Plant'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" /> Validity Period
              </span>
              <p className="font-semibold text-slate-200">
                {issueDate} to {expiryDate}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                <HeartPulse className="w-3 h-3 text-slate-500" /> Blood Group & Emergency
              </span>
              <p className="font-semibold text-slate-200">
                {bloodGroup} • <span className="font-mono text-slate-300">{emergencyPhone}</span>
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-800/40 text-[11px] text-sky-200 leading-relaxed">
            <strong>Security Notice:</strong> This digital identity card was verified in real time against the GT Enterprise Resource Planning HR database. The badge is authorized for access to plant facilities, administrative offices, and secure operations.
          </div>

          {/* Quick Actions */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Print Official ID Pass
            </button>
            <a
              href="tel:+251911234567"
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-2 border border-slate-700"
            >
              <Phone className="w-4 h-4" />
              Call
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 py-6 border-t border-slate-900 no-print">
        <p>© {new Date().getFullYear()} {companyName}. All rights reserved.</p>
        <p className="text-[10px] text-slate-600">GT ERP Automated Credential Authentication Service</p>
      </footer>
    </div>
  );
}

