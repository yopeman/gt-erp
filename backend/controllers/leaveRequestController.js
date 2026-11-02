import LeaveRequest from '../models/LeaveRequest.js';
import LeaveBalance from '../models/LeaveBalance.js';

// Create a new leave request
export const createLeaveRequest = async (req, res) => {
  try {
    const { employee, type, startDate, endDate, reason } = req.body;

    if (!employee || !type || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'employee, type, startDate, and endDate are required'
      });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'startDate cannot be after endDate'
      });
    }

    const leaveRequest = await LeaveRequest.create({
      employee,
      type,
      startDate,
      endDate,
      reason,
      decision: 'pending'
    });

    const populated = await leaveRequest.populate('employee', 'fullName email department position');

    res.status(201).json({
      success: true,
      message: 'Leave request created successfully',
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
      .populate('employee', 'fullName email department position')
      .populate('decideBy', 'fullName email')
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

    const leaveRequest = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
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

// Decide on leave request (accept/reject)
export const decideLeaveRequest = async (req, res) => {
  try {
    const { decision, decideBy } = req.body;

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

    leaveRequest.decision = decision;
    leaveRequest.decideBy = decideBy || null;
    leaveRequest.decideAt = new Date();

    await leaveRequest.save();

    // If accepted and matching LeaveBalance exists, update leave balance totalUsed and remaining
    if (decision === 'accepted') {
      const year = new Date(leaveRequest.startDate).getFullYear();
      const diffTime = Math.abs(new Date(leaveRequest.endDate) - new Date(leaveRequest.startDate));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      await LeaveBalance.findOneAndUpdate(
        { employee: leaveRequest.employee, year, type: leaveRequest.type, isDeleted: false },
        {
          $inc: { totalUsed: diffDays, remaining: -diffDays }
        }
      );
    }

    const populated = await leaveRequest.populate([
      { path: 'employee', select: 'fullName email department position' },
      { path: 'decideBy', select: 'fullName email' }
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

// Delete leave request
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

