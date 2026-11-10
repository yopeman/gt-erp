import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import IdCardModal from '../../components/hr/IdCardModal';
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
  AlertCircle,
  Camera,
  Upload,
  User,
  Check,
  KeyRound,
  Copy,
  Boxes,
  PackageCheck,
  PackageMinus,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ExternalLink
} from 'lucide-react';

const ETHIOPIAN_BANKS = [
  'Commercial Bank of Ethiopia (CBE)',
  'Awash Bank',
  'Dashen Bank',
  'Bank of Abyssinia',
  'Cooperative Bank of Oromia',
  'Hibret Bank',
  'Nib International Bank',
  'Zemen Bank',
  'Oromia Bank',
  'Wegagen Bank',
  'Berhan Bank',
  'Bunna Bank',
  'Abay Bank',
  'Addis International Bank',
  'Enat Bank',
  'Global Bank Ethiopia',
  'Siinqee Bank',
  'Tsedey Bank',
  'Gadaa Bank',
  'Amhara Bank',
  'Telebirr',
  'CBE Birr',
  'Other'
];

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
  user: '',
  status: 'active',
  profileImage: '',
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
  accountDetails: [
    {
      bankName: 'Commercial Bank of Ethiopia (CBE)',
      holderName: '',
      number: '',
      branch: '',
      status: 'active',
      isPrimary: true
    }
  ]
};

