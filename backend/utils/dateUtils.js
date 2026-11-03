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
 * Calculate total calendar days inclusive between two dates
 */
export const calculateDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Calculate working days (excluding Saturdays, Sundays, and public holidays)
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @param {Array<Date|string>} holidays List of holiday dates
 * @returns {number}
 */
export const calculateWorkingDays = (startDate, endDate, holidays = []) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return 0;
  }

  // Normalize holidays to 'YYYY-MM-DD' strings for quick comparison
  const holidayStrings = new Set(
    holidays.map((h) => {
      const d = new Date(h);
      return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null;
    }).filter(Boolean)
  );

  let workingDays = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);

  const targetEnd = new Date(end);
  targetEnd.setHours(0, 0, 0, 0);

  while (current <= targetEnd) {
    const dayOfWeek = current.getDay(); // 0 is Sunday, 6 is Saturday
    const dateStr = current.toISOString().split('T')[0];

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidayStrings.has(dateStr);

    if (!isWeekend && !isHoliday) {
      workingDays++;
    }

    current.setDate(current.getDate() + 1);
  }

  return workingDays;
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
  calculateWorkingDays,
  calculateWorkedHours
};
