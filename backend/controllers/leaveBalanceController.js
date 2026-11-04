import LeaveBalance from '../models/LeaveBalance.js';
import Employee from '../models/Employee.js';
import CompanySetting from '../models/CompanySetting.js';

/**
 * Helper to resolve logged in employee ID safely
 */
const resolveEmployeeId = async (req) => {
  if (req.body?.employee && req.user && (req.user.roles?.includes('admin') || req.user.roles?.includes('hr') || req.user.roles?.includes('manager'))) {
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
  if (req.body?.employee) {
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

    const existingBalance = await LeaveBalance.findOne({
      employee,
      year,
      type
    });

    if (existingBalance) {
      return res.status(409).json({
        success: false,
        message: 'Leave balance for this employee, year, and type already exists'
      });
    }

    const calculatedRemaining = remaining !== undefined ? remaining : total;

    const balance = await LeaveBalance.create({
      employee,
      year,
      type,
      isPayable: isPayable || false,
      total,
      remaining: calculatedRemaining,
      totalUsed: totalUsed || 0,
      carryForward: carryForward || 0
    });

    const populated = await balance.populate('employee', 'fullName email department position profileImage');

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

// Initialize full yearly standard leave balances for an employee or all active employees
export const initializeEmployeeYearlyBalances = async (req, res) => {
  try {
    const { employeeId, year } = req.body;
    const targetYear = Number(year) || new Date().getFullYear();

    const setting = await CompanySetting.findOne().sort({ createdAt: -1 });

    let employees = [];
    if (!employeeId || employeeId === 'all') {
      employees = await Employee.find({ status: { $ne: 'terminated' } });
    } else {
      const emp = await Employee.findById(employeeId);
      if (emp) employees = [emp];
    }

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No eligible employees found to initialize leave balances'
      });
    }

    let createdCount = 0;
    for (const emp of employees) {
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

      for (const item of standardBalances) {
        const existing = await LeaveBalance.findOne({
          employee: emp._id,
          year: targetYear,
          type: item.type
        });

        if (!existing) {
          await LeaveBalance.create({
            employee: emp._id,
            year: targetYear,
            type: item.type,
            isPayable: item.isPayable,
            total: item.total,
            remaining: item.total,
            totalUsed: 0
          });
          createdCount++;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Yearly balances initialized for year ${targetYear} (${createdCount} records created across ${employees.length} employee(s)).`,
      createdCount,
      employeeCount: employees.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to initialize yearly leave balances',
      error: error.message
    });
  }
};

// Get current user's leave balances with auto-initialization from policy
export const getMyLeaveBalances = async (req, res) => {
  try {
    const employeeId = await resolveEmployeeId(req);
    if (!employeeId) {
      return res.status(404).json({
        success: false,
        message: 'No matching employee profile found for user'
      });
    }

    const currentYear = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();
    let balances = await LeaveBalance.find({
      employee: employeeId,
      year: currentYear,
      isDeleted: false
    }).sort({ type: 1 });

    // Auto-initialize standard balances if none exist for current year
    if (balances.length === 0) {
      const setting = await CompanySetting.findOne().sort({ createdAt: -1 });
      const emp = await Employee.findById(employeeId);
      if (emp) {
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

        for (const item of standardBalances) {
          await LeaveBalance.create({
            employee: emp._id,
            year: currentYear,
            type: item.type,
            isPayable: item.isPayable,
            total: item.total,
            remaining: item.total,
            totalUsed: 0
          });
        }

        balances = await LeaveBalance.find({
          employee: employeeId,
          year: currentYear,
          isDeleted: false
        }).sort({ type: 1 });
      }
    }

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

// Sync Standard Leave Entitlement Policy quotas across employee balances
export const syncPolicyToBalances = async (req, res) => {
  try {
    const { year, overwriteCustom } = req.body;
    const targetYear = Number(year) || new Date().getFullYear();
    const setting = await CompanySetting.findOne().sort({ createdAt: -1 });

    const quotaMap = {
      annual: setting?.leaveSettings?.annualDaysPerYear || 16,
      sick: setting?.leaveSettings?.sickDaysPerYear || 15,
      emergency: setting?.leaveSettings?.emergencyDaysPerYear || 5,
      casual: setting?.leaveSettings?.casualDaysPerYear || 3,
      maternity: setting?.leaveSettings?.maternityDays || 90,
      paternity: setting?.leaveSettings?.paternityDays || 5
    };

    const employees = await Employee.find({ status: { $ne: 'terminated' } });
    let updatedCount = 0;
    let createdCount = 0;

    for (const emp of employees) {
      const types = ['annual', 'sick', 'emergency', 'casual'];
      if (emp.gender === 'female') types.push('maternity');
      else if (emp.gender === 'male') types.push('paternity');

      for (const t of types) {
        const policyTotal = quotaMap[t] || 0;
        const existing = await LeaveBalance.findOne({
          employee: emp._id,
          year: targetYear,
          type: t,
          isDeleted: false
        });

        if (existing) {
          if (overwriteCustom || existing.totalUsed === 0) {
            existing.total = policyTotal;
            existing.remaining = Math.max(0, policyTotal - (existing.totalUsed || 0));
            await existing.save();
            updatedCount++;
          }
        } else {
          await LeaveBalance.create({
            employee: emp._id,
            year: targetYear,
            type: t,
            isPayable: ['annual', 'maternity'].includes(t),
            total: policyTotal,
            remaining: policyTotal,
            totalUsed: 0
          });
          createdCount++;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Synchronized policy quotas for year ${targetYear} (${createdCount} created, ${updatedCount} updated across ${employees.length} employees)`,
      data: { createdCount, updatedCount, employeeCount: employees.length, targetYear }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to sync leave policy quotas',
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

    const userRoles = req.user?.roles || [];
    const canManage = userRoles.some((r) => ['admin', 'hr', 'manager'].includes(r));

    const query = {};

    if (includeDeleted !== 'true') {
      query.isDeleted = false;
    }

    // Scoped visibility: Regular employees can only see their own leave balances
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
    } else if (employee) {
      query.employee = employee;
    }

    if (year) query.year = parseInt(year, 10);
    if (type) query.type = type;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await LeaveBalance.countDocuments(query);
    const leaveBalances = await LeaveBalance.find(query)
      .populate('employee', 'fullName email department position profileImage nationalId')
      .populate('lastAdjustedBy', 'fullName email')
      .populate('adjustments.adjustedBy', 'fullName email')
      .sort({ year: -1, createdAt: -1 })
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
    const userRoles = req.user?.roles || [];
    const canManage = userRoles.some((r) => ['admin', 'hr', 'manager'].includes(r));

    const leaveBalance = await LeaveBalance.findById(req.params.id)
      .populate('employee', 'fullName email department position profileImage nationalId')
      .populate('lastAdjustedBy', 'fullName email')
      .populate('adjustments.adjustedBy', 'fullName email');

    if (!leaveBalance) {
      return res.status(404).json({
        success: false,
        message: 'Leave balance not found'
      });
    }

    if (!canManage) {
      const myEmpId = await resolveUserEmployeeId(req.user);
      const balEmpId = leaveBalance.employee?._id || leaveBalance.employee;
      if (String(balEmpId) !== String(myEmpId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own leave balance'
        });
      }
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
    ).populate('employee', 'fullName email department position profileImage nationalId');

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
      message: 'Failed to update leave balance record',
      error: error.message
    });
  }
};

