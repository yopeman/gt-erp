import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import CompanySetting from '../models/CompanySetting.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import { classifyAttendance, calculateWorkedHours } from '../utils/dateUtils.js';
import { checkGeofence } from '../utils/geoUtils.js';

/**
 * Resolve employee ID from request body or authenticated user
 */
const resolveEmployeeId = async (req) => {
  if (req.body.employee && req.user && (req.user.roles?.includes('admin') || req.user.roles?.includes('hr') || req.user.roles?.includes('manager'))) {
    return req.body.employee;
  }
  if (req.user) {
    const employee = await Employee.findOne({ email: req.user.email.toLowerCase() });
    if (employee) {
      return employee._id;
    }
  }
  if (req.body.employee) {
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
    const employeeId = await resolveEmployeeId(req);

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required (or logged in user must have matching employee profile)'
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

    // Get company schedule settings
    const setting = await CompanySetting.findOne().sort({ createdAt: -1 });
    const standardStartTime = setting?.workSchedule?.standardStartTime || '09:00';
    const graceMinutes = setting?.workSchedule?.gracePeriodMinutes || 15;
    const [startHour, startMin] = standardStartTime.split(':').map(Number);

    const clockInTime = new Date();
    const attendanceType = type || classifyAttendance(clockInTime, startHour || 9, graceMinutes || 15);

    const attendance = await Attendance.create({
      employee: employeeId,
      date: startOfDay,
      startTime: clockInTime,
      type: attendanceType,
      status: attendanceType === 'late' ? 'late' : 'present',
      selfRecorded: true,
      notes: notes || (geofenceResult.withinGeofence ? '' : `Geofence warning: ${geofenceResult.message}`),
      clockInSelfie: {
        image: selfieUrl,
        capturedAt: clockInTime,
        location: {
          latitude: location?.latitude,
          longitude: location?.longitude,
          address: location?.address,
          accuracy: location?.accuracy,
          distanceFromOfficeMeters: geofenceResult.distanceFromOfficeMeters,
          withinGeofence: geofenceResult.withinGeofence
        },
        deviceInfo: req.headers['user-agent'] || '',
        ipAddress: req.ip || req.connection?.remoteAddress || ''
      }
    });

    const populated = await attendance.populate('employee', 'fullName email department position profileImage');

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
    const employeeId = await resolveEmployeeId(req);

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
    const workedHours = calculateWorkedHours(attendance.startTime, clockOutTime);

    attendance.endTime = clockOutTime;
    attendance.workedHours = workedHours;
    if (notes) attendance.notes = attendance.notes ? `${attendance.notes} | ${notes}` : notes;

    attendance.clockOutSelfie = {
      image: selfieUrl,
      capturedAt: clockOutTime,
      location: {
        latitude: location?.latitude,
        longitude: location?.longitude,
        address: location?.address,
        accuracy: location?.accuracy,
        distanceFromOfficeMeters: geofenceResult.distanceFromOfficeMeters,
        withinGeofence: geofenceResult.withinGeofence
      },
      deviceInfo: req.headers['user-agent'] || '',
      ipAddress: req.ip || req.connection?.remoteAddress || ''
    };

    await attendance.save();

    const populated = await attendance.populate('employee', 'fullName email department position profileImage');

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

// Get all attendances with filters and pagination (Admin/HR/Manager)
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

    const query = {};

    if (includeDeleted !== 'true') {
      query.isDeleted = false;
    }

    if (employee) query.employee = employee;
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
      .populate('employee', 'fullName email department position profileImage')
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
    const attendance = await Attendance.findById(req.params.id)
      .populate('employee', 'fullName email department position profileImage');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
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
