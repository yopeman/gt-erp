import Payroll from '../models/Payroll.js';
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

// Helper for statutory Ethiopian Tax
const calculateStatutoryTax = (taxableIncome) => {
  const income = Number(taxableIncome) || 0;
  if (income <= 600) return 0;
  if (income <= 1650) return Math.round(income * 0.10 - 60);
  if (income <= 3200) return Math.round(income * 0.15 - 142.5);
  if (income <= 5250) return Math.round(income * 0.20 - 302.5);
  if (income <= 7800) return Math.round(income * 0.25 - 565);
  if (income <= 10900) return Math.round(income * 0.30 - 955);
  return Math.round(income * 0.35 - 1500);
};

// Create a new payroll record
export const createPayroll = async (req, res) => {
  try {
    const {
      employeeId,
      fromDate,
      toDate,
      currency,
      type,
      earnings = [],
      deductions = [],
      totalGross,
      totalDeduction,
      totalNet,
      createdBy
    } = req.body;

    if (!employeeId || !fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: 'employeeId, fromDate, and toDate are required'
      });
    }

    const calculatedGross = Array.isArray(earnings) && earnings.length > 0
      ? earnings.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
      : Number(totalGross) || 0;

    const calculatedDeduction = Array.isArray(deductions) && deductions.length > 0
      ? deductions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
      : Number(totalDeduction) || 0;

    const net = totalNet !== undefined ? Number(totalNet) : calculatedGross - calculatedDeduction;

    const payroll = await Payroll.create({
      employeeId,
      fromDate,
      toDate,
      currency: currency || 'ETB',
      type: type || 'salary',
      earnings: Array.isArray(earnings) ? earnings : [],
      deductions: Array.isArray(deductions) ? deductions : [],
      totalGross: calculatedGross,
      totalDeduction: calculatedDeduction,
      totalNet: net,
      createdBy: createdBy || req.user?._id || null,
      status: 'unpaid'
    });

    const populated = await payroll.populate([
      { path: 'employeeId', select: 'fullName email department position baseSalary accountDetails nationalId' },
      { path: 'createdBy', select: 'fullName email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Payroll record created successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create payroll record',
      error: error.message
    });
  }
};

// Get all payrolls with filters & pagination
export const getPayrolls = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      employeeId,
      status,
      type,
      fromDate,
      toDate
    } = req.query;

    const userRoles = req.user?.roles || [];
    const canManage = userRoles.some((r) => ['admin', 'hr', 'finance'].includes(r));

    const query = {};

    // Scoped visibility: Regular employees can only view their own payroll records
    if (!canManage) {
      const myEmpId = await resolveUserEmployeeId(req.user);
      if (!myEmpId) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: { total: 0, page: 1, pages: 0 }
        });
      }
      query.employeeId = myEmpId;
    } else {
      if (employeeId) query.employeeId = employeeId;
    }

    if (status) query.status = status;
    if (type) query.type = type;

    if (fromDate || toDate) {
      query.fromDate = {};
      if (fromDate) query.fromDate.$gte = new Date(fromDate);
      if (toDate) query.fromDate.$lte = new Date(toDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Payroll.countDocuments(query);
    const payrolls = await Payroll.find(query)
      .populate('employeeId', 'fullName email department position baseSalary accountDetails nationalId')
      .populate('createdBy', 'fullName email')
      .populate('approvedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: payrolls,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payroll records',
      error: error.message
    });
  }
};

