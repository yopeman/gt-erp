import Payroll from '../models/Payroll.js';
import Employee from '../models/Employee.js';
import Overtime from '../models/Overtime.js';
import { computePayslip } from '../utils/payrollCalculator.js';
import { recordApprovalEvent } from '../utils/approvalHelper.js';

// Helper to resolve employee ID
const resolveEmployeeId = async (req) => {
  if (req.body.employeeId && req.user && (req.user.roles?.includes('admin') || req.user.roles?.includes('hr') || req.user.roles?.includes('manager'))) {
    return req.body.employeeId;
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
  if (req.body.employeeId) {
    return req.body.employeeId;
  }
  return null;
};

// Create a single payroll record (Manual or Adjusted)
export const createPayroll = async (req, res) => {
  try {
    const {
      employeeId,
      fromDate,
      toDate,
      month,
      year,
      currency,
      type,
      baseSalary,
      overtimeHours,
      overtimeRate,
      allowances,
      deductions,
      unpaidLeaveDays,
      paymentMethod,
      bankDetails,
      remarks
    } = req.body;

    if (!employeeId || !fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: 'employeeId, fromDate, and toDate are required'
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const effectiveBaseSalary = baseSalary !== undefined ? Number(baseSalary) : (employee.baseSalary || 0);

    // Compute automatic statutory deductions & net
    const computed = computePayslip({
      baseSalary: effectiveBaseSalary,
      overtimeHours: Number(overtimeHours) || 0,
      overtimeRate: Number(overtimeRate) || 1.5,
      allowances: allowances || {},
      deductions: deductions || {},
      unpaidLeaveDays: Number(unpaidLeaveDays) || 0
    });

    const parsedMonth = month || new Date(fromDate).getMonth() + 1;
    const parsedYear = year || new Date(fromDate).getFullYear();
    const payslipReference = `PAY-${parsedYear}-${String(parsedMonth).padStart(2, '0')}-${employee._id.toString().slice(-4).toUpperCase()}`;

    const payroll = await Payroll.create({
      employeeId,
      payslipReference,
      month: parsedMonth,
      year: parsedYear,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      currency: currency || 'ETB',
      type: type || 'salary',
      baseSalary: computed.baseSalary,
      overtimeHours: computed.overtimeHours,
      overtimeAmount: computed.overtimeAmount,
      allowances: computed.allowances,
      deductions: computed.deductions,
      employerContributions: computed.employerContributions,
      totalGross: computed.totalGross,
      totalDeduction: computed.totalDeduction,
      totalNet: computed.totalNet,
      paymentMethod: paymentMethod || 'bank_transfer',
      bankDetails: bankDetails || {
        bankName: employee.accountDetails?.holderName,
        accountNumber: employee.accountDetails?.number,
        holderName: employee.accountDetails?.holderName
      },
      createdBy: req.user?._id || null,
      status: 'unpaid',
      remarks
    });

    const populated = await payroll.populate([
      { path: 'employeeId', select: 'fullName email department position baseSalary accountDetails' },
      { path: 'createdBy', select: 'fullName email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Payroll record created successfully with automatic tax and pension computation',
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

// Automated Monthly Payroll Generation for all active employees
export const generateMonthlyPayroll = async (req, res) => {
  try {
    const { month, year, fromDate, toDate } = req.body;

    const targetMonth = Number(month) || new Date().getMonth() + 1;
    const targetYear = Number(year) || new Date().getFullYear();

    // Default dates to first and last day of target month
    const startPeriod = fromDate ? new Date(fromDate) : new Date(targetYear, targetMonth - 1, 1);
    const endPeriod = toDate ? new Date(toDate) : new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const activeEmployees = await Employee.find({ status: 'active' });
    if (activeEmployees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active employees found to generate payroll'
      });
    }

    const generatedPayrolls = [];
    const skippedPayrolls = [];

    for (const emp of activeEmployees) {
      // Check if payroll already exists for this employee for this month/year
      const existing = await Payroll.findOne({
        employeeId: emp._id,
        month: targetMonth,
        year: targetYear
      });

      if (existing) {
        skippedPayrolls.push({
          employee: emp.fullName,
          reason: 'Payroll already generated for this month'
        });
        continue;
      }

      // Aggregate approved overtime for this employee in this period
      const overtimes = await Overtime.find({
        employee: emp._id,
        startAt: { $gte: startPeriod, $lte: endPeriod },
        status: 'approved'
      });

      const totalApprovedOvertimeHours = overtimes.reduce(
        (sum, o) => sum + (o.approvedHours || o.workedHours || 0),
        0
      );

      // Compute statutory deductions, income tax, pension, and net
      const computed = computePayslip({
        baseSalary: emp.baseSalary || 0,
        overtimeHours: totalApprovedOvertimeHours,
        overtimeRate: 1.5,
        allowances: {},
        deductions: {}
      });

      const payslipReference = `PAY-${targetYear}-${String(targetMonth).padStart(2, '0')}-${emp._id.toString().slice(-4).toUpperCase()}`;

      const payroll = await Payroll.create({
        employeeId: emp._id,
        payslipReference,
        month: targetMonth,
        year: targetYear,
        fromDate: startPeriod,
        toDate: endPeriod,
        currency: 'ETB',
        type: 'salary',
        baseSalary: computed.baseSalary,
        overtimeHours: computed.overtimeHours,
        overtimeAmount: computed.overtimeAmount,
        allowances: computed.allowances,
        deductions: computed.deductions,
        employerContributions: computed.employerContributions,
        totalGross: computed.totalGross,
        totalDeduction: computed.totalDeduction,
        totalNet: computed.totalNet,
        paymentMethod: 'bank_transfer',
        bankDetails: {
          accountNumber: emp.accountDetails?.number || '',
          holderName: emp.accountDetails?.holderName || emp.fullName,
          bankName: emp.branch || 'Commercial Bank of Ethiopia'
        },
        createdBy: req.user?._id || null,
        status: 'unpaid'
      });

      generatedPayrolls.push(payroll);
    }

    res.status(200).json({
      success: true,
      message: `Generated ${generatedPayrolls.length} payslips for ${targetMonth}/${targetYear}`,
      count: generatedPayrolls.length,
      skippedCount: skippedPayrolls.length,
      data: generatedPayrolls,
      skipped: skippedPayrolls
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate monthly payroll',
      error: error.message
    });
  }
};

// Employee Self-Service: Get current employee's payslips
export const getMyPayslips = async (req, res) => {
  try {
    const employeeId = await resolveEmployeeId(req);
    if (!employeeId) {
      return res.status(404).json({
        success: false,
        message: 'No employee profile linked to user'
      });
    }

    const { year, page = 1, limit = 12 } = req.query;
    const query = { employeeId };
    if (year) query.year = Number(year);

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Payroll.countDocuments(query);
    const payrolls = await Payroll.find(query)
      .sort({ year: -1, month: -1 })
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
      message: 'Failed to fetch your payslips',
      error: error.message
    });
  }
};

// Get all payrolls with filters & pagination (HR/Admin)
export const getPayrolls = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      employeeId,
      status,
      type,
      month,
      year,
      fromDate,
      toDate
    } = req.query;

    const query = {};

    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    if (type) query.type = type;
    if (month) query.month = Number(month);
    if (year) query.year = Number(year);

    if (fromDate || toDate) {
      query.fromDate = {};
      if (fromDate) query.fromDate.$gte = new Date(fromDate);
      if (toDate) query.fromDate.$lte = new Date(toDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Payroll.countDocuments(query);
    const payrolls = await Payroll.find(query)
      .populate('employeeId', 'fullName email department position baseSalary accountDetails profileImage')
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
    const payroll = await Payroll.findById(req.params.id)
      .populate('employeeId', 'fullName email department position baseSalary accountDetails profileImage')
      .populate('createdBy', 'fullName email')
      .populate('approvedBy', 'fullName email');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
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
    const updateData = { ...req.body };

    if (updateData.totalGross !== undefined || updateData.totalDeduction !== undefined) {
      const existing = await Payroll.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Payroll record not found'
        });
      }

      const gross = updateData.totalGross !== undefined ? Number(updateData.totalGross) : existing.totalGross;
      const deduction = updateData.totalDeduction !== undefined ? Number(updateData.totalDeduction) : existing.totalDeduction;
      if (updateData.totalNet === undefined) {
        updateData.totalNet = gross - deduction;
      }
    }

    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('employeeId', 'fullName email department position baseSalary accountDetails')
      .populate('approvedBy', 'fullName email');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

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
    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      {
        approvedBy: req.user?._id || req.body.approvedBy,
        remarks: req.body.remarks || 'Approved by HR/Finance'
      },
      { new: true }
    )
      .populate('employeeId', 'fullName email department position baseSalary')
      .populate('approvedBy', 'fullName email');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    // Log in ApprovalHistory
    await recordApprovalEvent({
      referenceType: 'payroll',
      referenceId: payroll._id,
      action: 'approved',
      user: req.user,
      comment: req.body.remarks || `Payroll for ${payroll.month}/${payroll.year} approved`
    });

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

// Mark payroll as paid
export const markPayrollAsPaid = async (req, res) => {
  try {
    const { status = 'paid', paidAt = new Date(), paymentMethod } = req.body;

    const updateFields = {
      status,
      paidAt
    };
    if (paymentMethod) updateFields.paymentMethod = paymentMethod;

    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    ).populate('employeeId', 'fullName email department position');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    // Also update any pending overtimes for this employee in this payroll period to 'paid'
    if (status === 'paid' && payroll.employeeId) {
      await Overtime.updateMany(
        {
          employee: payroll.employeeId._id,
          startAt: { $gte: payroll.fromDate, $lte: payroll.toDate },
          status: 'approved'
        },
        { paymentStatus: 'paid' }
      );
    }

    // Log in ApprovalHistory
    await recordApprovalEvent({
      referenceType: 'payroll',
      referenceId: payroll._id,
      action: 'paid',
      user: req.user,
      comment: `Disbursed ${payroll.totalNet} ${payroll.currency} via ${payroll.paymentMethod}`
    });

    res.status(200).json({
      success: true,
      message: `Payroll marked as ${status}`,
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
