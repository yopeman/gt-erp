import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import api from '../../services/api';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Phone,
  Mail,
  Building,
  Briefcase,
  Trash2,
  Edit,
  RefreshCw,
  FileText,
  GraduationCap,
  Plus,
  Eye,
  ShieldCheck
} from 'lucide-react';

export default function Employees() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const canManage = hasRole(['admin', 'hr']);

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Registration Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Detail Modal State
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [eduModalOpen, setEduModalOpen] = useState(false);

  const [docForm, setDocForm] = useState({
    type: 'contract',
    name: 'Employment Contract',
    url: 'https://gtprinting.com/docs/contract-sample.pdf'
  });

  const [eduForm, setEduForm] = useState({
    educationLevel: 'degree',
    graduationUniversity: 'Addis Ababa University',
    graduationYear: 2022
  });

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    department: 'Press/Offset',
    position: '',
    type: 'full time',
    gender: 'male',
    branch: 'Main Factory',
    baseSalary: '',
    status: 'active'
  });

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await api.get('/employees');
      if (response.success && Array.isArray(response.data)) {
        setEmployees(response.data);
      } else if (Array.isArray(response)) {
        setEmployees(response);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegisterEmployee = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        baseSalary: formData.baseSalary ? Number(formData.baseSalary) : 0
      };

      const response = await api.post('/employees', payload);
      if (response.success) {
        setIsModalOpen(false);
        setFormData({
          fullName: '',
          email: '',
          phoneNumber: '',
          department: 'Press/Offset',
          position: '',
          type: 'full time',
          gender: 'male',
          branch: 'Main Factory',
          baseSalary: '',
          status: 'active'
        });
        await fetchEmployees();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to register employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await api.delete(`/employees/${id}`);
      setEmployees((prev) => prev.filter((emp) => emp._id !== id));
      if (selectedEmployee?._id === id) setIsDetailOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to delete employee');
    }
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    try {
      const response = await api.post(`/employees/${selectedEmployee._id}/documents`, docForm);
      if (response.success) {
        setDocModalOpen(false);
        setSelectedEmployee((prev) => ({ ...prev, documents: response.data }));
        await fetchEmployees();
      }
    } catch (err) {
      alert(err.message || 'Failed to add document');
    }
  };

  const handleAddEducation = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    try {
      const response = await api.post(`/employees/${selectedEmployee._id}/educations`, eduForm);
      if (response.success) {
        setEduModalOpen(false);
        setSelectedEmployee((prev) => ({ ...prev, educations: response.data }));
        await fetchEmployees();
      }
    } catch (err) {
      alert(err.message || 'Failed to add education record');
    }
  };

  // Filtered employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = 
      emp.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      emp.email?.toLowerCase().includes(search.toLowerCase()) ||
      emp.position?.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter ? emp.department === deptFilter : true;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-500" />
            <span>{t('nav.employees')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Section 2.2 • Complete workforce directory, profiles, documents, and credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchEmployees}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Refresh employees"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canManage && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('actions.createEmployee')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or position..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Departments</option>
          <option value="Pre-press">Pre-press</option>
          <option value="Press/Offset">Press / Offset</option>
          <option value="Digital Print">Digital Print</option>
          <option value="Finishing">Post-press / Finishing</option>
          <option value="Store">Store & Inventory</option>
          <option value="Finance">Finance</option>
          <option value="HR">HR & Admin</option>
          <option value="Sales">Sales & Marketing</option>
        </select>
      </div>

      {/* Data Presentation */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Fetching workforce records from backend...
        </div>
      ) : filteredEmployees.length === 0 ? (
        <EmptyState
          title="No employees registered"
          message="No employees match your filter or the database is currently empty. Add your first employee to initiate records."
          actionText={canManage ? t('actions.createEmployee') : null}
          onAction={() => setIsModalOpen(true)}
          icon={Users}
        />
      ) : (
        <>
          {/* MOBILE CARD DECK (< md) */}
          <div className="block md:hidden space-y-3">
            {filteredEmployees.map((emp) => (
              <div 
                key={emp._id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{emp.fullName}</h3>
                    <p className="text-xs text-primary-500 font-medium">{emp.position}</p>
                  </div>
                  <Badge status={emp.status} text={emp.status} />
                </div>

                <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 border-y border-slate-100 dark:border-slate-700/60 py-2">
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>Dept: <strong>{emp.department}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{emp.phoneNumber}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setIsDetailOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-600 bg-primary-50 dark:bg-primary-950/60 hover:bg-primary-100 transition flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Profile</span>
                  </button>

                  {canManage && (
                    <button
                      onClick={() => handleDeleteEmployee(emp._id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('actions.delete')}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP TABLE (>= md) */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredEmployees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{emp.fullName}</div>
                      <div className="text-xs text-slate-400">{emp.email}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                      {emp.department}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {emp.position}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {emp.phoneNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 capitalize">
                      {emp.type}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={emp.status} text={emp.status} />
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setIsDetailOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-primary-600 bg-primary-50 dark:bg-primary-950/60 hover:bg-primary-100 rounded-lg transition"
                      >
                        Profile
                      </button>
                      {canManage && (
                        <button
                          onClick={() => handleDeleteEmployee(emp._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                          title="Delete employee"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Employee Profile Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedEmployee ? `${selectedEmployee.fullName} - Employee Profile` : 'Employee Details'}
        maxWidth="max-w-3xl"
      >
        {selectedEmployee && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {selectedEmployee.fullName}
                </h3>
                <p className="text-xs text-primary-500 font-bold">
                  {selectedEmployee.position} • {selectedEmployee.department}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedEmployee.email} • {selectedEmployee.phoneNumber}
                </p>
              </div>
              <Badge status={selectedEmployee.status} text={selectedEmployee.status} />
            </div>

            {/* Employment Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Branch</span>
                <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedEmployee.branch || 'Main Plant'}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Type</span>
                <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 capitalize">{selectedEmployee.type}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Base Salary</span>
                <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedEmployee.baseSalary?.toLocaleString() || '0'} ETB</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Gender</span>
                <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 capitalize">{selectedEmployee.gender || 'Not specified'}</div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary-500" />
                  <span>Contracts & Documents ({selectedEmployee.documents?.length || 0})</span>
                </h4>
                {canManage && (
                  <button
                    onClick={() => setDocModalOpen(true)}
                    className="px-2.5 py-1 text-xs font-semibold text-primary-600 bg-primary-50 dark:bg-primary-950/60 rounded-lg hover:bg-primary-100 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Document</span>
                  </button>
                )}
              </div>

              {!selectedEmployee.documents || selectedEmployee.documents.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                  No documents on file.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedEmployee.documents.map((doc, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{doc.name || 'Document'}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{doc.type}</div>
                      </div>
                      {doc.url && (
                        <a href={doc.url} target="_blank" rel="noreferrer" className="text-primary-500 hover:underline text-[11px] font-semibold">
                          View
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Educations Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-primary-500" />
                  <span>Educations ({selectedEmployee.educations?.length || 0})</span>
                </h4>
                {canManage && (
                  <button
                    onClick={() => setEduModalOpen(true)}
                    className="px-2.5 py-1 text-xs font-semibold text-primary-600 bg-primary-50 dark:bg-primary-950/60 rounded-lg hover:bg-primary-100 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Education</span>
                  </button>
                )}
              </div>

              {!selectedEmployee.educations || selectedEmployee.educations.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                  No education records registered.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedEmployee.educations.map((edu, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                      <div className="font-bold text-slate-800 dark:text-slate-200 capitalize">{edu.educationLevel}</div>
                      <div className="text-[11px] text-slate-400">{edu.graduationUniversity} ({edu.graduationYear})</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add Document Submodal */}
      <Modal
        isOpen={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        title="Add Employee Document / Contract"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddDocument} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Document Name *
            </label>
            <input
              type="text"
              required
              value={docForm.name}
              onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Document Type *
            </label>
            <select
              value={docForm.type}
              onChange={(e) => setDocForm({ ...docForm, type: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            >
              <option value="contract">Employment Contract</option>
              <option value="nationalId">National ID / Passport</option>
              <option value="certificate">Technical Certification</option>
              <option value="warranty">Warranty Agreement</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Document URL / File Path
            </label>
            <input
              type="text"
              value={docForm.url}
              onChange={(e) => setDocForm({ ...docForm, url: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setDocModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-primary-500 text-white font-bold text-xs rounded-xl"
            >
              Save Document
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Education Submodal */}
      <Modal
        isOpen={eduModalOpen}
        onClose={() => setEduModalOpen(false)}
        title="Add Education Qualification"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddEducation} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Education Level *
            </label>
            <select
              value={eduForm.educationLevel}
              onChange={(e) => setEduForm({ ...eduForm, educationLevel: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            >
              <option value="degree">Bachelor Degree</option>
              <option value="diploma">Technical Diploma (TVET)</option>
              <option value="master">Master's Degree</option>
              <option value="highschool">High School Completion</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              University / Institute *
            </label>
            <input
              type="text"
              required
              value={eduForm.graduationUniversity}
              onChange={(e) => setEduForm({ ...eduForm, graduationUniversity: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Graduation Year *
            </label>
            <input
              type="number"
              required
              value={eduForm.graduationYear}
              onChange={(e) => setEduForm({ ...eduForm, graduationYear: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setEduModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-primary-500 text-white font-bold text-xs rounded-xl"
            >
              Save Education
            </button>
          </div>
        </form>
      </Modal>

      {/* Registration Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('actions.createEmployee')}
        maxWidth="max-w-2xl"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {formError}
          </div>
        )}

        <form onSubmit={handleRegisterEmployee} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Abebe Kebede"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="abebe@gtprinting.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                required
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="+251 911 234 567"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Department *
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="Pre-press">Pre-press</option>
                <option value="Press/Offset">Press / Offset</option>
                <option value="Digital Print">Digital Print</option>
                <option value="Finishing">Post-press / Finishing</option>
                <option value="Store">Store & Inventory</option>
                <option value="Finance">Finance</option>
                <option value="HR">HR & Admin</option>
                <option value="Sales">Sales & Marketing</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Job Position *
              </label>
              <input
                type="text"
                required
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                placeholder="Offset Press Operator"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Employment Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="full time">Full Time</option>
                <option value="part time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
                <option value="remote">Remote</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Branch Location
              </label>
              <select
                name="branch"
                value={formData.branch}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="Main Factory">Main Factory Plant</option>
                <option value="Head Office">Head Office (Bole)</option>
                <option value="Branch 2">Retail & Quick-Print Branch</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Base Monthly Salary (ETB)
              </label>
              <input
                type="number"
                name="baseSalary"
                value={formData.baseSalary}
                onChange={handleInputChange}
                placeholder="15000"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Registering...' : t('actions.create')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
