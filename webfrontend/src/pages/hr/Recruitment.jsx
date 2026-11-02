import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import api from '../../services/api';
import { Briefcase, Plus, Users, Calendar, RefreshCw, Video, MapPin } from 'lucide-react';

export default function Recruitment() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const canManage = hasRole(['admin', 'hr']);

  const [activeTab, setActiveTab] = useState('positions'); // 'positions' or 'applications'
  const [positions, setPositions] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Position Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: 'Experience in printing press operations\nAttention to detail',
    type: 'Full Time',
    status: 'open',
    closingTime: ''
  });

  // Interview Modal
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [interviewForm, setInterviewForm] = useState({
    date: '',
    type: 'physical',
    meetingLink: '',
    note: 'Initial technical competency evaluation'
  });

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

  const handleCreatePosition = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        requirements: formData.requirements.split('\n').filter(Boolean)
      };
      const response = await api.post('/job-positions', payload);
      if (response.success) {
        setIsModalOpen(false);
        setFormData({
          title: '',
          description: '',
          requirements: '',
          type: 'Full Time',
          status: 'open',
          closingTime: ''
        });
        await fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to create job position');
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
            Section 2.8 • Job postings, applicant CV screening, and interview workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t('actions.createJob')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('positions')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'positions'
              ? 'bg-primary-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Open Positions ({positions.length})
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'applications'
              ? 'bg-primary-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Job Applicants ({applications.length})
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
            onAction={() => setIsModalOpen(true)}
            icon={Briefcase}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {positions.map((pos) => (
              <div 
                key={pos._id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{pos.title}</h3>
                    <p className="text-xs text-primary-500 font-medium">{pos.type}</p>
                  </div>
                  <Badge status={pos.status} text={pos.status} />
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {pos.description || 'No description provided.'}
                </p>

                {pos.requirements && pos.requirements.length > 0 && (
                  <div className="text-[11px] text-slate-400 space-y-0.5">
                    <span className="font-semibold text-slate-500">Key Requirements:</span>
                    <ul className="list-disc pl-4 text-slate-600 dark:text-slate-300">
                      {pos.requirements.slice(0, 2).map((req, idx) => (
                        <li key={idx} className="truncate">{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
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
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{app.candidate?.name}</h4>
                <div className="text-xs text-slate-400">
                  {app.candidate?.email} • {app.candidate?.phoneNumber}
                </div>
                <div className="text-[11px] text-primary-500 font-semibold mt-1">
                  Applied for: {app.position?.title || 'Position'}
                </div>
                {app.interview?.date && (
                  <div className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Interview: {new Date(app.interview.date).toLocaleDateString()} ({app.interview.type})</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Badge status={app.status || 'pending'} text={app.status || 'Pending'} />

                {canManage && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedApp(app);
                        setInterviewModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400 hover:bg-primary-100"
                    >
                      Schedule
                    </button>

                    <select
                      value={app.status || 'pending'}
                      onChange={(e) => handleStatusChange(app._id, e.target.value)}
                      className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    >
                      <option value="applied">Applied</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="interview">Interview</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
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
        <form onSubmit={handleScheduleInterview} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Interview Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={interviewForm.date}
              onChange={(e) => setInterviewForm({ ...interviewForm, date: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Interview Type *
            </label>
            <select
              value={interviewForm.type}
              onChange={(e) => setInterviewForm({ ...interviewForm, type: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            >
              <option value="physical">Physical (At Factory)</option>
              <option value="online">Online (Google Meet / Zoom)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Meeting Link / Room Location
            </label>
            <input
              type="text"
              value={interviewForm.meetingLink}
              onChange={(e) => setInterviewForm({ ...interviewForm, meetingLink: e.target.value })}
              placeholder="e.g. Meeting Room 2B or meet.google.com/xyz"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notes
            </label>
            <input
              type="text"
              value={interviewForm.note}
              onChange={(e) => setInterviewForm({ ...interviewForm, note: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setInterviewModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-primary-500 text-white font-bold text-xs rounded-xl"
            >
              Confirm Interview
            </button>
          </div>
        </form>
      </Modal>

      {/* Post Job Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('actions.createJob')}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreatePosition} className="space-y-4">
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
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Closing Deadline
              </label>
              <input
                type="date"
                value={formData.closingTime}
                onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Role Description
            </label>
            <textarea
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe printing press responsibilities..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Requirements (One per line)
            </label>
            <textarea
              rows="3"
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Posting...' : 'Post Vacancy'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
