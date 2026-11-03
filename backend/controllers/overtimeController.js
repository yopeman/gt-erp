import Overtime from '../models/Overtime.js';
import Employee from '../models/Employee.js';
import { recordApprovalEvent } from '../utils/approvalHelper.js';

// Helper to resolve employee ID
const resolveEmployeeId = async (req) => {
  if (req.body.employee && req.user && (req.user.roles?.includes('admin') || req.user.roles?.includes('hr') || req.user.roles?.includes('manager'))) {
    return req.body.employee;
  }
  if (req.user?.employee?._id) {
    return req.user.employee._id;
  }
  if (req.user?.employee) {
    return req.user.employee;
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

// Create overtime request
export const createOvertime = async (req, res) => {
  try {
    const {
      startAt,
      workedHours,
      reason,
      type,
      calculationRate,
      isPreApproved
    } = req.body;

    const employeeId = await resolveEmployeeId(req);

    if (!employeeId || !startAt || workedHours === undefined) {
      return res.status(400).json({
        success: false,
        message: 'employee, startAt, and workedHours are required'
      });
    }

    const hours = Number(workedHours) || 0;
    if (hours <= 0) {
      return res.status(400).json({
        success: false,
        message: 'workedHours must be greater than 0'
      });
    }

    const overtime = await Overtime.create({
      employee: employeeId,
      startAt,
      workedHours: hours,
      approvedHours: isPreApproved ? hours : 0,
      reason,
      type: type || 'calendar',
      calculationRate: calculationRate || 1.5,
      isPreApproved: Boolean(isPreApproved),
      status: 'pending',
      paymentStatus: 'unpaid'
    });

    // Record submission in ApprovalHistory
    await recordApprovalEvent({
      referenceType: 'overtime',
      referenceId: overtime._id,
      action: 'submitted',
      user: req.user,
      comment: `Overtime request for ${hours} hours submitted`
    });

    const populated = await overtime.populate('employee', 'fullName email department position baseSalary');

    res.status(201).json({
      success: true,
      message: 'Overtime request created successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create overtime request',
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
        message: 'No employee profile linked to user'
      });
    }

    const { page = 1, limit = 20, status, paymentStatus } = req.query;
    const query = { employee: employeeId };
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Overtime.countDocuments(query);
    const overtimes = await Overtime.find(query)
      .populate('approvedBy', 'fullName email')
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

// Get all overtimes with filters and pagination
export const getOvertimes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      employee,
      status,
      paymentStatus,
      type,
      startDate,
      endDate
    } = req.query;

    const query = {};

    if (employee) query.employee = employee;
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (type) query.type = type;

    if (startDate || endDate) {
      query.startAt = {};
      if (startDate) query.startAt.$gte = new Date(startDate);
      if (endDate) query.startAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Overtime.countDocuments(query);
    const overtimes = await Overtime.find(query)
      .populate('employee', 'fullName email department position baseSalary profileImage')
      .populate('approvedBy', 'fullName email')
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
    const overtime = await Overtime.findById(req.params.id)
      .populate('employee', 'fullName email department position baseSalary profileImage')
      .populate('approvedBy', 'fullName email');

    if (!overtime) {
      return res.status(404).json({
        success: false,
        message: 'Overtime record not found'
      });
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
    const overtime = await Overtime.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    )
      .populate('employee', 'fullName email department position baseSalary')
      .populate('approvedBy', 'fullName email');

    if (!overtime) {
      return res.status(404).json({
        success: false,
        message: 'Overtime record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Overtime record updated successfully',
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
    const { status, approvedHours, notes } = req.body;

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

    const finalApprovedHours = approvedHours !== undefined ? Number(approvedHours) : existing.workedHours;

    const updateData = {
      status,
      approvedBy: req.user?._id || null,
      approvedHours: status === 'approved' ? finalApprovedHours : 0
    };

    const overtime = await Overtime.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('employee', 'fullName email department position baseSalary')
      .populate('approvedBy', 'fullName email');

    // Record action in ApprovalHistory
    await recordApprovalEvent({
      referenceType: 'overtime',
      referenceId: overtime._id,
      action: status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'returned for correction',
      user: req.user,
      comment: notes || `Overtime ${status} with ${updateData.approvedHours} approved hours`
    });

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
      message: 'Overtime payment status updated successfully',
      data: overtime
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update overtime payment status',
      error: error.message
    });
  }
};

// Delete overtime
export const deleteOvertime = async (req, res) => {
  try {
    const overtime = await Overtime.findByIdAndDelete(req.params.id);
    if (!overtime) {
      return res.status(404).json({
        success: false,
        message: 'Overtime record not found'
      });
    }

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
