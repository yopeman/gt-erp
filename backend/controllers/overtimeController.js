import Overtime from '../models/Overtime.js';
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
      workedHours,
      reason,
      type = 'calendar',
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
    }

    if (!targetEmployeeId || !startAt || workedHours === undefined) {
      return res.status(400).json({
        success: false,
        message: 'employee, startAt, and workedHours are required'
      });
    }

    // Auto-select calculation rate from type
    const finalRate = Number(calculationRate) || OVERTIME_TYPE_RATES[type] || 1.5;

    const overtime = await Overtime.create({
      employee: targetEmployeeId,
      startAt,
      workedHours: Number(workedHours),
      approvedHours: isPreApproved ? Number(workedHours) : 0,
      reason,
      type: type || 'calendar',
      calculationRate: finalRate,
      isPreApproved: Boolean(isPreApproved),
      status: 'pending',
      paymentStatus: 'unpaid'
    });

    const populated = await overtime.populate('employee', 'fullName email department position profileImage nationalId');

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

    const userRoles = req.user?.roles || [];
    const canManage = userRoles.some((r) => ['admin', 'hr', 'manager', 'finance'].includes(r));

    const query = {};

    // Scoped visibility: Regular employees can only see their own overtime records
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
      .populate('employee', 'fullName email department position profileImage nationalId')
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
    const userRoles = req.user?.roles || [];
    const canManage = userRoles.some((r) => ['admin', 'hr', 'manager', 'finance'].includes(r));

    const overtime = await Overtime.findById(req.params.id)
      .populate('employee', 'fullName email department position profileImage nationalId')
      .populate('approvedBy', 'fullName email');

    if (!overtime) {
      return res.status(404).json({
        success: false,
        message: 'Overtime record not found'
      });
    }

    // Permission check for regular employee
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

// Update overtime request
export const updateOvertime = async (req, res) => {
  try {
    const overtime = await Overtime.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    )
      .populate('employee', 'fullName email department position')
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
    const { status, approvedHours, approvedBy } = req.body;

    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'approved', 'rejected', or 'pending'"
      });
    }

    const updateData = {
      status,
      approvedBy: approvedBy || null
    };

    if (approvedHours !== undefined) {
      updateData.approvedHours = approvedHours;
    }

    const overtime = await Overtime.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('employee', 'fullName email department position')
      .populate('approvedBy', 'fullName email');

    if (!overtime) {
      return res.status(404).json({
        success: false,
        message: 'Overtime record not found'
      });
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