// Get payroll by ID
export const getPayrollById = async (req, res) => {
  try {
    const userRoles = req.user?.roles || [];
    const canManage = userRoles.some((r) => ['admin', 'hr', 'finance'].includes(r));

    const payroll = await Payroll.findById(req.params.id)
      .populate('employeeId', 'fullName email department position baseSalary accountDetails nationalId')
      .populate('createdBy', 'fullName email')
      .populate('approvedBy', 'fullName email');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    // Permission check for regular employee: can only view own payslip
    if (!canManage) {
      const myEmpId = await resolveUserEmployeeId(req.user);
      const payEmpId = payroll.employeeId?._id || payroll.employeeId;
      if (String(payEmpId) !== String(myEmpId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own payroll and payslips'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: payroll
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payroll record',
      error: error.message
    });
  }
};

// Update payroll
export const updatePayroll = async (req, res) => {
  try {
    const existing = await Payroll.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    if (existing.approvedBy) {
      return res.status(400).json({
        success: false,
        message: 'Approved payroll records cannot be edited'
      });
    }

    const updateData = { ...req.body };

    if (Array.isArray(updateData.earnings)) {
      updateData.totalGross = updateData.earnings.reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0
      );
    }

    if (Array.isArray(updateData.deductions)) {
      updateData.totalDeduction = updateData.deductions.reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0
      );
    }

    const gross = updateData.totalGross !== undefined ? Number(updateData.totalGross) : existing.totalGross;
    const deduction = updateData.totalDeduction !== undefined ? Number(updateData.totalDeduction) : existing.totalDeduction;
    if (updateData.totalNet === undefined) {
      updateData.totalNet = gross - deduction;
    }

    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('employeeId', 'fullName email department position baseSalary accountDetails nationalId')
      .populate('createdBy', 'fullName email')
      .populate('approvedBy', 'fullName email');

    res.status(200).json({
      success: true,
      message: 'Payroll record updated successfully',
      data: payroll
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update payroll record',
      error: error.message
    });
  }
};

// Approve payroll
export const approvePayroll = async (req, res) => {
  try {
    const approverId = req.body?.approvedBy || req.user?._id;

    if (!approverId) {
      return res.status(400).json({
        success: false,
        message: 'approvedBy user ID is required'
      });
    }

    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      { approvedBy: approverId },
      { new: true }
    )
      .populate('employeeId', 'fullName email department position baseSalary accountDetails nationalId')
      .populate('approvedBy', 'fullName email');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payroll approved successfully',
      data: payroll
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to approve payroll',
      error: error.message
    });
  }
};

// Mass process payroll for all active employees
export const massProcessPayroll = async (req, res) => {
  try {
    const { fromDate, toDate, currency = 'ETB', type = 'salary' } = req.body;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: 'fromDate and toDate are required'
      });
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);

    // Fetch active employees
    const employees = await Employee.find({
      status: { $ne: 'terminated' }
    });

    if (!employees || employees.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No eligible employees found for payroll processing'
      });
    }

    const createdPayrolls = [];
    const skippedEmployees = [];

    for (const emp of employees) {
      // Check if duplicate exists for this employee and period
      const existing = await Payroll.findOne({
        employeeId: emp._id,
        fromDate: from,
        toDate: to
      });

      if (existing) {
        skippedEmployees.push({
          employeeId: emp._id,
          name: emp.fullName,
          reason: 'Payroll already exists for this period'
        });
        continue;
      }

      const baseSalary = Number(emp.baseSalary) || 15000;
      const pension = Math.round(baseSalary * 0.07);
      const incomeTax = calculateStatutoryTax(baseSalary);

      const earnings = [{ name: 'Base Salary', amount: baseSalary }];
      const deductions = [
        { name: 'Pension Contribution (7%)', amount: pension },
        { name: 'Income Tax (PAYE)', amount: incomeTax }
      ];

      const totalGross = baseSalary;
      const totalDeduction = pension + incomeTax;
      const totalNet = totalGross - totalDeduction;

      const payroll = await Payroll.create({
        employeeId: emp._id,
        fromDate: from,
        toDate: to,
        currency: currency || 'ETB',
        type: type || 'salary',
        earnings,
        deductions,
        totalGross,
        totalDeduction,
        totalNet,
        createdBy: req.user?._id || null,
        status: 'unpaid'
      });

      createdPayrolls.push(payroll);
    }

    res.status(201).json({
      success: true,
      message: `Mass payroll completed: ${createdPayrolls.length} created, ${skippedEmployees.length} skipped.`,
      data: {
        createdCount: createdPayrolls.length,
        skippedCount: skippedEmployees.length,
        skipped: skippedEmployees
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to execute mass payroll',
      error: error.message
    });
  }
};

// Mark payroll as paid
export const markPayrollAsPaid = async (req, res) => {
  try {
    const { status = 'paid', paidAt = new Date() } = req.body;

    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      { status, paidAt },
      { new: true }
    ).populate('employeeId', 'fullName email department position');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Payroll status updated to ${status}`,
      data: payroll
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: error.message
    });
  }
};

// Delete payroll
export const deletePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndDelete(req.params.id);
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payroll record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete payroll record',
      error: error.message
    });
  }
};

