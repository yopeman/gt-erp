import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import { classifyAttendance } from '../utils/dateUtils.js';

/**
 * Resolve employee ID from request body or authenticated user
 */
const resolveEmployeeId = async (req) => {
  if (req.body.employee) {
    return req.body.employee;
  }
  if (req.user) {
    const employee = await Employee.findOne({ email: req.user.email.toLowerCase() });
    if (employee) {
      return employee._id;
    }
  }
  return null;
};

// Self Clock-in with selfie photo upload to Cloudinary
export const clockIn = async (req, res) => {
  try {
    const { selfie, location, type } = req.body;
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

    const attendance = await Attendance.create({
      employee: employeeId,
      date: startOfDay,
      startTime: clockInTime,
      type: attendanceType,
      selfRecorded: true,
      clockInSelfie: {
        image: selfieUrl,
        capturedAt: clockInTime,
        location: location || {}
      }
    });

    const populated = await attendance.populate('employee', 'fullName email department position');

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
    attendance.clockOutSelfie = {
      image: selfieUrl,
      capturedAt: clockOutTime,
      location: location || {}
    };

    await attendance.save();

    const populated = await attendance.populate('employee', 'fullName email department position');

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

    const query = {};

    if (includeDeleted !== 'true') {
      query.isDeleted = false;
    }

    if (employee) query.employee = employee;
    if (type) query.type = type;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Attendance.countDocuments(query);
    const attendances = await Attendance.find(query)
      .populate('employee', 'fullName email department position')
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
    const attendance = await Attendance.findById(req.params.id)
      .populate('employee', 'fullName email department position');

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
