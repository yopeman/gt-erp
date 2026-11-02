import React, { useState, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';

export default function Attendance() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);

  // Clock In/Out Modal
  const [isClockModalOpen, setIsClockModalOpen] = useState(false);
  const [clockAction, setClockAction] = useState('clockIn'); // 'clockIn' or 'clockOut'
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [clockError, setClockError] = useState('');
  const [clockSuccess, setClockSuccess] = useState('');

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      const response = await api.get('/attendances');
      if (response.success && Array.isArray(response.data)) {
        setAttendances(response.data);
      } else if (Array.isArray(response)) {
        setAttendances(response);
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
        }
      }
    } catch (err) {
      console.warn('Could not load employees for clock selection:', err);
    }
  };

  useEffect(() => {
    fetchAttendanceRecords();
    fetchEmployeesList();
  }, []);

  const handleClockAction = async (e) => {
    e.preventDefault();
    setClockError('');
    setClockSuccess('');
    setSubmitting(true);

    try {
      const endpoint = clockAction === 'clockIn' ? '/attendances/clock-in' : '/attendances/clock-out';
      
      const payload = {
        employee: selectedEmployee,
        location: 'Factory Gate GPS [9.0222, 38.7468]',
        // Clean placeholder selfie string for clock punch
        selfie: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/'
      };

      const response = await api.post(endpoint, payload);
      if (response.success) {
        setClockSuccess(`Successfully recorded ${clockAction === 'clockIn' ? 'Clock In' : 'Clock Out'}!`);
        setTimeout(() => {
          setIsClockModalOpen(false);
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

  const openClockModal = (action) => {
    setClockAction(action);
    setClockError('');
    setClockSuccess('');
    setIsClockModalOpen(true);
  };

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
            Section 2.3 • Daily attendance tracking, clock-in selfies, and shift compliance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAttendanceRecords}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Refresh attendances"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

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

      {/* Attendance Records */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading attendance records from live API...
        </div>
      ) : attendances.length === 0 ? (
        <EmptyState
          title="No attendance records found"
          message="No daily clock logs recorded yet. Use the Clock In button above to register an employee punch."
          actionText={t('actions.clockIn')}
          onAction={() => openClockModal('clockIn')}
          icon={Clock}
        />
      ) : (
        <>
          {/* Mobile Card Deck (< md) */}
          <div className="block md:hidden space-y-3">
            {attendances.map((att) => (
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
                    <span className="text-slate-400">Time:</span>{' '}
                    {att.startTime || '--:--'} - {att.endTime || '--:--'}
                  </div>
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
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {attendances.map((att) => (
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
                      {att.startTime || '--:--'}
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-primary-500">
                      {att.endTime || '--:--'}
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

      {/* Clock In / Out Modal */}
      <Modal
        isOpen={isClockModalOpen}
        onClose={() => setIsClockModalOpen(false)}
        title={clockAction === 'clockIn' ? 'Employee Clock In' : 'Employee Clock Out'}
        maxWidth="max-w-md"
      >
        {clockError && (
          <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {clockError}
          </div>
        )}

        {clockSuccess && (
          <div className="mb-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{clockSuccess}</span>
          </div>
        )}

        <form onSubmit={handleClockAction} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Employee
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

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 text-slate-500">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
              <Camera className="w-4 h-4 text-primary-500" />
              <span>Biometric / Selfie Verification Simulation</span>
            </div>
            <p className="text-[11px]">
              Hardware/camera verification: Verified at Factory Gate (Lat: 9.0222, Long: 38.7468).
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsClockModalOpen(false)}
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
              {submitting ? 'Recording...' : clockAction === 'clockIn' ? t('actions.clockIn') : t('actions.clockOut')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
