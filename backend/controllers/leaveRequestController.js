import LeaveRequest from '../models/LeaveRequest.js';
import LeaveBalance from '../models/LeaveBalance.js';
import Employee from '../models/Employee.js';
import Holiday from '../models/Holiday.js';
import CompanySetting from '../models/CompanySetting.js';
import { calculateWorkingDays } from '../utils/dateUtils.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
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

// Create a new leave request with balance verification and attachment support
export const createLeaveRequest = async (req, res) => {
  try {
    const {
      employee,
      type,
      startDate,
      endDate,
      reason,
      attachment,
      attachmentName
    } = req.body;

    const userRoles = req.user?.roles || [];
    const canManage = userRoles.some((r) => ['admin', 'hr', 'manager'].includes(r));

    let targetEmployeeId = employee;

    // Security check: Regular employees cannot submit leave requests for someone else
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
          message: 'Employees cannot submit leave requests for other staff members.'
        });
      }
      targetEmployeeId = myEmpId;
    } else if (!targetEmployeeId) {
      targetEmployeeId = await resolveEmployeeId(req);
    }

    if (!targetEmployeeId || !type || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'employee, type, startDate, and endDate are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'endDate cannot be before startDate'
      });
    }

    // Load company settings & active holidays
    const setting = await CompanySetting.findOne().sort({ createdAt: -1 });
    const workingDaysOfWeek = setting?.workSchedule?.workingDays || [1, 2, 3, 4, 5];
    const holidays = await Holiday.find({ isActive: true });

    // Calculate actual working days excluding weekends & company public holidays
    let workingDays = calculateWorkingDays(start, end, holidays, workingDaysOfWeek);
    if (workingDays <= 0) {
      const diffTime = Math.abs(end - start);
      workingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    // Check company policy: Require attachment for sick leave
    const requireAttachment = setting?.leaveSettings?.requireAttachmentForSickLeave !== false;
    if (type === 'sick' && requireAttachment && !attachment) {
      return res.status(400).json({
        success: false,
        message: 'Supporting medical certificate attachment is required for sick leave requests as per company policy.'
      });
    }

    // Check for overlapping pending or accepted leave requests
    const overlapping = await LeaveRequest.findOne({
      employee: targetEmployeeId,
      decision: { $in: ['pending', 'manager_approved', 'accepted'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });

    if (overlapping) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active or pending leave request covering these dates'
      });
    }

    // Balance verification for deductible leave types
    const requestYear = start.getFullYear();
    let balance = await LeaveBalance.findOne({
      employee: targetEmployeeId,
      year: requestYear,
      type,
      isDeleted: false
    });

    // Lazy initialize balance if missing from Company Settings
    if (!balance && type !== 'unpaid') {
      const quotaMap = {
        annual: setting?.leaveSettings?.annualDaysPerYear || 16,
        sick: setting?.leaveSettings?.sickDaysPerYear || 15,
        emergency: setting?.leaveSettings?.emergencyDaysPerYear || 5,
        casual: setting?.leaveSettings?.casualDaysPerYear || 3,
        maternity: setting?.leaveSettings?.maternityDays || 90,
        paternity: setting?.leaveSettings?.paternityDays || 5
      };
      const standardQuota = quotaMap[type] || 0;
      if (standardQuota > 0) {
        balance = await LeaveBalance.create({
          employee: targetEmployeeId,
          year: requestYear,
          type,
          isPayable: ['annual', 'maternity'].includes(type),
          total: standardQuota,
          remaining: standardQuota,
          totalUsed: 0
        });
      }
    }

    const allowNegative = Boolean(setting?.leaveSettings?.allowNegativeBalance);

    if (type !== 'unpaid' && balance) {
      if (!allowNegative && balance.remaining < workingDays) {
        return res.status(400).json({
          success: false,
          message: `Insufficient leave balance for ${type} leave. Available: ${balance.remaining} days, requested: ${workingDays} working days.`,
          availableDays: balance.remaining,
          requestedDays: workingDays
        });
      }
    }

    // Handle document upload if provided (e.g. medical certificates)
    const attachments = [];
    if (attachment) {
      const uploadResult = await uploadToCloudinary(attachment, {
        folder: 'gt_erp/leave_attachments',
        resourceType: 'auto'
      });
      attachments.push({
        name: attachmentName || `${type}_leave_document`,
        url: uploadResult.secureUrl || uploadResult.url,
        uploadedAt: new Date()
      });
    }

    const leaveRequest = await LeaveRequest.create({
      employee: targetEmployeeId,
      type,
      startDate: start,
      endDate: end,
      numberOfDays: workingDays,
      reason,
      attachments,
      decision: 'pending'
    });

    // Record submission in ApprovalHistory
    try {
      await recordApprovalEvent({
        referenceType: 'leave request',
        referenceId: leaveRequest._id,
        action: 'submitted',
        user: req.user,
        comment: `Leave request of ${workingDays} day(s) submitted`
      });
    } catch (histErr) {
      console.warn('Approval history logging warning:', histErr.message);
    }

    const populated = await leaveRequest.populate([
      { path: 'employee', select: 'fullName email department position profileImage nationalId' }
    ]);

    // Automatic notification to HR and Managers
    try {
      const empName = populated.employee?.fullName || 'An employee';
      await sendNotificationToRoles({
        roles: ['admin', 'hr', 'manager'],
        title: 'New Leave Request',
        body: `${empName} requested ${workingDays} day(s) of ${type} leave.`,
        type: 'leave',
        data: {
          leaveRequestId: String(leaveRequest._id),
          employeeId: String(targetEmployeeId),
          link: '/hr/leave'
        }
      });
    } catch (notifErr) {
      console.warn('Leave request notification error:', notifErr.message);
    }

    const resObj = populated.toObject();
    resObj.leaveBalance = balance
      ? { total: balance.total, remaining: balance.remaining, totalUsed: balance.totalUsed }
      : null;

    res.status(201).json({
      success: true,
      message: `Leave request for ${workingDays} day(s) submitted successfully`,
      data: resObj
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create leave request',
      error: error.message
    });
  }
};

