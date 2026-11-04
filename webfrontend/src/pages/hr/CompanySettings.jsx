import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import api from '../../services/api';
import {
  Settings,
  Building2,
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Scale,
  CreditCard,
  Compass,
  ExternalLink,
  ShieldCheck,
  CalendarDays,
  Eye,
  Pencil
} from 'lucide-react';

export default function CompanySettings() {
  const { t } = useTranslation();
  const { user, hasRole } = useAuth();
  const isHrAdmin = hasRole(['admin', 'hr']);

  // Tabs: 'settings' | 'holidays'
  const [activeTab, setActiveTab] = useState('settings');

  // Loading & notification states
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  // Settings State
  const [settings, setSettings] = useState({
    companyName: 'GT ERP Corporation',
    currency: 'ETB',
    officeLocations: [],
    workSchedule: {
      standardStartTime: '09:00',
      standardEndTime: '17:00',
      gracePeriodMinutes: 15,
      standardDailyHours: 8,
      workingDays: [1, 2, 3, 4, 5]
    },
    leaveSettings: {
      annualDaysPerYear: 16,
      sickDaysPerYear: 15,
      emergencyDaysPerYear: 5,
      casualDaysPerYear: 3,
      maternityDays: 90,
      paternityDays: 5,
      requireAttachmentForSickLeave: true
    },
    payrollSettings: {
      employeePensionPercent: 7,
      employerPensionPercent: 11,
      overtimeRateRegular: 1.5,
      overtimeRateHoliday: 2.0,
      overtimeRateWeekend: 1.5
    }
  });

  // Holidays state
  const [holidays, setHolidays] = useState([]);
  const [holidayYear, setHolidayYear] = useState('all');
  const [loadingHolidays, setLoadingHolidays] = useState(false);

  // Modal 1: Add Office Location Modal
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [submittingLocation, setSubmittingLocation] = useState(false);
  const [gettingLocationGps, setGettingLocationGps] = useState(false);
  const [locationForm, setLocationForm] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    radiusMeters: 250,
    isDefault: false
  });

  // Modal 1B: View Location Detail Modal
  const [selectedLocationDetail, setSelectedLocationDetail] = useState(null);

  // Modal 1C: Edit Office Location Modal
  const [editingLocation, setEditingLocation] = useState(null);
  const [submittingEditLocation, setSubmittingEditLocation] = useState(false);
  const [gettingEditLocationGps, setGettingEditLocationGps] = useState(false);
  const [editLocationForm, setEditLocationForm] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    radiusMeters: 250,
    isActive: true,
    isDefault: false
  });

  // Modal 2: Add Public Holiday Modal
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [submittingHoliday, setSubmittingHoliday] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    isRecurringYearly: true,
    description: '',
    isActive: true
  });

  // Modal 2B: View Holiday Detail Modal
  const [selectedHolidayDetail, setSelectedHolidayDetail] = useState(null);

  // Modal 2C: Edit Holiday Modal
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [submittingEditHoliday, setSubmittingEditHoliday] = useState(false);
  const [editHolidayForm, setEditHolidayForm] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    isRecurringYearly: true,
    description: '',
    isActive: true
  });

  // Fetch company settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/company-settings');
      if (res.success && res.data) {
        // Enforce exactly one default HQ on client side
        let defaultSeen = false;
        const normalizedOfficeLocations = (res.data.officeLocations || []).map((loc) => {
          if (loc.isDefault) {
            if (!defaultSeen) {
              defaultSeen = true;
              return { ...loc, isDefault: true };
            }
            return { ...loc, isDefault: false };
          }
          return loc;
        });

        if (!defaultSeen && normalizedOfficeLocations.length > 0) {
          normalizedOfficeLocations[0].isDefault = true;
        }

        setSettings({
          ...res.data,
          officeLocations: normalizedOfficeLocations,
          workSchedule: {
            standardStartTime: '09:00',
            standardEndTime: '17:00',
            gracePeriodMinutes: 15,
            standardDailyHours: 8,
            workingDays: [1, 2, 3, 4, 5],
            ...(res.data.workSchedule || {})
          },
          leaveSettings: {
            annualDaysPerYear: 16,
            sickDaysPerYear: 15,
            emergencyDaysPerYear: 5,
            casualDaysPerYear: 3,
            maternityDays: 90,
            paternityDays: 5,
            requireAttachmentForSickLeave: true,
            ...(res.data.leaveSettings || {})
          },
          payrollSettings: {
            employeePensionPercent: 7,
            employerPensionPercent: 11,
            overtimeRateRegular: 1.5,
            overtimeRateHoliday: 2.0,
            overtimeRateWeekend: 1.5,
            ...(res.data.payrollSettings || {})
          }
        });
      }
    } catch (err) {
      console.error('Error fetching company settings:', err);
      setAlertMessage({ type: 'error', text: err.message || 'Failed to fetch company settings' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch holidays (fetches all holidays so dynamic years are derived accurately from database)
  const fetchHolidays = async () => {
    try {
      setLoadingHolidays(true);
      const res = await api.get('/company-settings/holidays?includeInactive=true');
      if (res.success && Array.isArray(res.data)) {
        setHolidays(res.data);
      } else if (Array.isArray(res)) {
        setHolidays(res);
      } else {
        setHolidays([]);
      }
    } catch (err) {
      console.error('Error fetching holidays:', err);
    } finally {
      setLoadingHolidays(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchHolidays();
  }, []);

  // Dynamically compute calendar years from actual existing holidays in database table
  const dynamicYears = useMemo(() => {
    const yearSet = new Set();
    (holidays || []).forEach((h) => {
      if (h.date) {
        const d = new Date(h.date);
        const y = d.getFullYear();
        if (!isNaN(y)) yearSet.add(y);
      }
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [holidays]);

  // Adjust holidayYear if it is set to a specific year that no longer exists in the table
  useEffect(() => {
    if (holidayYear !== 'all' && dynamicYears.length > 0 && !dynamicYears.includes(Number(holidayYear))) {
      setHolidayYear('all');
    }
  }, [dynamicYears, holidayYear]);

  // Filter holidays by dynamic calendar year selection
  const displayedHolidays = useMemo(() => {
    if (holidayYear === 'all') return holidays;
    return (holidays || []).filter((h) => {
      if (!h.date) return false;
      const y = new Date(h.date).getFullYear();
      return y === Number(holidayYear);
    });
  }, [holidays, holidayYear]);

  // Handle Save General Company Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setAlertMessage(null);
    try {
      const res = await api.put('/company-settings', settings);
      if (res.success) {
        setAlertMessage({ type: 'success', text: 'Company HR settings successfully updated and saved.' });
        if (res.data) setSettings(res.data);
      } else {
        setAlertMessage({ type: 'error', text: res.message || 'Failed to save settings' });
      }
    } catch (err) {
      setAlertMessage({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setSavingSettings(false);
    }
  };

  // Auto-fill GPS from browser for new office location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGettingLocationGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
          radiusMeters: Math.max(100, Math.round(position.coords.accuracy * 2))
        }));
        setGettingLocationGps(false);
      },
      (error) => {
        alert('Could not acquire GPS coordinates: ' + error.message);
        setGettingLocationGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handle Add Office Location
  const handleAddLocation = async (e) => {
    e.preventDefault();
    setSubmittingLocation(true);
    try {
      const payload = {
        ...locationForm,
        latitude: Number(locationForm.latitude),
        longitude: Number(locationForm.longitude),
        radiusMeters: Number(locationForm.radiusMeters) || 200
      };

      const res = await api.post('/company-settings/office-locations', payload);
      if (res.success) {
        setIsLocationModalOpen(false);
        setLocationForm({
          name: '',
          address: '',
          latitude: '',
          longitude: '',
          radiusMeters: 250,
          isDefault: false
        });
        await fetchSettings();
      } else {
        alert(res.message || 'Failed to add office location');
      }
    } catch (err) {
      alert(err.message || 'Failed to add office location');
    } finally {
      setSubmittingLocation(false);
    }
  };

  // Open Edit Location Modal
  const handleOpenEditLocation = (loc) => {
    setEditingLocation(loc);
    setEditLocationForm({
      name: loc.name || '',
      address: loc.address || '',
      latitude: loc.latitude !== undefined ? String(loc.latitude) : '',
      longitude: loc.longitude !== undefined ? String(loc.longitude) : '',
      radiusMeters: loc.radiusMeters || 200,
      isActive: loc.isActive !== false,
      isDefault: Boolean(loc.isDefault)
    });
  };

  // Auto-fill GPS from browser for editing office location
  const handleUseEditCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGettingEditLocationGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setEditLocationForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
          radiusMeters: Math.max(100, Math.round(position.coords.accuracy * 2))
        }));
        setGettingEditLocationGps(false);
      },
      (error) => {
        alert('Could not acquire GPS coordinates: ' + error.message);
        setGettingEditLocationGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handle Update Office Location
  const handleUpdateLocation = async (e) => {
    e.preventDefault();
    if (!editingLocation) return;
    setSubmittingEditLocation(true);
    try {
      const payload = {
        ...editLocationForm,
        latitude: Number(editLocationForm.latitude),
        longitude: Number(editLocationForm.longitude),
        radiusMeters: Number(editLocationForm.radiusMeters) || 200
      };

      const res = await api.put(`/company-settings/office-locations/${editingLocation._id}`, payload);
      if (res.success) {
        setEditingLocation(null);
        if (selectedLocationDetail && selectedLocationDetail._id === editingLocation._id) {
          const updated = Array.isArray(res.data)
            ? res.data.find((l) => String(l._id) === String(editingLocation._id))
            : null;
          if (updated) setSelectedLocationDetail(updated);
          else setSelectedLocationDetail(null);
        }
        await fetchSettings();
      } else {
        alert(res.message || 'Failed to update office location');
      }
    } catch (err) {
      alert(err.message || 'Failed to update office location');
    } finally {
      setSubmittingEditLocation(false);
    }
  };

  // Handle Delete Office Location
  const handleDeleteLocation = async (loc) => {
    if (!loc) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the office location "${loc.name}"? If this is currently the default HQ, another branch will automatically become default.`
    );
    if (!confirmDelete) return;

    try {
      const res = await api.delete(`/company-settings/office-locations/${loc._id}`);
      if (res.success) {
        if (selectedLocationDetail && selectedLocationDetail._id === loc._id) {
          setSelectedLocationDetail(null);
        }
        await fetchSettings();
      } else {
        alert(res.message || 'Failed to delete office location');
      }
    } catch (err) {
      alert(err.message || 'Failed to delete office location');
    }
  };

  // Handle Create Holiday
  const handleCreateHoliday = async (e) => {
    e.preventDefault();
    setSubmittingHoliday(true);
    try {
      const res = await api.post('/company-settings/holidays', holidayForm);
      if (res.success) {
        setIsHolidayModalOpen(false);
        setHolidayForm({
          title: '',
          date: new Date().toISOString().split('T')[0],
          isRecurringYearly: true,
          description: '',
          isActive: true
        });
        await fetchHolidays();
        setAlertMessage({ type: 'success', text: `Holiday "${holidayForm.title}" registered successfully.` });
      } else {
        alert(res.message || 'Failed to add public holiday');
      }
    } catch (err) {
      alert(err.message || 'Failed to add public holiday');
    } finally {
      setSubmittingHoliday(false);
    }
  };

  // Open Edit Holiday Modal
  const handleOpenEditHoliday = (h) => {
    setEditingHoliday(h);
    let dateStr = '';
    if (h.date) {
      dateStr = new Date(h.date).toISOString().split('T')[0];
    }
    setEditHolidayForm({
      title: h.title || '',
      date: dateStr,
      isRecurringYearly: h.isRecurringYearly !== undefined ? h.isRecurringYearly : true,
      description: h.description || '',
      isActive: h.isActive !== undefined ? h.isActive : true
    });
  };

  // Handle Update Holiday
  const handleUpdateHoliday = async (e) => {
    e.preventDefault();
    if (!editingHoliday) return;
    setSubmittingEditHoliday(true);
    try {
      const res = await api.put(`/company-settings/holidays/${editingHoliday._id}`, editHolidayForm);
      if (res.success) {
        if (selectedHolidayDetail && selectedHolidayDetail._id === editingHoliday._id) {
          setSelectedHolidayDetail(res.data || { ...selectedHolidayDetail, ...editHolidayForm });
        }
        setEditingHoliday(null);
        await fetchHolidays();
        setAlertMessage({ type: 'success', text: `Holiday "${editHolidayForm.title}" updated successfully.` });
      } else {
        alert(res.message || 'Failed to update public holiday');
      }
    } catch (err) {
      alert(err.message || 'Failed to update public holiday');
    } finally {
      setSubmittingEditHoliday(false);
    }
  };

  // Handle Delete Holiday
  const handleDeleteHoliday = async (id, title) => {
    if (!window.confirm(`Are you sure you want to remove the public holiday "${title}"?`)) return;
    try {
      const res = await api.delete(`/company-settings/holidays/${id}`);
      if (res.success) {
        if (selectedHolidayDetail && selectedHolidayDetail._id === id) {
          setSelectedHolidayDetail(null);
        }
        if (editingHoliday && editingHoliday._id === id) {
          setEditingHoliday(null);
        }
        await fetchHolidays();
        setAlertMessage({ type: 'success', text: `Holiday "${title}" removed successfully.` });
      } else {
        alert(res.message || 'Failed to delete holiday');
      }
    } catch (err) {
      alert(err.message || 'Failed to delete holiday');
    }
  };

  // State for syncing policy quotas
  const [syncingPolicy, setSyncingPolicy] = useState(false);

  const handleSyncPolicyQuotas = async () => {
    const yr = new Date().getFullYear();
    const confirmSync = window.confirm(
      `Synchronize these Standard Leave Entitlement Policy quotas across employee balances for fiscal year ${yr}?`
    );
    if (!confirmSync) return;

    setSyncingPolicy(true);
    try {
      await api.put('/company-settings', settings);
      const res = await api.post('/leave-balances/sync-policy', { year: yr });
      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to sync policy quotas to employee balances');
    } finally {
      setSyncingPolicy(false);
    }
  };

  if (!isHrAdmin) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Access Restricted</h2>
        <p className="text-xs text-slate-500 mt-1">
          Only Administrators and Human Resources officers have authorization to configure company settings and public holidays.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary-500" />
            <span>Company & Holiday Settings</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure office locations, attendance geofence perimeters, shift schedules, standard leave entitlements, and public holidays.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchSettings();
              fetchHolidays();
            }}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Refresh settings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {activeTab === 'settings' ? (
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? 'Saving...' : 'Save HR Settings'}</span>
            </button>
          ) : (
            <button
              onClick={() => setIsHolidayModalOpen(true)}
              className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Holiday</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert Banner */}
      {alertMessage && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
            alertMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {alertMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{alertMessage.text}</span>
          </div>
          <button
            onClick={() => setAlertMessage(null)}
            className="text-xs font-bold opacity-75 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>General HR & Geofence Policy</span>
        </button>
        <button
          onClick={() => setActiveTab('holidays')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'holidays'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Public Holidays Calendar ({holidays.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading company HR settings...
        </div>
      ) : activeTab === 'settings' ? (
        /* ========================================================================= */
        /* TAB 1: HR SETTINGS, GEOFENCE LOCATIONS, SHIFTS, LEAVE QUOTAS              */
        /* ========================================================================= */
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Section 1: Office Locations & Geofence Perimeters */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>Office Locations & Geofence Perimeters</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  GPS coordinates and accuracy radius used to verify staff attendance punches against physical office boundaries.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto border border-emerald-200 dark:border-emerald-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Location</span>
              </button>
            </div>

            {settings.officeLocations.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                No office locations registered. Staff will not be restricted by geofence coordinates.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {settings.officeLocations.map((loc, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>{loc.name}</span>
                          {loc.isDefault && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300 rounded">
                              Default HQ
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{loc.address || 'No street address'}</p>
                      </div>
                      <Badge
                        status={loc.isActive ? 'active' : 'inactive'}
                        text={loc.isActive ? 'Active' : 'Disabled'}
                        size="xs"
                      />
                    </div>

                    <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                      <div>Lat: {Number(loc.latitude).toFixed(6)}, Lng: {Number(loc.longitude).toFixed(6)}</div>
                      <div className="text-emerald-600 dark:text-emerald-400 font-semibold font-sans">
                        Radius: {loc.radiusMeters || 200} meters (Diameter: {(loc.radiusMeters || 200) * 2}m)
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                      <a
                        href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary-600 dark:text-primary-400 font-semibold hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Map</span>
                      </a>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedLocationDetail(loc)}
                          title="View Details"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditLocation(loc)}
                          title="Edit Location"
                          className="p-1.5 rounded-lg text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/60 transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLocation(loc)}
                          title="Delete Location"
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Work Schedule & Attendance Timings */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary-500" />
                <span>Shift Schedule & Lateness Grace Periods</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Standard shift check-in and check-out times, daily working hours, and allowed grace period before marking late.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Standard Start Time *
                </label>
                <input
                  type="time"
                  required
                  value={settings.workSchedule?.standardStartTime || '09:00'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      workSchedule: { ...settings.workSchedule, standardStartTime: e.target.value }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Standard End Time *
                </label>
                <input
                  type="time"
                  required
                  value={settings.workSchedule?.standardEndTime || '17:00'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      workSchedule: { ...settings.workSchedule, standardEndTime: e.target.value }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Grace Period (Minutes) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  required
                  value={settings.workSchedule?.gracePeriodMinutes || 15}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      workSchedule: { ...settings.workSchedule, gracePeriodMinutes: Number(e.target.value) }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Minutes after start before punch is 'Late'</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Standard Daily Hours *
                </label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  required
                  value={settings.workSchedule?.standardDailyHours || 8}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      workSchedule: { ...settings.workSchedule, standardDailyHours: Number(e.target.value) }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Hours per full working day</span>
              </div>
            </div>
          </div>

          {/* Section 3: Standard Leave Entitlement Quotas */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-primary-500" />
                  <span>Standard Leave Entitlement Policy (Days/Year)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Baseline yearly quota balances allocated when staff are initialized or onboarding.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSyncPolicyQuotas}
                disabled={syncingPolicy}
                className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto border border-primary-200 dark:border-primary-800 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingPolicy ? 'animate-spin' : ''}`} />
                <span>{syncingPolicy ? 'Syncing...' : 'Sync to Staff Balances'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Annual Leave
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.leaveSettings?.annualDaysPerYear || 16}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      leaveSettings: { ...settings.leaveSettings, annualDaysPerYear: Number(e.target.value) }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Sick Leave
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.leaveSettings?.sickDaysPerYear || 15}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      leaveSettings: { ...settings.leaveSettings, sickDaysPerYear: Number(e.target.value) }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Emergency Leave
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.leaveSettings?.emergencyDaysPerYear || 5}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      leaveSettings: { ...settings.leaveSettings, emergencyDaysPerYear: Number(e.target.value) }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Casual Leave
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.leaveSettings?.casualDaysPerYear || 3}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      leaveSettings: { ...settings.leaveSettings, casualDaysPerYear: Number(e.target.value) }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Maternity (F)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.leaveSettings?.maternityDays || 90}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      leaveSettings: { ...settings.leaveSettings, maternityDays: Number(e.target.value) }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Paternity (M)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.leaveSettings?.paternityDays || 5}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      leaveSettings: { ...settings.leaveSettings, paternityDays: Number(e.target.value) }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requireAttachmentCheck"
                  checked={settings.leaveSettings?.requireAttachmentForSickLeave !== false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      leaveSettings: {
                        ...settings.leaveSettings,
                        requireAttachmentForSickLeave: e.target.checked
                      }
                    })
                  }
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="requireAttachmentCheck" className="text-xs text-slate-700 dark:text-slate-300">
                  Prompt & enforce supporting medical certificate attachment for sick leave requests
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allowNegativeBalanceCheck"
                  checked={Boolean(settings.leaveSettings?.allowNegativeBalance)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      leaveSettings: {
                        ...settings.leaveSettings,
                        allowNegativeBalance: e.target.checked
                      }
                    })
                  }
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="allowNegativeBalanceCheck" className="text-xs text-slate-700 dark:text-slate-300">
                  Allow leave quota overdraft / borrowing against future entitlement (permits negative balance)
                </label>
              </div>
            </div>
          </div>

          {/* Section 4: Payroll & Overtime Multipliers */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary-500" />
                <span>Statutory Pension & Overtime Rates Multipliers</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Statutory pension percentages and multiplier factors for regular, weekend, and public holiday overtime.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Employee Pension (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={settings.payrollSettings?.employeePensionPercent || 7}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payrollSettings: {
                        ...settings.payrollSettings,
                        employeePensionPercent: Number(e.target.value)
                      }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Employer Pension (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={settings.payrollSettings?.employerPensionPercent || 11}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payrollSettings: {
                        ...settings.payrollSettings,
                        employerPensionPercent: Number(e.target.value)
                      }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Regular Overtime Rate
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={settings.payrollSettings?.overtimeRateRegular || 1.5}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payrollSettings: {
                        ...settings.payrollSettings,
                        overtimeRateRegular: Number(e.target.value)
                      }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Weekend Overtime Rate
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={settings.payrollSettings?.overtimeRateWeekend || 1.5}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payrollSettings: {
                        ...settings.payrollSettings,
                        overtimeRateWeekend: Number(e.target.value)
                      }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Holiday Overtime Rate
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={settings.payrollSettings?.overtimeRateHoliday || 2.0}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payrollSettings: {
                        ...settings.payrollSettings,
                        overtimeRateHoliday: Number(e.target.value)
                      }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                />
              </div>
            </div>
          </div>
        </form>
      ) : (
        /* ========================================================================= */
        /* TAB 2: PUBLIC HOLIDAYS CALENDAR MANAGEMENT                                */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* Year Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">Calendar Year:</span>
              <select
                value={holidayYear}
                onChange={(e) => setHolidayYear(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200"
              >
                <option value="all">All Calendar Years ({holidays.length})</option>
                {dynamicYears.map((yr) => {
                  const count = holidays.filter((h) => new Date(h.date).getFullYear() === yr).length;
                  return (
                    <option key={yr} value={yr}>
                      {yr} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {isHrAdmin && (
              <button
                onClick={() => setIsHolidayModalOpen(true)}
                className="px-3.5 py-1.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Holiday</span>
              </button>
            )}
          </div>

          {loadingHolidays ? (
            <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
              Loading holidays...
            </div>
          ) : displayedHolidays.length === 0 ? (
            <EmptyState
              title="No public holidays registered"
              message={
                holidayYear === 'all'
                  ? 'No official non-working public holidays have been added yet. Add national and religious holidays to exclude them from working days calculations.'
                  : `No official non-working public holidays have been added for year ${holidayYear}. Add national and religious holidays to exclude them from working days calculations.`
              }
              actionText={isHrAdmin ? 'Add Holiday' : undefined}
              onAction={isHrAdmin ? () => setIsHolidayModalOpen(true) : undefined}
              icon={CalendarDays}
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3.5">Holiday Title</th>
                    <th className="px-4 py-3.5">Official Date</th>
                    <th className="px-4 py-3.5">Recurring Yearly</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Description</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {displayedHolidays.map((h) => (
                    <tr key={h._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                        {h.title}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-primary-600 dark:text-primary-400 font-semibold whitespace-nowrap">
                        {new Date(h.date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3.5">
                        {h.isRecurringYearly ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                            Yes (Annual)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {h.isActive !== false ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs max-w-xs truncate">
                        {h.description || '-'}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedHolidayDetail(h)}
                            title="View Holiday Details"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {isHrAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditHoliday(h)}
                                title="Edit Holiday"
                                className="p-1.5 rounded-lg text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/60 transition"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteHoliday(h._id, h.title)}
                                title="Delete Holiday"
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD OFFICE LOCATION                                              */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        title="Add Office Location & Geofence Boundary"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddLocation} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Location / Branch Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Main HQ Office, Bole Branch"
              value={locationForm.name}
              onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Physical Street Address
            </label>
            <input
              type="text"
              placeholder="e.g. Bole Road, Addis Ababa, Ethiopia"
              value={locationForm.address}
              onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Quick GPS Locator Button */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-500">Auto-fill coordinates:</span>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={gettingLocationGps}
              className="px-2.5 py-1 text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 hover:bg-primary-100 rounded-lg flex items-center gap-1"
            >
              <Compass className={`w-3.5 h-3.5 ${gettingLocationGps ? 'animate-spin' : ''}`} />
              <span>Use Current Device GPS</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Latitude *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 9.0107"
                value={locationForm.latitude}
                onChange={(e) => setLocationForm({ ...locationForm, latitude: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Longitude *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 38.7612"
                value={locationForm.longitude}
                onChange={(e) => setLocationForm({ ...locationForm, longitude: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Geofence Radius (Meters) *
            </label>
            <input
              type="number"
              min="50"
              max="2000"
              required
              value={locationForm.radiusMeters}
              onChange={(e) => setLocationForm({ ...locationForm, radiusMeters: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-primary-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Punches within this radius will be recognized as 'In Perimeter'
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefaultLocationCheck"
              checked={locationForm.isDefault}
              onChange={(e) => setLocationForm({ ...locationForm, isDefault: e.target.checked })}
              className="rounded text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isDefaultLocationCheck" className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
              Set as primary headquarters (default office)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submittingLocation}
              className="px-5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {submittingLocation ? 'Saving...' : 'Add Office Location'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 1B: VIEW OFFICE LOCATION DETAILS                                    */}
      {/* ========================================================================= */}
      {selectedLocationDetail && (
        <Modal
          isOpen={Boolean(selectedLocationDetail)}
          onClose={() => setSelectedLocationDetail(null)}
          title="Office Location & Geofence Details"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            {/* Header Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-primary-500" />
                    <span>{selectedLocationDetail.name}</span>
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">{selectedLocationDetail.address || 'No physical street address recorded'}</p>
                </div>
                <Badge
                  status={selectedLocationDetail.isActive ? 'active' : 'inactive'}
                  text={selectedLocationDetail.isActive ? 'Active' : 'Disabled'}
                />
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center gap-2">
                {selectedLocationDetail.isDefault ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Primary Company Headquarters (Default HQ)</span>
                  </span>
                ) : (
                  <span className="text-slate-500 text-xs italic">Branch Office</span>
                )}
              </div>
            </div>

            {/* Coordinates & Perimeter Grid */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Geofence Radius</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  {selectedLocationDetail.radiusMeters || 200} meters
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Diameter: {(selectedLocationDetail.radiusMeters || 200) * 2}m
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">GPS Lock</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold block text-[11px]">
                  {Number(selectedLocationDetail.latitude).toFixed(5)}, {Number(selectedLocationDetail.longitude).toFixed(5)}
                </span>
                <a
                  href={`https://www.google.com/maps?q=${selectedLocationDetail.latitude},${selectedLocationDetail.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-primary-600 dark:text-primary-400 font-bold hover:underline mt-0.5"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  <span>Google Maps</span>
                </a>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleDeleteLocation(selectedLocationDetail)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1 border border-rose-200 dark:border-rose-900"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLocationDetail(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleOpenEditLocation(selectedLocationDetail);
                    setSelectedLocationDetail(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Location</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1C: EDIT OFFICE LOCATION & GEOFENCE PERIMETER                       */}
      {/* ========================================================================= */}
      {editingLocation && (
        <Modal
          isOpen={Boolean(editingLocation)}
          onClose={() => setEditingLocation(null)}
          title="Edit Office Location & Geofence"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleUpdateLocation} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Location / Branch Name *
              </label>
              <input
                type="text"
                required
                value={editLocationForm.name}
                onChange={(e) => setEditLocationForm({ ...editLocationForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Physical Street Address
              </label>
              <input
                type="text"
                value={editLocationForm.address}
                onChange={(e) => setEditLocationForm({ ...editLocationForm, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Quick GPS Locator Button */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-500">Auto-fill coordinates:</span>
              <button
                type="button"
                onClick={handleUseEditCurrentLocation}
                disabled={gettingEditLocationGps}
                className="px-2.5 py-1 text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 hover:bg-primary-100 rounded-lg flex items-center gap-1"
              >
                <Compass className={`w-3.5 h-3.5 ${gettingEditLocationGps ? 'animate-spin' : ''}`} />
                <span>Use Current Device GPS</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Latitude *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editLocationForm.latitude}
                  onChange={(e) => setEditLocationForm({ ...editLocationForm, latitude: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Longitude *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editLocationForm.longitude}
                  onChange={(e) => setEditLocationForm({ ...editLocationForm, longitude: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Geofence Radius (Meters) *
              </label>
              <input
                type="number"
                min="50"
                max="2000"
                required
                value={editLocationForm.radiusMeters}
                onChange={(e) => setEditLocationForm({ ...editLocationForm, radiusMeters: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Punches within this radius will be recognized as 'In Perimeter'
              </span>
            </div>

            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsActiveCheck"
                  checked={editLocationForm.isActive}
                  onChange={(e) => setEditLocationForm({ ...editLocationForm, isActive: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="editIsActiveCheck" className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  Active (allows staff to clock in from this location)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsDefaultCheck"
                  checked={editLocationForm.isDefault}
                  onChange={(e) => setEditLocationForm({ ...editLocationForm, isDefault: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="editIsDefaultCheck" className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                  Set as primary headquarters (Default HQ)
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingLocation(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t('actions.cancel')}
              </button>
              <button
                type="submit"
                disabled={submittingEditLocation}
                className="px-5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {submittingEditLocation ? 'Saving Changes...' : 'Save Location'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD PUBLIC HOLIDAY                                               */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        title="Add Public Holiday"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateHoliday} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Holiday Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ethiopian New Year (Enkutatash), Meskel, Eid"
              value={holidayForm.title}
              onChange={(e) => setHolidayForm({ ...holidayForm, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Holiday Date *
            </label>
            <input
              type="date"
              required
              value={holidayForm.date}
              onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description / Notes
            </label>
            <textarea
              rows="2"
              placeholder="Optional notes regarding the public holiday..."
              value={holidayForm.description}
              onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRecurringCheck"
              checked={holidayForm.isRecurringYearly}
              onChange={(e) => setHolidayForm({ ...holidayForm, isRecurringYearly: e.target.checked })}
              className="rounded text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isRecurringCheck" className="text-xs text-slate-700 dark:text-slate-300">
              Recurring yearly holiday (repeats annually on this date)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsHolidayModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submittingHoliday}
              className="px-5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {submittingHoliday ? 'Saving...' : 'Register Holiday'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2B: VIEW PUBLIC HOLIDAY DETAILS                                     */}
      {/* ========================================================================= */}
      {selectedHolidayDetail && (
        <Modal
          isOpen={Boolean(selectedHolidayDetail)}
          onClose={() => setSelectedHolidayDetail(null)}
          title="Public Holiday Details"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-primary-500" />
                    <span>{selectedHolidayDetail.title}</span>
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {new Date(selectedHolidayDetail.date).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                {selectedHolidayDetail.isRecurringYearly ? (
                  <Badge variant="success">Annual</Badge>
                ) : (
                  <Badge variant="neutral">Single Year</Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Official Date
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {selectedHolidayDetail.date ? new Date(selectedHolidayDetail.date).toISOString().split('T')[0] : '-'}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Recurrence
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedHolidayDetail.isRecurringYearly ? 'Repeats Annually' : 'One-time Only'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Calendar Status
              </span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${selectedHolidayDetail.isActive !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedHolidayDetail.isActive !== false ? 'Active Official Holiday' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Description & Notes
              </span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {selectedHolidayDetail.description || 'No additional notes or description provided for this holiday.'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedHolidayDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {t('actions.close')}
              </button>
              {isHrAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    const h = selectedHolidayDetail;
                    setSelectedHolidayDetail(null);
                    handleOpenEditHoliday(h);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary-500 hover:bg-primary-600 flex items-center gap-1.5 transition shadow-xs"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Holiday</span>
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2C: EDIT PUBLIC HOLIDAY                                             */}
      {/* ========================================================================= */}
      {editingHoliday && (
        <Modal
          isOpen={Boolean(editingHoliday)}
          onClose={() => setEditingHoliday(null)}
          title="Edit Public Holiday"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleUpdateHoliday} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Holiday Title *
              </label>
              <input
                type="text"
                required
                value={editHolidayForm.title}
                onChange={(e) => setEditHolidayForm({ ...editHolidayForm, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Holiday Date *
              </label>
              <input
                type="date"
                required
                value={editHolidayForm.date}
                onChange={(e) => setEditHolidayForm({ ...editHolidayForm, date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Description / Notes
              </label>
              <textarea
                rows="2"
                placeholder="Optional notes regarding the public holiday..."
                value={editHolidayForm.description}
                onChange={(e) => setEditHolidayForm({ ...editHolidayForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsRecurringCheck"
                  checked={editHolidayForm.isRecurringYearly}
                  onChange={(e) => setEditHolidayForm({ ...editHolidayForm, isRecurringYearly: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="editIsRecurringCheck" className="text-xs text-slate-700 dark:text-slate-300">
                  Recurring yearly holiday (repeats annually on this date)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editHolidayIsActive"
                  checked={editHolidayForm.isActive}
                  onChange={(e) => setEditHolidayForm({ ...editHolidayForm, isActive: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="editHolidayIsActive" className="text-xs text-slate-700 dark:text-slate-300">
                  Active official non-working holiday
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingHoliday(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t('actions.cancel')}
              </button>
              <button
                type="submit"
                disabled={submittingEditHoliday}
                className="px-5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {submittingEditHoliday ? 'Saving Changes...' : 'Save Holiday'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
