import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import api from '../../services/api';
import {
  Clock,
  LogIn,
  LogOut,
  Camera,
  MapPin,
  Calendar,
  Search,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Upload,
  UserCheck,
  Eye,
  Plus,
  Filter,
  X,
  FileEdit,
  Trash2,
  SlidersHorizontal
} from 'lucide-react';

export default function Attendance() {
  const { t } = useTranslation();
  const { user, hasRole } = useAuth();
  const canManage = hasRole(['admin', 'hr', 'manager']);

  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);

  // Filtering states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Clock In/Out Modal
  const [isClockModalOpen, setIsClockModalOpen] = useState(false);
  const [clockAction, setClockAction] = useState('clockIn'); // 'clockIn' or 'clockOut'
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [clockError, setClockError] = useState('');
  const [clockSuccess, setClockSuccess] = useState('');

  // Camera & Geolocation state
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const [capturedSelfie, setCapturedSelfie] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [geoLocation, setGeoLocation] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  // Photo viewer modal
  const [viewSelfieModal, setViewSelfieModal] = useState(null);

  // Manual Attendance Record Modal for HR/Admin
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState('');
  const [manualForm, setManualForm] = useState({
    employee: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '17:00',
    type: 'on time'
  });

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter) queryParams.append('type', statusFilter);
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await api.get(`/attendances${qs}`);

      if (response.success && Array.isArray(response.data)) {
        setAttendances(response.data);
      } else if (Array.isArray(response)) {
        setAttendances(response);
      } else {
        setAttendances([]);
      }
    } catch (err) {
      console.error('Error fetching attendances:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeesList = async () => {
    try {
      const response = await api.get('/employees');
      if (response.success && Array.isArray(response.data)) {
        setEmployees(response.data);
        if (response.data.length > 0) {
          setSelectedEmployee(response.data[0]._id);
          setManualForm((prev) => ({ ...prev, employee: response.data[0]._id }));
        }
      }
    } catch (err) {
      console.warn('Could not load employees for clock selection:', err);
    }
  };

  useEffect(() => {
    fetchEmployeesList();
  }, []);

  useEffect(() => {
    fetchAttendanceRecords();
  }, [statusFilter, startDate, endDate]);

  // Clean up media tracks on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // CAMERA CONTROLS
  const startCamera = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser or context.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Camera access warning:', err);
      setCameraError(
        err.message || 'Camera permission denied or camera device unavailable. You can use the photo upload option below.'
      );
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedSelfie(dataUrl);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setCapturedSelfie('');
    startCamera();
  };

  const handleSelfieFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedSelfie(reader.result);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  // GEOLOCATION CONTROLS
  const getGeolocation = () => {
    setGeoLoading(true);
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      setGeoLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
        setGeoLoading(false);
      },
      (err) => {
        console.warn('Geolocation warning:', err);
        setGeoError(err.message || 'Unable to retrieve GPS coordinates.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const openClockModal = (action) => {
    setClockAction(action);
    setClockError('');
    setClockSuccess('');
    setCapturedSelfie('');
    setCameraError('');
    setIsClockModalOpen(true);
    setTimeout(() => {
      startCamera();
      getGeolocation();
    }, 150);
  };

  const closeClockModal = () => {
    stopCamera();
    setIsClockModalOpen(false);
    setCapturedSelfie('');
    setCameraError('');
  };

  const handleClockAction = async (e) => {
    e.preventDefault();
    setClockError('');
    setClockSuccess('');
    setSubmitting(true);

    try {
      const endpoint = clockAction === 'clockIn' ? '/attendances/clock-in' : '/attendances/clock-out';

      const locationPayload = geoLocation
        ? {
            latitude: geoLocation.latitude,
            longitude: geoLocation.longitude,
            address: `GPS [${geoLocation.latitude.toFixed(6)}, ${geoLocation.longitude.toFixed(6)}] (±${Math.round(
              geoLocation.accuracy || 0
            )}m)`
          }
        : {
            address: 'GPS coordinates unavailable / Browser permission not granted'
          };

      const payload = {
        employee: selectedEmployee,
        location: locationPayload,
        selfie: capturedSelfie || undefined
      };

      const response = await api.post(endpoint, payload);
      if (response.success) {
        setClockSuccess(`Successfully recorded ${clockAction === 'clockIn' ? 'Clock In' : 'Clock Out'}!`);
        setTimeout(() => {
          closeClockModal();
          setClockSuccess('');
        }, 1500);
        await fetchAttendanceRecords();
      }
    } catch (err) {
      setClockError(err.message || `Failed to record ${clockAction}`);
    } finally {
      setSubmitting(false);
    }
  };

  // MANUAL ATTENDANCE ADJUSTMENT
  const handleOpenManualModal = () => {
    setManualError('');
    setIsManualModalOpen(true);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setManualError('');
    setManualSubmitting(true);

    try {
      const [startHour, startMin] = manualForm.startTime.split(':');
      const [endHour, endMin] = manualForm.endTime ? manualForm.endTime.split(':') : ['', ''];

      const startDateTime = new Date(manualForm.date);
      startDateTime.setHours(Number(startHour) || 8, Number(startMin) || 0, 0, 0);

      let endDateTime = null;
      if (manualForm.endTime) {
        endDateTime = new Date(manualForm.date);
        endDateTime.setHours(Number(endHour) || 17, Number(endMin) || 0, 0, 0);
      }

      const payload = {
        employee: manualForm.employee,
        date: new Date(manualForm.date),
        startTime: startDateTime,
        endTime: endDateTime,
        type: manualForm.type
      };

      const response = await api.post('/attendances', payload);
      if (response.success) {
        setIsManualModalOpen(false);
        await fetchAttendanceRecords();
      }
    } catch (err) {
      setManualError(err.message || 'Failed to record manual attendance entry');
    } finally {
      setManualSubmitting(false);
    }
  };

  const formatTimeDisplay = (timeVal) => {
    if (!timeVal) return '--:--';
    const d = new Date(timeVal);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return timeVal;
  };

  // Filter attendances by client search query
  const filteredAttendances = attendances.filter((att) => {
    const empName = att.employee?.fullName?.toLowerCase() || '';
    const empDept = att.employee?.department?.toLowerCase() || '';
    const q = search.toLowerCase();
    return empName.includes(q) || empDept.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary-500" />
            <span>{t('nav.attendance')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Section 2.3 • Daily workforce tracking with live camera selfie verification and GPS location.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchAttendanceRecords}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Refresh attendances"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canManage && (
            <button
              onClick={handleOpenManualModal}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
              title="Manual HR Attendance Adjustment"
            >
              <FileEdit className="w-4 h-4 text-primary-500" />
              <span>HR Adjustment</span>
            </button>
          )}

          <button
            onClick={() => openClockModal('clockIn')}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{t('actions.clockIn')}</span>
          </button>

          <button
            onClick={() => openClockModal('clockOut')}
            className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('actions.clockOut')}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee or dept..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Attendance Statuses</option>
          <option value="on time">On Time</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
          <option value="overtime">Overtime</option>
        </select>

        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            title="Start Date"
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            title="End Date"
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {(statusFilter || startDate || endDate || search) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setStartDate('');
                setEndDate('');
                setSearch('');
              }}
              className="p-1.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
              title="Reset all filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Attendance Records Presentation */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading attendance records from live API...
        </div>
      ) : filteredAttendances.length === 0 ? (
        <EmptyState
          title="No attendance records found"
          message="No daily clock logs match your criteria. Use Clock In or HR Adjustment to register punches."
          actionText={t('actions.clockIn')}
          onAction={() => openClockModal('clockIn')}
          icon={Clock}
        />
      ) : (
        <>
          {/* Mobile Card Deck (< md) */}
          <div className="block md:hidden space-y-3">
            {filteredAttendances.map((att) => (
              <div
                key={att._id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {att.employee?.fullName || 'Employee'}
                    </h3>
                    <p className="text-xs text-slate-400">{att.employee?.department || '-'}</p>
                  </div>
                  <Badge status={att.type || 'onTime'} text={att.type || 'On Time'} />
                </div>

                <div className="text-xs grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700/60 pt-2">
                  <div>
                    <span className="text-slate-400">Date:</span>{' '}
                    {new Date(att.date).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="text-slate-400">Punch:</span>{' '}
                    {formatTimeDisplay(att.startTime)} - {formatTimeDisplay(att.endTime)}
                  </div>
                </div>

                {/* Selfies & Geolocation badges */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {att.clockInSelfie?.image && (
                      <button
                        onClick={() =>
                          setViewSelfieModal({
                            title: `Clock-In Selfie: ${att.employee?.fullName}`,
                            image: att.clockInSelfie.image,
                            capturedAt: att.clockInSelfie.capturedAt,
                            location: att.clockInSelfie.location
                          })
                        }
                        className="px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center gap-1 font-semibold hover:underline"
                      >
                        <Camera className="w-3 h-3" />
                        <span>In Selfie</span>
                      </button>
                    )}
                    {att.clockOutSelfie?.image && (
                      <button
                        onClick={() =>
                          setViewSelfieModal({
                            title: `Clock-Out Selfie: ${att.employee?.fullName}`,
                            image: att.clockOutSelfie.image,
                            capturedAt: att.clockOutSelfie.capturedAt,
                            location: att.clockOutSelfie.location
                          })
                        }
                        className="px-2 py-1 rounded-md bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 flex items-center gap-1 font-semibold hover:underline"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Out Selfie</span>
                      </button>
                    )}
                  </div>

                  {att.clockInSelfie?.location?.latitude && (
                    <span className="text-slate-400 flex items-center gap-1 text-[10px]" title="GPS Verified">
                      <MapPin className="w-3 h-3 text-emerald-500" />
                      <span>GPS OK</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Start Time</th>
                  <th className="px-4 py-3">End Time</th>
                  <th className="px-4 py-3">Verification / Selfies</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredAttendances.map((att) => (
                  <tr key={att._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      {att.employee?.fullName || 'Employee'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {att.employee?.department || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {new Date(att.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-emerald-600 dark:text-emerald-400">
                      {formatTimeDisplay(att.startTime)}
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-primary-500">
                      {formatTimeDisplay(att.endTime)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {att.clockInSelfie?.image && (
                          <button
                            onClick={() =>
                              setViewSelfieModal({
                                title: `Clock-In Selfie: ${att.employee?.fullName}`,
                                image: att.clockInSelfie.image,
                                capturedAt: att.clockInSelfie.capturedAt,
                                location: att.clockInSelfie.location
                              })
                            }
                            className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold hover:underline flex items-center gap-1"
                            title="Inspect Clock-In Selfie"
                          >
                            <Camera className="w-3 h-3" />
                            <span>In</span>
                          </button>
                        )}
                        {att.clockOutSelfie?.image && (
                          <button
                            onClick={() =>
                              setViewSelfieModal({
                                title: `Clock-Out Selfie: ${att.employee?.fullName}`,
                                image: att.clockOutSelfie.image,
                                capturedAt: att.clockOutSelfie.capturedAt,
                                location: att.clockOutSelfie.location
                              })
                            }
                            className="px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-400 text-xs font-semibold hover:underline flex items-center gap-1"
                            title="Inspect Clock-Out Selfie"
                          >
                            <Camera className="w-3 h-3" />
                            <span>Out</span>
                          </button>
                        )}
                        {att.clockInSelfie?.location?.latitude && (
                          <span
                            className="text-slate-400 flex items-center gap-0.5 text-[11px]"
                            title={`GPS: ${att.clockInSelfie.location.latitude}, ${att.clockInSelfie.location.longitude}`}
                          >
                            <MapPin className="w-3 h-3 text-emerald-500" />
                          </span>
                        )}
                        {!att.clockInSelfie?.image && !att.clockOutSelfie?.image && (
                          <span className="text-slate-400 text-xs italic">Manual log</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={att.type || 'onTime'} text={att.type || 'On Time'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Real Camera & GPS Clock In / Out Modal */}
      <Modal
        isOpen={isClockModalOpen}
        onClose={closeClockModal}
        title={clockAction === 'clockIn' ? 'Live Clock In Punch' : 'Live Clock Out Punch'}
        maxWidth="max-w-lg"
      >
        {clockError && (
          <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{clockError}</span>
          </div>
        )}

        {clockSuccess && (
          <div className="mb-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{clockSuccess}</span>
          </div>
        )}

        <form onSubmit={handleClockAction} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Employee Profile *
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            >
              {employees.length === 0 ? (
                <option value="">No employees found - register first</option>
              ) : (
                employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.fullName} ({emp.department} - {emp.position})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Real Browser Camera Capture */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-primary-500" />
                <span>Verification Selfie (Real Camera)</span>
              </span>
              {capturedSelfie ? (
                <button
                  type="button"
                  onClick={retakePhoto}
                  className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline"
                >
                  Retake Photo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Restart Cam</span>
                </button>
              )}
            </div>

            {/* Video or Snapshot View */}
            <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-800">
              {capturedSelfie ? (
                <img src={capturedSelfie} alt="Captured Selfie" className="w-full h-full object-cover" />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${cameraError ? 'hidden' : 'block'}`}
                  />
                  {cameraError && (
                    <div className="p-4 text-center text-xs text-slate-400 space-y-2">
                      <Camera className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                      <p>{cameraError}</p>
                    </div>
                  )}
                </>
              )}

              {/* Hidden canvas for snapshot rendering */}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Camera Actions & File Fallback */}
            <div className="flex items-center justify-between gap-2 pt-1">
              {!capturedSelfie && !cameraError && (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-full py-2 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-4 h-4" />
                  <span>Snap Live Photo</span>
                </button>
              )}

              <div className="w-full">
                <label className="w-full cursor-pointer py-1.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 flex items-center justify-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-primary-500" />
                  <span>{capturedSelfie ? 'Or upload different photo' : 'Upload photo / file fallback'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handleSelfieFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Real Browser Geolocation */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-500" />
                <span>Live Browser Geolocation</span>
              </span>
              <button
                type="button"
                onClick={getGeolocation}
                disabled={geoLoading}
                className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${geoLoading ? 'animate-spin' : ''}`} />
                <span>Refresh GPS</span>
              </button>
            </div>

            {geoLoading ? (
              <p className="text-[11px] text-slate-400 animate-pulse">Acquiring live browser GPS coordinates...</p>
            ) : geoLocation ? (
              <div className="text-[11px] space-y-0.5 text-slate-600 dark:text-slate-300 font-mono">
                <div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 font-sans">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>GPS Lock Acquired</span>
                </div>
                <div>Lat: {geoLocation.latitude.toFixed(6)}, Long: {geoLocation.longitude.toFixed(6)}</div>
                <div className="text-slate-400 text-[10px] font-sans">
                  Accuracy radius: ±{Math.round(geoLocation.accuracy || 0)} meters
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-amber-600 dark:text-amber-400">
                {geoError || 'Awaiting browser GPS permission...'}
              </div>
            )}
          </div>

          {/* Submit & Cancel */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={closeClockModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedEmployee}
              className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md transition disabled:opacity-50 ${
                clockAction === 'clockIn' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-primary-500 hover:bg-primary-600'
              }`}
            >
              {submitting
                ? 'Recording Punch...'
                : clockAction === 'clockIn'
                ? t('actions.clockIn')
                : t('actions.clockOut')}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Selfie Preview Modal */}
      <Modal
        isOpen={Boolean(viewSelfieModal)}
        onClose={() => setViewSelfieModal(null)}
        title={viewSelfieModal?.title || 'Attendance Verification Selfie'}
        maxWidth="max-w-md"
      >
        {viewSelfieModal && (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 aspect-square flex items-center justify-center">
              <img
                src={viewSelfieModal.image}
                alt="Selfie verification"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div className="text-slate-500">
                Captured:{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {viewSelfieModal.capturedAt ? new Date(viewSelfieModal.capturedAt).toLocaleString() : 'N/A'}
                </strong>
              </div>
              {viewSelfieModal.location && (
                <div className="text-slate-500">
                  Location:{' '}
                  <strong className="text-slate-800 dark:text-slate-200 font-mono">
                    {viewSelfieModal.location.latitude
                      ? `Lat ${viewSelfieModal.location.latitude.toFixed(5)}, Lng ${viewSelfieModal.location.longitude.toFixed(5)}`
                      : viewSelfieModal.location.address || 'Manual log'}
                  </strong>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewSelfieModal(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* HR Manual Attendance Adjustment Modal */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="HR Administrative Attendance Adjustment"
        maxWidth="max-w-md"
      >
        {manualError && (
          <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{manualError}</span>
          </div>
        )}

        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Employee *
            </label>
            <select
              required
              value={manualForm.employee}
              onChange={(e) => setManualForm({ ...manualForm, employee: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            >
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.fullName} ({emp.department} - {emp.position})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Attendance Date *
            </label>
            <input
              type="date"
              required
              value={manualForm.date}
              onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            >
            </input>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={manualForm.startTime}
                onChange={(e) => setManualForm({ ...manualForm, startTime: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={manualForm.endTime}
                onChange={(e) => setManualForm({ ...manualForm, endTime: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Attendance Status *
            </label>
            <select
              value={manualForm.type}
              onChange={(e) => setManualForm({ ...manualForm, type: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="on time">On Time</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="overtime">Overtime</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsManualModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={manualSubmitting}
              className="px-5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {manualSubmitting ? 'Recording...' : 'Record Attendance'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
