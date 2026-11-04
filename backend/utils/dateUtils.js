/**
 * Classify attendance type based on clock-in time
 * Standard start time default: 09:00 AM (with 15 minutes grace period)
 */
export const classifyAttendance = (
  clockInTime = new Date(),
  standardStartTime = '09:00',
  graceMinutes = 15
) => {
  const clockIn = new Date(clockInTime);
  const cutoff = new Date(clockIn);
  let hour = 9;
  let min = 0;
  if (typeof standardStartTime === 'string' && standardStartTime.includes(':')) {
    const parts = standardStartTime.split(':').map(Number);
    hour = !isNaN(parts[0]) ? parts[0] : 9;
    min = !isNaN(parts[1]) ? parts[1] : 0;
  } else if (typeof standardStartTime === 'number') {
    hour = standardStartTime;
    min = 0;
  }
  cutoff.setHours(hour, min + (Number(graceMinutes) || 0), 0, 0);

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
 * Calculate working days (excluding non-working days/weekends and public holidays)
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @param {Array<Date|string|object>} holidays List of holiday dates or objects { date, isRecurringYearly }
 * @param {Array<number>} workingDaysOfWeek Array of day indices considered working days (default: [1,2,3,4,5] Mon-Fri)
 * @returns {number}
 */
export const calculateWorkingDays = (
  startDate,
  endDate,
  holidays = [],
  workingDaysOfWeek = [1, 2, 3, 4, 5]
) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return 0;
  }

  // Build sets for exact dates (YYYY-MM-DD) and recurring dates (MM-DD)
  const exactHolidays = new Set();
  const recurringHolidays = new Set();

  holidays.forEach((h) => {
    if (!h) return;
    const rawDate = h.date ? h.date : h;
    const isRecurring = Boolean(h.isRecurringYearly);
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const isoStr = d.toISOString().split('T')[0]; // 'YYYY-MM-DD'
      exactHolidays.add(isoStr);
      if (isRecurring) {
        recurringHolidays.add(isoStr.slice(5)); // 'MM-DD'
      }
    }
  });

  const validWorkDays = new Set(Array.isArray(workingDaysOfWeek) && workingDaysOfWeek.length > 0 ? workingDaysOfWeek : [1, 2, 3, 4, 5]);

  let workingDays = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);

  const targetEnd = new Date(end);
  targetEnd.setHours(0, 0, 0, 0);

  while (current <= targetEnd) {
    const dayOfWeek = current.getDay(); // 0 is Sunday, 6 is Saturday
    const dateStr = current.toISOString().split('T')[0];
    const monthDayStr = dateStr.slice(5);

    const isWorkDay = validWorkDays.has(dayOfWeek);
    const isHoliday = exactHolidays.has(dateStr) || recurringHolidays.has(monthDayStr);

    if (isWorkDay && !isHoliday) {
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
