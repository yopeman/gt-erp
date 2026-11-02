import LeaveBalance from '../models/LeaveBalance.js';

// Create or initialize a leave balance record
export const createLeaveBalance = async (req, res) => {
  try {
    const { employee, year, type, isPayable, total, remaining, totalUsed } = req.body;

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
    const balances = await LeaveBalance.find(query)
      .populate('employee', 'fullName email department position')
      .sort({ year: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: balances,
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
    const balance = await LeaveBalance.findById(req.params.id)
      .populate('employee', 'fullName email department position');

    if (!balance) {
      return res.status(404).json({
        success: false,
        message: 'Leave balance record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: balance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave balance record',
      error: error.message
    });
  }
};

// Update leave balance
export const updateLeaveBalance = async (req, res) => {
  try {
    const balance = await LeaveBalance.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('employee', 'fullName email department position');

    if (!balance) {
      return res.status(404).json({
        success: false,
        message: 'Leave balance record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Leave balance updated successfully',
      data: balance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update leave balance record',
      error: error.message
    });
  }
};

// Adjust leave balance days
export const adjustLeaveDays = async (req, res) => {
  try {
    const { daysUsed } = req.body;

    if (daysUsed === undefined) {
      return res.status(400).json({
        success: false,
        message: 'daysUsed number is required'
      });
    }

    const change = Number(daysUsed);

    const balance = await LeaveBalance.findByIdAndUpdate(
      req.params.id,
      {
        $inc: {
          totalUsed: change,
          remaining: -change
        }
      },
      { new: true, runValidators: true }
    ).populate('employee', 'fullName email department position');

    if (!balance) {
      return res.status(404).json({
        success: false,
        message: 'Leave balance record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Leave days adjusted successfully',
      data: balance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to adjust leave days',
      error: error.message
    });
  }
};

// Delete (soft delete) leave balance
export const deleteLeaveBalance = async (req, res) => {
  try {
    const { permanent } = req.query;

    if (permanent === 'true') {
      const balance = await LeaveBalance.findByIdAndDelete(req.params.id);
      if (!balance) {
        return res.status(404).json({
          success: false,
          message: 'Leave balance record not found'
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Leave balance permanently deleted'
      });
    }

    const balance = await LeaveBalance.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!balance) {
      return res.status(404).json({
        success: false,
        message: 'Leave balance record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Leave balance soft deleted successfully',
      data: balance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete leave balance',
      error: error.message
    });
  }
};