// Get current employee's leave requests
export const getMyLeaveRequests = async (req, res) => {
  try {
    const employeeId = await resolveEmployeeId(req);
    if (!employeeId) {
      return res.status(404).json({
        success: false,
        message: 'No employee profile linked to user'
      });
    }

    const { page = 1, limit = 20, decision, type } = req.query;
    const query = { employee: employeeId };
    if (decision) query.decision = decision;
    if (type) query.type = type;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await LeaveRequest.countDocuments(query);
    const leaveRequests = await LeaveRequest.find(query)
      .populate('decideBy', 'fullName email')
      .populate('managerReview.decidedBy', 'fullName email')
      .populate('hrReview.decidedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: leaveRequests,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your leave requests',
      error: error.message
    });
  }
};

// Get all leave requests with filters & pagination
export const getLeaveRequests = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      employee,
      type,
      decision,
      startDate,
      endDate
    } = req.query;

    const userRoles = req.user?.roles || [];
    const canManage = userRoles.some((r) => ['admin', 'hr', 'manager'].includes(r));

    const query = {};

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

    if (type) query.type = type;
    if (decision) query.decision = decision;

    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await LeaveRequest.countDocuments(query);
    const leaveRequests = await LeaveRequest.find(query)
      .populate('employee', 'fullName email department position profileImage nationalId')
      .populate('decideBy', 'fullName email')
      .populate('managerReview.decidedBy', 'fullName email')
      .populate('hrReview.decidedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: leaveRequests,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave requests',
      error: error.message
    });
  }
};

// Get leave request by ID
export const getLeaveRequestById = async (req, res) => {
  try {
    const userRoles = req.user?.roles || [];
    const canManage = userRoles.some((r) => ['admin', 'hr', 'manager'].includes(r));

    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('employee', 'fullName email department position profileImage nationalId')
      .populate('decideBy', 'fullName email')
      .populate('managerReview.decidedBy', 'fullName email')
      .populate('hrReview.decidedBy', 'fullName email');

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    if (!canManage) {
      const myEmpId = await resolveUserEmployeeId(req.user);
      const reqEmpId = leaveRequest.employee?._id || leaveRequest.employee;
      if (String(reqEmpId) !== String(myEmpId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own leave requests'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: leaveRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave request',
      error: error.message
    });
  }
};

// Update leave request details
export const updateLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    )
      .populate('employee', 'fullName email department position profileImage nationalId')
      .populate('decideBy', 'fullName email');

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Leave request updated successfully',
      data: leaveRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update leave request',
      error: error.message
    });
  }
};

