import Overtime from '../models/Overtime.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import CompanySetting from '../models/CompanySetting.js';
import Holiday from '../models/Holiday.js';
import { recordApprovalEvent } from '../utils/approvalHelper.js';
import { sendNotificationToRoles, sendNotificationToEmployee } from '../utils/notificationService.js';

/**
 * Helper to resolve logged in employee ID safely
 */
const resolveEmployeeId = async (req) => {
  const userRoles = req.user?.roles || [];
  const canManage = userRoles.some((r) => ['admin', 'hr', 'manager'].includes(r));

  if (canManage && req.body?.employee) {
    return req.body.employee;
  }
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
        { email: req.user.email?.toLowerCase() }
      ]
    });
    if (employee) {
      return employee._id;
    }
  }
  if (canManage && req.body?.employee) {
    return req.body.employee;
  }
  return null;
};

const resolveUserEmployeeId = async (user) => {
  if (!user) return null;
  if (user.employee?._id) return user.employee._id;
  if (user.employee) return user.employee;
  const emp = await Employee.findOne({
    $or: [
      { user: user._id },
      { email: user.email?.toLowerCase() }
    ]
  });
  return emp ? emp._id : null;
};

// Rate mapping from type
const OVERTIME_TYPE_RATES = {
  calendar: 1.5,
  weekend: 2.0,
  holiday: 2.0
};

