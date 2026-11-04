import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import Overtime from '../models/Overtime.js';
import CompanySetting from '../models/CompanySetting.js';
import Holiday from '../models/Holiday.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import { classifyAttendance, calculateWorkedHours } from '../utils/dateUtils.js';
import { checkGeofence } from '../utils/geoUtils.js';

/**
 * Resolve employee ID from request body or authenticated user.
 * Employees can only ever record for themselves; HR/Admin/Manager can select another employee.
 */
const resolveEmployeeId = async (req) => {
  const userRoles = req.user?.roles || [];
  const canManageOthers = userRoles.some((r) => ['admin', 'hr', 'manager'].includes(r));

  // If HR/Admin/Manager explicitly selected another employee in request body, allow it
  if (canManageOthers && req.body.employee) {
    return req.body.employee;
  }

  // Regular employee MUST resolve strictly to their own linked employee profile
  if (req.user?.employee?._id) {
    return req.user.employee._id;
  }
  if (req.user?.employee) {
    return req.user.employee;
  }
  if (req.user) {
    const employee = await Employee.findOne({
      $or: [
        { user: req.user._id },
        { email: req.user.email.toLowerCase() }
      ]
    });
    if (employee) {
      return employee._id;
    }
  }

  if (canManageOthers && req.body.employee) {
    return req.body.employee;
  }

  return null;
};

/**
 * Perform geofence verification against company office locations
 */
const verifyLocationGeofence = async (location) => {
  if (!location || location.latitude === undefined || location.longitude === undefined) {
    return {
      distanceFromOfficeMeters: null,
      withinGeofence: true,
      message: 'Location coordinates not provided'
    };
  }

  try {
    const setting = await CompanySetting.findOne().sort({ createdAt: -1 });
    const offices = setting?.officeLocations?.filter((o) => o.isActive) || [];

    if (offices.length === 0) {
      // Default to HQ fallback or allow if no office coordinates configured
      return {
        distanceFromOfficeMeters: 0,
        withinGeofence: true,
        message: 'No office geofence configured, location recorded'
      };
    }

    // Check distance to closest office
    let closestOffice = null;
    let minDistance = Infinity;
    let isWithinAny = false;

    for (const office of offices) {
      const geoResult = checkGeofence(
        location.latitude,
        location.longitude,
        office.latitude,
        office.longitude,
        office.radiusMeters || 200
      );

      if (geoResult.distance !== null && geoResult.distance < minDistance) {
        minDistance = geoResult.distance;
        closestOffice = office;
        if (geoResult.isValid) {
          isWithinAny = true;
        }
      }
    }

    return {
      distanceFromOfficeMeters: minDistance === Infinity ? null : minDistance,
      withinGeofence: isWithinAny,
      closestOfficeName: closestOffice?.name,
      message: isWithinAny
        ? `Within permitted work perimeter for ${closestOffice?.name || 'office'}`
        : `Outside office perimeter (${minDistance}m from ${closestOffice?.name || 'office'})`
    };
  } catch {
    return {
      distanceFromOfficeMeters: null,
      withinGeofence: true,
      message: 'Geofence check bypassed'
    };
  }
};