// Department Manager review step
export const managerReviewLeaveRequest = async (req, res) => {
  try {
    const { decision, notes } = req.body; // 'manager_approved' or 'rejected'

    if (!['manager_approved', 'rejected'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "Decision must be either 'manager_approved' or 'rejected'"
      });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    leaveRequest.decision = decision;
    leaveRequest.managerReview = {
      decidedBy: req.user?._id || null,
      decidedAt: new Date(),
      notes: notes || ''
    };

    if (decision === 'rejected') {
      leaveRequest.rejectionReason = notes || 'Rejected by Department Manager';
    }

    await leaveRequest.save();

    // Log in ApprovalHistory
    try {
      await recordApprovalEvent({
        referenceType: 'leave request',
        referenceId: leaveRequest._id,
        action: decision,
        user: req.user,
        comment: notes || `Manager review: ${decision}`
      });
    } catch (histErr) {
      console.warn('Approval history logging warning:', histErr.message);
    }

    const populated = await leaveRequest.populate([
      { path: 'employee', select: 'fullName email department position' },
      { path: 'managerReview.decidedBy', select: 'fullName email' }
    ]);

    res.status(200).json({
      success: true,
      message: `Leave request has been marked as ${decision}`,
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to record manager review',
      error: error.message
    });
  }
};

// Final HR Decision on leave request (accept / reject)
export const decideLeaveRequest = async (req, res) => {
  try {
    const { decision, notes, rejectionReason, decisionReason, reason, decideBy } = req.body;

    if (!decision || !['accepted', 'rejected'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "Decision is required and must be either 'accepted' or 'rejected'"
      });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    const previousDecision = leaveRequest.decision;
    const finalReason = decisionReason || rejectionReason || notes || reason || '';

    const year = new Date(leaveRequest.startDate).getFullYear();
    const diffDays = leaveRequest.numberOfDays || Math.ceil(Math.abs(new Date(leaveRequest.endDate) - new Date(leaveRequest.startDate)) / (1000 * 60 * 60 * 24)) + 1;

    const setting = await CompanySetting.findOne().sort({ createdAt: -1 });
    const allowNegative = Boolean(setting?.leaveSettings?.allowNegativeBalance);

    // Check Leave Balance
    let balance = await LeaveBalance.findOne({
      employee: leaveRequest.employee,
      year,
      type: leaveRequest.type,
      isDeleted: false
    });

    if (decision === 'accepted' && previousDecision !== 'accepted') {
      if (leaveRequest.type !== 'unpaid') {
        if (!balance) {
          const quotaMap = {
            annual: setting?.leaveSettings?.annualDaysPerYear || 16,
            sick: setting?.leaveSettings?.sickDaysPerYear || 15,
            emergency: setting?.leaveSettings?.emergencyDaysPerYear || 5,
            casual: setting?.leaveSettings?.casualDaysPerYear || 3,
            maternity: setting?.leaveSettings?.maternityDays || 90,
            paternity: setting?.leaveSettings?.paternityDays || 5
          };
          const standardQuota = quotaMap[leaveRequest.type] || 0;
          balance = await LeaveBalance.create({
            employee: leaveRequest.employee,
            year,
            type: leaveRequest.type,
            isPayable: ['annual', 'maternity'].includes(leaveRequest.type),
            total: standardQuota,
            remaining: standardQuota,
            totalUsed: 0
          });
        }

        if (!allowNegative && balance.remaining < diffDays) {
          return res.status(400).json({
            success: false,
            message: `Cannot approve leave: Insufficient balance. Available: ${balance.remaining} days, Required: ${diffDays} days.`
          });
        }
        balance.remaining = balance.remaining - diffDays;
        balance.totalUsed += diffDays;
        await balance.save();
      }
    } else if (decision === 'rejected' && previousDecision === 'accepted') {
      // Refund previously deducted balance if rejecting a previously accepted request
      if (balance) {
        balance.remaining += diffDays;
        balance.totalUsed = Math.max(0, balance.totalUsed - diffDays);
        await balance.save();
      }
    }

    leaveRequest.decision = decision;
    leaveRequest.decisionReason = finalReason;
    leaveRequest.decideBy = req.user?._id || decideBy || null;
    leaveRequest.decideAt = new Date();
    leaveRequest.hrReview = {
      decidedBy: req.user?._id || decideBy || null,
      decidedAt: new Date(),
      notes: notes || finalReason
    };

    if (decision === 'rejected') {
      leaveRequest.rejectionReason = finalReason || 'Rejected by HR';
    }

    await leaveRequest.save();

    // Log action in ApprovalHistory
    try {
      await recordApprovalEvent({
        referenceType: 'leave request',
        referenceId: leaveRequest._id,
        action: decision,
        user: req.user,
        comment: notes || finalReason || `HR decision: ${decision}`
      });
    } catch (histErr) {
      console.warn('Approval history logging warning:', histErr.message);
    }

    const populated = await leaveRequest.populate([
      { path: 'employee', select: 'fullName email department position profileImage nationalId' },
      { path: 'decideBy', select: 'fullName email' },
      { path: 'hrReview.decidedBy', select: 'fullName email' }
    ]);

    // Automatic notification to the employee
    try {
      const decisionTitle = decision === 'approved' ? 'Leave Request Approved' : 'Leave Request Rejected';
      const decisionBody = decision === 'approved'
        ? `Your request for ${leaveRequest.numberOfDays} day(s) of ${leaveRequest.type} leave has been approved.`
        : `Your request for ${leaveRequest.numberOfDays} day(s) of ${leaveRequest.type} leave was rejected. ${finalReason ? 'Reason: ' + finalReason : ''}`;

      await sendNotificationToEmployee({
        employeeId: leaveRequest.employee,
        title: decisionTitle,
        body: decisionBody,
        type: 'leave',
        data: {
          leaveRequestId: String(leaveRequest._id),
          decision,
          link: '/hr/leave'
        }
      });
    } catch (notifErr) {
      console.warn('Leave decision notification error:', notifErr.message);
    }

    const resObj = populated.toObject();
    resObj.leaveBalance = balance
      ? { total: balance.total, remaining: balance.remaining, totalUsed: balance.totalUsed }
      : null;

    res.status(200).json({
      success: true,
      message: `Leave request has been ${decision}`,
      data: resObj
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to process leave decision',
      error: error.message
    });
  }
};

