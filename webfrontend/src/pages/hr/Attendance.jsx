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
  UserCheck,
  Eye,
  X,
  FileEdit,
  ExternalLink,
  Compass,
  ShieldCheck,
  User
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

  // Complete attendance capture inspection modal
  const [selectedAttendanceDetail, setSelectedAttendanceDetail] = useState(null);

  // Photo quick viewer modal
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

  // Current logged in user's employee record
  const currentEmployee = employees.find(
    (e) =>
      (user?.employee && (e._id === (user.employee._id || user.employee))) ||
      (e.user && (e.user._id || e.user) === user?._id) ||
      (e.email?.toLowerCase() === user?.email?.toLowerCase())
  );

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
      const response = await api.get('/employees?limit=200');
      if (response.success && Array.isArray(response.data)) {
        setEmployees(response.data);
        const myEmp = response.data.find(
          (e) =>
            (user?.employee && (e._id === (user.employee._id || user.employee))) ||
            (e.user && (e.user._id || e.user) === user?._id) ||
            (e.email?.toLowerCase() === user?.email?.toLowerCase())
        );

        if (!canManage) {
          if (myEmp) {
            setSelectedEmployee(myEmp._id);
          }
        } else if (response.data.length > 0) {
          setSelectedEmployee(myEmp ? myEmp._id : response.data[0]._id);
          setManualForm((prev) => ({ ...prev, employee: myEmp ? myEmp._id : response.data[0]._id }));
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

  // Sync selected employee whenever currentEmployee or canManage changes
  useEffect(() => {
    if (!canManage && currentEmployee) {
      setSelectedEmployee(currentEmployee._id);
    }
  }, [canManage, currentEmployee]);

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
        err.message || 'Camera permission denied or camera device unavailable. Please ensure camera access is enabled.'
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
        const accuracy = Math.round(pos.coords.accuracy || 0);
        setGeoLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: accuracy,
          diameter: accuracy * 2
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

    // Ensure non-manager always uses their own employee ID
    if (!canManage && currentEmployee) {
      setSelectedEmployee(currentEmployee._id);
    }

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

      const accuracy = geoLocation?.accuracy || 0;
      const diameter = geoLocation?.diameter || accuracy * 2;

      const locationPayload = geoLocation
        ? {
            latitude: geoLocation.latitude,
            longitude: geoLocation.longitude,
            accuracy: accuracy,
            diameter: diameter,
            address: `GPS [${geoLocation.latitude.toFixed(6)}, ${geoLocation.longitude.toFixed(6)}] (Radius ±${accuracy}m, Diameter ${diameter}m)`
          }
        : {
            address: 'GPS coordinates unavailable / Browser permission not granted'
          };

      const employeeTarget = canManage ? selectedEmployee : currentEmployee?._id || selectedEmployee;

      const payload = {
        employee: employeeTarget,
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

  // MANUAL ATTENDANCE ADJUSTMENT (HR / Admin only)
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

  const calculateDuration = (start, end) => {
    if (!start || !end) return 'In Progress';
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (isNaN(s) || isNaN(e) || e < s) return 'N/A';
    const diffMs = e - s;
    const hrs = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins}m`;
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
            {canManage
              ? 'Workforce attendance management with selfie camera capture and GPS geolocation radius.'
              : 'Personal attendance records with live camera selfie verification and GPS check-in.'}
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
            placeholder={canManage ? 'Search employee or dept...' : 'Search records...'}
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
          message={
            canManage
              ? 'No daily clock logs match your criteria. Use Clock In or HR Adjustment to register punches.'
              : 'You have no attendance logs registered yet. Use Clock In to record your daily attendance.'
          }
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
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    {att.employee?.profileImage ? (
                      <img
                        src={att.employee.profileImage}
                        alt={att.employee?.fullName}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 font-bold flex items-center justify-center border border-primary-500/20 text-xs">
                        {att.employee?.fullName?.charAt(0) || 'E'}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {att.employee?.fullName || 'Employee'}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {att.employee?.department || '-'} • {att.employee?.position || 'Staff'}
                      </p>
                    </div>
                  </div>
                  <Badge status={att.type || 'onTime'} text={att.type || 'On Time'} />
                </div>

                <div className="text-xs grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700/60 pt-2">
                  <div>
                    <span className="text-slate-400">Date:</span>{' '}
                    <strong>{new Date(att.date).toLocaleDateString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Hours:</span>{' '}
                    <strong>{calculateDuration(att.startTime, att.endTime)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Clock In:</span>{' '}
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {formatTimeDisplay(att.startTime)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Clock Out:</span>{' '}
                    <span className="font-mono text-primary-500 font-semibold">
                      {formatTimeDisplay(att.endTime)}
                    </span>
                  </div>
                </div>

                {/* Verification badges & View Complete Action */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {att.clockInSelfie?.image && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center gap-1 font-semibold text-[10px]">
                        <Camera className="w-3 h-3" />
                        <span>Selfie In</span>
                      </span>
                    )}
                    {att.clockInSelfie?.location?.latitude && (
                      <span className="px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 flex items-center gap-1 font-semibold text-[10px]">
                        <MapPin className="w-3 h-3" />
                        <span>GPS</span>
                      </span>
                    )}
                    {att.clockInSelfie?.location?.withinGeofence !== undefined && (
                      <span
                        className={`px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold text-[10px] ${
                          att.clockInSelfie.location.withinGeofence
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {att.clockInSelfie.location.withinGeofence ? (
                          <>
                            <ShieldCheck className="w-3 h-3" />
                            <span>In Perimeter</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" />
                            <span>Outside ({Math.round(att.clockInSelfie.location.distanceFromOfficeMeters || 0)}m)</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedAttendanceDetail(att)}
                    className="px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 hover:bg-primary-100 font-semibold text-xs flex items-center gap-1.5 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Capture</span>
                  </button>
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
                  <th className="px-4 py-3">Clock In</th>
                  <th className="px-4 py-3">Clock Out</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Perimeter</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredAttendances.map((att) => (
                  <tr key={att._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {att.employee?.profileImage ? (
                          <img
                            src={att.employee.profileImage}
                            alt={att.employee?.fullName}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 font-bold flex items-center justify-center border border-primary-500/20 text-xs">
                            {att.employee?.fullName?.charAt(0) || 'E'}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {att.employee?.fullName || 'Employee'}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-xs">
                            {att.employee?.position || 'Staff'}
                          </div>
                        </div>
                      </div>
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

                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                      {calculateDuration(att.startTime, att.endTime)}
                    </td>

                    <td className="px-4 py-3">
                      <Badge status={att.type || 'onTime'} text={att.type || 'On Time'} />
                    </td>

                    <td className="px-4 py-3">
                      {att.clockInSelfie?.location?.withinGeofence !== undefined ? (
                        att.clockInSelfie.location.withinGeofence ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <ShieldCheck className="w-3 h-3" />
                            <span>In Perimeter</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                            title={`Outside geofence: ~${Math.round(att.clockInSelfie.location.distanceFromOfficeMeters || 0)}m`}
                          >
                            <AlertCircle className="w-3 h-3" />
                            <span>Outside ({Math.round(att.clockInSelfie.location.distanceFromOfficeMeters || 0)}m)</span>
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 text-xs italic">-</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedAttendanceDetail(att)}
                        className="px-2.5 py-1 text-xs font-semibold text-primary-600 bg-primary-50 dark:bg-primary-950/60 hover:bg-primary-100 rounded-lg transition inline-flex items-center gap-1.5"
                        title="View complete attendance capture information"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Capture</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Clock In / Out Modal (Real Camera & Live Geolocation) */}
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
          {/* Employee Selection: HR/Manager can select other, regular employee is locked to themselves */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Employee Profile *
            </label>
            {canManage ? (
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
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                {currentEmployee?.profileImage ? (
                  <img
                    src={currentEmployee.profileImage}
                    alt={currentEmployee.fullName}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 font-bold flex items-center justify-center border border-primary-500/20 text-xs">
                    {(currentEmployee?.fullName || user?.fullName)?.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                    {currentEmployee?.fullName || user?.fullName}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {currentEmployee?.department
                      ? `${currentEmployee.department} • ${currentEmployee.position}`
                      : user?.email}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Verification Selfie (Real Camera Only, Upload Fallback Removed) */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-primary-500" />
                <span>Verification Selfie</span>
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

            {/* Live Video or Snapshot View */}
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

            {/* Snap Live Photo Button */}
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
          </div>

          {/* Live Browser Geolocation */}
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
                  Accuracy radius: ±{Math.round(geoLocation.accuracy || 0)} meters • Diameter: {geoLocation.diameter || Math.round(geoLocation.accuracy * 2)} meters
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
              disabled={submitting || (!selectedEmployee && !currentEmployee)}
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

      {/* Complete Attendance Capture Information Modal (Images, Coordinates, Radius & Diameter) */}
      <Modal
        isOpen={Boolean(selectedAttendanceDetail)}
        onClose={() => setSelectedAttendanceDetail(null)}
        title="Complete Attendance Capture Information"
        maxWidth="max-w-2xl"
      >
        {selectedAttendanceDetail && (
          <div className="space-y-4">
            {/* Employee Profile Header */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {selectedAttendanceDetail.employee?.profileImage ? (
                  <img
                    src={selectedAttendanceDetail.employee.profileImage}
                    alt={selectedAttendanceDetail.employee?.fullName}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 font-bold flex items-center justify-center border border-primary-500/20 text-sm">
                    {selectedAttendanceDetail.employee?.fullName?.charAt(0) || 'E'}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                    {selectedAttendanceDetail.employee?.fullName || 'Employee'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedAttendanceDetail.employee?.department || '-'} •{' '}
                    {selectedAttendanceDetail.employee?.position || 'Staff'}
                  </p>
                  {selectedAttendanceDetail.employee?.nationalId && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      ID: {selectedAttendanceDetail.employee.nationalId}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1">
                <Badge
                  status={selectedAttendanceDetail.type || 'onTime'}
                  text={selectedAttendanceDetail.type || 'On Time'}
                />
                <span className="text-xs text-slate-400">
                  {new Date(selectedAttendanceDetail.date).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Shift Timings Overview */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Clock In</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatTimeDisplay(selectedAttendanceDetail.startTime)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Clock Out</span>
                <span className="font-mono font-bold text-primary-500 text-sm">
                  {formatTimeDisplay(selectedAttendanceDetail.endTime)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Shift Duration</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {calculateDuration(selectedAttendanceDetail.startTime, selectedAttendanceDetail.endTime)}
                </span>
              </div>
            </div>

            {/* Clock-In Capture Details */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <LogIn className="w-4 h-4 text-emerald-500" />
                  <span>Clock-In Verification Capture</span>
                </h4>
                {selectedAttendanceDetail.clockInSelfie?.capturedAt && (
                  <span className="text-[11px] text-slate-400">
                    {new Date(selectedAttendanceDetail.clockInSelfie.capturedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>

              {selectedAttendanceDetail.clockInSelfie?.image ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  {/* Photo */}
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 aspect-video sm:aspect-square flex items-center justify-center">
                    <img
                      src={selectedAttendanceDetail.clockInSelfie.image}
                      alt="Clock In Selfie"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Location & Diameter details */}
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                        <span>GPS Coordinates & Radius</span>
                      </span>
                      {selectedAttendanceDetail.clockInSelfie?.location?.latitude ? (
                        <>
                          <div className="font-mono text-slate-800 dark:text-slate-200 font-semibold text-[11px]">
                            Lat: {selectedAttendanceDetail.clockInSelfie.location.latitude.toFixed(6)}, Lng:{' '}
                            {selectedAttendanceDetail.clockInSelfie.location.longitude.toFixed(6)}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400">
                            Accuracy Radius:{' '}
                            <strong className="text-emerald-600 dark:text-emerald-400">
                              ±{Math.round(selectedAttendanceDetail.clockInSelfie.location.accuracy || 15)}m
                            </strong>
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400">
                            Capture Diameter:{' '}
                            <strong className="text-primary-600 dark:text-primary-400">
                              {selectedAttendanceDetail.clockInSelfie.location.diameter ||
                                Math.round((selectedAttendanceDetail.clockInSelfie.location.accuracy || 15) * 2)}
                              m
                            </strong>
                          </div>
                          {selectedAttendanceDetail.clockInSelfie.location.withinGeofence !== undefined && (
                            <div className="text-[11px] text-slate-600 dark:text-slate-400">
                              Office Perimeter:{' '}
                              <strong
                                className={
                                  selectedAttendanceDetail.clockInSelfie.location.withinGeofence
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }
                              >
                                {selectedAttendanceDetail.clockInSelfie.location.withinGeofence
                                  ? 'Within Office Geofence'
                                  : `Outside Office Perimeter (${Math.round(selectedAttendanceDetail.clockInSelfie.location.distanceFromOfficeMeters || 0)}m away)`}
                              </strong>
                            </div>
                          )}
                          <div className="pt-1.5">
                            <a
                              href={`https://www.google.com/maps?q=${selectedAttendanceDetail.clockInSelfie.location.latitude},${selectedAttendanceDetail.clockInSelfie.location.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline bg-primary-50 dark:bg-primary-950/60 px-2.5 py-1 rounded-lg"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>View On Google Maps</span>
                            </a>
                          </div>
                        </>
                      ) : (
                        <p className="text-slate-400 italic text-[11px]">
                          {selectedAttendanceDetail.clockInSelfie?.location?.address || 'GPS coordinates not recorded'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No live selfie recorded at clock-in.</p>
              )}
            </div>

            {/* Clock-Out Capture Details (if present) */}
            {selectedAttendanceDetail.endTime && (
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                    <LogOut className="w-4 h-4 text-primary-500" />
                    <span>Clock-Out Verification Capture</span>
                  </h4>
                  {selectedAttendanceDetail.clockOutSelfie?.capturedAt && (
                    <span className="text-[11px] text-slate-400">
                      {new Date(selectedAttendanceDetail.clockOutSelfie.capturedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                {selectedAttendanceDetail.clockOutSelfie?.image ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                    {/* Photo */}
                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 aspect-video sm:aspect-square flex items-center justify-center">
                      <img
                        src={selectedAttendanceDetail.clockOutSelfie.image}
                        alt="Clock Out Selfie"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Location & Diameter details */}
                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-primary-500" />
                          <span>GPS Coordinates & Radius</span>
                        </span>
                        {selectedAttendanceDetail.clockOutSelfie?.location?.latitude ? (
                          <>
                            <div className="font-mono text-slate-800 dark:text-slate-200 font-semibold text-[11px]">
                              Lat: {selectedAttendanceDetail.clockOutSelfie.location.latitude.toFixed(6)}, Lng:{' '}
                              {selectedAttendanceDetail.clockOutSelfie.location.longitude.toFixed(6)}
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400">
                              Accuracy Radius:{' '}
                              <strong className="text-emerald-600 dark:text-emerald-400">
                                ±{Math.round(selectedAttendanceDetail.clockOutSelfie.location.accuracy || 15)}m
                              </strong>
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400">
                              Capture Diameter:{' '}
                              <strong className="text-primary-600 dark:text-primary-400">
                                {selectedAttendanceDetail.clockOutSelfie.location.diameter ||
                                  Math.round((selectedAttendanceDetail.clockOutSelfie.location.accuracy || 15) * 2)}
                                m
                              </strong>
                            </div>
                            <div className="pt-1.5">
                              <a
                                href={`https://www.google.com/maps?q=${selectedAttendanceDetail.clockOutSelfie.location.latitude},${selectedAttendanceDetail.clockOutSelfie.location.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline bg-primary-50 dark:bg-primary-950/60 px-2.5 py-1 rounded-lg"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>View On Google Maps</span>
                              </a>
                            </div>
                          </>
                        ) : (
                          <p className="text-slate-400 italic text-[11px]">
                            {selectedAttendanceDetail.clockOutSelfie?.location?.address || 'GPS coordinates not recorded'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No live selfie recorded at clock-out.</p>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedAttendanceDetail(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Quick Selfie Viewer Modal */}
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

      {/* HR Manual Attendance Adjustment Modal (HR / Admin only) */}
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
            />
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
