import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Download,
  RotateCw,
  Palette,
  CreditCard,
  QrCode,
  ShieldCheck,
  Sparkles,
  Sliders,
  Upload,
  Check,
  X,
  User,
  Phone,
  Building,
  Calendar,
  AlertCircle,
  ExternalLink,
  Copy
} from 'lucide-react';
import QrCodeSvg from '../common/QrCodeSvg';

const THEMES = {
  navy: {
    id: 'navy',
    name: 'Corporate Navy',
    primary: '#0369a1',
    headerBg: 'bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900',
    bannerBg: 'bg-sky-600',
    accentText: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-500/40',
    badge: 'bg-sky-100 text-sky-800 border-sky-300'
  },
  crimson: {
    id: 'crimson',
    name: 'GT Crimson',
    primary: '#e11d48',
    headerBg: 'bg-gradient-to-r from-neutral-950 via-rose-950 to-neutral-950',
    bannerBg: 'bg-rose-600',
    accentText: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/40',
    badge: 'bg-rose-100 text-rose-800 border-rose-300'
  },
  emerald: {
    id: 'emerald',
    name: 'Industrial Emerald',
    primary: '#059669',
    headerBg: 'bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-950',
    bannerBg: 'bg-emerald-600',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/40',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  },
  amber: {
    id: 'amber',
    name: 'Executive Amber',
    primary: '#d97706',
    headerBg: 'bg-gradient-to-r from-stone-950 via-amber-950 to-stone-950',
    bannerBg: 'bg-amber-600',
    accentText: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/40',
    badge: 'bg-amber-100 text-amber-800 border-amber-300'
  },
  dark: {
    id: 'dark',
    name: 'Carbon Obsidian',
    primary: '#38bdf8',
    headerBg: 'bg-gradient-to-r from-black via-zinc-900 to-black',
    bannerBg: 'bg-zinc-800',
    accentText: 'text-sky-400',
    border: 'border-zinc-700',
    badge: 'bg-zinc-800 text-zinc-100 border-zinc-600'
  }
};

/**
 * Deterministic Vector SVG Barcode generator
 */
function BarcodeSvg({ value, height = 36 }) {
  const bars = [];
  const seed = value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 17);
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
      <svg width={pos + 10} height={height} viewBox={`0 0 ${pos + 10} ${height}`} className="w-full max-w-[170px] h-7">
        {bars}
      </svg>
      <span className="font-mono text-[9px] tracking-widest text-slate-700 uppercase mt-0.5">{value}</span>
    </div>
  );
}