// Adjust leave balance days
export const adjustLeaveDays = async (req, res) => {
  try {
    const { daysUsed, adjustment, change: bodyChange, reason } = req.body;

    // Resolve adjustment value from adjustment, days, change, or daysUsed
    const rawVal = adjustment !== undefined
      ? adjustment
      : (req.body.days !== undefined
          ? req.body.days
          : (bodyChange !== undefined
              ? bodyChange
              : daysUsed));

    if (rawVal === undefined || rawVal === null || isNaN(Number(rawVal))) {
      return res.status(400).json({
        success: false,
        message: 'Adjustment days number is required'
      });
    }

    const balance = await LeaveBalance.findById(req.params.id);

    if (!balance) {
      return res.status(404).json({
        success: false,
        message: 'Leave balance record not found'
      });
    }

    const numVal = Number(rawVal);

    if (adjustment !== undefined || req.body.days !== undefined || bodyChange !== undefined) {
      // Direct quota adjustment (+ to add to quota & remaining, - to subtract)
      if (balance.remaining + numVal < 0) {
        return res.status(400).json({
          success: false,
          message: `Adjustment would result in negative balance. Available remaining days: ${balance.remaining}.`
        });
      }

      balance.total = Math.max(0, balance.total + numVal);
      balance.remaining = Math.max(0, balance.remaining + numVal);
    } else {
      // Legacy daysUsed adjustment: positive increases totalUsed and decreases remaining
      if (balance.remaining - numVal < 0) {
        return res.status(400).json({
          success: false,
          message: `Adjustment would result in negative balance. Available remaining days: ${balance.remaining}.`
        });
      }

      balance.totalUsed = Math.max(0, balance.totalUsed + numVal);
      balance.remaining = Math.max(0, balance.remaining - numVal);
    }

    const finalReason = reason || req.body.adjustmentReason || req.body.adjustReason || '';
    balance.adjustmentReason = finalReason;
    balance.lastAdjustedAt = new Date();
    if (req.user?._id) {
      balance.lastAdjustedBy = req.user._id;
    }
    if (!Array.isArray(balance.adjustments)) {
      balance.adjustments = [];
    }
    balance.adjustments.push({
      adjustment: numVal,
      reason: finalReason,
      adjustedBy: req.user?._id || null,
      adjustedAt: new Date()
    });

    await balance.save();

    const populated = await balance.populate([
      { path: 'employee', select: 'fullName email department position profileImage nationalId' },
      { path: 'lastAdjustedBy', select: 'fullName email' },
      { path: 'adjustments.adjustedBy', select: 'fullName email' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Leave days adjusted successfully',
      data: populated
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