// Self Clock-in with selfie photo upload & geofence validation
export const clockIn = async (req, res) => {
  try {
    const { selfie, location, type, notes } = req.body;
    const userRoles = req.user?.roles || [];
    const canManageOthers = userRoles.some((r) => ['admin', 'hr', 'manager'].includes(r));

    const employeeId = await resolveEmployeeId(req);

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required (or logged in user must have matching employee profile)'
      });
    }

    // Security check: Regular employees cannot clock in on behalf of someone else
    if (!canManageOthers && req.body.employee && String(req.body.employee) !== String(employeeId)) {
      return res.status(403).json({
        success: false,
        message: 'Employees cannot clock in for other staff members.'
      });
    }

    // Check if employee already clocked in today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const existingAttendance = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: startOfDay, $lte: endOfDay },
      isDeleted: false
    });

    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        message: 'You have already clocked in for today',
        data: existingAttendance
      });
    }

    // Validate Geofencing
    const geofenceResult = await verifyLocationGeofence(location);

    // Upload selfie to Cloudinary / local storage if provided
    let selfieUrl = null;
    if (selfie) {
      const uploadResult = await uploadToCloudinary(selfie, {
        folder: 'gt_erp/attendance/clock_in',
        resourceType: 'image'
      });
      selfieUrl = uploadResult.secureUrl || uploadResult.url;
    }

    // Get company schedule settings and public holidays
    const setting = await CompanySetting.findOne().sort({ createdAt: -1 });
    const standardStartTime = setting?.workSchedule?.standardStartTime || '09:00';
    const graceMinutes = setting?.workSchedule?.gracePeriodMinutes || 15;
    const workingDays = setting?.workSchedule?.workingDays || [1, 2, 3, 4, 5];

    const holidays = await Holiday.find({ isActive: true });
    const clockInTime = new Date();
    const clockInDateStr = clockInTime.toISOString().split('T')[0];
    const clockInMonthDay = clockInDateStr.slice(5);

    const holidayToday = holidays.find((h) => {
      const hDate = new Date(h.date).toISOString().split('T')[0];
      return hDate === clockInDateStr || (h.isRecurringYearly && hDate.slice(5) === clockInMonthDay);
    });

    const dayOfWeek = clockInTime.getDay();
    const isRestDay = !workingDays.includes(dayOfWeek);

    const attendanceType = type || classifyAttendance(clockInTime, standardStartTime, graceMinutes);

    let scheduleNote = '';
    if (holidayToday) {
      scheduleNote = `Public Holiday: ${holidayToday.title}`;
    } else if (isRestDay) {
      scheduleNote = 'Weekend / Rest Day Shift';
    }

    // Normalize location with diameter and geofence results
    const finalLocation = {
      latitude: location?.latitude,
      longitude: location?.longitude,
      address: location?.address,
      accuracy: location?.accuracy,
      diameter: location?.diameter || (location?.accuracy ? Math.round(location.accuracy * 2) : undefined),
      distanceFromOfficeMeters: geofenceResult.distanceFromOfficeMeters,
      withinGeofence: geofenceResult.withinGeofence
    };

    let initialNotes = notes || '';
    if (scheduleNote) {
      initialNotes = initialNotes ? `${initialNotes} | ${scheduleNote}` : scheduleNote;
    }
    if (!geofenceResult.withinGeofence) {
      const geoMsg = `Geofence warning: ${geofenceResult.message}`;
      initialNotes = initialNotes ? `${initialNotes} | ${geoMsg}` : geoMsg;
    }

    const attendance = await Attendance.create({
      employee: employeeId,
      date: startOfDay,
      startTime: clockInTime,
      type: attendanceType,
      status: attendanceType === 'late' ? 'late' : 'present',
      selfRecorded: true,
      notes: initialNotes,
      clockInSelfie: {
        image: selfieUrl,
        capturedAt: clockInTime,
        location: finalLocation,
        deviceInfo: req.headers['user-agent'] || '',
        ipAddress: req.ip || req.connection?.remoteAddress || ''
      }
    });

    const populated = await attendance.populate(
      'employee',
      'fullName email department position profileImage nationalId branch phoneNumber'
    );

    res.status(201).json({
      success: true,
      message: 'Clock-in successful with selfie and location recorded',
      geofence: geofenceResult,
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clock in',
      error: error.message
    });
  }
};