// Create overtime request
export const createOvertime = async (req, res) => {
  try {
    const {
      employee,
      startAt,
      endAt,
      startTime,
      endTime,
      workedHours,
      reason,
      type,
      calculationRate,
      isPreApproved
    } = req.body;

    const userRoles = req.user?.roles || [];
    const canManage = userRoles.some((r) => ['admin', 'hr', 'manager'].includes(r));

    let targetEmployeeId = employee;

    // Security check: Regular employees cannot submit overtime for other staff members
    if (!canManage) {
      const myEmpId = await resolveUserEmployeeId(req.user);
      if (!myEmpId) {
        return res.status(400).json({
          success: false,
          message: 'No employee profile linked to your user account'
        });
      }
      if (employee && String(employee) !== String(myEmpId)) {
        return res.status(403).json({
          success: false,
          message: 'Employees cannot submit overtime requests for other staff members.'
        });
      }
      targetEmployeeId = myEmpId;
    } else if (!targetEmployeeId) {
      targetEmployeeId = await resolveEmployeeId(req);
    }

    if (!targetEmployeeId || !startAt) {
      return res.status(400).json({
        success: false,
        message: 'employee and startAt are required'
      });
    }

    let calculatedStartAt = new Date(startAt);
    let calculatedEndAt = endAt ? new Date(endAt) : null;
    let effectiveStartTime = startTime ? String(startTime).trim() : '';
    let effectiveEndTime = endTime ? String(endTime).trim() : '';

    if (effectiveStartTime && !isNaN(calculatedStartAt.getTime())) {
      const [sHour, sMin] = effectiveStartTime.split(':').map(Number);
      if (!isNaN(sHour) && !isNaN(sMin)) {
        calculatedStartAt.setHours(sHour, sMin, 0, 0);
      }
    } else if (!effectiveStartTime && !isNaN(calculatedStartAt.getTime())) {
      const h = calculatedStartAt.getHours();
      const m = calculatedStartAt.getMinutes();
      if (h !== 0 || m !== 0) {
        effectiveStartTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }

    if (effectiveEndTime && !isNaN(calculatedStartAt.getTime())) {
      const [eHour, eMin] = effectiveEndTime.split(':').map(Number);
      if (!isNaN(eHour) && !isNaN(eMin)) {
        calculatedEndAt = new Date(calculatedStartAt);
        calculatedEndAt.setHours(eHour, eMin, 0, 0);
        // Handle overnight shifts (e.g. 23:00 to 03:00)
        if (calculatedEndAt <= calculatedStartAt) {
          calculatedEndAt.setDate(calculatedEndAt.getDate() + 1);
        }
      }
    } else if (calculatedEndAt && !effectiveEndTime && !isNaN(calculatedEndAt.getTime())) {
      const h = calculatedEndAt.getHours();
      const m = calculatedEndAt.getMinutes();
      effectiveEndTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    let hours = Number(workedHours) || 0;
    if (hours <= 0 && calculatedEndAt && calculatedStartAt) {
      const diffMs = calculatedEndAt.getTime() - calculatedStartAt.getTime();
      if (diffMs > 0) {
        hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
      }
    }

    if (hours <= 0) {
      return res.status(400).json({
        success: false,
        message: 'workedHours must be greater than 0 (or provide valid startTime and endTime)'
      });
    }

    // Fetch company settings & holidays to link rates and holiday detection
    const setting = await CompanySetting.findOne().sort({ createdAt: -1 });
    const workingDays = setting?.workSchedule?.workingDays || [1, 2, 3, 4, 5];
    const otRateRegular = setting?.payrollSettings?.overtimeRateRegular || 1.5;
    const otRateWeekend = setting?.payrollSettings?.overtimeRateWeekend || 1.5;
    const otRateHoliday = setting?.payrollSettings?.overtimeRateHoliday || 2.0;

    const holidays = await Holiday.find({ isActive: true });
    const shiftDate = new Date(calculatedStartAt);
    const dateStr = shiftDate.toISOString().split('T')[0];
    const monthDayStr = dateStr.slice(5);

    const holidayMatch = holidays.find((h) => {
      const hDate = new Date(h.date).toISOString().split('T')[0];
      return hDate === dateStr || (h.isRecurringYearly && hDate.slice(5) === monthDayStr);
    });

    const dayOfWeek = shiftDate.getDay();
    const isNonWorkingDay = !workingDays.includes(dayOfWeek);

    // Auto-detect type if not provided
    let finalType = type;
    if (!finalType) {
      if (holidayMatch) finalType = 'holiday';
      else if (isNonWorkingDay) finalType = 'weekend';
      else finalType = 'calendar';
    }

    // Auto-select calculation rate from company setting multipliers
    let defaultRateForType = otRateRegular;
    if (finalType === 'holiday') defaultRateForType = otRateHoliday;
    else if (finalType === 'weekend') defaultRateForType = otRateWeekend;

    const finalRate = calculationRate !== undefined && !isNaN(Number(calculationRate))
      ? Number(calculationRate)
      : defaultRateForType;

    // Check if matching attendance exists for this employee on that date
    const startOfDay = new Date(shiftDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(shiftDate);
    endOfDay.setHours(23, 59, 59, 999);

    const matchingAttendance = await Attendance.findOne({
      employee: targetEmployeeId,
      date: { $gte: startOfDay, $lte: endOfDay },
      isDeleted: false
    });

    const overtime = await Overtime.create({
      employee: targetEmployeeId,
      startAt: calculatedStartAt,
      endAt: calculatedEndAt,
      startTime: effectiveStartTime,
      endTime: effectiveEndTime,
      workedHours: hours,
      approvedHours: isPreApproved ? hours : 0,
      reason,
      type: finalType,
      calculationRate: finalRate,
      isPreApproved: Boolean(isPreApproved),
      status: 'pending',
      paymentStatus: 'unpaid',
      attendance: matchingAttendance ? matchingAttendance._id : null
    });

    if (matchingAttendance) {
      matchingAttendance.type = 'overtime';
      matchingAttendance.linkedOvertime = overtime._id;
      await matchingAttendance.save();
    }

    // Record submission in ApprovalHistory
    try {
      await recordApprovalEvent({
        referenceType: 'overtime',
        referenceId: overtime._id,
        action: 'submitted',
        user: req.user,
        comment: `Overtime request for ${hours} hours submitted. Reason: ${reason || 'N/A'}`
      });
    } catch (histErr) {
      console.warn('Approval history logging warning:', histErr.message);
    }

    const populated = await overtime.populate([
      { path: 'employee', select: 'fullName email department position profileImage nationalId baseSalary' },
      { path: 'attendance', select: 'date startTime endTime workedHours type' }
    ]);

    // Automatic push & in-app notification to HR and Managers
    try {
      const empName = populated.employee?.fullName || 'An employee';
      await sendNotificationToRoles({
        roles: ['admin', 'hr', 'manager'],
        title: 'New Overtime Request',
        body: `${empName} requested ${hours} hrs overtime (${finalType} rate ${finalRate}x).`,
        type: 'overtime',
        data: {
          overtimeId: String(overtime._id),
          employeeId: String(targetEmployeeId),
          link: '/hr/overtimes'
        }
      });
    } catch (notifErr) {
      console.warn('Overtime notification error:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Overtime request created successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create overtime record',
      error: error.message
    });
  }
};

// Lookup attendance for a specific employee and date
export const lookupAttendanceForOvertime = async (req, res) => {
  try {
    const { employee, date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'date parameter is required'
      });
    }

    const targetEmployeeId = employee || (await resolveEmployeeId(req));
    if (!targetEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'employee could not be determined'
      });
    }

    const queryDate = new Date(date);
    const startOfDay = new Date(queryDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(queryDate);
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await Attendance.findOne({
      employee: targetEmployeeId,
      date: { $gte: startOfDay, $lte: endOfDay },
      isDeleted: false
    });

    // Load company settings and public holidays to suggest accurate type & multiplier
    const setting = await CompanySetting.findOne().sort({ createdAt: -1 });
    const standardDailyHours = setting?.workSchedule?.standardDailyHours || 8;
    const workingDays = setting?.workSchedule?.workingDays || [1, 2, 3, 4, 5];
    const otRateRegular = setting?.payrollSettings?.overtimeRateRegular || 1.5;
    const otRateWeekend = setting?.payrollSettings?.overtimeRateWeekend || 1.5;
    const otRateHoliday = setting?.payrollSettings?.overtimeRateHoliday || 2.0;

    const holidays = await Holiday.find({ isActive: true });
    const dateStr = queryDate.toISOString().split('T')[0];
    const monthDayStr = dateStr.slice(5);

    const holidayMatch = holidays.find((h) => {
      const hDate = new Date(h.date).toISOString().split('T')[0];
      return hDate === dateStr || (h.isRecurringYearly && hDate.slice(5) === monthDayStr);
    });

    const dayOfWeek = queryDate.getDay();
    const isNonWorkingDay = !workingDays.includes(dayOfWeek);

    let suggestedType = 'calendar';
    let suggestedRate = otRateRegular;

    if (holidayMatch) {
      suggestedType = 'holiday';
      suggestedRate = otRateHoliday;
    } else if (isNonWorkingDay) {
      suggestedType = 'weekend';
      suggestedRate = otRateWeekend;
    }

    if (!attendance) {
      return res.status(200).json({
        success: true,
        found: false,
        attendance: null,
        holiday: holidayMatch ? { title: holidayMatch.title, isHoliday: true } : null,
        isNonWorkingDay,
        suggestedType,
        suggestedRate,
        standardDailyHours
      });
    }

    const workedHours = attendance.workedHours || 0;
    let suggestedExtraHours = 0;

    if (holidayMatch || isNonWorkingDay) {
      suggestedExtraHours = workedHours > standardDailyHours ? workedHours : Number(workedHours.toFixed(2));
    } else {
      suggestedExtraHours = workedHours > standardDailyHours ? Number((workedHours - standardDailyHours).toFixed(2)) : 0;
    }

    res.status(200).json({
      success: true,
      found: true,
      attendance: {
        _id: attendance._id,
        startTime: attendance.startTime,
        endTime: attendance.endTime,
        workedHours,
        suggestedExtraHours,
        suggestedType,
        suggestedRate,
        standardDailyHours,
        isNonWorkingDay,
        holiday: holidayMatch ? { title: holidayMatch.title, isHoliday: true } : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to lookup attendance',
      error: error.message
    });
  }
};

// Get current user's overtime records
export const getMyOvertimes = async (req, res) => {
  try {
    const employeeId = await resolveEmployeeId(req);
    if (!employeeId) {
      return res.status(404).json({
        success: false,
        message: 'No matching employee profile found for user'
      });
    }

    const { page = 1, limit = 20, status, type } = req.query;
    const query = { employee: employeeId };
    if (status) query.status = status;
    if (type) query.type = type;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Overtime.countDocuments(query);
    const overtimes = await Overtime.find(query)
      .populate('approvedBy', 'fullName email')
      .populate('attendance', 'date startTime endTime workedHours type')
      .populate('payroll', 'fromDate toDate status paidAt totalNet')
      .sort({ startAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: overtimes,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your overtime records',
      error: error.message
    });
  }
};

// Get all overtime records with filters and pagination
export const getOvertimes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      employee,
      status,
      type,
      paymentStatus,
      startDate,
      endDate
    } = req.query;

    const userRoles = req.user?.roles || [];
    const canManage = userRoles.some((r) => ['admin', 'hr', 'manager', 'finance'].includes(r));

    const query = {};

    // Scoped visibility: regular employees can only see their own overtimes
    if (!canManage) {
      const myEmpId = await resolveUserEmployeeId(req.user);
      if (!myEmpId) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: { total: 0, page: 1, pages: 0 }
        });
      }
      query.employee = myEmpId;
    } else {
      if (employee) query.employee = employee;
    }

    if (status) query.status = status;
    if (type) query.type = type;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    if (startDate || endDate) {
      query.startAt = {};
      if (startDate) query.startAt.$gte = new Date(startDate);
      if (endDate) query.startAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Overtime.countDocuments(query);
    const overtimes = await Overtime.find(query)
      .populate('employee', 'fullName email department position profileImage nationalId baseSalary')
      .populate('approvedBy', 'fullName email')
      .populate('attendance', 'date startTime endTime workedHours type')
      .populate('payroll', 'fromDate toDate status paidAt totalNet')
      .sort({ startAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: overtimes,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overtime records',
      error: error.message
    });
  }
};

