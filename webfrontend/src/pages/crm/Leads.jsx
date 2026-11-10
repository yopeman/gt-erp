import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import crmService from '../../services/crmService';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  Target,
  Plus,
  Search,
  Phone,
  Mail,
  Building2,
  Calendar,
  MessageSquare,
  UserCheck,
  Edit,
  Trash2,
  DollarSign,
  AlertCircle,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';

const LEAD_STAGES = [
  { value: 'all', label: 'All Stages' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' }
];

const LEAD_SOURCES = [
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'tender', label: 'Tender' },
  { value: 'phone_inquiry', label: 'Phone Inquiry' },
  { value: 'other', label: 'Other' }
];

export default function Leads() {
  const { t } = useTranslation();

  const [leads, setLeads] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  // Discussion Drawer / Modal
  const [activeDiscussionLead, setActiveDiscussionLead] = useState(null);
  const [discussionForm, setDiscussionForm] = useState({
    agenda: '',
    summary: '',
    nextFollowupDate: '',
    newStatus: ''
  });

  // Convert Lead Modal
  const [convertingLead, setConvertingLead] = useState(null);
  const [convertForm, setConvertForm] = useState({
    allowedCredit: false,
    creditLimit: 0,
    creditTermDays: 30,
    tinNumber: '',
    vatNumber: ''
  });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    phone: '',
    email: '',
    source: 'walk_in',
    category: 'corporate',
    priority: 'medium',
    estimatedValue: 0,
    currency: 'ETB',
    assignedTo: '',
    requirements: ''
  });

  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (search) params.search = search;
      if (stageFilter !== 'all') params.status = stageFilter;
      if (sourceFilter !== 'all') params.source = sourceFilter;

      const res = await crmService.getLeads(params);
      setLeads(res.data?.leads || res.leads || []);
    } catch (err) {
      setError(err?.message || 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await crmService.getEmployees({ limit: 100 });
      setEmployees(res.data?.employees || res.employees || []);
    } catch {
      // Non-blocking lookup
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchEmployees();
  }, [stageFilter, sourceFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLeads();
  };

  const handleOpenCreateModal = () => {
    setEditingLead(null);
    setFormData({
      name: '',
      companyName: '',
      phone: '',
      email: '',
      source: 'walk_in',
      category: 'corporate',
      priority: 'medium',
      estimatedValue: 0,
      currency: 'ETB',
      assignedTo: '',
      requirements: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (lead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name || '',
      companyName: lead.companyName || '',
      phone: lead.phone || '',
      email: lead.email || '',
      source: lead.source || 'walk_in',
      category: lead.category || 'corporate',
      priority: lead.priority || 'medium',
      estimatedValue: lead.estimatedValue || 0,
      currency: lead.currency || 'ETB',
      assignedTo: lead.assignedTo?._id || lead.assignedTo || '',
      requirements: lead.requirements || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveLead = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingLead) {
        await crmService.updateLead(editingLead._id, formData);
      } else {
        await crmService.createLead(formData);
      }
      setIsModalOpen(false);
      fetchLeads();
    } catch (err) {
      alert(err?.message || 'Error saving lead');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLead = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await crmService.deleteLead(id);
      fetchLeads();
    } catch (err) {
      alert(err?.message || 'Failed to delete lead');
    }
  };

  // Discussion handler
  const handleOpenDiscussion = (lead) => {
    setActiveDiscussionLead(lead);
    setDiscussionForm({
      agenda: '',
      summary: '',
      nextFollowupDate: '',
      newStatus: lead.status === 'new' ? 'contacted' : lead.status
    });
  };

  const handleAddDiscussion = async (e) => {
    e.preventDefault();
    if (!activeDiscussionLead) return;
    try {
      setSubmitting(true);
      const res = await crmService.addDiscussion(activeDiscussionLead._id, discussionForm);
      setActiveDiscussionLead(res.data || res);
      setDiscussionForm({ agenda: '', summary: '', nextFollowupDate: '', newStatus: '' });
      fetchLeads();
    } catch (err) {
      alert(err?.message || 'Failed to add discussion note');
    } finally {
      setSubmitting(false);
    }
  };

  // Conversion handler
  const handleOpenConvert = (lead) => {
    setConvertingLead(lead);
    setConvertForm({
      allowedCredit: false,
      creditLimit: 0,
      creditTermDays: 30,
      tinNumber: '',
      vatNumber: ''
    });
  };

  const handleConvertLead = async (e) => {
    e.preventDefault();
    if (!convertingLead) return;
    try {
      setSubmitting(true);
      await crmService.convertLeadToCustomer(convertingLead._id, convertForm);
      setConvertingLead(null);
      fetchLeads();
      alert('Lead successfully converted to Customer!');
    } catch (err) {
      alert(err?.message || 'Failed to convert lead');
    } finally {
      setSubmitting(false);
    }
  };

  const getStageBadgeVariant = (stage) => {
    switch (stage) {
      case 'new': return 'info';
      case 'contacted': return 'primary';
      case 'qualified': return 'warning';
      case 'proposal_sent': return 'indigo';
      case 'converted': return 'success';
      case 'lost': return 'danger';
      default: return 'neutral';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Target className="w-7 h-7 text-primary-500" />
            Lead Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Capture prospective clients, record sales discussions, and convert qualified leads to customers.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Lead
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by name, phone, company..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 text-slate-800 dark:text-slate-100"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden"
          >
            {LEAD_STAGES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="all">All Sources</option>
            {LEAD_SOURCES.map((src) => (
              <option key={src.value} value={src.value}>{src.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading leads...</div>
        ) : leads.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No leads found"
            description="Start acquiring clients by creating your first sales lead."
            actionLabel="Add New Lead"
            onAction={handleOpenCreateModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Lead #</th>
                  <th className="py-3 px-4">Client / Company</th>
                  <th className="py-3 px-4">Phone & Email</th>
                  <th className="py-3 px-4">Est. Value</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                      {lead.leadNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{lead.name}</div>
                      {lead.companyName && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" /> {lead.companyName}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> {lead.phone}
                      </div>
                      {lead.email && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" /> {lead.email}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {lead.estimatedValue > 0
                        ? `${Number(lead.estimatedValue).toLocaleString()} ${lead.currency || 'ETB'}`
                        : '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      {lead.assignedTo ? (
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {lead.assignedTo.firstName} {lead.assignedTo.lastName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={getStageBadgeVariant(lead.status)}>
                        {lead.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDiscussion(lead)}
                          title="Discussions & Notes"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>

                        {lead.status !== 'converted' ? (
                          <button
                            onClick={() => handleOpenConvert(lead)}
                            title="Convert to Customer"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        ) : (
                          <span title="Converted" className="p-1.5 text-emerald-500">
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        )}

                        <button
                          onClick={() => handleOpenEditModal(lead)}
                          title="Edit Lead"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteLead(lead._id)}
                          title="Delete Lead"
                          disabled={lead.status === 'converted'}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition disabled:opacity-40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Lead Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLead ? `Edit Lead: ${editingLead.leadNumber}` : 'Create New Lead'}
      >
        <form onSubmit={handleSaveLead} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Contact Person Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Abebe Bikila"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="e.g. Dashen Bank S.C."
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. +251 91 123 4567"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. contact@example.com"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Lead Source
              </label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              >
                {LEAD_SOURCES.map((src) => (
                  <option key={src.value} value={src.value}>{src.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              >
                <option value="corporate">Corporate</option>
                <option value="sme">SME</option>
                <option value="government">Government</option>
                <option value="ngo">NGO</option>
                <option value="individual">Individual</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Estimated Deal Value (ETB)
              </label>
              <input
                type="number"
                min="0"
                value={formData.estimatedValue}
                onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Assign Sales Representative
              </label>
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              >
                <option value="">-- Select Sales Rep --</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Project Requirements & Printing Specs
            </label>
            <textarea
              rows="3"
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              placeholder="e.g. 5,000 copies of softcover catalog, 64 pages, 150 GSM art paper, delivery by end of month."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingLead ? 'Update Lead' : 'Create Lead'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Discussion Log Modal */}
      {activeDiscussionLead && (
        <Modal
          isOpen={Boolean(activeDiscussionLead)}
          onClose={() => setActiveDiscussionLead(null)}
          title={`Discussions: ${activeDiscussionLead.name} (${activeDiscussionLead.leadNumber})`}
        >
          <div className="space-y-5">
            {/* Historical discussions */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {activeDiscussionLead.discussions?.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No discussion notes recorded yet.</p>
              ) : (
                activeDiscussionLead.discussions.map((d, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{d.agenda || 'Discussion'}</span>
                      <span>{new Date(d.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200">{d.summary}</p>
                    {d.nextFollowupDate && (
                      <div className="text-[10px] text-primary-600 dark:text-primary-400 flex items-center gap-1 mt-1 font-medium">
                        <Clock className="w-3 h-3" /> Next Follow-up: {new Date(d.nextFollowupDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add new discussion note */}
            <form onSubmit={handleAddDiscussion} className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Add Discussion Note
              </h4>

              <div>
                <input
                  type="text"
                  placeholder="Discussion Agenda (e.g. Price Negotiation)"
                  value={discussionForm.agenda}
                  onChange={(e) => setDiscussionForm({ ...discussionForm, agenda: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <textarea
                  required
                  rows="2"
                  placeholder="Summary of discussion outcome... *"
                  value={discussionForm.summary}
                  onChange={(e) => setDiscussionForm({ ...discussionForm, summary: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Next Follow-up Date</label>
                  <input
                    type="date"
                    value={discussionForm.nextFollowupDate}
                    onChange={(e) => setDiscussionForm({ ...discussionForm, nextFollowupDate: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Update Lead Status</label>
                  <select
                    value={discussionForm.newStatus}
                    onChange={(e) => setDiscussionForm({ ...discussionForm, newStatus: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="proposal_sent">Proposal Sent</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Add Note & Update'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Convert Lead to Customer Modal */}
      {convertingLead && (
        <Modal
          isOpen={Boolean(convertingLead)}
          onClose={() => setConvertingLead(null)}
          title={`Convert to Formal Customer: ${convertingLead.name}`}
        >
          <form onSubmit={handleConvertLead} className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This will create a new Customer profile from lead <strong>{convertingLead.leadNumber}</strong>, keeping all contact information and history intact.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tax Identification Number (TIN)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0012345678"
                  value={convertForm.tinNumber}
                  onChange={(e) => setConvertForm({ ...convertForm, tinNumber: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  VAT Registration Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. VAT-987654"
                  value={convertForm.vatNumber}
                  onChange={(e) => setConvertForm({ ...convertForm, vatNumber: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Enable Credit Sales</div>
                  <div className="text-[11px] text-slate-400">Allow this customer to purchase on invoice credit terms</div>
                </div>
                <input
                  type="checkbox"
                  checked={convertForm.allowedCredit}
                  onChange={(e) => setConvertForm({ ...convertForm, allowedCredit: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded-sm"
                />
              </div>

              {convertForm.allowedCredit && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Credit Limit (ETB)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={convertForm.creditLimit}
                      onChange={(e) => setConvertForm({ ...convertForm, creditLimit: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Payment Terms (Days)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={convertForm.creditTermDays}
                      onChange={(e) => setConvertForm({ ...convertForm, creditTermDays: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConvertingLead(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
              >
                {submitting ? 'Converting...' : 'Confirm Conversion'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