// Self Clock-out with selfie photo upload & worked hours calculation
export const clockOut = async (req, res) => {
  try {
    const { selfie, location, attendanceId, notes } = req.body;
    const userRoles = req.user?.roles || [];
    const canManageOthers = userRoles.some((r) => ['admin', 'hr', 'manager'].includes(r));

    const employeeId = await resolveEmployeeId(req);

    // Security check: Regular employees cannot clock out on behalf of someone else
    if (!canManageOthers && req.body.employee && String(req.body.employee) !== String(employeeId)) {
      return res.status(403).json({
        success: false,
        message: 'Employees cannot clock out for other staff members.'
      });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const query = attendanceId
      ? { _id: attendanceId }
      : {
          employee: employeeId,
          date: { $gte: startOfDay, $lte: endOfDay },
          endTime: null,
          isDeleted: false
        };

    const attendance = await Attendance.findOne(query);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No active clock-in session found for today'
      });
    }

    // Validate Geofencing for clock-out
    const geofenceResult = await verifyLocationGeofence(location);

    // Upload selfie to Cloudinary / local storage if provided
    let selfieUrl = null;
    if (selfie) {
      const uploadResult = await uploadToCloudinary(selfie, {
        folder: 'gt_erp/attendance/clock_out',
        resourceType: 'image'
      });
      selfieUrl = uploadResult.secureUrl || uploadResult.url;
    }

    const clockOutTime = new Date();
    attendance.endTime = clockOutTime;

    // Fetch company settings & holidays to calculate shift thresholds & overtime rates
    const setting = await CompanySetting.findOne().sort({ createdAt: -1 });
    const standardDailyHours = setting?.workSchedule?.standardDailyHours || 8;
    const workingDays = setting?.workSchedule?.workingDays || [1, 2, 3, 4, 5];
    const otRateRegular = setting?.payrollSettings?.overtimeRateRegular || 1.5;
    const otRateWeekend = setting?.payrollSettings?.overtimeRateWeekend || 1.5;
    const otRateHoliday = setting?.payrollSettings?.overtimeRateHoliday || 2.0;

    const holidays = await Holiday.find({ isActive: true });
    const shiftDate = attendance.startTime || attendance.date || new Date();
    const shiftDateStr = new Date(shiftDate).toISOString().split('T')[0];
    const shiftMonthDay = shiftDateStr.slice(5);

    const holidayShift = holidays.find((h) => {
      const hDate = new Date(h.date).toISOString().split('T')[0];
      return hDate === shiftDateStr || (h.isRecurringYearly && hDate.slice(5) === shiftMonthDay);
    });

    const dayOfWeek = new Date(shiftDate).getDay();
    const isNonWorkingDay = !workingDays.includes(dayOfWeek);

    // Calculate worked hours
    let workedHours = 0;
    if (attendance.startTime) {
      workedHours = calculateWorkedHours(attendance.startTime, clockOutTime);
      attendance.workedHours = workedHours;
    }

    // Determine overtime eligibility: regular day extra hours OR rest day / holiday shift
    const isOvertimeShift = workedHours > standardDailyHours || (holidayShift && workedHours >= 0.5) || (isNonWorkingDay && workedHours >= 0.5);

    if (isOvertimeShift) {
      attendance.type = 'overtime';

      let otType = 'calendar';
      let otRate = otRateRegular;
      let extraHours = 0;

      if (holidayShift) {
        otType = 'holiday';
        otRate = otRateHoliday;
        // On public holidays, either entire worked time or hours beyond threshold are overtime
        extraHours = workedHours > standardDailyHours ? workedHours : Number(workedHours.toFixed(2));
      } else if (isNonWorkingDay) {
        otType = 'weekend';
        otRate = otRateWeekend;
        extraHours = workedHours > standardDailyHours ? workedHours : Number(workedHours.toFixed(2));
      } else {
        extraHours = Number((workedHours - standardDailyHours).toFixed(2));
      }

      if (extraHours >= 0.5 && !attendance.linkedOvertime) {
        const existingOt = await Overtime.findOne({
          employee: employeeId,
          $or: [
            { attendance: attendance._id },
            { startAt: { $gte: startOfDay, $lte: endOfDay } }
          ]
        });

        if (!existingOt) {
          const holidayTitle = holidayShift ? ` [Holiday: ${holidayShift.title}]` : '';
          const autoOt = await Overtime.create({
            employee: employeeId,
            attendance: attendance._id,
            startAt: attendance.startTime || attendance.date,
            workedHours: extraHours,
            approvedHours: 0,
            type: otType,
            calculationRate: otRate,
            reason: `Auto-recorded from shift (${workedHours}h worked vs ${standardDailyHours}h standard shift${holidayTitle})`,
            status: 'pending',
            paymentStatus: 'unpaid'
          });
          attendance.linkedOvertime = autoOt._id;
        } else {
          attendance.linkedOvertime = existingOt._id;
          if (!existingOt.attendance) {
            existingOt.attendance = attendance._id;
            await existingOt.save();
          }
        }
      }
    }

    if (notes) attendance.notes = attendance.notes ? `${attendance.notes} | ${notes}` : notes;

    const finalLocation = {
      latitude: location?.latitude,
      longitude: location?.longitude,
      address: location?.address,
      accuracy: location?.accuracy,
      diameter: location?.diameter || (location?.accuracy ? Math.round(location.accuracy * 2) : undefined),
      distanceFromOfficeMeters: geofenceResult.distanceFromOfficeMeters,
      withinGeofence: geofenceResult.withinGeofence
    };

    attendance.clockOutSelfie = {
      image: selfieUrl,
      capturedAt: clockOutTime,
      location: finalLocation,
      deviceInfo: req.headers['user-agent'] || '',
      ipAddress: req.ip || req.connection?.remoteAddress || ''
    };

    await attendance.save();

    const populated = await attendance.populate([
      { path: 'employee', select: 'fullName email department position profileImage nationalId branch phoneNumber' },
      { path: 'linkedOvertime', select: 'workedHours approvedHours status calculationRate' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Clock-out successful with selfie recorded',
      workedHours,
      geofence: geofenceResult,
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clock out',
      error: error.message
    });
  }
};