export default function IdCardModal({ isOpen, onClose, employee }) {
  if (!isOpen || !employee) return null;

  // Customization Options
  const [orientation, setOrientation] = useState('portrait'); // 'portrait' | 'landscape'
  const [themeKey, setThemeKey] = useState('navy');
  const [companyName, setCompanyName] = useState('GT PRINTING & PACKAGING PLC');
  const [cardTitle, setCardTitle] = useState('STAFF IDENTITY CARD');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [issueDate, setIssueDate] = useState(
    employee.hiredAt
      ? new Date(employee.hiredAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().split('T')[0];
  });
  const [customPhoto, setCustomPhoto] = useState(employee.profileImage || null);
  const [emergencyPhone, setEmergencyPhone] = useState(
    employee.emergency?.contactPhone || employee.phoneNumber || '+251 911 234 567'
  );

  useEffect(() => {
    if (employee) {
      setCustomPhoto(employee.profileImage || null);
      setEmergencyPhone(
        employee.emergency?.contactPhone || employee.phoneNumber || '+251 911 234 567'
      );
      if (employee.hiredAt) {
        setIssueDate(new Date(employee.hiredAt).toISOString().split('T')[0]);
      }
    }
  }, [employee]);

  // Toggles
  const [showBarcode, setShowBarcode] = useState(true);
  const [showQrCode, setShowQrCode] = useState(true);
  const [showNationalId, setShowNationalId] = useState(true);
  const [showBloodGroup, setShowBloodGroup] = useState(true);
  const [showHologram, setShowHologram] = useState(true);
  const [showLanyardSlot, setShowLanyardSlot] = useState(true);

  // Side view tab
  const [previewSide, setPreviewSide] = useState('both'); // 'both' | 'front' | 'back'
  const [printSide, setPrintSide] = useState('both'); // 'both' | 'front' | 'back'

  const currentTheme = THEMES[themeKey] || THEMES.navy;
  const employeeBadgeCode = employee.employeeCode || `GTE-${(employee._id || '').slice(-6).toUpperCase() || 'EMP901'}`;
  const verifyUrl = typeof window !== 'undefined'
    ? `${import.meta.env.VITE_FRONTEND_BASE_URL || window.location.origin}/verify-id/${employee._id || employeeBadgeCode}`
    : `/verify-id/${employee._id || employeeBadgeCode}`;

  const [copied, setCopied] = useState(false);
  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle Photo Upload on the fly
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setCustomPhoto(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Print Stylesheet Injection */}
      <style>{`
        @media print {
          @page {
            size: auto;
            margin: 8mm;
          }
          body * {
            visibility: hidden !important;
          }
          #id-card-print-area, #id-card-print-area * {
            visibility: visible !important;
          }
          #id-card-print-area {
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
        }
      `}</style>

      <div className="flex min-h-full items-center justify-center p-2 sm:p-4 text-center">
        <div
          className="relative w-full max-w-6xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left shadow-2xl transition-all max-h-[95vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                  Staff ID Card Generator & Print Studio
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  CR80 PVC Badge specification (85.6mm × 54mm) • Real-time customization for {employee.fullName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={verifyUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5"
                title="Open public verification page as scanned by QR code"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-500" />
                <span>Verify ID</span>
              </a>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print ID Card</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body: Split between Customizer Controls (Left) and Live Preview (Right) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: Customizer Controls (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  <Sliders className="w-4 h-4 text-primary-500" />
                  <span>Card Design & Themes</span>
                </div>

                {/* Orientation Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Card Orientation
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrientation('portrait')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                        orientation === 'portrait'
                          ? 'bg-primary-500 text-white border-primary-500 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Portrait (Vertical)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrientation('landscape')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                        orientation === 'landscape'
                          ? 'bg-primary-500 text-white border-primary-500 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Landscape (Horizontal)</span>
                    </button>
                  </div>
                </div>

                {/* Color Theme Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Brand Color Palette
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.values(THEMES).map((thm) => (
                      <button
                        key={thm.id}
                        type="button"
                        onClick={() => setThemeKey(thm.id)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                          themeKey === thm.id
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 ring-2 ring-primary-500'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                        }`}
                        title={thm.name}
                      >
                        <span className="w-5 h-5 rounded-full shadow-xs" style={{ backgroundColor: thm.primary }} />
                        <span className="text-[10px] font-semibold truncate w-full text-center">{thm.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Photo Override */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Employee Badge Photo
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-14 rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden border border-slate-300 dark:border-slate-600 shrink-0 flex items-center justify-center">
                      {customPhoto ? (
                        <img src={customPhoto} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <label className="flex-1 cursor-pointer py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-primary-500" />
                      <span>{customPhoto ? 'Change Photo' : 'Upload Badge Photo'}</span>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Data Customization Inputs */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  <Palette className="w-4 h-4 text-primary-500" />
                  <span>Card Text & Credentials</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Organization Header
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Badge Title
                    </label>
                    <input
                      type="text"
                      value={cardTitle}
                      onChange={(e) => setCardTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Blood Group
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'N/A'].map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Emergency Contact Phone
                    </label>
                    <input
                      type="text"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Issue Date
                    </label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                {/* Feature Toggles */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={showBarcode}
                      onChange={(e) => setShowBarcode(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-primary-500 focus:ring-primary-500"
                    />
                    <span>Barcode</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={showQrCode}
                      onChange={(e) => setShowQrCode(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-primary-500 focus:ring-primary-500"
                    />
                    <span>QR Code</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={showNationalId}
                      onChange={(e) => setShowNationalId(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-primary-500 focus:ring-primary-500"
                    />
                    <span>National / Kebele ID</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={showBloodGroup}
                      onChange={(e) => setShowBloodGroup(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-primary-500 focus:ring-primary-500"
                    />
                    <span>Blood Group</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={showHologram}
                      onChange={(e) => setShowHologram(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-primary-500 focus:ring-primary-500"
                    />
                    <span>Security Hologram</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={showLanyardSlot}
                      onChange={(e) => setShowLanyardSlot(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-primary-500 focus:ring-primary-500"
                    />
                    <span>Lanyard Cutout</span>
                  </label>
                </div>
              </div>

              {/* Instant Scan with Phone Camera */}
              <div className="p-4 rounded-2xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/70 dark:bg-sky-950/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-900 dark:text-sky-300 uppercase tracking-wider">
                    <QrCode className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>Scan With Mobile Camera</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                    Scannable
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-xl shadow-md border border-slate-200 shrink-0">
                    <QrCodeSvg text={verifyUrl} size={110} />
                  </div>
                  <div className="flex-1 space-y-2 text-left">
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                      Point your smartphone camera at this QR code to immediately open the <strong>Digital ID Card</strong>.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={verifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] inline-flex items-center gap-1 transition-colors shadow-xs"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open Page</span>
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] border border-slate-300 dark:border-slate-700 inline-flex items-center gap-1 transition-colors"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Live Interactive Preview & Print Canvas (7 cols) */}
            <div className="lg:col-span-7 flex flex-col items-center">
              {/* Preview Toggle Tabs */}
              <div className="flex items-center justify-between w-full max-w-lg mb-3">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewSide('both')}
                    className={`px-3 py-1 rounded-lg transition ${
                      previewSide === 'both' ? 'bg-white dark:bg-slate-900 text-primary-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Both Sides
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewSide('front')}
                    className={`px-3 py-1 rounded-lg transition ${
                      previewSide === 'front' ? 'bg-white dark:bg-slate-900 text-primary-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Front Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewSide('back')}
                    className={`px-3 py-1 rounded-lg transition ${
                      previewSide === 'back' ? 'bg-white dark:bg-slate-900 text-primary-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Back Only
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-semibold">Print:</span>
                  <select
                    value={printSide}
                    onChange={(e) => setPrintSide(e.target.value)}
                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="both">Both Sides</option>
                    <option value="front">Front Only</option>
                    <option value="back">Back Only</option>
                  </select>
                </div>
              </div>

              {/* CARD PREVIEW CONTAINER & PRINT TARGET */}
              <div
                id="id-card-print-area"
                className={`w-full flex ${
                  orientation === 'portrait'
                    ? 'flex-col sm:flex-row items-center justify-center gap-6'
                    : 'flex-col items-center justify-center gap-6'
                }`}
              >
                {/* -------------------- FRONT SIDE -------------------- */}
                {(previewSide === 'both' || previewSide === 'front') && (printSide === 'both' || printSide === 'front') && (
                  <div
                    className={`id-card-container relative bg-white text-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-300 shrink-0 select-none ${
                      orientation === 'portrait' ? 'w-[300px] h-[460px]' : 'w-[440px] h-[276px]'
                    }`}
                    style={{
                      // Standard CR80 aspect ratio
                      boxSizing: 'border-box'
                    }}
                  >
                    {/* Optional Lanyard Punch hole representation */}
                    {showLanyardSlot && (
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-2 bg-slate-300/80 rounded-full border border-slate-400/50 z-20 shadow-inner" />
                    )}

                    {/* PORTRAIT FRONT LAYOUT */}
                    {orientation === 'portrait' && (
                      <div className="flex flex-col h-full">
                        {/* Header Banner */}
                        <div className={`${currentTheme.headerBg} pt-5 pb-3 px-4 text-white text-center relative shadow-sm`}>
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <img src="/gt-logo.jpg" alt="Logo" className="w-6 h-6 object-contain rounded-md bg-white p-0.5" />
                            <span className="font-black text-[12px] tracking-tight uppercase leading-tight">
                              {companyName}
                            </span>
                          </div>
                          <div className="text-[9px] font-bold tracking-widest text-sky-200 uppercase">
                            {cardTitle}
                          </div>
                        </div>

                        {/* Top Accent Strip */}
                        <div className={`h-1.5 ${currentTheme.bannerBg} w-full`} />

                        {/* Body Details */}
                        <div className="flex-1 p-4 flex flex-col items-center justify-between text-center bg-radial from-slate-50 to-white">
                          {/* Photo Avatar */}
                          <div className="relative mt-1">
                            <div className="w-24 h-28 rounded-xl overflow-hidden border-2 border-slate-800 shadow-md bg-slate-100 flex items-center justify-center">
                              {customPhoto ? (
                                <img src={customPhoto} alt={employee.fullName} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-12 h-12 text-slate-300" />
                              )}
                            </div>
                            {showHologram && (
                              <div
                                className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-linear-to-tr from-amber-400 via-rose-300 to-sky-400 border border-white shadow-md flex items-center justify-center"
                                title="Tamper-evident holographic credential"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-slate-900" />
                              </div>
                            )}
                          </div>

                          {/* Name & Title */}
                          <div className="mt-2 space-y-0.5">
                            <h2 className="font-black text-base text-slate-900 leading-tight uppercase">
                              {employee.fullName}
                            </h2>
                            <p className="font-bold text-xs text-sky-700 uppercase">
                              {employee.position}
                            </p>
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {employee.department} • {employee.branch || 'Main Plant'}
                            </span>
                          </div>

                          {/* Info Grid */}
                          <div className="w-full grid grid-cols-2 gap-1.5 px-2 text-[10px] text-left border-y border-slate-100 py-2">
                            <div>
                              <span className="text-slate-400 block text-[8px] uppercase font-bold">Staff ID</span>
                              <span className="font-mono font-bold text-slate-800">{employeeBadgeCode}</span>
                            </div>
                            {showNationalId && (
                              <div>
                                <span className="text-slate-400 block text-[8px] uppercase font-bold">National ID</span>
                                <span className="font-mono font-bold text-slate-800 truncate block">
                                  {employee.nationalId || 'N/A'}
                                </span>
                              </div>
                            )}
                            <div>
                              <span className="text-slate-400 block text-[8px] uppercase font-bold">Issued</span>
                              <span className="font-semibold text-slate-700">{issueDate}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[8px] uppercase font-bold">Expires</span>
                              <span className="font-semibold text-rose-600 font-mono">{expiryDate}</span>
                            </div>
                          </div>

                          {/* Barcode / QR */}
                          <div className="w-full flex items-center justify-center gap-3 pt-1">
                            {showBarcode && <BarcodeSvg value={employeeBadgeCode} height={24} />}
                            {showQrCode && <QrCodeSvg text={verifyUrl} size={46} />}
                          </div>
                        </div>

                        {/* Footer color strip */}
                        <div className={`py-1 ${currentTheme.headerBg} text-center`}>
                          <span className="text-[8px] font-bold text-slate-300 tracking-wider">
                            OFFICIAL AUTHORIZED PERSONNEL
                          </span>
                        </div>
                      </div>
                    )}

                    {/* LANDSCAPE FRONT LAYOUT */}
                    {orientation === 'landscape' && (
                      <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className={`${currentTheme.headerBg} pt-3 pb-2 px-5 text-white flex items-center justify-between`}>
                          <div className="flex items-center gap-2">
                            <img src="/gt-logo.jpg" alt="Logo" className="w-5 h-5 object-contain rounded bg-white p-0.5" />
                            <span className="font-black text-xs tracking-tight uppercase">{companyName}</span>
                          </div>
                          <span className="text-[9px] font-bold text-sky-200 tracking-widest uppercase">
                            {cardTitle}
                          </span>
                        </div>
                        <div className={`h-1 ${currentTheme.bannerBg} w-full`} />

                        {/* Body 2 Columns */}
                        <div className="flex-1 p-3.5 flex items-center gap-4 bg-linear-to-b from-slate-50 to-white">
                          {/* Left Column: Photo */}
                          <div className="flex flex-col items-center shrink-0">
                            <div className="w-24 h-28 rounded-xl overflow-hidden border-2 border-slate-800 shadow-md bg-slate-100 flex items-center justify-center">
                              {customPhoto ? (
                                <img src={customPhoto} alt={employee.fullName} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-10 h-10 text-slate-300" />
                              )}
                            </div>
                            <span className="font-mono text-[9px] font-bold text-slate-600 mt-1">
                              {employeeBadgeCode}
                            </span>
                          </div>

                          {/* Right Column: Information */}
                          <div className="flex-1 space-y-1.5 text-left">
                            <div>
                              <h2 className="font-black text-base text-slate-900 leading-tight uppercase">
                                {employee.fullName}
                              </h2>
                              <p className="font-bold text-xs text-sky-700 uppercase">{employee.position}</p>
                              <p className="text-[10px] text-slate-500 font-medium">
                                {employee.department} • {employee.branch || 'Main Plant'}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-1 text-[10px] border-t border-slate-100 pt-1.5">
                              {showNationalId && (
                                <div>
                                  <span className="text-slate-400 block text-[8px] uppercase font-bold">National ID</span>
                                  <span className="font-mono font-bold text-slate-800">{employee.nationalId || 'N/A'}</span>
                                </div>
                              )}
                              {showBloodGroup && (
                                <div>
                                  <span className="text-slate-400 block text-[8px] uppercase font-bold">Blood Group</span>
                                  <span className="font-bold text-rose-600">{bloodGroup}</span>
                                </div>
                              )}
                              <div>
                                <span className="text-slate-400 block text-[8px] uppercase font-bold">Valid Until</span>
                                <span className="font-semibold text-slate-700">{expiryDate}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[8px] uppercase font-bold">Staff ID</span>
                                <span className="font-bold text-slate-800">{employeeBadgeCode}</span>
                              </div>
                            </div>

                            {/* Barcode or QR */}
                            <div className="pt-1 flex items-center justify-between">
                              {showBarcode && <BarcodeSvg value={employeeBadgeCode} height={20} />}
                              {showQrCode && <QrCodeSvg text={verifyUrl} size={48} />}
                            </div>
                          </div>
                        </div>

                        {/* Footer Strip */}
                        <div className={`py-0.5 ${currentTheme.headerBg} text-center`}>
                          <span className="text-[8px] font-bold text-slate-300 tracking-wider">
                            GT ENTERPRISE AUTHORIZED IDENTITY PASS
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* -------------------- BACK SIDE -------------------- */}
                {(previewSide === 'both' || previewSide === 'back') && (printSide === 'both' || printSide === 'back') && (
                  <div
                    className={`id-card-container relative bg-white text-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-300 shrink-0 select-none flex flex-col ${
                      orientation === 'portrait' ? 'w-[300px] h-[460px]' : 'w-[440px] h-[276px]'
                    }`}
                  >
                    {/* Optional Lanyard Punch hole */}
                    {showLanyardSlot && (
                      <div
                        className={`absolute left-1/2 -translate-x-1/2 bg-slate-300/80 rounded-full border border-slate-400/50 z-20 shadow-inner ${
                          orientation === 'portrait' ? 'top-2 w-10 h-2' : 'top-1.5 w-8 h-1.5'
                        }`}
                      />
                    )}

                    {/* PORTRAIT BACK LAYOUT */}
                    {orientation === 'portrait' && (
                      <div className="flex flex-col h-full justify-between">
                        {/* Magnetic Stripe representation */}
                        <div className={`w-full h-6 bg-slate-900 shrink-0 ${showLanyardSlot ? 'mt-5' : 'mt-2.5'}`} />

                        <div className="p-3.5 flex flex-col justify-between flex-1 overflow-hidden text-left text-xs bg-linear-to-b from-slate-50 to-white">
                          {/* Terms & Return Information */}
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

                            {/* Emergency Contact */}
                            <div className="grid grid-cols-2 gap-2 text-[9.5px] pt-1.5 border-t border-slate-100">
                              <div>
                                <span className="text-slate-400 block text-[8px] uppercase font-bold">Emergency Phone</span>
                                <span className="font-mono font-bold text-slate-800 text-[10px]">{emergencyPhone}</span>
                              </div>
                              {showBloodGroup && (
                                <div>
                                  <span className="text-slate-400 block text-[8px] uppercase font-bold">Medical / Blood</span>
                                  <span className="font-bold text-rose-600 text-[10px]">{bloodGroup}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* QR Code and Signatures */}
                          <div className="flex items-end justify-between pt-2 border-t border-slate-200">
                            {showQrCode ? (
                              <div className="flex items-center gap-2">
                                <QrCodeSvg
                                  text={verifyUrl}
                                  size={54}
                                />
                                <div className="text-[8px] text-slate-500 leading-tight">
                                  <span className="font-bold block text-slate-700">Scan to verify</span>
                                  GT ERP Secure
                                  <br />
                                  HR Registry
                                </div>
                              </div>
                            ) : (
                              <div className="text-[9px] font-mono text-slate-400">GT-SECURITY-SYSTEMS</div>
                            )}

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

                        {/* Footer color strip */}
                        <div className={`py-1 ${currentTheme.headerBg} text-center shrink-0`}>
                          <span className="text-[8px] font-bold text-slate-300 tracking-wider">
                            GT ENTERPRISE AUTHORIZED IDENTITY PASS
                          </span>
                        </div>
                      </div>
                    )}

                    {/* LANDSCAPE BACK LAYOUT */}
                    {orientation === 'landscape' && (
                      <div className="flex flex-col h-full justify-between">
                        {/* Magnetic Stripe representation */}
                        <div className={`w-full h-5 bg-slate-900 shrink-0 ${showLanyardSlot ? 'mt-4' : 'mt-1.5'}`} />

                        <div className="flex-1 p-2.5 flex gap-3 text-left overflow-hidden bg-linear-to-b from-slate-50 to-white">
                          {/* Left Column: Terms, Return Info, Emergency */}
                          <div className="flex-1 flex flex-col justify-between overflow-hidden">
                            {/* Terms */}
                            <div className="text-[8px] text-slate-600 leading-tight">
                              <strong className="text-slate-800">TERMS OF USE:</strong> This credential is the exclusive property of{' '}
                              <span className="font-bold text-slate-900">{companyName}</span>. Must be displayed on premises at all times and surrendered upon end of employment.
                            </div>

                            {/* Return Info Box */}
                            <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-[8px] space-y-0.5 shadow-xs">
                              <div className="font-bold text-slate-800 flex items-center gap-1">
                                <AlertCircle className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                                <span>IF FOUND, PLEASE RETURN TO:</span>
                              </div>
                              <div className="text-slate-600 pl-3.5 space-y-0.5 text-[7.5px] leading-tight">
                                <div>HR & Administration Directorate</div>
                                <div>GT Printing & Packaging Plant, Addis Ababa</div>
                                <div className="font-mono text-slate-800 font-semibold">Hotline: +251 911 234 567</div>
                              </div>
                            </div>

                            {/* Emergency & Blood Group */}
                            <div className="grid grid-cols-2 gap-2 text-[8px] pt-1 border-t border-slate-200">
                              <div>
                                <span className="text-slate-400 block text-[7px] uppercase font-bold">Emergency Contact</span>
                                <span className="font-mono font-bold text-slate-800 text-[8.5px]">{emergencyPhone}</span>
                              </div>
                              {showBloodGroup && (
                                <div>
                                  <span className="text-slate-400 block text-[7px] uppercase font-bold">Blood Group</span>
                                  <span className="font-bold text-rose-600 text-[8.5px]">{bloodGroup}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right Column: Credential ID, QR Code, Signatory */}
                          <div className="w-36 shrink-0 border-l border-slate-200 pl-2.5 flex flex-col justify-between">
                            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                              <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">Credential ID</span>
                              <span className="font-mono font-bold text-slate-800 text-[8.5px]">{employeeBadgeCode}</span>
                            </div>

                            <div className="flex items-center gap-2 py-1 my-auto">
                              {showQrCode ? (
                                <>
                                  <QrCodeSvg
                                    text={verifyUrl}
                                    size={50}
                                  />
                                  <div className="text-[7.5px] text-slate-500 leading-tight">
                                    <span className="font-bold text-slate-700 block">Scan to verify</span>
                                    GT ERP Secure
                                    <br />
                                    Registry
                                  </div>
                                </>
                              ) : (
                                <div className="text-[8px] font-mono text-slate-400">GT-SECURITY</div>
                              )}
                            </div>

                            <div className="text-center pt-1 border-t border-slate-200">
                              <div className="w-24 mx-auto border-b border-slate-400 pb-0.5 mb-0.5 font-serif italic text-slate-600 text-[9.5px]">
                                Authorized HR
                              </div>
                              <span className="text-[7px] font-bold text-slate-500 uppercase tracking-wider block">
                                Authorized Signatory
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Footer Strip */}
                        <div className={`py-0.5 ${currentTheme.headerBg} text-center shrink-0`}>
                          <span className="text-[7.5px] font-bold text-slate-300 tracking-wider">
                            PROPERTY OF GT ENTERPRISE • AUTHORIZED IDENTITY PASS
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
