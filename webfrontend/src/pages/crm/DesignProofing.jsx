import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import crmService from '../../services/crmService';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  Palette,
  Upload,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  Clock,
  Eye,
  ExternalLink,
  AlertCircle,
  Plus,
  User,
  Building2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

const DESIGN_STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'in_design', label: 'In Design' },
  { value: 'proof_submitted', label: 'Proof Submitted' },
  { value: 'revision_requested', label: 'Revision Requested' },
  { value: 'approved_for_press', label: 'Approved for Press' }
];

export default function DesignProofing() {
  const { t } = useTranslation();

  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [uploadModalDesign, setUploadModalDesign] = useState(null);
  const [reviewModalDesign, setReviewModalDesign] = useState(null);
  const [historyModalDesign, setHistoryModalDesign] = useState(null);

  // Form States
  const [uploadForm, setUploadForm] = useState({
    fileUrl: '',
    remarks: ''
  });

  const [reviewForm, setReviewForm] = useState({
    versionId: '',
    status: 'client_approved', // or 'client_rejected'
    clientFeedback: ''
  });

  const fetchDesigns = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await crmService.getDesigns(params);
      setDesigns(res.data?.designs || res.designs || []);
    } catch (err) {
      setError(err?.message || 'Failed to fetch pre-press designs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesigns();
  }, [statusFilter]);

  const handleOpenUploadModal = (design) => {
    setUploadModalDesign(design);
    setUploadForm({
      fileUrl: '',
      remarks: ''
    });
  };

  const handleSaveVersion = async (e) => {
    e.preventDefault();
    if (!uploadModalDesign) return;
    try {
      setSubmitting(true);
      await crmService.addDesignVersion(uploadModalDesign._id, {
        fileUrl: uploadForm.fileUrl,
        remarks: uploadForm.remarks
      });
      setUploadModalDesign(null);
      fetchDesigns();
      alert('New artwork proof version uploaded successfully!');
    } catch (err) {
      alert(err?.message || 'Failed to upload version');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReviewModal = (design) => {
    setReviewModalDesign(design);
    const latestVersion = design.versions?.[design.versions.length - 1];
    setReviewForm({
      versionId: latestVersion?._id || '',
      status: 'client_approved',
      clientFeedback: ''
    });
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!reviewModalDesign || !reviewForm.versionId) return;
    try {
      setSubmitting(true);
      await crmService.reviewDesignVersion(reviewModalDesign._id, reviewForm.versionId, {
        status: reviewForm.status,
        clientFeedback: reviewForm.clientFeedback
      });
      setReviewModalDesign(null);
      fetchDesigns();
      alert(reviewForm.status === 'client_approved' ? 'Design approved for production run!' : 'Revision request logged');
    } catch (err) {
      alert(err?.message || 'Failed to review design version');
    } finally {
      setSubmitting(false);
    }
  };

  const getDesignStatusVariant = (status) => {
    switch (status) {
      case 'in_design': return 'warning';
      case 'proof_submitted': return 'indigo';
      case 'revision_requested': return 'danger';
      case 'approved_for_press': return 'success';
      default: return 'neutral';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Palette className="w-7 h-7 text-primary-500" />
            Pre-press Design & Proofing
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage artwork versions, client proofs, and digital sign-offs before jobs reach the printing press.
          </p>
        </div>
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
            onKeyDown={(e) => e.key === 'Enter' && fetchDesigns()}
            placeholder="Search by design # or remarks..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          >
            {DESIGN_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Designs Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          Loading pre-press proofing records...
        </div>
      ) : designs.length === 0 ? (
        <EmptyState
          icon={Palette}
          title="No design jobs found"
          description="Design proofing records are automatically initialized when sales orders are created with an assigned designer."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {designs.map((dsg) => {
            const latestVersion = dsg.versions?.[dsg.versions.length - 1];
            const isApproved = dsg.status === 'approved_for_press';

            return (
              <div
                key={dsg._id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-primary-300 dark:hover:border-primary-800 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded-md">
                      {dsg.designNumber}
                    </span>
                    <Badge variant={getDesignStatusVariant(dsg.status)}>
                      {dsg.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 font-medium">Order Reference:</div>
                    <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {dsg.order?.orderNumber || 'SO-N/A'}
                    </div>
                  </div>

                  {/* Designer & Specs */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span>Designer:</span>
                      <span className="font-bold">
                        {dsg.assignedDesigner ? `${dsg.assignedDesigner.firstName} ${dsg.assignedDesigner.lastName}` : 'Unassigned'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Color / Bleed:</span>
                      <span>{dsg.specifications?.colorProfile || 'CMYK'} • {dsg.specifications?.bleedMm || 3}mm</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Resolution:</span>
                      <span>{dsg.specifications?.resolutionDpi || 300} DPI</span>
                    </div>
                  </div>

                  {/* Latest Proof Version Box */}
                  <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-primary-500" />
                        {latestVersion ? `Version v${latestVersion.versionNumber}` : 'No Proof Uploaded'}
                      </span>
                      {latestVersion && (
                        <a
                          href={latestVersion.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary-600 hover:text-primary-700 flex items-center gap-1 font-semibold text-[11px]"
                        >
                          View File <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {latestVersion?.clientFeedback && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                        "{latestVersion.clientFeedback}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions Ribbon */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setHistoryModalDesign(dsg)}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-primary-600"
                  >
                    {dsg.versions?.length || 0} Versions
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenUploadModal(dsg)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      New Proof
                    </button>

                    {latestVersion && !isApproved && (
                      <button
                        onClick={() => handleOpenReviewModal(dsg)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Client Review
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload New Proof Version Modal */}
      {uploadModalDesign && (
        <Modal
          isOpen={Boolean(uploadModalDesign)}
          onClose={() => setUploadModalDesign(null)}
          title={`Upload New Proof Version: ${uploadModalDesign.designNumber}`}
        >
          <form onSubmit={handleSaveVersion} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Print-ready Artwork File URL / Cloudinary Link *
              </label>
              <input
                type="url"
                required
                placeholder="https://res.cloudinary.com/.../proof_v2.pdf"
                value={uploadForm.fileUrl}
                onChange={(e) => setUploadForm({ ...uploadForm, fileUrl: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Link to high-resolution print PDF, EPS, or TIFF file for client proofing.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Designer Notes / Revision Summary
              </label>
              <textarea
                rows="3"
                placeholder="e.g. Adjusted margins to 5mm and fixed Pantone 186C color registration."
                value={uploadForm.remarks}
                onChange={(e) => setUploadForm({ ...uploadForm, remarks: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setUploadModalDesign(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
              >
                {submitting ? 'Uploading...' : 'Submit Proof Version'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Client Review Sign-off Modal */}
      {reviewModalDesign && (
        <Modal
          isOpen={Boolean(reviewModalDesign)}
          onClose={() => setReviewModalDesign(null)}
          title={`Client Review Sign-off: ${reviewModalDesign.designNumber}`}
        >
          <form onSubmit={handleSaveReview} className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Record the client's confirmation or revision notes for the latest proof version.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReviewForm({ ...reviewForm, status: 'client_approved' })}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                  reviewForm.status === 'client_approved'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>Approve for Press</span>
              </button>

              <button
                type="button"
                onClick={() => setReviewForm({ ...reviewForm, status: 'client_rejected' })}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                  reviewForm.status === 'client_rejected'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <XCircle className="w-5 h-5 text-rose-500" />
                <span>Request Revisions</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Client Feedback & Comments
              </label>
              <textarea
                rows="3"
                placeholder={
                  reviewForm.status === 'client_approved'
                    ? 'e.g. Approved via email by customer Tigist Haile.'
                    : 'e.g. Please increase logo size on front cover by 20%.'
                }
                value={reviewForm.clientFeedback}
                onChange={(e) => setReviewForm({ ...reviewForm, clientFeedback: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReviewModalDesign(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Confirm Review'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Version History Drawer Modal */}
      {historyModalDesign && (
        <Modal
          isOpen={Boolean(historyModalDesign)}
          onClose={() => setHistoryModalDesign(null)}
          title={`Version History: ${historyModalDesign.designNumber}`}
        >
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {historyModalDesign.versions?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No versions uploaded yet.</p>
            ) : (
              historyModalDesign.versions.map((ver) => (
                <div
                  key={ver._id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      Version v{ver.versionNumber}
                    </span>
                    <Badge variant={ver.status === 'client_approved' ? 'success' : ver.status === 'client_rejected' ? 'danger' : 'warning'}>
                      {ver.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    Uploaded {new Date(ver.uploadedAt).toLocaleString()}
                  </div>

                  {ver.clientFeedback && (
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300">
                      <strong>Client Feedback:</strong> {ver.clientFeedback}
                    </div>
                  )}

                  <div className="pt-1">
                    <a
                      href={ver.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700"
                    >
                      Download Artwork File <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