// Administrative record attendance
export const recordAttendance = async (req, res) => {
  try {
    const { employee, date, startTime, endTime, type, status, clockInSelfie, clockOutSelfie, notes } = req.body;

    if (!employee || !date || !type) {
      return res.status(400).json({
        success: false,
        message: 'employee, date, and type are required'
      });
    }

    const start = startTime ? new Date(startTime) : new Date();
    const end = endTime ? new Date(endTime) : null;
    const workedHours = end ? calculateWorkedHours(start, end) : 0;

    const attendance = await Attendance.create({
      employee,
      date,
      startTime: start,
      endTime: end,
      workedHours,
      type,
      status: status || (type === 'late' ? 'late' : 'present'),
      selfRecorded: false,
      notes,
      clockInSelfie,
      clockOutSelfie
    });

    const populated = await attendance.populate('employee', 'fullName email department position');

    res.status(201).json({
      success: true,
      message: 'Attendance recorded successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to record attendance',
      error: error.message
    });
  }
};

// Get current user's attendance status for today
export const getMyTodayAttendance = async (req, res) => {
  try {
    const employeeId = await resolveEmployeeId(req);
    if (!employeeId) {
      return res.status(404).json({
        success: false,
        message: 'No matching employee profile found for user'
      });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: startOfDay, $lte: endOfDay },
      isDeleted: false
    }).populate('employee', 'fullName email department position profileImage');

    res.status(200).json({
      success: true,
      hasClockedIn: !!attendance,
      hasClockedOut: !!(attendance && attendance.endTime),
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch today's attendance status",
      error: error.message
    });
  }
};

// Get current user's attendance history
export const getMyAttendanceHistory = async (req, res) => {
  try {
    const employeeId = await resolveEmployeeId(req);
    if (!employeeId) {
      return res.status(404).json({
        success: false,
        message: 'No matching employee profile found for user'
      });
    }

    const { page = 1, limit = 30, startDate, endDate } = req.query;
    const query = { employee: employeeId, isDeleted: false };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Attendance.countDocuments(query);
    const attendances = await Attendance.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: attendances,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance history',
      error: error.message
    });
  }
};

