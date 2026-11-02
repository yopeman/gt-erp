/**
 * Classify attendance type based on clock-in time
 * Standard start time default: 09:00 AM (with 15 minutes grace period)
 */
export const classifyAttendance = (
  clockInTime = new Date(),
  standardHour = 9,
  graceMinutes = 15
) => {
  const clockIn = new Date(clockInTime);
  const cutoff = new Date(clockIn);
  cutoff.setHours(standardHour, graceMinutes, 0, 0);

  if (clockIn > cutoff) {
    return 'late';
  }
  return 'on time';
};

/**
 * Calculate total days inclusive between two dates
 */
export const calculateDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Calculate decimal worked hours between two times
 */
export const calculateWorkedHours = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end - start;
  if (diffMs <= 0) return 0;
  return Number((diffMs / (1000 * 60 * 60)).toFixed(2));
};

export default {
  classifyAttendance,
  calculateDaysBetween,
  calculateWorkedHours
};

