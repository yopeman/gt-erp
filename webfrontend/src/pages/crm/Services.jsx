import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import crmService from '../../services/crmService';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  Workflow,
  DollarSign,
  Layers,
  Clock,
  AlertCircle,
  Tag,
  CheckCircle2
} from 'lucide-react';

const SERVICE_CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'offset_printing', label: 'Offset Press Printing' },
  { value: 'digital_printing', label: 'Digital Printing' },
  { value: 'large_format', label: 'Large Format / Banner' },
  { value: 'packaging', label: 'Packaging & Cartons' },
  { value: 'finishing_service', label: 'Finishing Services' },
  { value: 'other', label: 'Other Printing' }
];

export default function Services() {
  const { t } = useTranslation();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [viewingWorkflowService, setViewingWorkflowService] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    serviceCode: '',
    category: 'offset_printing',
    description: '',
    unitOfMeasurement: 'copy',
    basePrice: 0,
    minimumOrderQuantity: 1,
    workflowTemplate: [
      { sequence: 1, stageName: 'Pre-press & CTP Plates', estimatedDurationMinutes: 60, defaultMachineCategory: 'offset_press' },
      { sequence: 2, stageName: 'Press Printing', estimatedDurationMinutes: 180, defaultMachineCategory: 'offset_press' },
      { sequence: 3, stageName: 'Cutting & Trimming', estimatedDurationMinutes: 45, defaultMachineCategory: 'guillotine_cutter' },
      { sequence: 4, stageName: 'Final Quality Check', estimatedDurationMinutes: 30, defaultMachineCategory: 'other' }
    ]
  });

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (search) params.search = search;
      if (categoryFilter !== 'all') params.category = categoryFilter;

      const res = await crmService.getServices(params);
      setServices(res.data?.services || res.services || []);
    } catch (err) {
      setError(err?.message ? t(err.message) : t('Failed to fetch services'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [categoryFilter]);

  const handleOpenCreateModal = () => {
    setEditingService(null);
    setFormData({
      name: '',
      serviceCode: '',
      category: 'offset_printing',
      description: '',
      unitOfMeasurement: 'copy',
      basePrice: 0,
      minimumOrderQuantity: 1,
      workflowTemplate: [
        { sequence: 1, stageName: 'Pre-press & CTP Plates', estimatedDurationMinutes: 60, defaultMachineCategory: 'offset_press' },
        { sequence: 2, stageName: 'Press Printing', estimatedDurationMinutes: 180, defaultMachineCategory: 'offset_press' },
        { sequence: 3, stageName: 'Cutting & Trimming', estimatedDurationMinutes: 45, defaultMachineCategory: 'guillotine_cutter' },
        { sequence: 4, stageName: 'Final Quality Check', estimatedDurationMinutes: 30, defaultMachineCategory: 'other' }
      ]
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (srv) => {
    setEditingService(srv);
    setFormData({
      name: srv.name || '',
      serviceCode: srv.serviceCode || '',
      category: srv.category || 'offset_printing',
      description: srv.description || '',
      unitOfMeasurement: srv.pricingModel?.unitOfMeasurement || 'copy',
      basePrice: srv.pricingModel?.basePrice || 0,
      minimumOrderQuantity: srv.pricingModel?.minimumOrderQuantity || 1,
      workflowTemplate: srv.workflowTemplate?.length ? srv.workflowTemplate : []
    });
    setIsModalOpen(true);
  };

  const handleAddWorkflowStep = () => {
    const nextSeq = formData.workflowTemplate.length + 1;
    setFormData({
      ...formData,
      workflowTemplate: [
        ...formData.workflowTemplate,
        { sequence: nextSeq, stageName: '', estimatedDurationMinutes: 30, defaultMachineCategory: 'other' }
      ]
    });
  };

  const handleRemoveWorkflowStep = (idx) => {
    const updated = formData.workflowTemplate
      .filter((_, i) => i !== idx)
      .map((step, i) => ({ ...step, sequence: i + 1 }));
    setFormData({ ...formData, workflowTemplate: updated });
  };

  const handleWorkflowStepChange = (idx, field, value) => {
    const updated = [...formData.workflowTemplate];
    updated[idx][field] = value;
    setFormData({ ...formData, workflowTemplate: updated });
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        name: formData.name,
        serviceCode: formData.serviceCode || undefined,
        category: formData.category,
        description: formData.description,
        pricingModel: {
          unitOfMeasurement: formData.unitOfMeasurement,
          basePrice: Number(formData.basePrice || 0),
          minimumOrderQuantity: Number(formData.minimumOrderQuantity || 1)
        },
        workflowTemplate: formData.workflowTemplate
      };

      if (editingService) {
        await crmService.updateService(editingService._id, payload);
      } else {
        await crmService.createService(payload);
      }

      setIsModalOpen(false);
      fetchServices();
    } catch (err) {
      alert(err?.message ? t(err.message) : t('Error saving service'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm(t('Are you sure you want to delete this printing service catalog item?'))) return;
    try {
      await crmService.deleteService(id);
      fetchServices();
    } catch (err) {
      alert(err?.message ? t(err.message) : t('Failed to delete service'));
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', maximumFractionDigits: 2 }).format(val || 0);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-primary-500" />
            {t('Printing Services Catalog')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('Configure printing product offerings, baseline pricing models, and standard production routing templates.')}
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          {t('Add Service')}
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
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchServices()}
            placeholder={t('Search services by name or code...')}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          >
            {SERVICE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{t(c.label)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          {t('Loading printing services...')}
        </div>
      ) : services.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('No services found')}
          description={t('Register your printing offerings such as book printing, packaging, or flex banners.')}
          actionLabel={t('Add Service')}
          onAction={handleOpenCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((srv) => (
            <div
              key={srv._id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-primary-300 dark:hover:border-primary-800 transition"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded-md">
                    {srv.serviceCode}
                  </span>
                  <Badge variant={srv.status === 'active' ? 'success' : 'neutral'}>
                    {t(srv.status)}
                  </Badge>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">{srv.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {srv.description ? t(srv.description) : t('Standard printing service package with customizable specifications.')}
                </p>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('Base Price')}</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(srv.pricingModel?.basePrice)} / {t(srv.pricingModel?.unitOfMeasurement || 'unit')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('Min Order')}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {srv.pricingModel?.minimumOrderQuantity || 1} {t(srv.pricingModel?.unitOfMeasurement || 'units')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Workflow template preview & actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setViewingWorkflowService(srv)}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1.5"
                >
                  <Workflow className="w-3.5 h-3.5" />
                  {srv.workflowTemplate?.length || 0} {t('Routing Stages')}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(srv)}
                    title={t('Edit Service')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteService(srv._id)}
                    title={t('Delete Service')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Service Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? `${t('Edit Service:')} ${editingService.serviceCode}` : t('Register New Printing Service')}
      >
        <form onSubmit={handleSaveService} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('Service Title *')}
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Hardcover Book Binding"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('Service Category')}
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="offset_printing">{t('Offset Press Printing')}</option>
                <option value="digital_printing">{t('Digital Printing')}</option>
                <option value="large_format">{t('Large Format / Banner')}</option>
                <option value="packaging">{t('Packaging & Cartons')}</option>
                <option value="finishing_service">{t('Finishing Services')}</option>
                <option value="other">{t('Other Printing')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('Base Unit Price (ETB) *')}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('Unit of Measurement')}
              </label>
              <select
                value={formData.unitOfMeasurement}
                onChange={(e) => setFormData({ ...formData, unitOfMeasurement: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="copy">{t('Copy')}</option>
                <option value="piece">{t('Piece')}</option>
                <option value="sqm">{t('Square Meter (sqm)')}</option>
                <option value="sheet">{t('Sheet')}</option>
                <option value="pack">{t('Pack')}</option>
                <option value="box">{t('Box')}</option>
                <option value="roll">{t('Roll')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t('Description & Specifications Summary')}
            </label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Standard offset printing with CMYK colors, UV coating options, and saddle stitch."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Workflow Template Routing Steps Builder */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Workflow className="w-3.5 h-3.5 text-primary-500" /> {t('Default Production Workflow Template')}
                </h4>
                <p className="text-[11px] text-slate-400">{t('Stages instantiated when orders of this service are sent to production')}</p>
              </div>
              <button
                type="button"
                onClick={handleAddWorkflowStep}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-300 hover:bg-primary-100"
              >
                {t('+ Add Stage')}
              </button>
            </div>

            <div className="space-y-2">
              {formData.workflowTemplate.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="font-mono font-bold text-slate-400 w-5 text-center">{step.sequence}.</span>
                  <input
                    type="text"
                    required
                    placeholder={t('Stage Name (e.g. Lamination)')}
                    value={step.stageName}
                    onChange={(e) => handleWorkflowStepChange(idx, 'stageName', e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                  />
                  <input
                    type="number"
                    min="1"
                    title={t('Estimated minutes')}
                    placeholder={t('Mins')}
                    value={step.estimatedDurationMinutes}
                    onChange={(e) => handleWorkflowStepChange(idx, 'estimatedDurationMinutes', Number(e.target.value))}
                    className="w-16 px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                  />
                  <span className="text-[11px] text-slate-400">{t('min')}</span>
                  {formData.workflowTemplate.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveWorkflowStep(idx)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            >
              {t('Cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
            >
              {submitting ? t('Saving...') : editingService ? t('Update Service') : t('Create Service')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Workflow Template Preview Modal */}
      {viewingWorkflowService && (
        <Modal
          isOpen={Boolean(viewingWorkflowService)}
          onClose={() => setViewingWorkflowService(null)}
          title={`${t('Routing Sequence:')} ${viewingWorkflowService.name}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('When an order for this service is approved for press, the following sequential stages will be auto-generated in the Production Job order:')}
            </p>

            <div className="space-y-2.5">
              {viewingWorkflowService.workflowTemplate?.map((step) => (
                <div key={step.sequence} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary-500 text-white font-bold flex items-center justify-center text-xs">
                      {step.sequence}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{step.stageName}</span>
                      <span className="text-[11px] text-slate-400 block capitalize">{t('Machine Type:')} {t(step.defaultMachineCategory.replace('_', ' '))}</span>
                    </div>
                  </div>
                  <span className="font-mono text-slate-500 text-xs font-medium">
                    ~{step.estimatedDurationMinutes} {t('mins')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

