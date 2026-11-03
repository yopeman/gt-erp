import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import { classifyAttendance } from '../utils/dateUtils.js';

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
  if (req.user) {
    if (req.user.employee) {
      return req.user.employee._id || req.user.employee;
    }
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

// Self Clock-in with selfie photo upload to Cloudinary
export const clockIn = async (req, res) => {
  try {
    const { selfie, location, type } = req.body;
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

    // Upload selfie to Cloudinary if provided
    let selfieUrl = null;
    if (selfie) {
      const uploadResult = await uploadToCloudinary(selfie, {
        folder: 'gt_erp/attendance/clock_in',
        resourceType: 'image'
      });
      selfieUrl = uploadResult.secureUrl || uploadResult.url;
    }

    const clockInTime = new Date();
    const attendanceType = type || classifyAttendance(clockInTime);

    // Normalize location with diameter
    const finalLocation = location ? { ...location } : {};
    if (finalLocation.accuracy && !finalLocation.diameter) {
      finalLocation.diameter = Math.round(finalLocation.accuracy * 2);
    }

    const attendance = await Attendance.create({
      employee: employeeId,
      date: startOfDay,
      startTime: clockInTime,
      type: attendanceType,
      selfRecorded: true,
      clockInSelfie: {
        image: selfieUrl,
        capturedAt: clockInTime,
        location: finalLocation
      }
    });

    const populated = await attendance.populate(
      'employee',
      'fullName email department position profileImage nationalId branch phoneNumber'
    );

    res.status(201).json({
      success: true,
      message: 'Clock-in successful with selfie recorded',
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

// Self Clock-out with selfie photo upload to Cloudinary
export const clockOut = async (req, res) => {
  try {
    const { selfie, location, attendanceId } = req.body;
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

    // Upload selfie to Cloudinary if provided
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

    // Normalize location with diameter
    const finalLocation = location ? { ...location } : {};
    if (finalLocation.accuracy && !finalLocation.diameter) {
      finalLocation.diameter = Math.round(finalLocation.accuracy * 2);
    }

    attendance.clockOutSelfie = {
      image: selfieUrl,
      capturedAt: clockOutTime,
      location: finalLocation
    };

    await attendance.save();

    const populated = await attendance.populate(
      'employee',
      'fullName email department position profileImage nationalId branch phoneNumber'
    );

    res.status(200).json({
      success: true,
      message: 'Clock-out successful with selfie recorded',
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
    const { employee, date, startTime, endTime, type, clockInSelfie, clockOutSelfie } = req.body;

    if (!employee || !date || !type) {
      return res.status(400).json({
        success: false,
        message: 'employee, date, and type are required'
      });
    }

    const attendance = await Attendance.create({
      employee,
      date,
      startTime: startTime || new Date(),
      endTime: endTime || null,
      type,
      selfRecorded: false,
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

// Get all attendances with filters and pagination
// Regular employees see only their own attendance history logs; HR/Admin/Manager can see all
export const getAttendances = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      employee,
      type,
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

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Attendance.countDocuments(query);
    const attendances = await Attendance.find(query)
      .populate('employee', 'fullName email department position profileImage nationalId branch phoneNumber')
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

// Get attendance by ID
export const getAttendanceById = async (req, res) => {
  try {
    const userRoles = req.user?.roles || [];
    const canManageOthers = userRoles.some((r) => ['admin', 'hr', 'manager'].includes(r));

    const attendance = await Attendance.findById(req.params.id)
      .populate('employee', 'fullName email department position profileImage nationalId branch phoneNumber');

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
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
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
