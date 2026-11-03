import LeaveRequest from '../models/LeaveRequest.js';
import LeaveBalance from '../models/LeaveBalance.js';
import Employee from '../models/Employee.js';
import Holiday from '../models/Holiday.js';
import { calculateWorkingDays } from '../utils/dateUtils.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import { recordApprovalEvent } from '../utils/approvalHelper.js';

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

// Create a new leave request with balance verification and attachment support
export const createLeaveRequest = async (req, res) => {
  try {
    const {
      type,
      startDate,
      endDate,
      reason,
      attachment,
      attachmentName
    } = req.body;

    const employeeId = await resolveEmployeeId(req);

    if (!employeeId || !type || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'employee, type, startDate, and endDate are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'startDate cannot be after endDate'
      });
    }

    // Fetch active public holidays to exclude from working days
    const holidays = await Holiday.find({ isActive: true });
    const holidayDates = holidays.map((h) => h.date);

    // Calculate actual working days excluding weekends & holidays
    const workingDays = calculateWorkingDays(start, end, holidayDates);
    if (workingDays <= 0) {
      return res.status(400).json({
        success: false,
        message: 'The selected date range contains 0 working days (weekends or public holidays)'
      });
    }

    // Check for overlapping pending or accepted leave requests
    const overlapping = await LeaveRequest.findOne({
      employee: employeeId,
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
    const balance = await LeaveBalance.findOne({
      employee: employeeId,
      year: requestYear,
      type,
      isDeleted: false
    });

    if (type !== 'unpaid') {
      if (!balance) {
        return res.status(400).json({
          success: false,
          message: `No leave balance allocated for '${type}' in year ${requestYear}. Please contact HR.`
        });
      }

      if (balance.remaining < workingDays) {
        return res.status(400).json({
          success: false,
          message: `Insufficient leave balance. You have ${balance.remaining} days remaining, but requested ${workingDays} working days.`
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
      employee: employeeId,
      type,
      startDate: start,
      endDate: end,
      numberOfDays: workingDays,
      reason,
      attachments,
      decision: 'pending'
    });

    // Record submission in ApprovalHistory
    await recordApprovalEvent({
      referenceType: 'leave request',
      referenceId: leaveRequest._id,
      action: 'submitted',
      user: req.user,
      comment: `Leave request of ${workingDays} working days submitted`
    });

    const populated = await leaveRequest.populate('employee', 'fullName email department position');

    res.status(201).json({
      success: true,
      message: `Leave request for ${workingDays} working day(s) submitted successfully`,
      data: populated
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

// Get all leave requests with filters & pagination (Admin/HR/Manager)
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

    const query = {};

    if (employee) query.employee = employee;
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
      .populate('employee', 'fullName email department position profileImage')
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
    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('employee', 'fullName email department position profileImage')
      .populate('decideBy', 'fullName email')
      .populate('managerReview.decidedBy', 'fullName email')
      .populate('hrReview.decidedBy', 'fullName email');

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
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

// Update leave request
export const updateLeaveRequest = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'startDate cannot be after endDate'
      });
    }

    const updateData = { ...req.body };
    if (startDate && endDate) {
      const holidays = await Holiday.find({ isActive: true });
      const holidayDates = holidays.map((h) => h.date);
      updateData.numberOfDays = calculateWorkingDays(new Date(startDate), new Date(endDate), holidayDates);
    }

    const leaveRequest = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('employee', 'fullName email department position')
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
    await recordApprovalEvent({
      referenceType: 'leave request',
      referenceId: leaveRequest._id,
      action: decision,
      user: req.user,
      comment: notes || `Manager review: ${decision}`
    });

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
    const { decision, notes, rejectionReason } = req.body;

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

    // Check if already processed
    if (leaveRequest.decision === 'accepted' && decision === 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Leave request has already been accepted'
      });
    }

    leaveRequest.decision = decision;
    leaveRequest.decideBy = req.user?._id || null;
    leaveRequest.decideAt = new Date();
    leaveRequest.hrReview = {
      decidedBy: req.user?._id || null,
      decidedAt: new Date(),
      notes: notes || ''
    };

    if (decision === 'rejected') {
      leaveRequest.rejectionReason = rejectionReason || notes || 'Rejected by HR';
    }

    await leaveRequest.save();

    // Deduct from LeaveBalance if accepted
    if (decision === 'accepted' && leaveRequest.type !== 'unpaid') {
      const year = new Date(leaveRequest.startDate).getFullYear();
      const deductionDays = leaveRequest.numberOfDays || 1;

      await LeaveBalance.findOneAndUpdate(
        { employee: leaveRequest.employee, year, type: leaveRequest.type, isDeleted: false },
        {
          $inc: { totalUsed: deductionDays, remaining: -deductionDays }
        }
      );
    }

    // Log action in ApprovalHistory
    await recordApprovalEvent({
      referenceType: 'leave request',
      referenceId: leaveRequest._id,
      action: decision,
      user: req.user,
      comment: notes || rejectionReason || `HR decision: ${decision}`
    });

    const populated = await leaveRequest.populate([
      { path: 'employee', select: 'fullName email department position' },
      { path: 'decideBy', select: 'fullName email' },
      { path: 'hrReview.decidedBy', select: 'fullName email' }
    ]);

    res.status(200).json({
      success: true,
      message: `Leave request has been ${decision}`,
      data: populated
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

    await recordApprovalEvent({
      referenceType: 'leave request',
      referenceId: leaveRequest._id,
      action: 'cancelled',
      user: req.user,
      comment: 'Cancelled by employee'
    });

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
    const leaveRequest = await LeaveRequest.findByIdAndDelete(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

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