// Employee Cancel leave request
export const cancelMyLeaveRequest = async (req, res) => {
  try {
    const employeeId = await resolveEmployeeId(req);
    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    if (leaveRequest.employee.toString() !== employeeId?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own leave request'
      });
    }

    if (leaveRequest.decision === 'accepted') {
      // Restore leave balance
      const year = new Date(leaveRequest.startDate).getFullYear();
      const restoreDays = leaveRequest.numberOfDays || 1;

      await LeaveBalance.findOneAndUpdate(
        { employee: leaveRequest.employee, year, type: leaveRequest.type, isDeleted: false },
        {
          $inc: { totalUsed: -restoreDays, remaining: restoreDays }
        }
      );
    }

    leaveRequest.decision = 'cancelled';
    await leaveRequest.save();

    try {
      await recordApprovalEvent({
        referenceType: 'leave request',
        referenceId: leaveRequest._id,
        action: 'cancelled',
        user: req.user,
        comment: 'Cancelled by employee'
      });
    } catch (histErr) {
      console.warn('Approval history logging warning:', histErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Leave request cancelled and balance restored',
      data: leaveRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cancel leave request',
      error: error.message
    });
  }
};

// Delete leave request (Admin/HR only)
export const deleteLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // If deleting an accepted request, refund the balance
    if (leaveRequest.decision === 'accepted') {
      const year = new Date(leaveRequest.startDate).getFullYear();
      const diffDays = leaveRequest.numberOfDays || Math.ceil(Math.abs(new Date(leaveRequest.endDate) - new Date(leaveRequest.startDate)) / (1000 * 60 * 60 * 24)) + 1;
      await LeaveBalance.findOneAndUpdate(
        { employee: leaveRequest.employee, year, type: leaveRequest.type, isDeleted: false },
        { $inc: { totalUsed: -diffDays, remaining: diffDays } }
      );
    }

    await LeaveRequest.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Leave request deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete leave request',
      error: error.message
    });
  }
};