export default function Employees() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
  const [profileTab, setProfileTab] = useState('overview'); // 'overview' | 'address' | 'emergency' | 'bank' | 'docs' | 'education' | 'store'
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [eduModalOpen, setEduModalOpen] = useState(false);

  // Store Custody & Clearance State
  const [storeClearance, setStoreClearance] = useState(null);
  const [storeRequests, setStoreRequests] = useState([]);
  const [loadingStoreData, setLoadingStoreData] = useState(false);
  const [signingClearance, setSigningClearance] = useState(false);
  const [clearanceRemarksModal, setClearanceRemarksModal] = useState({
    isOpen: false,
    status: 'rejected',
    remarks: ''
  });

  // ID Card Generator Modal State
  const [idCardEmployee, setIdCardEmployee] = useState(null);

  // Temporary Password Reset Modal State
  const [resetModalData, setResetModalData] = useState(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

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

  const fetchEmployeeStoreData = async (employeeId) => {
    if (!employeeId) return;
    setLoadingStoreData(true);
    try {
      const clearanceRes = await api.get(`/clearances?employee=${employeeId}`);
      const clearanceList =
        clearanceRes.success && Array.isArray(clearanceRes.data)
          ? clearanceRes.data
          : Array.isArray(clearanceRes)
          ? clearanceRes
          : [];
      setStoreClearance(clearanceList[0] || null);

      const requestsRes = await api.get(`/stock-requests?requestedBy=${employeeId}&limit=50`);
      const reqList =
        requestsRes.success && Array.isArray(requestsRes.data)
          ? requestsRes.data
          : Array.isArray(requestsRes)
          ? requestsRes
          : [];
      setStoreRequests(reqList);
    } catch (err) {
      console.error('Failed to load employee store custody/clearance:', err);
    } finally {
      setLoadingStoreData(false);
    }
  };

  useEffect(() => {
    if (isDetailOpen && profileTab === 'store' && selectedEmployee?._id) {
      fetchEmployeeStoreData(selectedEmployee._id);
    }
  }, [isDetailOpen, profileTab, selectedEmployee]);

  const handleUpdateStoreClearance = async (newStatus, customRemarks = '') => {
    if (!storeClearance) return;
    const storeItem = storeClearance.checklist?.find((i) =>
      i.title?.toLowerCase().includes('store') || i.title?.toLowerCase().includes('inventory')
    );
    if (!storeItem) return;

    setSigningClearance(true);
    try {
      const res = await api.patch(`/clearances/${storeClearance._id}/checklist/${storeItem._id}`, {
        status: newStatus,
        remarks:
          customRemarks ||
          (newStatus === 'cleared'
            ? 'All tools, equipment and assets returned to warehouse.'
            : 'Store clearance updated.')
      });
      if (res.success) {
        await fetchEmployeeStoreData(selectedEmployee._id);
        setClearanceRemarksModal({ isOpen: false, status: 'rejected', remarks: '' });
      }
    } catch (err) {
      alert(err.message || 'Failed to update store clearance');
    } finally {
      setSigningClearance(false);
    }
  };

  const handleInitializeClearance = async () => {
    if (!selectedEmployee?._id) return;
    setSigningClearance(true);
    try {
      const res = await api.post('/clearances', {
        employee: selectedEmployee._id,
        reason: 'Store custody audit & exit clearance initialization'
      });
      if (res.success) {
        await fetchEmployeeStoreData(selectedEmployee._id);
      }
    } catch (err) {
      alert(err.message || 'Failed to initialize clearance');
    } finally {
      setSigningClearance(false);
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

    // Normalize bank accounts into an array with exactly one primary
    let normalizedAccounts = [];
    if (Array.isArray(emp.accountDetails) && emp.accountDetails.length > 0) {
      normalizedAccounts = emp.accountDetails.map((acc, idx) => ({
        bankName: acc.bankName || 'Commercial Bank of Ethiopia (CBE)',
        holderName: acc.holderName || '',
        number: acc.number || '',
        branch: acc.branch || '',
        status: acc.status || 'active',
        isPrimary: Boolean(acc.isPrimary)
      }));
    } else if (emp.accountDetails && typeof emp.accountDetails === 'object' && (emp.accountDetails.holderName || emp.accountDetails.number)) {
      normalizedAccounts = [
        {
          bankName: emp.accountDetails.bankName || 'Commercial Bank of Ethiopia (CBE)',
          holderName: emp.accountDetails.holderName || '',
          number: emp.accountDetails.number || '',
          branch: emp.accountDetails.branch || '',
          status: emp.accountDetails.status || 'active',
          isPrimary: true
        }
      ];
    } else {
      normalizedAccounts = [
        {
          bankName: 'Commercial Bank of Ethiopia (CBE)',
          holderName: emp.fullName || '',
          number: '',
          branch: '',
          status: 'active',
          isPrimary: true
        }
      ];
    }

    if (!normalizedAccounts.some((acc) => acc.isPrimary)) {
      normalizedAccounts[0].isPrimary = true;
    }

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
      user: emp.user?._id || emp.user || '',
      status: emp.status || 'active',
      profileImage: emp.profileImage || '',
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
      accountDetails: normalizedAccounts
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

  // Profile Image Handlers
  const handleProfileImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setFormData((prev) => ({ ...prev, profileImage: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfileImage = () => {
    setFormData((prev) => ({ ...prev, profileImage: '' }));
  };

  // Multiple Bank Account Handlers
  const handleAddBankAccount = () => {
    setFormData((prev) => ({
      ...prev,
      accountDetails: [
        ...prev.accountDetails,
        {
          bankName: 'Commercial Bank of Ethiopia (CBE)',
          holderName: prev.fullName || '',
          number: '',
          branch: '',
          status: 'active',
          isPrimary: prev.accountDetails.length === 0
        }
      ]
    }));
  };

  const handleRemoveBankAccount = (indexToRemove) => {
    setFormData((prev) => {
      const remaining = prev.accountDetails.filter((_, idx) => idx !== indexToRemove);
      if (remaining.length > 0 && !remaining.some((acc) => acc.isPrimary)) {
        remaining[0].isPrimary = true;
      }
      return { ...prev, accountDetails: remaining };
    });
  };

  const handleAccountChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.accountDetails];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, accountDetails: updated };
    });
  };

  const handleSetPrimaryAccount = (primaryIndex) => {
    setFormData((prev) => ({
      ...prev,
      accountDetails: prev.accountDetails.map((acc, idx) => ({
        ...acc,
        isPrimary: idx === primaryIndex
      }))
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
        user: formData.user || null,
        baseSalary: formData.baseSalary !== '' ? Number(formData.baseSalary) : 0,
        manager: formData.manager || null,
        profileImage: formData.profileImage || null,
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

  const handleResetPassword = async (emp) => {
    const userId = emp.user?._id || emp.user;
    if (!userId) {
      alert('This employee does not have a linked user login account.');
      return;
    }
    if (!window.confirm(`Are you sure you want to generate a new temporary password for ${emp.fullName}? Their previous credentials will be replaced.`)) {
      return;
    }
    setResettingPassword(true);
    try {
      const response = await api.post(`/users/${userId}/reset-temporary-password`);
      if (response.success && response.temporaryPassword) {
        setResetModalData({
          employee: emp,
          temporaryPassword: response.temporaryPassword,
          email: response.credentials?.email || emp.email
        });
        setCopiedPassword(false);
      } else {
        alert(response.message || 'Failed to reset temporary password');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Error resetting temporary password');
    } finally {
      setResettingPassword(false);
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
            placeholder={t('search by name, email, position, id, or phone...')}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">{t('all departments')}</option>
          <option value="Pre-press">{t('pre-press')}</option>
          <option value="Press/Offset">{t('press/offset')}</option>
          <option value="Digital Print">{t('digital print')}</option>
          <option value="Finishing">{t('post-press / finishing')}</option>
          <option value="Store">{t('store')}</option>
          <option value="Finance">{t('finance')}</option>
          <option value="HR">{t('hr')}</option>
          <option value="Sales">{t('sales')}</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">{t('all statuses')}</option>
          <option value="active">{t('active')}</option>
          <option value="inactive">{t('inactive')}</option>
          <option value="suspended">{t('suspended')}</option>
          <option value="terminated">{t('terminated')}</option>
        </select>
      </div>

      {/* Data Presentation */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          {t('fetching workforce records from backend...')}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <EmptyState
          title={t('no employees registered')}
          message={t('no employees match your filter or the database is currently empty. add your first employee to initiate records.')}
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
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shrink-0 flex items-center justify-center">
                      {emp.profileImage ? (
                        <img src={emp.profileImage} alt={emp.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-slate-500 uppercase">
                          {emp.fullName?.slice(0, 2) || 'GT'}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{emp.fullName}</h3>
                      <p className="text-xs text-primary-500 font-medium">{emp.position}</p>
                      {emp.nationalId && (
                        <span className="text-[10px] text-slate-400 font-mono">ID: {emp.nationalId}</span>
                      )}
                    </div>
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
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-primary-500" />
                      System Access:
                    </span>
                    {emp.user ? (
                      <div className="flex flex-wrap gap-1">
                        {emp.user.roles?.map((r) => (
                          <span
                            key={r}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              r === 'storekeeper'
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-500/40'
                                : 'bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border-primary-500/20'
                            }`}
                          >
                            {r === 'storekeeper' && <Boxes className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                            <span>{r}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">No Login Account</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 flex-wrap gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setProfileTab('overview');
                        setIsDetailOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-primary-600 bg-primary-50 dark:bg-primary-950/60 hover:bg-primary-100 transition flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Profile</span>
                    </button>

                    {canManage && (
                      <button
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setProfileTab('store');
                          setIsDetailOpen(true);
                        }}
                        className="px-2 py-1.5 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition flex items-center gap-1 border border-amber-200 dark:border-amber-800"
                        title="Store Custody & Clearance"
                      >
                        <Boxes className="w-3.5 h-3.5 text-amber-600" />
                        <span>Custody</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setIdCardEmployee(emp)}
                      className="px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1"
                      title="Generate ID Card"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-sky-500" />
                      <span>ID Card</span>
                    </button>
                    {canManage && emp.user && (
                      <button
                        onClick={() => handleResetPassword(emp)}
                        disabled={resettingPassword}
                        className="px-2 py-1.5 rounded-lg text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition flex items-center gap-1"
                        title="Reset Temporary Password"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Reset Pwd</span>
                      </button>
                    )}
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
                  <th className="px-4 py-3">{t('employee')}</th>
                  <th className="px-4 py-3">{t('national id')}</th>
                  <th className="px-4 py-3">{t('department')}</th>
                  <th className="px-4 py-3">{t('position')}</th>
                  <th className="px-4 py-3">{t('phone')}</th>
                  <th className="px-4 py-3">{t('type')}</th>
                  <th className="px-4 py-3">{t('system access')}</th>
                  <th className="px-4 py-3">{t('status')}</th>
                  <th className="px-4 py-3 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredEmployees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shrink-0 flex items-center justify-center">
                          {emp.profileImage ? (
                            <img src={emp.profileImage} alt={emp.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-slate-500 uppercase">
                              {emp.fullName?.slice(0, 2) || 'GT'}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">{emp.fullName}</div>
                          <div className="text-xs text-slate-400">{emp.email}</div>
                        </div>
                      </div>
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
                      {emp.user ? (
                        <div className="flex flex-wrap gap-1 max-w-[130px]">
                          {emp.user.roles?.map((r) => (
                            <span
                              key={r}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                                r === 'storekeeper'
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-500/40'
                                  : 'bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border-primary-500/20'
                              }`}
                            >
                              {r === 'storekeeper' && <Boxes className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                              <span>{r}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                          No Login
                        </span>
                      )}
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
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setProfileTab('store');
                            setIsDetailOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition"
                          title="Store Custody & Clearance"
                        >
                          <Boxes className="w-4 h-4 text-amber-600" />
                        </button>
                      )}
                      <button
                        onClick={() => setIdCardEmployee(emp)}
                        className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg transition"
                        title="Generate & Print ID Card"
                      >
                        <CreditCard className="w-4 h-4" />
                      </button>
                      {canManage && emp.user && (
                        <button
                          onClick={() => handleResetPassword(emp)}
                          disabled={resettingPassword}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition"
                          title="Reset Temporary Password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                      )}
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
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 shrink-0 flex items-center justify-center shadow-xs">
                  {selectedEmployee.profileImage ? (
                    <img src={selectedEmployee.profileImage} alt={selectedEmployee.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-400" />
                  )}
                </div>
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
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                <button
                  onClick={() => setIdCardEmployee(selectedEmployee)}
                  className="px-3.5 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                  title="Generate Staff ID Badge"
                >
                  <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                  <span>ID Badge</span>
                </button>
                {canManage && (
                  <button
                    onClick={() => {
                      handleOpenEditModal(selectedEmployee);
                    }}
                    className="px-3.5 py-2 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>
            </div>

            {/* Profile Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 gap-1 overflow-x-auto text-xs">
              {[
                { id: 'overview', label: 'Overview & Job' },
                { id: 'address', label: 'Address & Home' },
                { id: 'emergency', label: 'Emergency & Warranty' },
                { id: 'bank', label: `Bank Accounts (${Array.isArray(selectedEmployee.accountDetails) ? selectedEmployee.accountDetails.length : 1})` },
                { id: 'docs', label: `Documents (${selectedEmployee.documents?.length || 0})` },
                { id: 'education', label: `Education (${selectedEmployee.educations?.length || 0})` },
                { id: 'store', label: 'Store Custody & Clearance' }
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

                {/* Linked System User Account & Roles */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary-500" />
                      Connected System User Account & Permissions
                    </span>
                    {selectedEmployee.user ? (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Login Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No User Account</span>
                    )}
                  </div>
                  {selectedEmployee.user ? (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {selectedEmployee.user.fullName || selectedEmployee.fullName}
                        </div>
                        <div className="text-[11px] text-slate-400">{selectedEmployee.user.email}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400">Assigned Roles:</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedEmployee.user.roles?.map((r) => (
                            <span
                              key={r}
                              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-500/20"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 pt-1">
                      This employee does not currently have login access. Edit profile to link a user account.
                    </p>
                  )}
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

            {/* Tab 4: Multiple Bank Accounts */}
            {profileTab === 'bank' && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <CreditCard className="w-4 h-4 text-primary-500" />
                    <span>Bank Disbursement Accounts</span>
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Only 1 primary account designated for payroll
                  </span>
                </div>

                {(() => {
                  const accounts = Array.isArray(selectedEmployee.accountDetails)
                    ? selectedEmployee.accountDetails
                    : selectedEmployee.accountDetails
                    ? [selectedEmployee.accountDetails]
                    : [];

                  if (accounts.length === 0) {
                    return (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400">
                        No bank accounts registered.
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {accounts.map((acc, idx) => (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border transition ${
                            acc.isPrimary
                              ? 'bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
                                {acc.bankName || 'Bank Account'}
                              </span>
                              {acc.branch && (
                                <span className="text-[10px] text-slate-400 block">{acc.branch} Branch</span>
                              )}
                            </div>
                            {acc.isPrimary ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1 shrink-0">
                                <Check className="w-3 h-3" />
                                <span>PRIMARY</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                                Secondary
                              </span>
                            )}
                          </div>

                          <div className="space-y-1 text-[11px]">
                            <div className="text-slate-500">
                              Holder:{' '}
                              <strong className="text-slate-800 dark:text-slate-200">
                                {acc.holderName || selectedEmployee.fullName}
                              </strong>
                            </div>
                            <div className="text-slate-500">
                              Account Number:{' '}
                              <strong className="font-mono text-slate-900 dark:text-slate-100">
                                {acc.number || 'N/A'}
                              </strong>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <span className="text-slate-400 text-[10px]">Status:</span>
                              <Badge status={acc.status || 'active'} text={acc.status || 'Active'} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
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
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary-600 dark:text-primary-400 hover:underline text-[11px] font-semibold flex items-center gap-1 bg-primary-50 dark:bg-primary-950/60 px-2 py-1 rounded-lg"
                          >
                            <span>Open File</span>
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

            {/* Tab 7: Store Custody & Clearance */}
            {profileTab === 'store' && (
              <div className="space-y-4 text-xs">
                {/* Header Banner */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Boxes className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>Store Custody & Exit Clearance</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Manage tools, machinery equipment custody, material requisitions, and exit store clearance sign-offs.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fetchEmployeeStoreData(selectedEmployee._id)}
                      disabled={loadingStoreData}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                      title="Refresh Store Data"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingStoreData ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailOpen(false);
                        navigate('/store/outward');
                      }}
                      className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Issue Material / SIV</span>
                    </button>
                  </div>
                </div>

                {loadingStoreData ? (
                  <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
                    Loading live store clearance checklist & requisitions history...
                  </div>
                ) : (
                  <>
                    {/* SECTION 1: EXIT STORE CLEARANCE SIGN-OFF */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PackageCheck className="w-4 h-4 text-primary-500" />
                          <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                            Store & Inventory Exit Clearance Sign-Off
                          </h5>
                        </div>
                        {storeClearance && (
                          <Badge
                            status={storeClearance.status}
                            text={`Clearance: ${storeClearance.status.toUpperCase()}`}
                          />
                        )}
                      </div>

                      {(() => {
                        if (!storeClearance) {
                          return (
                            <div className="p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-700 dark:text-slate-300">
                                  No Exit Clearance Initialized
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  This employee does not have an active offboarding clearance workflow. When staff separates, storekeepers verify that all borrowed tools and keys are returned.
                                </p>
                              </div>
                              {canManage && (
                                <button
                                  type="button"
                                  onClick={handleInitializeClearance}
                                  disabled={signingClearance}
                                  className="px-3 py-1.5 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition whitespace-nowrap self-start sm:self-auto shrink-0"
                                >
                                  {signingClearance ? 'Initializing...' : 'Initialize Clearance'}
                                </button>
                              )}
                            </div>
                          );
                        }

                        const storeItem = storeClearance.checklist?.find((i) =>
                          i.title?.toLowerCase().includes('store') || i.title?.toLowerCase().includes('inventory')
                        );

                        if (!storeItem) {
                          return (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                              Store checklist item not defined in this clearance record.
                            </div>
                          );
                        }

                        return (
                          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                  {storeItem.status === 'cleared' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                  ) : storeItem.status === 'rejected' ? (
                                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                                  )}
                                  <span>{storeItem.title}</span>
                                </span>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {storeItem.remarks || 'No remarks recorded yet.'}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase ${
                                    storeItem.status === 'cleared'
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                      : storeItem.status === 'rejected'
                                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                  }`}
                                >
                                  {storeItem.status}
                                </span>
                              </div>
                            </div>

                            {storeItem.confirmedAt && (
                              <div className="text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-200/60 dark:border-slate-800 pt-2 flex items-center justify-between">
                                <span>Sign-off Record:</span>
                                <span>{new Date(storeItem.confirmedAt).toLocaleString()}</span>
                              </div>
                            )}

                            {/* Admin / HR Action Buttons */}
                            {canManage && (
                              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStoreClearance('cleared')}
                                  disabled={signingClearance || storeItem.status === 'cleared'}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Sign Off Clearance (Cleared)</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setClearanceRemarksModal({
                                      isOpen: true,
                                      status: 'rejected',
                                      remarks: storeItem.remarks || ''
                                    })
                                  }
                                  disabled={signingClearance}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Hold / Missing Tools</span>
                                </button>

                                {storeItem.status !== 'pending' && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStoreClearance('pending', 'Inspection reset')}
                                    disabled={signingClearance}
                                    className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs rounded-xl transition"
                                  >
                                    Reset to Pending
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* SECTION 2: MATERIAL & TOOLS REQUISITIONS (CUSTODY) */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PackageMinus className="w-4 h-4 text-amber-500" />
                          <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                            Material Requisitions & Issued Tool History ({storeRequests.length})
                          </h5>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDetailOpen(false);
                            navigate('/store/outward');
                          }}
                          className="text-[11px] font-bold text-primary-500 hover:text-primary-600 flex items-center gap-1"
                        >
                          <span>Go to Outward Portal</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>

                      {storeRequests.length === 0 ? (
                        <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                          No store material requests or tool issuances on record for this employee.
                        </div>
                      ) : (
                        <>
                          {/* Mobile Cards (< sm) */}
                          <div className="block sm:hidden space-y-2.5">
                            {storeRequests.map((req) => (
                              <div
                                key={req._id}
                                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                                    {req.requestNumber}
                                  </span>
                                  <Badge status={req.status} text={req.status} />
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                                  <span>{req.warehouse?.warehouseName || 'Warehouse'}</span>
                                  <span>{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '-'}</span>
                                </div>
                                {req.purpose && (
                                  <p className="text-[11px] text-slate-600 dark:text-slate-300 italic">
                                    "{req.purpose}"
                                  </p>
                                )}
                                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-1">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                    Items Issued / Requested:
                                  </span>
                                  {req.items?.map((it, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300"
                                    >
                                      <span>{it.item?.itemName || 'Item'}</span>
                                      <span className="font-mono font-bold">
                                        {it.issuedQuantity || 0} / {it.requestedQuantity}{' '}
                                        <span className="text-slate-400 font-normal">{it.unitOfMeasurement}</span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Desktop Table (>= sm) */}
                          <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                  <th className="px-3 py-2.5">Request #</th>
                                  <th className="px-3 py-2.5">Date</th>
                                  <th className="px-3 py-2.5">Warehouse</th>
                                  <th className="px-3 py-2.5">Priority</th>
                                  <th className="px-3 py-2.5">Items & Quantities</th>
                                  <th className="px-3 py-2.5">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {storeRequests.map((req) => (
                                  <tr
                                    key={req._id}
                                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition"
                                  >
                                    <td className="px-3 py-2.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                                      {req.requestNumber}
                                    </td>
                                    <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">
                                      {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300">
                                      {req.warehouse?.warehouseName || '-'}
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                          req.priority === 'urgent'
                                            ? 'bg-rose-500/10 text-rose-600'
                                            : req.priority === 'high'
                                            ? 'bg-amber-500/10 text-amber-600'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                        }`}
                                      >
                                        {req.priority || 'normal'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <div className="space-y-0.5 max-w-xs">
                                        {req.items?.map((it, idx) => (
                                          <div key={idx} className="text-[11px] flex items-center justify-between gap-2">
                                            <span className="truncate">{it.item?.itemName || 'Item'}</span>
                                            <span className="font-mono font-semibold shrink-0">
                                              {it.issuedQuantity || 0}/{it.requestedQuantity} {it.unitOfMeasurement}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <Badge status={req.status} text={req.status} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  </>
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
              accept=".pdf,image/*,.doc,.docx"
              onChange={handleDocumentFileUpload}
              className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 dark:file:bg-primary-950/60 dark:file:text-primary-300 hover:file:bg-primary-100"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Files are automatically stored via Cloudinary CDN with local disk fallback (never stored as base64 in database).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Or Document URL / Web Link
            </label>
            <input
              type="text"
              value={docForm.url}
              onChange={(e) => setDocForm({ ...docForm, url: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
              placeholder="https://... or auto-populated from file"
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
            <span>1. Personal & Photo</span>
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
            <span>4. Bank Accounts ({formData.accountDetails.length})</span>
          </button>
        </div>

        <form onSubmit={handleSaveEmployee} className="space-y-4">
          {/* TAB 1: Personal, Photo & Employment */}
          {activeTab === 'personal' && (
            <div className="space-y-4">
              {/* Profile Image Upload Box */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 shadow-xs shrink-0 flex items-center justify-center">
                  {formData.profileImage ? (
                    <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Employee Profile Photo
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Used across the workforce directory, staff profiles, and automatically printed on the Staff ID Badge.
                  </p>
                  <div className="flex items-center gap-2 justify-center sm:justify-start pt-1">
                    <label className="cursor-pointer py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-1.5 shadow-xs">
                      <Upload className="w-3.5 h-3.5 text-primary-500" />
                      <span>{formData.profileImage ? 'Change Photo' : 'Upload Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageUpload}
                        className="hidden"
                      />
                    </label>
                    {formData.profileImage && (
                      <button
                        type="button"
                        onClick={handleRemoveProfileImage}
                        className="py-1.5 px-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

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

          {/* TAB 4: Multiple Bank Accounts (Only 1 Primary) */}
          {activeTab === 'bank' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-primary-500" />
                    <span>Disbursement Bank Accounts</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Register employee bank accounts. Exactly <strong>one</strong> account must be designated as primary for automatic payroll disbursements.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddBankAccount}
                  className="px-3 py-1.5 bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-300 hover:bg-primary-100 rounded-xl font-bold text-xs flex items-center gap-1 transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Bank Account</span>
                </button>
              </div>

              <div className="space-y-3">
                {formData.accountDetails.map((account, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-2xl border transition relative ${
                      account.isPrimary
                        ? 'border-emerald-500/80 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-mono font-bold text-xs text-slate-700 dark:text-slate-200">
                          {index + 1}
                        </span>
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          {account.bankName || `Bank Account #${index + 1}`}
                        </span>
                        {account.isPrimary && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>PRIMARY DISBURSEMENT</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {!account.isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryAccount(index)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-lg transition"
                          >
                            Set as Primary
                          </button>
                        )}

                        {formData.accountDetails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBankAccount(index)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            title="Remove this account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Bank Name *
                        </label>
                        <select
                          value={account.bankName}
                          onChange={(e) => handleAccountChange(index, 'bankName', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                        >
                          {ETHIOPIAN_BANKS.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Account Holder Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={account.holderName}
                          onChange={(e) => handleAccountChange(index, 'holderName', e.target.value)}
                          placeholder="As stated in passbook / bank ID"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Bank Account Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={account.number}
                          onChange={(e) => handleAccountChange(index, 'number', e.target.value)}
                          placeholder="e.g. 1000123456789"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Branch (Optional)
                          </label>
                          <input
                            type="text"
                            value={account.branch || ''}
                            onChange={(e) => handleAccountChange(index, 'branch', e.target.value)}
                            placeholder="e.g. Bole Medhanialem"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Account Status
                          </label>
                          <select
                            value={account.status}
                            onChange={(e) => handleAccountChange(index, 'status', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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

      {/* Staff ID Card Generator & Print Studio Modal */}
      <IdCardModal
        isOpen={Boolean(idCardEmployee)}
        onClose={() => setIdCardEmployee(null)}
        employee={idCardEmployee}
      />

      {/* Temporary Password Reset Output Modal */}
      {resetModalData && (
        <Modal
          isOpen={Boolean(resetModalData)}
          onClose={() => setResetModalData(null)}
          title="Temporary Password Generated"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                A new temporary password was generated for <strong>{resetModalData.employee?.fullName}</strong>. They will be required to change this upon next login.
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Login Account Email
              </label>
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200">
                {resetModalData.email}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                New Temporary Password
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-sm font-bold text-primary-600 dark:text-primary-400 tracking-wider">
                  {resetModalData.temporaryPassword}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(resetModalData.temporaryPassword);
                    setCopiedPassword(true);
                    setTimeout(() => setCopiedPassword(false), 2000);
                  }}
                  className="px-3 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-xs"
                >
                  {copiedPassword ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPassword ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setResetModalData(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Clearance Remarks Submodal */}
      <Modal
        isOpen={clearanceRemarksModal.isOpen}
        onClose={() => setClearanceRemarksModal({ isOpen: false, status: 'rejected', remarks: '' })}
        title="Hold / Flag Unreturned Store Assets"
        maxWidth="max-w-md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleUpdateStoreClearance(clearanceRemarksModal.status, clearanceRemarksModal.remarks);
          }}
          className="space-y-3"
        >
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Specify the unreturned tools, machinery parts, or equipment preventing this employee's exit clearance.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Storekeeper Remarks / Missing Asset Notes *
            </label>
            <textarea
              required
              rows={3}
              value={clearanceRemarksModal.remarks}
              onChange={(e) =>
                setClearanceRemarksModal({ ...clearanceRemarksModal, remarks: e.target.value })
              }
              placeholder="e.g. Cordless drill kit #2 and safety helmet not yet returned to Warehouse B."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setClearanceRemarksModal({ isOpen: false, status: 'rejected', remarks: '' })}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={signingClearance}
              className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition"
            >
              {signingClearance ? 'Saving...' : 'Hold Store Clearance'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