// Get overtime by ID
export const getOvertimeById = async (req, res) => {
  try {
    const userRoles = req.user?.roles || [];
    const canManage = userRoles.some((r) => ['admin', 'hr', 'manager', 'finance'].includes(r));

    const overtime = await Overtime.findById(req.params.id)
      .populate('employee', 'fullName email department position profileImage nationalId baseSalary')
      .populate('approvedBy', 'fullName email')
      .populate('attendance', 'date startTime endTime workedHours type')
      .populate('payroll', 'fromDate toDate status paidAt totalNet');

    if (!overtime) {
      return res.status(404).json({
        success: false,
        message: 'Overtime record not found'
      });
    }

    if (!canManage) {
      const myEmpId = await resolveUserEmployeeId(req.user);
      const otEmpId = overtime.employee?._id || overtime.employee;
      if (String(otEmpId) !== String(myEmpId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own overtime records'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: overtime
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overtime record',
      error: error.message
    });
  }
};

// Update overtime record
export const updateOvertime = async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.type && !updateData.calculationRate) {
      updateData.calculationRate = OVERTIME_TYPE_RATES[updateData.type] || 1.5;
    }

    if (updateData.startTime || updateData.endTime || updateData.startAt) {
      const existing = await Overtime.findById(req.params.id);
      if (existing) {
        const baseDate = updateData.startAt ? new Date(updateData.startAt) : new Date(existing.startAt);
        const sTime = updateData.startTime !== undefined ? updateData.startTime : existing.startTime;
        const eTime = updateData.endTime !== undefined ? updateData.endTime : existing.endTime;

        if (sTime) {
          const [sh, sm] = String(sTime).split(':').map(Number);
          if (!isNaN(sh) && !isNaN(sm)) {
            baseDate.setHours(sh, sm, 0, 0);
            updateData.startAt = baseDate;
          }
        }

        if (eTime) {
          const [eh, em] = String(eTime).split(':').map(Number);
          if (!isNaN(eh) && !isNaN(em)) {
            const endDate = new Date(baseDate);
            endDate.setHours(eh, em, 0, 0);
            if (endDate <= baseDate) {
              endDate.setDate(endDate.getDate() + 1);
            }
            updateData.endAt = endDate;
            if (!updateData.workedHours) {
              updateData.workedHours = Math.round(((endDate - baseDate) / (1000 * 60 * 60)) * 100) / 100;
            }
          }
        }
      }
    }

    const overtime = await Overtime.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('employee', 'fullName email department position profileImage nationalId baseSalary')
      .populate('approvedBy', 'fullName email');

    if (!overtime) {
      return res.status(404).json({
        success: false,
        message: 'Overtime record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Overtime updated successfully',
      data: overtime
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update overtime record',
      error: error.message
    });
  }
};