// Get all attendances with filters and pagination
// Regular employees see only their own attendance history logs; HR/Admin/Manager can see all
export const getAttendances = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      employee,
      type,
      status,
      startDate,
      endDate,
      includeDeleted = 'false'
    } = req.query;

    const userRoles = req.user?.roles || [];
    const canManageOthers = userRoles.some((r) => ['admin', 'hr', 'manager'].includes(r));

    const query = {};

    if (includeDeleted !== 'true') {
      query.isDeleted = false;
    }

    if (!canManageOthers) {
      // Restrict regular employee to strictly their own attendance records
      let userEmpId = req.user?.employee?._id || req.user?.employee;
      if (!userEmpId && req.user) {
        const emp = await Employee.findOne({
          $or: [
            { user: req.user._id },
            { email: req.user.email.toLowerCase() }
          ]
        });
        if (emp) userEmpId = emp._id;
      }

      if (!userEmpId) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: {
            total: 0,
            page: 1,
            pages: 0
          }
        });
      }

      query.employee = userEmpId;
    } else {
      // HR/Admin/Manager can filter by any specific employee or view all
      if (employee) query.employee = employee;
    }

    if (type) query.type = type;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Attendance.countDocuments(query);
    const attendances = await Attendance.find(query)
      .populate('employee', 'fullName email department position profileImage nationalId branch phoneNumber')
      .populate('linkedOvertime', 'workedHours approvedHours status calculationRate')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: attendances,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records',
      error: error.message
    });
  }
};

// Get overall attendance statistics for dashboard
export const getAttendanceStats = async (req, res) => {
  try {
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const totalActiveEmployees = await Employee.countDocuments({ status: 'active' });

    const todayAttendances = await Attendance.find({
      date: { $gte: startOfDay, $lte: endOfDay },
      isDeleted: false
    });

    const presentCount = todayAttendances.length;
    const onTimeCount = todayAttendances.filter((a) => a.type === 'on time').length;
    const lateCount = todayAttendances.filter((a) => a.type === 'late').length;
    const completedClockOut = todayAttendances.filter((a) => a.endTime !== null).length;
    const absentCount = Math.max(0, totalActiveEmployees - presentCount);

    res.status(200).json({
      success: true,
      data: {
        date: startOfDay.toISOString().split('T')[0],
        totalActiveEmployees,
        present: presentCount,
        onTime: onTimeCount,
        late: lateCount,
        absent: absentCount,
        completedClockOut,
        inOfficeCurrently: presentCount - completedClockOut
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to compute attendance statistics',
      error: error.message
    });
  }
};

// Get attendance by ID
export const getAttendanceById = async (req, res) => {
  try {
    const userRoles = req.user?.roles || [];
    const canManageOthers = userRoles.some((r) => ['admin', 'hr', 'manager'].includes(r));

    const attendance = await Attendance.findById(req.params.id)
      .populate('employee', 'fullName email department position profileImage nationalId branch phoneNumber')
      .populate('linkedOvertime', 'workedHours approvedHours status calculationRate');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    // Permission check for regular employee
    if (!canManageOthers && req.user) {
      let userEmpId = req.user?.employee?._id || req.user?.employee;
      if (!userEmpId) {
        const emp = await Employee.findOne({
          $or: [
            { user: req.user._id },
            { email: req.user.email.toLowerCase() }
          ]
        });
        if (emp) userEmpId = emp._id;
      }

      const recordEmpId = attendance.employee?._id || attendance.employee;
      if (String(recordEmpId) !== String(userEmpId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own attendance records'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance record',
      error: error.message
    });
  }
};

// Update attendance record
export const updateAttendance = async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.startTime && updateData.endTime) {
      updateData.workedHours = calculateWorkedHours(updateData.startTime, updateData.endTime);
    }

    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('employee', 'fullName email department position');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance updated successfully',
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update attendance record',
      error: error.message
    });
  }
};

// Delete (soft delete) attendance
export const deleteAttendance = async (req, res) => {
  try {
    const { permanent } = req.query;

    if (permanent === 'true') {
      const attendance = await Attendance.findByIdAndDelete(req.params.id);
      if (!attendance) {
        return res.status(404).json({
          success: false,
          message: 'Attendance record not found'
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Attendance permanently deleted'
      });
    }

    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance record soft deleted',
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete attendance record',
      error: error.message
    });
  }
};
