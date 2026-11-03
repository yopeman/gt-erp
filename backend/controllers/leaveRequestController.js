import LeaveRequest from '../models/LeaveRequest.js';
import LeaveBalance from '../models/LeaveBalance.js';
import Employee from '../models/Employee.js';

/**
 * Helper to resolve logged in employee ID safely
 */
const resolveUserEmployeeId = async (user) => {
  if (!user) return null;
  if (user.employee) {
    return user.employee._id || user.employee;
  }
  const emp = await Employee.findOne({
    $or: [
      { user: user._id },
      { email: user.email?.toLowerCase() }
    ]
  });
  return emp ? emp._id : null;
};

// Create a new leave request
export const createLeaveRequest = async (req, res) => {
  try {
    const { employee, type, startDate, endDate, reason } = req.body;
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
    }

    if (!targetEmployeeId || !type || !startDate || !endDate) {
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

    // Calculate requested duration in calendar days
    const diffTime = Math.abs(end - start);
    const requestedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Balance check: prevent requests exceeding available remaining quota to avoid negative balance
    const year = start.getFullYear();
    const balance = await LeaveBalance.findOne({
      employee: targetEmployeeId,
      year,
      type,
      isDeleted: false
    });

    if (type !== 'unpaid' && balance) {
      if (balance.remaining < requestedDays) {
        return res.status(400).json({
          success: false,
          message: `Insufficient leave balance for ${type} leave. Available: ${balance.remaining} days, requested: ${requestedDays} days.`,
          availableDays: balance.remaining,
          requestedDays
        });
      }
    }

    const leaveRequest = await LeaveRequest.create({
      employee: targetEmployeeId,
      type,
      startDate: start,
      endDate: end,
      reason,
      decision: 'pending'
    });

    const populated = await leaveRequest.populate([
      { path: 'employee', select: 'fullName email department position profileImage nationalId' }
    ]);

    const resObj = populated.toObject();
    resObj.leaveBalance = balance
      ? { total: balance.total, remaining: balance.remaining, totalUsed: balance.totalUsed }
      : null;

    res.status(201).json({
      success: true,
      message: 'Leave request created successfully',
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

// Get all leave requests with filters & pagination
// Regular employees can only see their own leave requests; HR/Manager can see all
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
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    // Attach current leave balance for each request to show in the table directly
    const requestsWithBalance = await Promise.all(
      leaveRequests.map(async (lr) => {
        const obj = lr.toObject();
        const year = new Date(lr.startDate).getFullYear();
        const empId = lr.employee?._id || lr.employee;
        const bal = await LeaveBalance.findOne({
          employee: empId,
          year,
          type: lr.type,
          isDeleted: false
        });
        obj.leaveBalance = bal
          ? { total: bal.total, remaining: bal.remaining, totalUsed: bal.totalUsed }
          : null;
        return obj;
      })
    );

    res.status(200).json({
      success: true,
      data: requestsWithBalance,
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
      .populate('decideBy', 'fullName email');

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Permission check for regular employee
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

    const year = new Date(leaveRequest.startDate).getFullYear();
    const empId = leaveRequest.employee?._id || leaveRequest.employee;
    const bal = await LeaveBalance.findOne({
      employee: empId,
      year,
      type: leaveRequest.type,
      isDeleted: false
    });

    const resObj = leaveRequest.toObject();
    resObj.leaveBalance = bal
      ? { total: bal.total, remaining: bal.remaining, totalUsed: bal.totalUsed }
      : null;

    res.status(200).json({
      success: true,
      data: resObj
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

// Decide on leave request (accept/reject with decision reason and negative balance prevention)
export const decideLeaveRequest = async (req, res) => {
  try {
    const { decision, decisionReason, rejectionReason, reason, decideBy } = req.body;

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
    const finalReason = decisionReason || rejectionReason || reason || '';

    const year = new Date(leaveRequest.startDate).getFullYear();
    const diffTime = Math.abs(new Date(leaveRequest.endDate) - new Date(leaveRequest.startDate));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Check Leave Balance
    const balance = await LeaveBalance.findOne({
      employee: leaveRequest.employee,
      year,
      type: leaveRequest.type,
      isDeleted: false
    });

    if (decision === 'accepted' && previousDecision !== 'accepted') {
      // Prevent negative balance upon approval
      if (leaveRequest.type !== 'unpaid' && balance) {
        if (balance.remaining < diffDays) {
          return res.status(400).json({
            success: false,
            message: `Cannot approve leave: Insufficient balance. Available: ${balance.remaining} days, Required: ${diffDays} days.`
          });
        }
        balance.remaining = Math.max(0, balance.remaining - diffDays);
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

    await leaveRequest.save();

    const populated = await leaveRequest.populate([
      { path: 'employee', select: 'fullName email department position profileImage nationalId' },
      { path: 'decideBy', select: 'fullName email' }
    ]);

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

// Delete leave request
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
      const diffTime = Math.abs(new Date(leaveRequest.endDate) - new Date(leaveRequest.startDate));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
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