// Review / Approve / Reject overtime
export const reviewOvertime = async (req, res) => {
  try {
    const { status, approvedHours, approvedBy, decisionReason, reason, rejectionReason, notes } = req.body;

    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'approved', 'rejected', or 'pending'"
      });
    }

    const existing = await Overtime.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Overtime record not found'
      });
    }

    const finalReason = decisionReason || rejectionReason || notes || reason || '';
    const reviewerId = approvedBy || req.user?._id || null;
    const finalApprovedHours = approvedHours !== undefined ? Number(approvedHours) : existing.workedHours;

    const updateData = {
      status,
      approvedBy: reviewerId,
      reviewedAt: new Date(),
      decisionReason: finalReason,
      approvedHours: status === 'approved' ? finalApprovedHours : 0
    };

    const overtime = await Overtime.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('employee', 'fullName email department position profileImage nationalId baseSalary')
      .populate('approvedBy', 'fullName email');

    // Record action in ApprovalHistory
    try {
      await recordApprovalEvent({
        referenceType: 'overtime',
        referenceId: overtime._id,
        action: status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'returned for correction',
        user: req.user,
        comment: notes || finalReason || `Overtime ${status} with ${updateData.approvedHours} approved hours`
      });
    } catch (histErr) {
      console.warn('Approval history logging warning:', histErr.message);
    }

    // Automatic notification to the employee
    try {
      const statusTitle = status === 'approved' ? 'Overtime Request Approved' : 'Overtime Request Rejected';
      const statusBody = status === 'approved'
        ? `Your overtime request for ${existing.workedHours} hrs on ${new Date(existing.startAt).toLocaleDateString()} has been approved (${finalApprovedHours} hrs approved).`
        : `Your overtime request for ${existing.workedHours} hrs on ${new Date(existing.startAt).toLocaleDateString()} was rejected. ${finalReason ? 'Reason: ' + finalReason : ''}`;

      await sendNotificationToEmployee({
        employeeId: existing.employee,
        title: statusTitle,
        body: statusBody,
        type: 'overtime',
        data: {
          overtimeId: String(existing._id),
          status,
          link: '/hr/overtimes'
        }
      });
    } catch (notifErr) {
      console.warn('Overtime review notification error:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Overtime record ${status} successfully`,
      data: overtime
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to review overtime record',
      error: error.message
    });
  }
};

// Update overtime payment status
export const updateOvertimePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;

    if (!['paid', 'unpaid', 'partially'].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "paymentStatus must be 'paid', 'unpaid', or 'partially'"
      });
    }

    const overtime = await Overtime.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true }
    );

    if (!overtime) {
      return res.status(404).json({
        success: false,
        message: 'Overtime record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Payment status updated to ${paymentStatus}`,
      data: overtime
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: error.message
    });
  }
};

// Delete overtime record
export const deleteOvertime = async (req, res) => {
  try {
    const overtime = await Overtime.findById(req.params.id);
    if (!overtime) {
      return res.status(404).json({
        success: false,
        message: 'Overtime record not found'
      });
    }

    // If attendance was linked, unlink it
    if (overtime.attendance) {
      await Attendance.findByIdAndUpdate(overtime.attendance, {
        $set: { linkedOvertime: null }
      });
    }

    await Overtime.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Overtime record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete overtime record',
      error: error.message
    });
  }
};
