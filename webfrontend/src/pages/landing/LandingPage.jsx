import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Factory,
  Boxes,
  Users,
  ShoppingCart,
  Landmark,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sun,
  Moon,
  Menu,
  X,
  Sparkles,
  Search,
  ChevronRight,
  Briefcase,
  Activity,
  Building2
} from 'lucide-react';

export default function LandingPage() {
  const { t, lang, setLanguage } = useTranslation();
  const { user, token } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [verifyIdInput, setVerifyIdInput] = useState('');
  const [activeTab, setActiveTab] = useState('production');

  const isAuthenticated = Boolean(token && user);

  const handleVerifySubmit = (e) => {
    e.preventDefault();
    const cleanId = verifyIdInput.trim();
    if (cleanId) {
      navigate(`/verify-id/${encodeURIComponent(cleanId)}`);
    }
  };

  const modules = [
    {
      id: 'production',
      icon: Factory,
      name: lang === 'am' ? 'የማምረቻና ማሽነሪ ኦፕሬሽን' : 'Production Floor & Machinery',
      subtitle: lang === 'am' ? 'ኦፍሴት፣ ዲጂታል፣ መቁረጫና ባይንዲንግ መስመር' : 'Offset, Digital, Cutters & Finishing Lines',
      color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
      description: lang === 'am'
        ? 'የህትመት ማሽኖች የስራ መርሃ-ግብር፣ የቀን ተቀን የፍተሻ ቼክሊስት፣ የማሽን ብልሽት ምዝገባ እና የእውነተኛ ጊዜ የወረቀትና ቀለም ብክነት ቁጥጥር።'
        : 'Plant machinery registry with hourly run-rates, stage-based job routing (Pre-press, Offset, Die-Cut, UV, Binding), daily checkup logs, and live wastage capture.',
      highlights: [
        lang === 'am' ? 'የስራ ቅደም-ተከተል መከታተያ (Job Routing)' : 'Multi-stage production job orders & shop routing',
        lang === 'am' ? 'የማሽን ፍተሻና የጥገና መዝገብ' : 'Preventive maintenance & shift checkup checklists',
        lang === 'am' ? 'የወረቀትና የቀለም ብክነት ቅነሳ' : 'Trim scrap, setup spoils & defect tracking'
      ]
    },
    {
      id: 'store',
      icon: Boxes,
      name: lang === 'am' ? 'የወረቀትና ጥሬ ዕቃ መጋዘን' : 'Paper Stock & Store Inventory',
      subtitle: lang === 'am' ? 'የወረቀት ጂኤስኤም፣ ሪም፣ ቀለምና ፕሌት ክምችት' : 'GSM, Caliper, Reams, Rolls, Inks & CTP Plates',
      color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
      description: lang === 'am'
        ? 'የወረቀት መጠን (GSM፣ ስፋትና ርዝመት)፣ የቀለም ቆሳቆስ፣ የሲቲፒ ፕሌትና የማሸጊያ ጥሬ እቃዎች ክምችት በበርካታ መጋዘኖች ውስጥ በቅጽበት መከታተያ።'
        : 'Raw material inventory categorized by Paper GSM, caliper dimensions, reams, and rolls. Features inward GRV, direct store issuance (SIV), and staff returns.',
      highlights: [
        lang === 'am' ? 'የወረቀት ክምችት በስፋትና በክብደት (GSM)' : 'Paper sizing (64x90, 70x100) & GSM matrix',
        lang === 'am' ? 'የገቢ ዕቃ ሰነድ (GRV) እና የወጪ ሰነድ (SIV)' : 'Inward GRV & Outward Shop Requisitioning',
        lang === 'am' ? 'አነስተኛ የክምችት መጠን ማስጠንቀቂያ' : 'Automated low-stock threshold alerts'
      ]
    },
    {
      id: 'crm',
      icon: TrendingUp,
      name: lang === 'am' ? 'የደንበኞችና የህትመት ትዕዛዝ' : 'CRM & Dynamic Print Estimator',
      subtitle: lang === 'am' ? 'ፈጣን የዋጋ ስሌትና የንድፍ ማረጋገጫ' : 'Dynamic Cost Rollup & Pre-Press Proofing',
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
      description: lang === 'am'
        ? 'የደንበኞች መረጃ፣ የህትመት ዋጋ ስሌት (የወረቀት ብዛት፣ የቀለም ሽፋንና የማሽን ሰዓት) እና የንድፍ ማረጋገጫ (Design Proofing) ማጽደቂያ የስራ ፍሰት።'
        : 'Automated print quotation calculator factoring paper weight, machine run hours, and finishing. Closed-loop pre-press design proofing preventing unapproved runs.',
      highlights: [
        lang === 'am' ? 'የካንባን (Kanban) የሽያጭ መከታተያ' : 'Lead acquisition pipeline with discussion logs',
        lang === 'am' ? 'የተሟላ የንድፍ ማረጋገጫ (Artwork Proofing)' : 'Client artwork approval workflow with revision tracking',
        lang === 'am' ? 'የፕሮፎርማና የታክስ ደረሰኝ ማመንጨት' : 'Instant Proforma and 15% VAT Tax Invoice generation'
      ]
    },
    {
      id: 'finance',
      icon: Landmark,
      name: lang === 'am' ? 'ፋይናንስና ድርብ መዝገብ ሂሳብ' : 'General Ledger & Ethiopian Tax',
      subtitle: lang === 'am' ? '15% ተጨማሪ እሴት ታክስ፣ ዊዝሆልዲንግና ጆርናል' : 'Double-Entry GL, Treasury, AP/AR & VAT',
      color: 'from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400',
      description: lang === 'am'
        ? 'ከሽያጭ፣ ግዢ፣ ደመወዝና ስቶር በቀጥታ የሚመነጭ የተሟላ የሂሳብ መዝገብ (Chart of Accounts)፣ የትርፍና ኪሳራ መግለጫ እና የኢትዮጵያ ታክስ አሰራር።'
        : 'Strict double-entry ledger with automatic journal postings triggered from Sales, Purchasing, and Store issuance. Compliant with Ethiopian VAT (15%) and Withholding rules.',
      highlights: [
        lang === 'am' ? 'አውቶማቲክ ድርብ መዝገብ (Journal Entries)' : 'Automated balanced double-entry accounting',
        lang === 'am' ? 'የትርፋማነት ትንተና ለእያንዳንዱ ትዕዛዝ' : 'Job-order profitability & gross margin rollup',
        lang === 'am' ? 'የባንክና የጥሬ ገንዘብ ማስታረቂያ (Reconciliation)' : 'Treasury, bank accounts & cash flow tracking'
      ]
    },
    {
      id: 'hr',
      icon: Users,
      name: lang === 'am' ? 'የሰው ኃይልና የደመወዝ ክፍያ' : 'HR, Biometrics & Payroll',
      subtitle: lang === 'am' ? 'የፎቶ ሰልፊ መግቢያ፣ ፈቃድና የኢትዮጵያ ፔንሲዮን' : 'Selfie Clock-in, Leave, Pension & Income Tax',
      color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400',
      description: lang === 'am'
        ? 'የሰራተኞች መረጃ ቋት፣ በፎቶ ሰልፊና ጂፒኤስ የሚረጋገጥ የሰዓት መግቢያ፣ የፈቃድ አስተዳደር፣ እና የኢትዮጵያ የስራ ግብርና ፔንሲዮን (7%/11%) ደመወዝ ስሌት።'
        : 'Employee directory, verified photo/geo attendance, automated leave requests, and compliant payroll processing with Ethiopian tax brackets and 7%/11% pensions.',
      highlights: [
        lang === 'am' ? 'በፎቶ ሰልፊ የተረጋገጠ የሥራ መግቢያ' : 'Selfie & GPS verified attendance clock-in',
        lang === 'am' ? 'የኢትዮጵያ የስራ ግብርና የጡረታ ስሌት' : 'Automated Ethiopian income tax & pension calculation',
        lang === 'am' ? 'የሰራተኛ መታወቂያ ባጅ በQR ኮድ' : 'Digital employee ID badges with QR verification'
      ]
    },
    {
      id: 'purchasing',
      icon: ShoppingCart,
      name: lang === 'am' ? 'ግዢና የአቅራቢዎች አስተዳደር' : 'Procurement & Vendor Ops',
      subtitle: lang === 'am' ? 'የወረቀት ግዢ ጥያቄ፣ ፒኦ (PO) እና የብድር ዕዳ' : 'Purchase Orders, Vendor AP & Receiving',
      color: 'from-amber-600/20 to-yellow-500/10 border-amber-600/30 text-amber-600 dark:text-amber-500',
      description: lang === 'am'
        ? 'የወረቀትና ጥሬ እቃ ግዢ ጥያቄዎች (PR)፣ የዋጋ ማወዳደሪያ፣ የግዢ ትዕዛዝ (PO)፣ እና የአቅራቢዎች የብድር ዕዳ ክፍያ ቁጥጥር።'
        : 'End-to-end procurement pipeline connecting purchase requisitions with supplier quotes, PO authorizations, Goods Receipt verification, and AP aging schedules.',
      highlights: [
        lang === 'am' ? 'የግዢ ጥያቄዎችና የማጽደቅ ሂደት' : 'Purchase Requisitions (PR) & multi-tier approval',
        lang === 'am' ? 'የአቅራቢዎች የብድር ቆይታ (Aging Report)' : 'Accounts Payable aging & supplier ledger',
        lang === 'am' ? 'የተጎዱ እቃዎች መልስ (Supplier Returns)' : 'Supplier return tracking & credit adjustments'
      ]
    }
  ];

  const currentModule = modules.find((m) => m.id === activeTab) || modules[0];

  const workflowSteps = [
    {
      num: '01',
      title: lang === 'am' ? 'የጥያቄ ምዝገባና ዋጋ ስሌት' : 'Specs & Dynamic Estimation',
      desc: lang === 'am' ? 'የደንበኛ ፍላጎት (የወረቀት GSM፣ መጠን፣ ቀለማት) በስርዓቱ ተሰልቶ የወረቀትና የቀለም ወጪ በቅጽበት ይወጣል።' : 'Calculate exact paper sheets, ink coverage, machine hours, and gross profit margin before quotation.'
    },
    {
      num: '02',
      title: lang === 'am' ? 'የንድፍ ማረጋገጫ (Pre-press)' : 'Artwork Proofing & Sign-off',
      desc: lang === 'am' ? 'የህትመት ንድፉ በሲስተሙ ተጭኖ በደንበኛው ዲጂታል ማረጋገጫ ሳያገኝ ወደ ማተሚያ ማሽን አይላክም።' : 'Closed-loop digital proof approval ensures unapproved artwork never reaches the press floor.'
    },
    {
      num: '03',
      title: lang === 'am' ? 'የጥሬ ዕቃ ወጪ ሰነድ (SIV)' : 'Warehouse Material Issuance',
      desc: lang === 'am' ? 'ለስራው የሚያስፈልገው የወረቀት ሪሞችና ቀለሞች ከመጋዘን በስራ ቁጥሩ (Job ID) ወጪ ተደርገው ይመዘገባሉ።' : 'Storekeepers release exact paper reams, CTP plates, and inks tied to the production order.'
    },
    {
      num: '04',
      title: lang === 'am' ? 'የማሽን ምርትና ብክነት ክትትል' : 'Machine Execution & Scrap Log',
      desc: lang === 'am' ? 'በኦፍሴት ወይም በዲጂታል ማሽን ሲታተም የሚፈጠረው የቆረጣ (Trim) እና የብልሽት ብክነት በእውነተኛ ጊዜ ይመዘገባል።' : 'Track impressions per hour, operator shifts, cutting stages, and trim scrap in real-time.'
    },
    {
      num: '05',
      title: lang === 'am' ? 'የጥራት ቁጥጥርና ማሸግ' : 'Finishing & Quality Control',
      desc: lang === 'am' ? 'ባይንዲንግ፣ ላሚኔሽንና ማሸግ ተጠናቆ የተፈተሸው የተጠናቀቀ ምርት ወደ ደንበኛ ርክክብ ይዘጋጃል።' : 'Lamination, folding, die-cut, and binding inspection before dispatch to the customer.'
    },
    {
      num: '06',
      title: lang === 'am' ? 'የ15% ታክስ ደረሰኝና ጆርናል' : 'Tax Invoicing & GL Posting',
      desc: lang === 'am' ? 'የህጋዊ 15% ቫት ታክስ ደረሰኝ ወጥቶ በድርብ መዝገብ ሂሳብ ላይ አውቶማቲክ ጆርናል ይመዘገባል።' : 'Issue compliant 15% VAT invoices while balanced double-entry journals post automatically.'
    }
  ];

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors antialiased selection:bg-primary-500 selection:text-white">
      {/* ========================================================
          1. HEADER / NAVIGATION (Compliant with modern-web-guidance)
      ======================================================== */}
      <header className="site-header sticky top-0 z-50 backdrop-blur-md bg-white/90 dark:bg-slate-950/90 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-xl p-1">
            <div className="relative p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs group-hover:scale-105 transition-transform">
              <img
                src="/gt-logo.jpg"
                alt="GT ERP Logo"
                className="h-9 w-9 sm:h-11 sm:w-11 rounded-lg object-contain"
                width="44"
                height="44"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  GT ERP
                </span>
                <span className="hidden xs:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                  Print & Pack
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {lang === 'am' ? 'የማተሚያ ቤት አስተዳደር ሥርዓት' : 'Industrial Printing OS'}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 font-medium text-sm text-slate-600 dark:text-slate-300" aria-label="Primary">
            <a
              href="#modules"
              className="px-3 py-2 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 transition"
            >
              {t('landing.navModules', 'Modules')}
            </a>
            <a
              href="#workflow"
              className="px-3 py-2 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 transition"
            >
              {t('landing.navWorkflow', 'Workflow')}
            </a>
            <a
              href="#verification"
              className="px-3 py-2 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 transition"
            >
              {t('landing.verifyStaffBadge', 'Verify ID')}
            </a>
            <Link
              to="/careers"
              className="px-3 py-2 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 transition flex items-center gap-1.5"
            >
              <span>{t('landing.exploreCareers', 'Careers')}</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </Link>
          </nav>

          {/* Controls & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLanguage(lang === 'en' ? 'am' : 'en')}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 shadow-2xs transition focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Toggle language between English and Amharic"
            >
              {lang === 'en' ? '🇪🇹 አማርኛ' : '🇬🇧 EN'}
            </button>

            {/* Dark/Light Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-2xs transition focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Toggle visual theme"
            >
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Primary Action Button */}
            {isAuthenticated ? (
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs hover:shadow-md transition active:scale-98"
              >
                <span>{t('landing.goToDashboard', 'Dashboard')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-primary-600 hover:bg-primary-500 shadow-xs hover:shadow-md transition active:scale-98"
              >
                <span>{t('landing.signIn', 'Portal Login')}</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Popover */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-2 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
            <a
              href="#modules"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t('landing.navModules', 'Modules')}
            </a>
            <a
              href="#workflow"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t('landing.navWorkflow', 'Workflow')}
            </a>
            <a
              href="#verification"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t('landing.verifyStaffBadge', 'Verify ID')}
            </a>
            <Link
              to="/careers"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t('landing.exploreCareers', 'Public Careers')}
            </Link>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              {isAuthenticated ? (
                <Link
                  to="/"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white bg-emerald-600"
                >
                  {t('landing.goToDashboard', 'Dashboard')}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white bg-primary-600"
                >
                  {t('landing.signIn', 'Portal Login')}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ========================================================
          2. HERO SECTION
      ======================================================== */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-28">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary-500/10 dark:bg-primary-500/15 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-10 w-[300px] h-[250px] bg-amber-500/10 rounded-full blur-2xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200/80 dark:border-primary-800/80 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-primary-500" />
              <span>{t('landing.badge', 'Industrial Printing & Packaging ERP')}</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              {lang === 'am' ? (
                <>
                  ከጥሬ ወረቀት እስከ የተጠናቀቀ ማሸጊያ፡{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-indigo-600 to-amber-600">
                    ሙሉ የማተሚያ ቤት ኦፕሬሽን
                  </span>
                </>
              ) : (
                <>
                  From Paper Stock to Finished Box:{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-indigo-600 to-amber-600">
                    Unified Precision ERP
                  </span>
                </>
              )}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              {t(
                'landing.heroSubtitle',
                'Engineered specifically for offset presses, digital plants, carton converters, and finishing houses. Unify dynamic GSM calculations, pre-press proofing, machine routing, and Ethiopian tax accounting.'
              )}
            </p>

            {/* Call to Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {isAuthenticated ? (
                <Link
                  to="/"
                  className="px-6 py-3.5 rounded-2xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-98 shadow-md hover:shadow-lg transition flex items-center gap-2"
                >
                  <Activity className="w-4 h-4" />
                  <span>{t('landing.goToDashboard', 'Go to Dashboard')}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="px-6 py-3.5 rounded-2xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-500 active:scale-98 shadow-md hover:shadow-lg transition flex items-center gap-2"
                >
                  <Building2 className="w-4 h-4" />
                  <span>{t('landing.enterPortal', 'Enter Enterprise Portal')}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}

              <Link
                to="/careers"
                className="px-5 py-3.5 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-xs transition flex items-center gap-2"
              >
                <Briefcase className="w-4 h-4 text-emerald-500" />
                <span>{t('landing.exploreCareers', 'Public Careers')}</span>
              </Link>
            </div>
          </div>

          {/* ========================================================
              HERO LIVE DIGITAL PLANT MOCK CARD
          ======================================================== */}
          <div className="mt-12 sm:mt-16 max-w-5xl mx-auto rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-2xl overflow-hidden">
            {/* Card Window Bar */}
            <div className="px-4 py-3 bg-slate-100/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                <span className="ml-2 text-xs font-mono text-slate-500 font-semibold">
                  gt-erp-plant-console :: live-feed
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ONLINE
                </span>
                <span className="text-[11px] font-mono text-slate-400">Addis Ababa, ET</span>
              </div>
            </div>

            {/* Dashboard Mock Widgets Grid */}
            <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 bg-slate-50/50 dark:bg-slate-950/50">
              {/* Widget 1: Machine Speed & Active Press Run */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Press 01 • Heidelberg SM-74</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                    Running
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">8,950 <span className="text-xs font-semibold text-slate-400">imp/hr</span></div>
                  <div className="text-xs text-slate-500 mt-0.5">Job: #ORD-2026-104 (Magazine Cover 250 GSM)</div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    <span>Target: 25,000</span>
                    <span className="text-primary-600 dark:text-primary-400">82% Done</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 rounded-full w-[82%]" />
                  </div>
                </div>
              </div>

              {/* Widget 2: Paper Stock & Ream Inventory */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Warehouse Raw Stock</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    Sufficient
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">1,420 <span className="text-xs font-semibold text-slate-400">Reams</span></div>
                  <div className="text-xs text-slate-500 mt-0.5">Art Paper 150 GSM (70x100 cm)</div>
                </div>
                <div className="text-[11px] grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Boxboard 300 GSM</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">620 Reams</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Cyan/Magenta Inks</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">48 Canisters</span>
                  </div>
                </div>
              </div>

              {/* Widget 3: Ethiopian Financial Compliance & Profitability */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Financial Ledger (ETB)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                    VAT 15% Verified
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">ETB 486,200</div>
                  <div className="text-xs text-slate-500 mt-0.5">Est. Gross Margin: <span className="font-bold text-emerald-600">38.4%</span></div>
                </div>
                <div className="text-[11px] space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Tax Withholding (2%):</span>
                    <span className="font-mono font-semibold">ETB 9,724</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pension Remittance:</span>
                    <span className="font-mono font-semibold text-emerald-600">7% / 11% Posted</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          3. METRICS / STATS BAR
      ======================================================== */}
      <section className="border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 py-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-primary-600 dark:text-primary-400">100%</div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {t('landing.statsTraceability', 'Material Traceability')}
              </div>
              <div className="text-[11px] text-slate-500">{t('landing.statsTraceabilitySub', 'From raw ream to delivered box')}</div>
            </div>

            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">15% VAT</div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {t('landing.statsTax', 'Ethiopian Tax Compliance')}
              </div>
              <div className="text-[11px] text-slate-500">{t('landing.statsTaxSub', '15% VAT & Withholding built-in')}</div>
            </div>

            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">&lt; 3.2%</div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {t('landing.statsEfficiency', 'Production Efficiency')}
              </div>
              <div className="text-[11px] text-slate-500">{t('landing.statsEfficiencySub', 'Live machine speeds & scrap logs')}</div>
            </div>

            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">EN + አማ</div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {t('landing.statsLanguages', 'Bilingual Platform')}
              </div>
              <div className="text-[11px] text-slate-500">{t('landing.statsLanguagesSub', 'English and Amharic native')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          4. INTERACTIVE 6-MODULE SHOWCASE
      ======================================================== */}
      <section id="modules" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            {t('landing.navModules', 'Core Modules')}
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t('landing.modulesTitle', 'Integrated Operational Modules')}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            {t(
              'landing.modulesSubtitle',
              'Tailored for printing press manufacturing, pre-press, shop floor, inventory, and finance'
            )}
          </p>
        </div>

        {/* Module Switcher Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {modules.map((m) => {
            const isSelected = activeTab === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setActiveTab(m.id)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <m.icon className="w-4 h-4" />
                <span>{m.name}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Module Detail Banner */}
        <div className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <currentModule.icon className="w-3.5 h-3.5" />
              <span>{currentModule.subtitle}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {currentModule.name}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {currentModule.description}
            </p>
            <div className="space-y-2 pt-2">
              {currentModule.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className={`p-6 rounded-2xl bg-gradient-to-br ${currentModule.color} border space-y-4`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500">Feature Spotlight</span>
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {lang === 'am' ? 'የተዋሃደ የስራ ፍሰት' : 'Zero Information Silos'}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {lang === 'am'
                  ? 'እያንዳንዱ እርምጃ ከቀጣዩ ክፍል ጋር ተሳስሮ ይሰራል - የሽያጭ ትዕዛዝ ወዲያውኑ የወረቀት ፍላጎትን ለስቶር ያሳውቃል፣ የማሽን ስራ ሲጠናቀቅ ደግሞ ፋይናንስ ደረሰኝ ያዘጋጃል።'
                  : 'Automated inter-department routing: Order confirmation triggers warehouse paper reservations; machine run completions trigger finished goods receipt and journal postings.'}
              </p>
              <div className="pt-2">
                <Link
                  to={isAuthenticated ? '/' : '/login'}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
                >
                  <span>{isAuthenticated ? t('landing.goToDashboard', 'Open Dashboard') : t('landing.signIn', 'Sign In to Access')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          5. COMPLETE PRINT LIFECYCLE WORKFLOW
      ======================================================== */}
      <section id="workflow" className="py-16 sm:py-24 bg-slate-100/60 dark:bg-slate-900/40 border-y border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              {t('landing.navWorkflow', 'Production Pipeline')}
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {lang === 'am' ? 'የህትመትና ማምረቻ ሙሉ የስራ ቅደም-ተከተል' : 'The End-to-End Print Manufacturing Lifecycle'}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              {lang === 'am'
                ? 'ከደንበኛ ጥያቄ እስከ ደረሰኝ አሰጣጥ ድረስ ያለውን እያንዳንዱን ደረጃ ይቆጣጠሩ'
                : 'Complete operational accountability across every print run, machine impression, and sheet.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflowSteps.map((step) => (
              <div
                key={step.num}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black font-mono text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform">
                    {step.num}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {step.title}
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================
          6. PUBLIC EMPLOYEE CREDENTIAL VERIFICATION TOOL
      ======================================================== */}
      <section id="verification" className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white shadow-2xl border border-slate-800 space-y-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t('landing.verifyStaffBadge', 'Public ID Verification')}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
              {lang === 'am' ? 'የሠራተኛ ዲጂታል ባጅና መታወቂያ ማረጋገጫ' : 'Anti-Fraud Employee ID Verification'}
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {lang === 'am'
                ? 'ደንበኞችና የጥበቃ አባላት የጂቲ ማተሚያ ቤት ሰራተኞችን ትክክለኛነት በQR ኮድ ወይም በመታወቂያ ቁጥራቸው ወዲያውኑ ማረጋገጥ ይችላሉ።'
                : 'Clients, vendors, and security personnel can authenticate employee credentials in real time using their system ID or QR scan.'}
            </p>
          </div>

          <form onSubmit={handleVerifySubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={verifyIdInput}
                onChange={(e) => setVerifyIdInput(e.target.value)}
                placeholder={t('landing.verifyPlaceholder', 'Enter Employee ID (e.g. EMP-2026-001)...')}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl font-bold text-sm bg-primary-600 hover:bg-primary-500 text-white shadow-md transition active:scale-98 flex items-center justify-center gap-2 shrink-0"
            >
              <span>{t('landing.verifyBtn', 'Verify Badge')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>

      {/* ========================================================
          7. BOTTOM CTA SECTION
      ======================================================== */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-transparent to-primary-50/50 dark:to-primary-950/20 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="inline-block p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <img
              src="/gt-logo.jpg"
              alt="GT Logo"
              className="h-14 w-14 mx-auto rounded-xl object-contain"
              width="56"
              height="56"
            />
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t('landing.ctaTitle', 'Ready to Streamline Your Press & Packaging Plant?')}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            {t(
              'landing.ctaSubtitle',
              'Access your enterprise workspace or contact your system administrator to assign roles.'
            )}
          </p>
          <div className="pt-2 flex justify-center">
            {isAuthenticated ? (
              <Link
                to="/"
                className="px-8 py-4 rounded-2xl text-base font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg hover:shadow-xl transition flex items-center gap-2"
              >
                <span>{t('landing.goToDashboard', 'Open Dashboard')}</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-8 py-4 rounded-2xl text-base font-bold text-white bg-primary-600 hover:bg-primary-500 shadow-lg hover:shadow-xl transition flex items-center gap-2"
              >
                <span>{t('landing.ctaButton', 'Sign In to GT ERP')}</span>
                <ChevronRight className="w-5 h-5" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================
          8. FOOTER
      ======================================================== */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img
                src="/gt-logo.jpg"
                alt="GT ERP"
                className="h-8 w-8 rounded-lg object-contain"
                width="32"
                height="32"
              />
              <div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">GT ERP</span>
                <span className="block text-xs text-slate-500">
                  {lang === 'am' ? 'የማተሚያና ማሸጊያ ኢአርፒ ሥርዓት' : 'Printing & Packaging Operating System'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <Link to="/careers" className="hover:text-primary-600 dark:hover:text-primary-400 transition">
                {t('landing.exploreCareers', 'Careers')}
              </Link>
              <a href="#workflow" className="hover:text-primary-600 dark:hover:text-primary-400 transition">
                {t('landing.navWorkflow', 'Workflow')}
              </a>
              <a href="#modules" className="hover:text-primary-600 dark:hover:text-primary-400 transition">
                {t('landing.navModules', 'Modules')}
              </a>
              <Link to="/login" className="hover:text-primary-600 dark:hover:text-primary-400 transition">
                {t('landing.signIn', 'Portal Login')}
              </Link>
            </div>

            <div className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} GT Printing Press. {t('landing.allRightsReserved', 'All rights reserved.')}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
