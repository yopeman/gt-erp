import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import crmService from '../../services/crmService';
import { extractArray, extractData } from '../../services/api';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  CalendarClock,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Phone,
  Mail,
  Building2,
  User,
  Trash2,
  Check,
  RotateCcw,
  Tag
} from 'lucide-react';

const FOLLOWUP_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'in_person_meeting', label: 'In-person Meeting' },
  { value: 'email', label: 'Email Correspondence' },
  { value: 'site_visit', label: 'Client Site Visit' },
  { value: 'quotation_followup', label: 'Quotation Follow-up' },
  { value: 'payment_reminder', label: 'Payment Reminder' }
];

export default function Followups() {
  const { t } = useTranslation();

  const [followups, setFollowups] = useState([]);
  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters & Tabs
  const [activeScope, setActiveScope] = useState('today'); // 'today', 'upcoming', 'overdue', 'all'
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [completingFollowup, setCompletingFollowup] = useState(null);

  // New Followup Form
  const [formData, setFormData] = useState({
    targetType: 'lead', // 'lead' or 'customer'
    lead: '',
    customer: '',
    type: 'phone_call',
    agenda: '',
    scheduledTime: '',
    priority: 'medium',
    assignedTo: ''
  });

  // Complete Form
  const [completeForm, setCompleteForm] = useState({
    result: '',
    scheduleNextFollowup: false,
    nextAgenda: '',
    nextScheduledTime: ''
  });

  const fetchFollowups = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (activeScope !== 'all') params.scope = activeScope;
      if (typeFilter !== 'all') params.type = typeFilter;
      if (search) params.search = search;

      const res = await crmService.getFollowups(params);
      setFollowups(extractArray(res, 'followups'));
    } catch (err) {
      setError(err?.message || 'Failed to fetch follow-ups');
    } finally {
      setLoading(false);
    }
  };

  const fetchLookups = async () => {
    try {
      const [leadsRes, custsRes, empsRes] = await Promise.allSettled([
        crmService.getLeads({ limit: 100 }),
        crmService.getCustomers({ limit: 100 }),
        crmService.getEmployees({ limit: 100 })
      ]);
      if (leadsRes.status === 'fulfilled') setLeads(extractArray(leadsRes.value, 'leads'));
      if (custsRes.status === 'fulfilled') setCustomers(extractArray(custsRes.value, 'customers'));
      if (empsRes.status === 'fulfilled') setEmployees(extractArray(empsRes.value, 'employees'));
    } catch {
      // Non-blocking lookup
    }
  };

  useEffect(() => {
    fetchFollowups();
  }, [activeScope, typeFilter]);

  useEffect(() => {
    fetchLookups();
  }, []);

  const handleOpenCreateModal = () => {
    // Default scheduled time to 1 hour from now formatted for datetime-local
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    const dateStr = now.toISOString().slice(0, 16);

    setFormData({
      targetType: 'lead',
      lead: leads[0]?._id || '',
      customer: '',
      type: 'phone_call',
      agenda: '',
      scheduledTime: dateStr,
      priority: 'medium',
      assignedTo: employees[0]?._id || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveFollowup = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        lead: formData.targetType === 'lead' ? formData.lead : null,
        customer: formData.targetType === 'customer' ? formData.customer : null,
        type: formData.type,
        agenda: formData.agenda,
        scheduledTime: formData.scheduledTime,
        priority: formData.priority,
        assignedTo: formData.assignedTo
      };

      await crmService.createFollowup(payload);
      setIsModalOpen(false);
      fetchFollowups();
    } catch (err) {
      alert(err?.message || 'Error creating follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCompleteModal = (followup) => {
    setCompletingFollowup(followup);
    setCompleteForm({
      result: '',
      scheduleNextFollowup: false,
      nextAgenda: '',
      nextScheduledTime: ''
    });
  };

  const handleSaveCompletion = async (e) => {
    e.preventDefault();
    if (!completingFollowup) return;
    try {
      setSubmitting(true);
      await crmService.completeFollowup(completingFollowup._id, completeForm);
      setCompletingFollowup(null);
      fetchFollowups();
    } catch (err) {
      alert(err?.message || 'Failed to complete follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFollowup = async (id) => {
    if (!window.confirm('Delete this scheduled follow-up?')) return;
    try {
      await crmService.deleteFollowup(id);
      fetchFollowups();
    } catch (err) {
      alert(err?.message || 'Failed to delete follow-up');
    }
  };

  const getPriorityBadgeVariant = (priority) => {
    switch (priority) {
      case 'urgent': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'primary';
      default: return 'neutral';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <CalendarClock className="w-7 h-7 text-primary-500" />
            Follow-up Schedule
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track customer communications, scheduled meetings, and pending sales touchpoints.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Schedule Follow-up
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Scope Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5">
          {[
            { key: 'today', label: "Today's Agenda" },
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'overdue', label: 'Overdue' },
            { key: 'all', label: 'All History' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveScope(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeScope === tab.key
                  ? 'bg-primary-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          >
            {FOLLOWUP_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Follow-ups List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            Loading follow-up schedule...
          </div>
        ) : followups.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No follow-ups found"
            description="Schedule a communication touchpoint with a client or prospect."
            actionLabel="Schedule Follow-up"
            onAction={handleOpenCreateModal}
          />
        ) : (
          followups.map((flw) => {
            const targetName = flw.lead ? flw.lead.name : flw.customer ? flw.customer.name : 'Unknown';
            const targetCompany = flw.lead?.companyName || flw.customer?.companyName;
            const targetPhone = flw.lead?.phone || flw.customer?.contactPersons?.[0]?.phone;
            const isCompleted = flw.status === 'completed';

            return (
              <div
                key={flw._id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">{flw.followupNumber}</span>
                    <Badge variant={getPriorityBadgeVariant(flw.priority)}>{flw.priority}</Badge>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 capitalize">
                      {flw.type.replace('_', ' ')}
                    </span>
                    <Badge variant={isCompleted ? 'success' : 'warning'}>{flw.status}</Badge>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 dark:text-white">{flw.agenda}</h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                      {flw.lead ? <User className="w-3.5 h-3.5 text-primary-500" /> : <Building2 className="w-3.5 h-3.5 text-indigo-500" />}
                      {targetName} {targetCompany && `(${targetCompany})`}
                    </span>
                    {targetPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> {targetPhone}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(flw.scheduledTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                    {flw.assignedTo && (
                      <span>Rep: {flw.assignedTo.firstName} {flw.assignedTo.lastName}</span>
                    )}
                  </div>

                  {flw.result && (
                    <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                      <strong>Outcome Result:</strong> {flw.result}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {!isCompleted && (
                    <button
                      onClick={() => handleOpenCompleteModal(flw)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Mark Done
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteFollowup(flw._id)}
                    title="Delete Follow-up"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Schedule Follow-up Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Client Follow-up"
      >
        <form onSubmit={handleSaveFollowup} className="space-y-4">
          {/* Target Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Target Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, targetType: 'lead' })}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  formData.targetType === 'lead'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Lead / Prospective Client
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, targetType: 'customer' })}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  formData.targetType === 'customer'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Existing Customer
              </button>
            </div>
          </div>

          {formData.targetType === 'lead' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Lead *
              </label>
              <select
                required
                value={formData.lead}
                onChange={(e) => setFormData({ ...formData, lead: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">-- Choose Lead --</option>
                {leads.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.name} {l.companyName && `(${l.companyName})`} - {l.phone}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Customer *
              </label>
              <select
                required
                value={formData.customer}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">-- Choose Customer --</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.companyName && `(${c.companyName})`} [{c.customerNumber}]
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Agenda / Purpose *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Discuss revised quote for 10k brochures"
              value={formData.agenda}
              onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Interaction Channel
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="phone_call">Phone Call</option>
                <option value="in_person_meeting">In-person Meeting</option>
                <option value="email">Email</option>
                <option value="site_visit">Site Visit</option>
                <option value="quotation_followup">Quotation Follow-up</option>
                <option value="payment_reminder">Payment Reminder</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Scheduled Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.scheduledTime}
                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Assigned Employee *
              </label>
              <select
                required
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">-- Choose Sales Rep --</option>
                {employees.map((emp) => {
                  const name = emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || 'Sales Rep';
                  const code = emp.employeeCode || emp.employeeId || '';
                  return (
                    <option key={emp._id} value={emp._id}>
                      {name} {code ? `(${code})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
            >
              {submitting ? 'Scheduling...' : 'Save Follow-up'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Complete Follow-up Modal */}
      {completingFollowup && (
        <Modal
          isOpen={Boolean(completingFollowup)}
          onClose={() => setCompletingFollowup(null)}
          title={`Log Outcome: ${completingFollowup.agenda}`}
        >
          <form onSubmit={handleSaveCompletion} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Discussion Result & Key Takeaways *
              </label>
              <textarea
                rows="3"
                required
                placeholder="What was agreed upon? Did the client request samples or a revised price?"
                value={completeForm.result}
                onChange={(e) => setCompleteForm({ ...completeForm, result: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Schedule Next Follow-up</span>
                  <p className="text-[11px] text-slate-400">Automatically create subsequent appointment</p>
                </div>
                <input
                  type="checkbox"
                  checked={completeForm.scheduleNextFollowup}
                  onChange={(e) => setCompleteForm({ ...completeForm, scheduleNextFollowup: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded-sm"
                />
              </div>

              {completeForm.scheduleNextFollowup && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Next Agenda</label>
                    <input
                      type="text"
                      placeholder="e.g. Finalize sample sign-off"
                      value={completeForm.nextAgenda}
                      onChange={(e) => setCompleteForm({ ...completeForm, nextAgenda: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Next Date & Time</label>
                    <input
                      type="datetime-local"
                      value={completeForm.nextScheduledTime}
                      onChange={(e) => setCompleteForm({ ...completeForm, nextScheduledTime: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCompletingFollowup(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Mark as Completed'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

