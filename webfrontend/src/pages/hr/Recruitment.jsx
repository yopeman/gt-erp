import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import MarkdownRenderer from '../../components/common/MarkdownRenderer';
import api from '../../services/api';
import {
  Briefcase,
  Plus,
  Users,
  Calendar,
  RefreshCw,
  Video,
  MapPin,
  Pencil,
  Trash2,
  ExternalLink,
  Link as LinkIcon,
  Check,
  Eye,
  Clock,
  FileText
} from 'lucide-react';

export default function Recruitment() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const canManage = hasRole(['admin', 'hr']);

  const [activeTab, setActiveTab] = useState('positions'); // 'positions' or 'applications'
  const [positions, setPositions] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Position Modal (Create & Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPositionId, setEditingPositionId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: ['Experience in printing press operations', 'Attention to detail'],
    type: 'Full Time',
    status: 'open',
    closingTime: ''
  });
  const [newReqInput, setNewReqInput] = useState('');

  // Interview Modal
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [interviewForm, setInterviewForm] = useState({
    date: '',
    type: 'online',
    meetingLink: '',
    note: 'Initial technical competency evaluation'
  });

  const generateMeetingLink = () => {
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 10) + '-' + Math.random().toString(36).substring(2, 6);
    return `https://meet.jit.si/${uuid}`;
  };

  const handleOpenInterviewModal = (app) => {
    setSelectedApp(app);
    const existingType = app.interview?.type || 'online';
    const link = app.interview?.meetingLink || (existingType === 'online' ? generateMeetingLink() : '');
    setInterviewForm({
      date: app.interview?.date ? new Date(app.interview.date).toISOString().slice(0, 16) : '',
      type: existingType,
      meetingLink: link,
      note: app.interview?.note || 'Initial technical competency evaluation'
    });
    setInterviewModalOpen(true);
  };

  const handleAddRequirement = () => {
    const trimmed = newReqInput.trim();
    if (!trimmed) return;
    setFormData((prev) => ({
      ...prev,
      requirements: [...(prev.requirements || []), trimmed]
    }));
    setNewReqInput('');
  };

  const handleRemoveRequirement = (idxToRemove) => {
    setFormData((prev) => ({
      ...prev,
      requirements: (prev.requirements || []).filter((_, idx) => idx !== idxToRemove)
    }));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [posRes, appRes] = await Promise.allSettled([
        api.get('/job-positions'),
        api.get('/job-applications')
      ]);

      if (posRes.status === 'fulfilled' && posRes.value?.data) {
        setPositions(Array.isArray(posRes.value.data) ? posRes.value.data : []);
      }
      if (appRes.status === 'fulfilled' && appRes.value?.data) {
        setApplications(Array.isArray(appRes.value.data) ? appRes.value.data : []);
      }
    } catch (err) {
      console.error('Error fetching recruitment data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreatePosition = () => {
    setEditingPositionId(null);
    setNewReqInput('');
    setFormData({
      title: '',
      description: '',
      requirements: [
        'Experience in printing press operations',
        'Attention to detail and quality focus'
      ],
      type: 'Full Time',
      status: 'open',
      closingTime: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditPosition = (pos) => {
    setEditingPositionId(pos._id);
    setNewReqInput('');
    let reqArray = [];
    if (Array.isArray(pos.requirements)) {
      reqArray = [...pos.requirements];
    } else if (typeof pos.requirements === 'string') {
      reqArray = pos.requirements.split('\n').map((r) => r.trim()).filter(Boolean);
    }
    setFormData({
      title: pos.title || '',
      description: pos.description || '',
      requirements: reqArray,
      type: pos.type || 'Full Time',
      status: pos.status || 'open',
      closingTime: pos.closingTime ? new Date(pos.closingTime).toISOString().split('T')[0] : ''
    });
    setIsModalOpen(true);
  };

  const handleDeletePosition = async (pos) => {
    if (window.confirm(`Are you sure you want to delete the job position "${pos.title}"?`)) {
      try {
        const res = await api.delete(`/job-positions/${pos._id}`);
        if (res.success) {
          setPositions((prev) => prev.filter((p) => p._id !== pos._id));
        }
      } catch (err) {
        alert(err.message || 'Failed to delete job position');
      }
    }
  };

  const handleCopyPublicLink = (posId) => {
    const fullUrl = `${window.location.origin}/careers/${posId}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(posId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSavePosition = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        requirements: Array.isArray(formData.requirements)
          ? formData.requirements.map((r) => r.trim()).filter(Boolean)
          : []
      };

      let response;
      if (editingPositionId) {
        response = await api.put(`/job-positions/${editingPositionId}`, payload);
      } else {
        response = await api.post('/job-positions', payload);
      }

      if (response.success) {
        setIsModalOpen(false);
        setEditingPositionId(null);
        await fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to save job position');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (appId, status) => {
    try {
      await api.patch(`/job-applications/${appId}/status`, { status });
      setApplications((prev) =>
        prev.map((app) => (app._id === appId ? { ...app, status } : app))
      );
    } catch (err) {
      alert(err.message || 'Status update failed');
    }
  };

  const handleScheduleInterview = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;
    try {
      const response = await api.patch(`/job-applications/${selectedApp._id}/interview`, interviewForm);
      if (response.success) {
        setInterviewModalOpen(false);
        await fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to schedule interview');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary-500" />
            <span>{t('nav.recruitment')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Section 2.8 • Job postings, public careers portal, applicant CV screening, and interviews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Public Careers Page Shortcut */}
          <a
            href="/careers"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
            title="Open Public Careers Board in new tab"
          >
            <ExternalLink className="w-4 h-4 text-primary-500" />
            <span className="hidden sm:inline">{t('Public Careers Board')}</span>
          </a>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canManage && (
            <button
              onClick={handleOpenCreatePosition}
              className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t('actions.createJob')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs with Header Icons */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('positions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'positions'
              ? 'bg-primary-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>{t('Open Positions')} ({positions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'applications'
              ? 'bg-primary-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t('Job Applicants')} ({applications.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading recruitment records...
        </div>
      ) : activeTab === 'positions' ? (
        positions.length === 0 ? (
          <EmptyState
            title="No job openings posted"
            message="There are currently no job vacancies listed. Post a new opening to start accepting candidates."
            actionText={canManage ? t('actions.createJob') : null}
            onAction={handleOpenCreatePosition}
            icon={Briefcase}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {positions.map((pos) => (
              <div
                key={pos._id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {pos.title}
                      </h3>
                      <p className="text-xs text-primary-500 font-medium">{pos.type}</p>
                    </div>
                    <Badge status={pos.status} text={pos.status} />
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3">
                    <MarkdownRenderer content={pos.description || 'No description provided.'} />
                  </div>

                  {pos.requirements && pos.requirements.length > 0 && (
                    <div className="text-[11px] text-slate-400 space-y-1">
                      <span className="font-semibold text-slate-500">Key Requirements:</span>
                      <div className="space-y-0.5">
                        {pos.requirements.slice(0, 2).map((req, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300">
                            <span className="text-primary-500 leading-tight">•</span>
                            <div className="truncate flex-1">
                              <MarkdownRenderer content={req} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pos.closingTime && (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Deadline: {new Date(pos.closingTime).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Job Position Action Toolbar: Open in Public Page, Copy Link, Edit, Delete */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Open in Public Page */}
                    <a
                      href={`/careers/${pos._id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 hover:bg-primary-100 dark:hover:bg-primary-900/60 transition flex items-center gap-1"
                      title="Open Public Application Page"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{t('Public Page')}</span>
                    </a>

                    {/* Copy Public Link */}
                    <button
                      onClick={() => handleCopyPublicLink(pos._id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      title="Copy Public Job Link"
                    >
                      {copiedId === pos._id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <LinkIcon className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      {/* Edit Position */}
                      <button
                        onClick={() => handleOpenEditPosition(pos)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition"
                        title="Edit Job Opening"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Position */}
                      <button
                        onClick={() => handleDeletePosition(pos)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition"
                        title="Delete Job Opening"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : applications.length === 0 ? (
        <EmptyState
          title="No applications received"
          message="No candidate has applied to job vacancies yet."
          icon={Users}
        />
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div
              key={app._id}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {app.candidate?.name}
                </h4>
                <div className="text-xs text-slate-400">
                  {app.candidate?.email} • {app.candidate?.phoneNumber}
                  {app.candidate?.telegramUsername && ` • ${app.candidate.telegramUsername}`}
                </div>
                <div className="text-[11px] text-primary-500 font-semibold mt-1">
                  Applied for: {app.position?.title || 'Position'}
                </div>

                {/* Candidate Attachments / CV */}
                {app.attachments && app.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {app.attachments.map((att, idx) => (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-primary-600 transition"
                      >
                        <FileText className="w-3 h-3 text-primary-500" />
                        <span>{att.name || 'View CV / Resume'}</span>
                      </a>
                    ))}
                  </div>
                )}

                {app.interview?.date && (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-900/40">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        Interview:{' '}
                        {new Date(app.interview.date).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}{' '}
                        ({app.interview.type})
                      </span>
                    </div>

                    {app.interview.meetingLink && (
                      <a
                        href={
                          app.interview.meetingLink.startsWith('http')
                            ? app.interview.meetingLink
                            : `https://${app.interview.meetingLink}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 text-[11px] font-bold hover:bg-primary-100 dark:hover:bg-primary-900/40 transition"
                      >
                        <Video className="w-3 h-3 text-primary-500" />
                        <span>Meeting Link</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Badge status={app.status || 'pending'} text={app.status || 'Pending'} />

                {/* Direct Action: Open Video Meeting */}
                {app.interview?.meetingLink && (
                  <a
                    href={
                      app.interview.meetingLink.startsWith('http')
                        ? app.interview.meetingLink
                        : `https://${app.interview.meetingLink}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                    title="Open Video Meeting Room"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Join Meeting</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                )}

                {canManage && (
                  <>
                    <button
                      onClick={() => handleOpenInterviewModal(app)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400 hover:bg-primary-100"
                    >
                      {t('Schedule')}
                    </button>

                    <select
                      value={app.status || 'pending'}
                      onChange={(e) => handleStatusChange(app._id, e.target.value)}
                      className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    >
                      <option value="applied">{t('applied')}</option>
                      <option value="screening">{t('screening')}</option>
                      <option value="interview">{t('interview')}</option>
                      <option value="offered">{t('offered')}</option>
                      <option value="hired">{t('hired')}</option>
                      <option value="rejected">{t('rejected')}</option>
                    </select>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Interview Modal */}
      <Modal
        isOpen={interviewModalOpen}
        onClose={() => setInterviewModalOpen(false)}
        title={selectedApp ? `Schedule Interview: ${selectedApp.candidate?.name}` : 'Schedule Interview'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleScheduleInterview} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Interview Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={interviewForm.date}
              onChange={(e) => setInterviewForm({ ...interviewForm, date: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Interview Format
            </label>
            <select
              value={interviewForm.type}
              onChange={(e) => {
                const newType = e.target.value;
                setInterviewForm((prev) => ({
                  ...prev,
                  type: newType,
                  meetingLink:
                    newType === 'online' && (!prev.meetingLink || !prev.meetingLink.startsWith('http'))
                      ? generateMeetingLink()
                      : prev.meetingLink
                }));
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="online">Online (Video Meeting)</option>
              <option value="physical">Physical (On-site)</option>
            </select>
          </div>

          {interviewForm.type === 'online' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Meeting Link (Auto-generated) *
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setInterviewForm((prev) => ({ ...prev, meetingLink: generateMeetingLink() }))
                  }
                  className="text-[11px] text-primary-600 dark:text-primary-400 font-bold hover:underline"
                >
                  Regenerate Link
                </button>
              </div>
              <input
                type="text"
                required
                value={interviewForm.meetingLink}
                onChange={(e) => setInterviewForm({ ...interviewForm, meetingLink: e.target.value })}
                placeholder="https://meet.jit.si/..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-primary-600 dark:text-primary-400 focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                An invitation with this video link will be automatically emailed to{' '}
                <strong className="text-slate-700 dark:text-slate-200">
                  {selectedApp?.candidate?.email || 'the applicant'}
                </strong>.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notes / Instructions
            </label>
            <input
              type="text"
              value={interviewForm.note}
              onChange={(e) => setInterviewForm({ ...interviewForm, note: e.target.value })}
              placeholder="e.g. Please bring an updated portfolio or preparation materials"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setInterviewModalOpen(false)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              Confirm & Dispatch Invitation
            </button>
          </div>
        </form>
      </Modal>

      {/* Post / Edit Job Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPositionId(null);
        }}
        title={editingPositionId ? 'Edit Job Opening' : t('actions.createJob')}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSavePosition} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Job Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Lead Offset Press Technician"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Employment Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="Full Time">Full Time</option>
                <option value="Part Time">Part Time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
                <option value="Remote">Remote</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Vacancy Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 font-bold"
              >
                <option value="open">Open (Publicly Visible)</option>
                <option value="closed">Closed / Filled</option>
                <option value="pending">Draft / Pending</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Application Deadline
            </label>
            <input
              type="date"
              value={formData.closingTime}
              onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Role Description (Markdown supported)
            </label>
            <textarea
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe core duties and expectations (supports markdown like **bold**, *italics*, lists)..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Requirements (Markdown supported)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newReqInput}
                onChange={(e) => setNewReqInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRequirement();
                  }
                }}
                placeholder="Type a requirement (e.g. 3+ years experience with **Heidelberg** presses) and click + Add"
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={handleAddRequirement}
                className="px-3.5 py-2 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition shrink-0 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {formData.requirements && formData.requirements.length > 0 ? (
              <div className="mt-2.5 space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {formData.requirements.map((req, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs"
                  >
                    <div className="flex-1">
                      <MarkdownRenderer content={req} />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveRequirement(idx)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded transition shrink-0"
                      title="Remove requirement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic mt-1.5">
                No requirements added yet. Enter a requirement above and click Add.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingPositionId(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {submitting
                ? 'Saving...'
                : editingPositionId
                ? 'Update Opening'
                : 'Publish Vacancy'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
