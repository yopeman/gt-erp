import LeaveBalance from '../models/LeaveBalance.js';
import Employee from '../models/Employee.js';
import CompanySetting from '../models/CompanySetting.js';

// Resolve employee ID from request body or authenticated user
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

// Create or initialize a single leave balance record
export const createLeaveBalance = async (req, res) => {
  try {
    const { employee, year, type, isPayable, total, remaining, totalUsed, carryForward } = req.body;

    if (!employee || !year || !type) {
      return res.status(400).json({
        success: false,
        message: 'employee, year, and type are required'
      });
    }

    const totalDays = Number(total) || 0;
    const usedDays = Number(totalUsed) || 0;
    const remainingDays = remaining !== undefined ? Number(remaining) : totalDays - usedDays;

    const existingBalance = await LeaveBalance.findOne({ employee, year, type });
    if (existingBalance) {
      return res.status(409).json({
        success: false,
        message: `Leave balance for employee in year ${year} of type '${type}' already exists`
      });
    }

    const leaveBalance = await LeaveBalance.create({
      employee,
      year,
      type,
      isPayable: Boolean(isPayable),
      total: totalDays,
      totalUsed: usedDays,
      remaining: remainingDays,
      carryForward: Number(carryForward) || 0,
      isDeleted: false
    });

    const populated = await leaveBalance.populate('employee', 'fullName email department position');

    res.status(201).json({
      success: true,
      message: 'Leave balance created successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create leave balance',
      error: error.message
    });
  }
};

// Initialize full yearly standard leave balances for an employee
export const initializeEmployeeYearlyBalances = async (req, res) => {
  try {
    const { employeeId, year } = req.body;
    const targetYear = Number(year) || new Date().getFullYear();

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'employeeId is required'
      });
    }

    const emp = await Employee.findById(employeeId);
    if (!emp) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const setting = await CompanySetting.findOne().sort({ createdAt: -1 });
    const standardBalances = [
      { type: 'annual', total: setting?.leaveSettings?.annualDaysPerYear || 16, isPayable: true },
      { type: 'sick', total: setting?.leaveSettings?.sickDaysPerYear || 15, isPayable: false },
      { type: 'emergency', total: setting?.leaveSettings?.emergencyDaysPerYear || 5, isPayable: false },
      { type: 'casual', total: setting?.leaveSettings?.casualDaysPerYear || 3, isPayable: false }
    ];

    if (emp.gender === 'female') {
      standardBalances.push({ type: 'maternity', total: setting?.leaveSettings?.maternityDays || 90, isPayable: true });
    } else if (emp.gender === 'male') {
      standardBalances.push({ type: 'paternity', total: setting?.leaveSettings?.paternityDays || 5, isPayable: false });
    }

    const results = [];
    for (const item of standardBalances) {
      const existing = await LeaveBalance.findOne({
        employee: employeeId,
        year: targetYear,
        type: item.type
      });

      if (!existing) {
        const created = await LeaveBalance.create({
          employee: employeeId,
          year: targetYear,
          type: item.type,
          isPayable: item.isPayable,
          total: item.total,
          remaining: item.total,
          totalUsed: 0
        });
        results.push(created);
      } else {
        results.push(existing);
      }
    }

    res.status(200).json({
      success: true,
      message: `Yearly balances initialized for year ${targetYear}`,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to initialize yearly leave balances',
      error: error.message
    });
  }
};

// Get current user's leave balances
export const getMyLeaveBalances = async (req, res) => {
  try {
    const employeeId = await resolveEmployeeId(req);
    if (!employeeId) {
      return res.status(404).json({
        success: false,
        message: 'No employee profile linked to user'
      });
    }

    const currentYear = req.query.year ? Number(req.query.year) : new Date().getFullYear();

    const balances = await LeaveBalance.find({
      employee: employeeId,
      year: currentYear,
      isDeleted: false
    });

    res.status(200).json({
      success: true,
      year: currentYear,
      data: balances
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your leave balances',
      error: error.message
    });
  }
};

// Get all leave balances with filters and pagination
export const getLeaveBalances = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      employee,
      year,
      type,
      includeDeleted = 'false'
    } = req.query;

    const query = {};

    if (includeDeleted !== 'true') {
      query.isDeleted = false;
    }

    if (employee) query.employee = employee;
    if (year) query.year = parseInt(year, 10);
    if (type) query.type = type;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await LeaveBalance.countDocuments(query);
    const leaveBalances = await LeaveBalance.find(query)
      .populate('employee', 'fullName email department position profileImage')
      .sort({ year: -1, type: 1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: leaveBalances,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave balances',
      error: error.message
    });
  }
};

// Get leave balance by ID
export const getLeaveBalanceById = async (req, res) => {
  try {
    const leaveBalance = await LeaveBalance.findById(req.params.id)
      .populate('employee', 'fullName email department position');

    if (!leaveBalance) {
      return res.status(404).json({
        success: false,
        message: 'Leave balance not found'
      });
    }

    res.status(200).json({
      success: true,
      data: leaveBalance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave balance',
      error: error.message
    });
  }
};

// Update leave balance
export const updateLeaveBalance = async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (updateData.total !== undefined || updateData.totalUsed !== undefined) {
      const existing = await LeaveBalance.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Leave balance not found'
        });
      }

      const total = updateData.total !== undefined ? Number(updateData.total) : existing.total;
      const used = updateData.totalUsed !== undefined ? Number(updateData.totalUsed) : existing.totalUsed;
      updateData.remaining = Math.max(0, total - used);
    }

    const leaveBalance = await LeaveBalance.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('employee', 'fullName email department position');

    if (!leaveBalance) {
      return res.status(404).json({
        success: false,
        message: 'Leave balance not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Leave balance updated successfully',
      data: leaveBalance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update leave balance',
      error: error.message
    });
  }
};

// Delete (soft delete) leave balance
export const deleteLeaveBalance = async (req, res) => {
  try {
    const { permanent } = req.query;

    if (permanent === 'true') {
      const leaveBalance = await LeaveBalance.findByIdAndDelete(req.params.id);
      if (!leaveBalance) {
        return res.status(404).json({
          success: false,
          message: 'Leave balance not found'
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Leave balance permanently deleted'
      });
    }

    const leaveBalance = await LeaveBalance.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!leaveBalance) {
      return res.status(404).json({
        success: false,
        message: 'Leave balance not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Leave balance soft deleted',
      data: leaveBalance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete leave balance',
      error: error.message
    });
  }
};
