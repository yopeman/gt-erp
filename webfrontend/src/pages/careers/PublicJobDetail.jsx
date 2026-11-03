import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import MarkdownRenderer from '../../components/common/MarkdownRenderer';
import {
  Briefcase,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  Upload,
  Send,
  AlertCircle,
  Building2,
  Sparkles,
  Link as LinkIcon,
  Phone,
  Mail,
  User,
  Share2,
  Check
} from 'lucide-react';

export default function PublicJobDetail() {
  const { id } = useParams();
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Application Form State
  const [candidate, setCandidate] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    telegramUsername: ''
  });
  const [resumeUrl, setResumeUrl] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeFileName, setResumeFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const fetchPosition = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/job-positions/${id}`);
        if (res.success && res.data) {
          setPosition(res.data);
        } else if (res.title) {
          setPosition(res);
        } else {
          setError('Job position not found or no longer available.');
        }
      } catch (err) {
        setError(err.message || 'Failed to load job details.');
      } finally {
        setLoading(false);
      }
    };

    fetchPosition();
  }, [id]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit.');
        return;
      }
      setResumeFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setResumeFile(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!candidate.name.trim() || !candidate.email.trim()) {
      setSubmitError('Name and email are required to submit an application.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        position: id,
        candidate,
        resumeFile: resumeFile || undefined,
        resumeFileName: resumeFileName || undefined,
        resumeUrl: resumeUrl.trim() || undefined
      };

      const res = await api.post('/job-applications', payload);
      if (res.success) {
        setSubmitSuccess(true);
      } else {
        setSubmitError(res.message || 'Failed to submit application.');
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit application. Please check your information.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-xs text-slate-400 animate-pulse">
        Loading job vacancy details...
      </div>
    );
  }

  if (error || !position) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Job Position Unavailable</h2>
        <p className="text-xs text-slate-400 max-w-sm">
          {error || 'This job vacancy has expired or is no longer accepting public applications.'}
        </p>
        <Link
          to="/careers"
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          Browse All Vacancies
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link to="/careers" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 text-white flex items-center justify-center font-black shadow-md shadow-primary-500/20 text-sm">
                GT
              </div>
              <div className="hidden sm:block">
                <span className="font-black text-sm tracking-tight block text-slate-900 dark:text-white leading-none">
                  GT-ERP
                </span>
                <span className="text-[9px] uppercase font-bold tracking-widest text-primary-600 dark:text-primary-400">
                  Careers Portal
                </span>
              </div>
            </Link>

            <span className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            <Link
              to="/careers"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-primary-600 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Vacancies</span>
            </Link>
          </div>

          <button
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied!' : 'Share Position'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full space-y-8">
        {/* Job Header Hero */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-900">
              {position.type || 'Full Time'}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold capitalize bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
              Status: {position.status || 'Open'}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
              <Clock className="w-3.5 h-3.5" />
              Posted on {new Date(position.postedAt || position.createdAt).toLocaleDateString()}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {position.title}
          </h1>

          {position.closingTime && (
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Application Deadline: {new Date(position.closingTime).toLocaleDateString()}</span>
            </p>
          )}
        </div>

        {/* Two-Column Grid: Job Description & Application Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Job Description and Requirements (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Description Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary-500" />
                <span>About the Role</span>
              </h2>
              <MarkdownRenderer content={position.description || 'No detailed description provided for this opening.'} />
            </div>

            {/* Requirements Card */}
            {position.requirements && position.requirements.length > 0 && (
              <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>Requirements & Qualifications</span>
                </h2>
                <div className="space-y-2.5">
                  {position.requirements.map((req, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                        ✓
                      </span>
                      <div className="flex-1">
                        <MarkdownRenderer content={req} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Application Form (5 cols) */}
          <div className="lg:col-span-5 sticky top-24">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none space-y-5">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-primary-600 dark:text-primary-400 block mb-1">
                  Fast Track Application
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Apply for this Opening
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Submit your details below. Our HR recruitment team will review your CV.
                </p>
              </div>

              {submitSuccess ? (
                <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-base text-emerald-900 dark:text-emerald-200">
                    Application Submitted!
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                    Thank you, <strong className="font-bold">{candidate.name}</strong>. Your application for{' '}
                    <strong className="font-bold">{position.title}</strong> has been successfully received. We will get in touch with you via email or phone!
                  </p>
                  <div className="pt-2">
                    <Link
                      to="/careers"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition inline-block"
                    >
                      Browse More Openings
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleApply} className="space-y-4">
                  {submitError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Abebe Kebede"
                        value={candidate.name}
                        onChange={(e) => setCandidate({ ...candidate, name: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. abebe@example.com"
                        value={candidate.email}
                        onChange={(e) => setCandidate({ ...candidate, email: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="tel"
                          required
                          placeholder="+251 911 ..."
                          value={candidate.phoneNumber}
                          onChange={(e) => setCandidate({ ...candidate, phoneNumber: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Telegram Username
                      </label>
                      <input
                        type="text"
                        placeholder="@username"
                        value={candidate.telegramUsername}
                        onChange={(e) => setCandidate({ ...candidate, telegramUsername: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Resume / CV Document Upload */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Upload Resume / CV (PDF, DOCX)
                    </label>
                    <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary-500 rounded-xl p-3 text-center cursor-pointer block transition bg-slate-50/50 dark:bg-slate-800/50">
                      <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                        {resumeFileName || 'Choose File or Drag & Drop'}
                      </span>
                      <span className="text-[10px] text-slate-400">Max size: 5MB</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Or Portfolio / Resume Link */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Or Portfolio / Google Drive / LinkedIn Link
                    </label>
                    <div className="relative">
                      <LinkIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/... or drive link"
                        value={resumeUrl}
                        onChange={(e) => setResumeUrl(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-primary-500/20 transition flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? 'Submitting Application...' : 'Submit Application'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
