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
  ShieldCheck,
  MapPin,
  CreditCard,
  Shield,
  UserCheck,
  Calendar,
  AlertCircle
} from 'lucide-react';

const INITIAL_FORM_STATE = {
  fullName: '',
  email: '',
  phoneNumber: '',
  nationalId: '',
  gender: 'male',
  dateOfBirth: '',
  department: 'Press/Offset',
  position: '',
  type: 'full time',
  branch: 'Main Factory',
  baseSalary: '',
  hiredAt: new Date().toISOString().split('T')[0],
  manager: '',
  status: 'active',
  detailAddress: {
    location: '',
    home: ''
  },
  emergency: {
    contactName: '',
    contactPhone: '',
    contactRelationship: '',
    warrantyRelationshipToEmployee: ''
  },
  warranty: {
    fullName: '',
    phone: '',
    nationalId: '',
    relationshipToEmployee: ''
  },
  accountDetails: {
    holderName: '',
    number: '',
    status: 'active',
    isPrimary: true
  }
};

export default function Employees() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const canManage = hasRole(['admin', 'hr']);

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Form Modal State (Create & Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'address' | 'emergency' | 'bank'
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // Detail Modal State
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [profileTab, setProfileTab] = useState('overview'); // 'overview' | 'address' | 'emergency' | 'bank' | 'docs' | 'education'
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [eduModalOpen, setEduModalOpen] = useState(false);

  const [docForm, setDocForm] = useState({
    type: 'contract',
    name: 'Employment Contract',
    url: ''
  });

  const [eduForm, setEduForm] = useState({
    educationLevel: 'degree',
    graduationUniversity: 'Addis Ababa University',
    graduationYear: 2022
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

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    setFormData(INITIAL_FORM_STATE);
    setActiveTab('personal');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (emp) => {
    setModalMode('edit');
    setEditingId(emp._id);
    setFormData({
      fullName: emp.fullName || '',
      email: emp.email || '',
      phoneNumber: emp.phoneNumber || '',
      nationalId: emp.nationalId || '',
      gender: emp.gender || 'male',
      dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth).toISOString().split('T')[0] : '',
      department: emp.department || 'Press/Offset',
      position: emp.position || '',
      type: emp.type || 'full time',
      branch: emp.branch || 'Main Factory',
      baseSalary: emp.baseSalary !== undefined ? String(emp.baseSalary) : '',
      hiredAt: emp.hiredAt ? new Date(emp.hiredAt).toISOString().split('T')[0] : '',
      manager: emp.manager?._id || emp.manager || '',
      status: emp.status || 'active',
      detailAddress: {
        location: emp.detailAddress?.location || '',
        home: emp.detailAddress?.home || ''
      },
      emergency: {
        contactName: emp.emergency?.contactName || '',
        contactPhone: emp.emergency?.contactPhone || '',
        contactRelationship: emp.emergency?.contactRelationship || '',
        warrantyRelationshipToEmployee: emp.emergency?.warrantyRelationshipToEmployee || ''
      },
      warranty: {
        fullName: emp.warranty?.fullName || '',
        phone: emp.warranty?.phone || '',
        nationalId: emp.warranty?.nationalId || '',
        relationshipToEmployee: emp.warranty?.relationshipToEmployee || ''
      },
      accountDetails: {
        holderName: emp.accountDetails?.holderName || '',
        number: emp.accountDetails?.number || '',
        status: emp.accountDetails?.status || 'active',
        isPrimary: emp.accountDetails?.isPrimary ?? true
      }
    });
    setActiveTab('personal');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNestedInputChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        nationalId: formData.nationalId.trim(),
        gender: formData.gender,
        department: formData.department,
        position: formData.position.trim(),
        type: formData.type,
        branch: formData.branch,
        status: formData.status,
        baseSalary: formData.baseSalary !== '' ? Number(formData.baseSalary) : 0,
        manager: formData.manager || null,
        detailAddress: formData.detailAddress,
        emergency: formData.emergency,
        warranty: formData.warranty,
        accountDetails: formData.accountDetails
      };

      if (formData.dateOfBirth) {
        payload.dateOfBirth = formData.dateOfBirth;
      }
      if (formData.hiredAt) {
        payload.hiredAt = formData.hiredAt;
      }

      let response;
      if (modalMode === 'create') {
        response = await api.post('/employees', payload);
      } else {
        response = await api.put(`/employees/${editingId}`, payload);
      }

      if (response.success || response.data) {
        setIsModalOpen(false);
        const updatedRecord = response.data || payload;
        if (selectedEmployee && selectedEmployee._id === editingId) {
          setSelectedEmployee((prev) => ({ ...prev, ...updatedRecord }));
        }
        await fetchEmployees();
      }
    } catch (err) {
      setFormError(err.message || `Failed to ${modalMode} employee`);
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
        setDocForm({ type: 'contract', name: '', url: '' });
        setSelectedEmployee((prev) => ({ ...prev, documents: response.data }));
        await fetchEmployees();
      }
    } catch (err) {
      alert(err.message || 'Failed to add document');
    }
  };

  const handleDocumentFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setDocForm((prev) => ({
          ...prev,
          name: prev.name || file.name,
          url: reader.result
        }));
      };
      reader.readAsDataURL(file);
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
      emp.position?.toLowerCase().includes(search.toLowerCase()) ||
      emp.nationalId?.toLowerCase().includes(search.toLowerCase()) ||
      emp.phoneNumber?.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter ? emp.department === deptFilter : true;
    const matchesStatus = statusFilter ? emp.status === statusFilter : true;
    return matchesSearch && matchesDept && matchesStatus;
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
            Section 2.2 • Complete enterprise workforce directory, addresses, emergency contacts, warranty, and accounts.
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
              onClick={handleOpenCreateModal}
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
            placeholder="Search by name, email, position, ID, or phone..."
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

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
          <option value="terminated">Terminated</option>
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
          onAction={handleOpenCreateModal}
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
                    {emp.nationalId && (
                      <span className="text-[10px] text-slate-400 font-mono">ID: {emp.nationalId}</span>
                    )}
                  </div>
                  <Badge status={emp.status} text={emp.status} />
                </div>

                <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 border-y border-slate-100 dark:border-slate-700/60 py-2">
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>Dept: <strong>{emp.department}</strong> ({emp.branch || 'Main Plant'})</span>
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
                      setProfileTab('overview');
                      setIsDetailOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-600 bg-primary-50 dark:bg-primary-950/60 hover:bg-primary-100 transition flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Profile</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {canManage && (
                      <button
                        onClick={() => handleOpenEditModal(emp)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1"
                        title="Edit employee"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    )}
                    {canManage && (
                      <button
                        onClick={() => handleDeleteEmployee(emp._id)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t('actions.delete')}</span>
                      </button>
                    )}
                  </div>
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
                  <th className="px-4 py-3">National ID</th>
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
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                      {emp.nationalId || '-'}
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
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setProfileTab('overview');
                          setIsDetailOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-primary-600 bg-primary-50 dark:bg-primary-950/60 hover:bg-primary-100 rounded-lg transition"
                      >
                        Profile
                      </button>
                      {canManage && (
                        <button
                          onClick={() => handleOpenEditModal(emp)}
                          className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-lg transition"
                          title="Edit employee"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
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
        maxWidth="max-w-4xl"
      >
        {selectedEmployee && (
          <div className="space-y-5">
            {/* Header Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    {selectedEmployee.fullName}
                  </h3>
                  <Badge status={selectedEmployee.status} text={selectedEmployee.status} />
                </div>
                <p className="text-xs text-primary-500 font-bold mt-0.5">
                  {selectedEmployee.position} • {selectedEmployee.department} ({selectedEmployee.branch || 'Main Plant'})
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedEmployee.email} • {selectedEmployee.phoneNumber}
                  {selectedEmployee.nationalId ? ` • ID: ${selectedEmployee.nationalId}` : ''}
                </p>
              </div>

              {canManage && (
                <button
                  onClick={() => {
                    handleOpenEditModal(selectedEmployee);
                  }}
                  className="px-3.5 py-2 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>

            {/* Profile Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 gap-1 overflow-x-auto text-xs">
              {[
                { id: 'overview', label: 'Overview & Job' },
                { id: 'address', label: 'Address & Home' },
                { id: 'emergency', label: 'Emergency & Warranty' },
                { id: 'bank', label: 'Bank Account' },
                { id: 'docs', label: `Documents (${selectedEmployee.documents?.length || 0})` },
                { id: 'education', label: `Education (${selectedEmployee.educations?.length || 0})` }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setProfileTab(tab.id)}
                  className={`px-3 py-2 font-bold whitespace-nowrap transition border-b-2 ${
                    profileTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Overview & Job */}
            {profileTab === 'overview' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Branch</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedEmployee.branch || 'Main Plant'}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Employment Type</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 capitalize">{selectedEmployee.type}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Base Monthly Salary</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedEmployee.baseSalary?.toLocaleString() || '0'} ETB</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Gender</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 capitalize">{selectedEmployee.gender || 'Not specified'}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Date of Birth</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedEmployee.dateOfBirth ? new Date(selectedEmployee.dateOfBirth).toLocaleDateString() : 'Not registered'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Hired Date</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedEmployee.hiredAt ? new Date(selectedEmployee.hiredAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 col-span-2">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Direct Supervisor / Manager</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedEmployee.manager?.fullName
                      ? `${selectedEmployee.manager.fullName} (${selectedEmployee.manager.position || 'Supervisor'})`
                      : 'None assigned'}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Address */}
            {profileTab === 'address' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary-500" />
                    City / Subcity / Woreda
                  </span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {selectedEmployee.detailAddress?.location || 'Not provided'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-primary-500" />
                    House / Landmark / Home Address
                  </span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {selectedEmployee.detailAddress?.home || 'Not provided'}
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: Emergency & Warranty */}
            {profileTab === 'emergency' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Emergency Contact */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <Phone className="w-4 h-4 text-amber-500" />
                    <span>Emergency Contact</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-slate-500">Contact Name: <strong className="text-slate-800 dark:text-slate-200">{selectedEmployee.emergency?.contactName || 'N/A'}</strong></div>
                    <div className="text-slate-500">Phone Number: <strong className="text-slate-800 dark:text-slate-200">{selectedEmployee.emergency?.contactPhone || 'N/A'}</strong></div>
                    <div className="text-slate-500">Relationship: <strong className="text-slate-800 dark:text-slate-200">{selectedEmployee.emergency?.contactRelationship || 'N/A'}</strong></div>
                    {selectedEmployee.emergency?.warrantyRelationshipToEmployee && (
                      <div className="text-slate-500">Warranty Note: <strong className="text-slate-800 dark:text-slate-200">{selectedEmployee.emergency.warrantyRelationshipToEmployee}</strong></div>
                    )}
                  </div>
                </div>

                {/* Warranty Guarantor */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span>Warranty Guarantor (Legal Bond)</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-slate-500">Guarantor Name: <strong className="text-slate-800 dark:text-slate-200">{selectedEmployee.warranty?.fullName || 'N/A'}</strong></div>
                    <div className="text-slate-500">Guarantor Phone: <strong className="text-slate-800 dark:text-slate-200">{selectedEmployee.warranty?.phone || 'N/A'}</strong></div>
                    <div className="text-slate-500">National ID / Kebele: <strong className="text-slate-800 dark:text-slate-200 font-mono">{selectedEmployee.warranty?.nationalId || 'N/A'}</strong></div>
                    <div className="text-slate-500">Relationship to Employee: <strong className="text-slate-800 dark:text-slate-200">{selectedEmployee.warranty?.relationshipToEmployee || 'N/A'}</strong></div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Bank Account */}
            {profileTab === 'bank' && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <CreditCard className="w-4 h-4 text-primary-500" />
                  <span>Disbursement Bank Account</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Account Holder</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">
                      {selectedEmployee.accountDetails?.holderName || selectedEmployee.fullName}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Account Number</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm font-mono mt-0.5">
                      {selectedEmployee.accountDetails?.number || 'No account number linked'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Status & Primary</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge status={selectedEmployee.accountDetails?.status || 'active'} text={selectedEmployee.accountDetails?.status || 'Active'} />
                      {selectedEmployee.accountDetails?.isPrimary && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">Primary</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 5: Documents */}
            {profileTab === 'docs' && (
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
                            View / Download
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 6: Education */}
            {profileTab === 'education' && (
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
            )}
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
              placeholder="e.g. Employment Contract 2026"
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
              Upload Document File (PDF / Image)
            </label>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={handleDocumentFileUpload}
              className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 dark:file:bg-primary-950/60 dark:file:text-primary-300 hover:file:bg-primary-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Or Document URL / Web Link
            </label>
            <input
              type="text"
              value={docForm.url}
              onChange={(e) => setDocForm({ ...docForm, url: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              placeholder="https://... or uploaded data"
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
              <option value="doctorate">Doctorate (PhD)</option>
              <option value="high school">High School Completion</option>
              <option value="other">Other Certification</option>
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

      {/* Unified Tabbed Employee Registration & Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? t('actions.createEmployee') : `Edit Employee: ${formData.fullName}`}
        maxWidth="max-w-3xl"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Modal Tabs Header */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 gap-2 mb-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`px-3 py-2 font-bold text-xs flex items-center gap-1.5 border-b-2 whitespace-nowrap transition ${
              activeTab === 'personal'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>1. Personal & Job</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('address')}
            className={`px-3 py-2 font-bold text-xs flex items-center gap-1.5 border-b-2 whitespace-nowrap transition ${
              activeTab === 'address'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>2. Address</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('emergency')}
            className={`px-3 py-2 font-bold text-xs flex items-center gap-1.5 border-b-2 whitespace-nowrap transition ${
              activeTab === 'emergency'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>3. Emergency & Warranty</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bank')}
            className={`px-3 py-2 font-bold text-xs flex items-center gap-1.5 border-b-2 whitespace-nowrap transition ${
              activeTab === 'bank'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>4. Bank Account</span>
          </button>
        </div>

        <form onSubmit={handleSaveEmployee} className="space-y-4">
          {/* TAB 1: Personal & Employment */}
          {activeTab === 'personal' && (
            <div className="space-y-4">
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
                    National / Kebele ID
                  </label>
                  <input
                    type="text"
                    name="nationalId"
                    value={formData.nationalId}
                    onChange={handleInputChange}
                    placeholder="ETH-AA-998231"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
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

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hired Date
                  </label>
                  <input
                    type="date"
                    name="hiredAt"
                    value={formData.hiredAt}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Direct Supervisor / Manager
                  </label>
                  <select
                    name="manager"
                    value={formData.manager}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">None (Top-level / Self-managed)</option>
                    {employees
                      .filter((e) => e._id !== editingId)
                      .map((e) => (
                        <option key={e._id} value={e._id}>
                          {e.fullName} ({e.department} - {e.position})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Detail Address */}
          {activeTab === 'address' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Physical residential address per Kebele registration. Essential for official labor inspection and correspondence.
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    City, Subcity & Woreda
                  </label>
                  <input
                    type="text"
                    value={formData.detailAddress.location}
                    onChange={(e) => handleNestedInputChange('detailAddress', 'location', e.target.value)}
                    placeholder="e.g. Addis Ababa, Bole Subcity, Woreda 04"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    House Number, Street or Nearby Landmark
                  </label>
                  <input
                    type="text"
                    value={formData.detailAddress.home}
                    onChange={(e) => handleNestedInputChange('detailAddress', 'home', e.target.value)}
                    placeholder="e.g. House No. 891 / Behind Edna Mall / Kebele 02"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Emergency & Warranty */}
          {activeTab === 'emergency' && (
            <div className="space-y-5">
              {/* Emergency Contact */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-amber-500" />
                  <span>Primary Emergency Contact</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Contact Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.emergency.contactName}
                      onChange={(e) => handleNestedInputChange('emergency', 'contactName', e.target.value)}
                      placeholder="e.g. Almaz Bekele"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Contact Phone Number
                    </label>
                    <input
                      type="text"
                      value={formData.emergency.contactPhone}
                      onChange={(e) => handleNestedInputChange('emergency', 'contactPhone', e.target.value)}
                      placeholder="+251 922 456 789"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Relationship to Employee
                    </label>
                    <input
                      type="text"
                      value={formData.emergency.contactRelationship}
                      onChange={(e) => handleNestedInputChange('emergency', 'contactRelationship', e.target.value)}
                      placeholder="e.g. Spouse / Mother / Brother"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Warranty Note / Additional Link
                    </label>
                    <input
                      type="text"
                      value={formData.emergency.warrantyRelationshipToEmployee}
                      onChange={(e) => handleNestedInputChange('emergency', 'warrantyRelationshipToEmployee', e.target.value)}
                      placeholder="e.g. Family representative"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* Warranty Guarantor */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Warranty Guarantor (Legal / Financial Guarantor)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Guarantor Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.warranty.fullName}
                      onChange={(e) => handleNestedInputChange('warranty', 'fullName', e.target.value)}
                      placeholder="e.g. Girma Tadesse"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Guarantor Phone
                    </label>
                    <input
                      type="text"
                      value={formData.warranty.phone}
                      onChange={(e) => handleNestedInputChange('warranty', 'phone', e.target.value)}
                      placeholder="+251 911 888 999"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Guarantor National / Kebele ID
                    </label>
                    <input
                      type="text"
                      value={formData.warranty.nationalId}
                      onChange={(e) => handleNestedInputChange('warranty', 'nationalId', e.target.value)}
                      placeholder="ETH-AA-776655"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Relationship to Employee
                    </label>
                    <input
                      type="text"
                      value={formData.warranty.relationshipToEmployee}
                      onChange={(e) => handleNestedInputChange('warranty', 'relationshipToEmployee', e.target.value)}
                      placeholder="e.g. Uncle / Colleague / Neighbor"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Bank Account */}
          {activeTab === 'bank' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                <CreditCard className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Bank account used for monthly payroll disbursement, bonuses, and overtime compensations.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={formData.accountDetails.holderName}
                    onChange={(e) => handleNestedInputChange('accountDetails', 'holderName', e.target.value)}
                    placeholder="Full name matching bank passport / ID"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={formData.accountDetails.number}
                    onChange={(e) => handleNestedInputChange('accountDetails', 'number', e.target.value)}
                    placeholder="e.g. 1000123456789 (CBE / Awash / Dashen)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Account Status
                  </label>
                  <select
                    value={formData.accountDetails.status}
                    onChange={(e) => handleNestedInputChange('accountDetails', 'status', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="active">Active (Disbursements Allowed)</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.accountDetails.isPrimary}
                      onChange={(e) => handleNestedInputChange('accountDetails', 'isPrimary', e.target.checked)}
                      className="w-4 h-4 rounded text-primary-500 focus:ring-primary-500"
                    />
                    <span>Designate as Primary Disbursement Account</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              {activeTab !== 'personal' && (
                <button
                  type="button"
                  onClick={() => {
                    const tabs = ['personal', 'address', 'emergency', 'bank'];
                    const currentIndex = tabs.indexOf(activeTab);
                    if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1]);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  ← Back
                </button>
              )}

              {activeTab !== 'bank' && (
                <button
                  type="button"
                  onClick={() => {
                    const tabs = ['personal', 'address', 'emergency', 'bank'];
                    const currentIndex = tabs.indexOf(activeTab);
                    if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1]);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-primary-600 bg-primary-50 dark:bg-primary-950/50 hover:bg-primary-100 transition"
                >
                  Next Tab →
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
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
                {submitting
                  ? modalMode === 'create'
                    ? 'Registering...'
                    : 'Saving Changes...'
                  : modalMode === 'create'
                  ? t('actions.create')
                  : 'Update Employee'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
