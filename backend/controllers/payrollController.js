import Payroll from '../models/Payroll.js';
import Employee from '../models/Employee.js';
import Overtime from '../models/Overtime.js';
import LeaveRequest from '../models/LeaveRequest.js';

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

// Helper for statutory Ethiopian Tax (Proclamation 979/2016)
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

/**
 * Shared Payroll Calculation Engine
 * Links Employee base salary with:
 * 1. Approved Overtime records (adds Overtime earnings)
 * 2. Approved Leave requests (deducts Unpaid Leave)
 * 3. Ethiopian Statutory Pension (7%) & Progressive Income Tax
 */
export const computePayrollBreakdown = async ({
  employeeId,
  fromDate,
  toDate,
  customEarnings = [],
  customDeductions = []
}) => {
  const from = new Date(fromDate);
  const to = new Date(toDate);

  const employee = await Employee.findById(employeeId);
  if (!employee) throw new Error('Employee not found');

  const baseSalary = Number(employee.baseSalary) || 15000;
  const earnings = [{ name: 'Base Salary', amount: baseSalary }];
  const deductions = [];

  // 1. Link Overtime:
  // Find approved overtimes for this employee in the period that haven't been paid
  const approvedOvertimes = await Overtime.find({
    employee: employeeId,
    status: 'approved',
    paymentStatus: { $ne: 'paid' },
    startAt: { $gte: from, $lte: to }
  });

  let totalOtHours = 0;
  let totalOtAmount = 0;
  // Standard working hours = 208 hrs / month (26 days * 8 hours)
  const hourlyRate = baseSalary / 208;

  for (const ot of approvedOvertimes) {
    const hours = ot.approvedHours > 0 ? ot.approvedHours : ot.workedHours;
    const rate = ot.calculationRate || 1.5;
    const amount = Math.round(hours * hourlyRate * rate);
    totalOtHours += hours;
    totalOtAmount += amount;
  }

  if (totalOtAmount > 0) {
    earnings.push({
      name: `Approved Overtime (${totalOtHours} hrs)`,
      amount: totalOtAmount
    });
  }

  // Include any custom earnings passed (allowances, bonuses, etc.)
  if (Array.isArray(customEarnings) && customEarnings.length > 0) {
    customEarnings.forEach((ce) => {
      if (
        ce.name &&
        ce.name !== 'Base Salary' &&
        !ce.name.startsWith('Approved Overtime') &&
        !earnings.some((e) => e.name === ce.name)
      ) {
        earnings.push({
          name: ce.name,
          amount: Number(ce.amount) || 0
        });
      }
    });
  }

  // 2. Link Leave:
  // Find accepted leave requests overlapping with the period
  const acceptedLeaves = await LeaveRequest.find({
    employee: employeeId,
    decision: 'accepted',
    startDate: { $lte: to },
    endDate: { $gte: from }
  });

  let unpaidLeaveDays = 0;
  let paidLeaveDays = 0;
  const dailyRate = Math.round(baseSalary / 30);

  for (const leave of acceptedLeaves) {
    const leaveStart = new Date(Math.max(new Date(leave.startDate), from));
    const leaveEnd = new Date(Math.min(new Date(leave.endDate), to));
    if (leaveEnd >= leaveStart) {
      const days = Math.ceil((leaveEnd - leaveStart) / (1000 * 60 * 60 * 24)) + 1;
      if (leave.type === 'unpaid') {
        unpaidLeaveDays += days;
      } else {
        paidLeaveDays += days;
      }
    }
  }

  let unpaidLeaveDeduction = 0;
  if (unpaidLeaveDays > 0) {
    unpaidLeaveDeduction = unpaidLeaveDays * dailyRate;
    deductions.push({
      name: `Unpaid Leave Deduction (${unpaidLeaveDays} days)`,
      amount: unpaidLeaveDeduction
    });
  }

  // 3. Statutory Deductions (Pension 7% & Income Tax)
  const pension = Math.round(baseSalary * 0.07);
  deductions.push({
    name: 'Pension Contribution (7%)',
    amount: pension
  });

  // Calculate gross before tax
  const totalGross = earnings.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  // Taxable income = Base Salary + Overtime Pay - Unpaid Leave Deduction
  const taxableIncome = Math.max(0, baseSalary + totalOtAmount - unpaidLeaveDeduction);
  const incomeTax = calculateStatutoryTax(taxableIncome);
  deductions.push({
    name: 'Income Tax (PAYE)',
    amount: incomeTax
  });

  // Include any custom deductions passed (loan repayment, penalty, etc.)
  if (Array.isArray(customDeductions) && customDeductions.length > 0) {
    customDeductions.forEach((cd) => {
      if (
        cd.name &&
        !cd.name.startsWith('Pension Contribution') &&
        !cd.name.startsWith('Income Tax') &&
        !cd.name.startsWith('Unpaid Leave Deduction') &&
        !deductions.some((d) => d.name === cd.name)
      ) {
        deductions.push({
          name: cd.name,
          amount: Number(cd.amount) || 0
        });
      }
    });
  }

  const totalDeduction = deductions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalNet = totalGross - totalDeduction;

  return {
    employee,
    baseSalary,
    earnings,
    deductions,
    totalGross,
    totalDeduction,
    totalNet,
    overtimeRecords: approvedOvertimes.map((o) => o._id),
    leaveRecords: acceptedLeaves.map((l) => l._id),
    summary: {
      totalOtHours,
      totalOtAmount,
      overtimeCount: approvedOvertimes.length,
      unpaidLeaveDays,
      unpaidLeaveDeduction,
      paidLeaveDays,
      leaveCount: acceptedLeaves.length
    }
  };
};

// Preview Payroll Calculation with live leave and overtime breakdown
export const previewPayrollCalculation = async (req, res) => {
  try {
    const { employeeId, fromDate, toDate } = req.query;

    if (!employeeId || !fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: 'employeeId, fromDate, and toDate are required'
      });
    }

    const result = await computePayrollBreakdown({
      employeeId,
      fromDate,
      toDate
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate payroll preview',
      error: error.message
    });
  }
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

    const from = new Date(fromDate);
    const to = new Date(toDate);

    // Identify linked overtime and leave records
    const approvedOvertimes = await Overtime.find({
      employee: employeeId,
      status: 'approved',
      paymentStatus: { $ne: 'paid' },
      startAt: { $gte: from, $lte: to }
    });

    const acceptedLeaves = await LeaveRequest.find({
      employee: employeeId,
      decision: 'accepted',
      startDate: { $lte: to },
      endDate: { $gte: from }
    });

    const overtimeIds = approvedOvertimes.map((o) => o._id);
    const leaveIds = acceptedLeaves.map((l) => l._id);

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
      overtimeRecords: overtimeIds,
      leaveRecords: leaveIds,
      totalGross: calculatedGross,
      totalDeduction: calculatedDeduction,
      totalNet: net,
      createdBy: createdBy || req.user?._id || null,
      status: 'unpaid'
    });

    // Link this payroll to the overtime records
    if (overtimeIds.length > 0) {
      await Overtime.updateMany(
        { _id: { $in: overtimeIds } },
        { payroll: payroll._id }
      );
    }

    const populated = await payroll.populate([
      { path: 'employeeId', select: 'fullName email department position baseSalary accountDetails nationalId' },
      { path: 'overtimeRecords', select: 'workedHours approvedHours calculationRate startAt' },
      { path: 'leaveRecords', select: 'type startDate endDate reason' },
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
      .populate('overtimeRecords', 'workedHours approvedHours calculationRate startAt')
      .populate('leaveRecords', 'type startDate endDate reason')
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
      .populate('overtimeRecords', 'workedHours approvedHours calculationRate startAt reason')
      .populate('leaveRecords', 'type startDate endDate reason')
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
      .populate('overtimeRecords', 'workedHours approvedHours calculationRate startAt')
      .populate('leaveRecords', 'type startDate endDate reason')
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
      .populate('overtimeRecords', 'workedHours approvedHours calculationRate startAt')
      .populate('leaveRecords', 'type startDate endDate reason')
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

// Mass process payroll for all active employees linked with leave and overtime
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

      // Calculate complete breakdown linking Leave and Overtime
      const breakdown = await computePayrollBreakdown({
        employeeId: emp._id,
        fromDate: from,
        toDate: to
      });

      const payroll = await Payroll.create({
        employeeId: emp._id,
        fromDate: from,
        toDate: to,
        currency: currency || 'ETB',
        type: type || 'salary',
        earnings: breakdown.earnings,
        deductions: breakdown.deductions,
        overtimeRecords: breakdown.overtimeRecords,
        leaveRecords: breakdown.leaveRecords,
        totalGross: breakdown.totalGross,
        totalDeduction: breakdown.totalDeduction,
        totalNet: breakdown.totalNet,
        createdBy: req.user?._id || null,
        status: 'unpaid'
      });

      // Link overtime records to this payroll
      if (breakdown.overtimeRecords && breakdown.overtimeRecords.length > 0) {
        await Overtime.updateMany(
          { _id: { $in: breakdown.overtimeRecords } },
          { payroll: payroll._id }
        );
      }

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

// Mark payroll as paid - automatically updates linked overtime records to paid!
export const markPayrollAsPaid = async (req, res) => {
  try {
    const { status = 'paid', paidAt = new Date() } = req.body;

    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    payroll.status = status;
    payroll.paidAt = paidAt;
    await payroll.save();

    // Link and mark associated overtime records as paid
    if (payroll.overtimeRecords && payroll.overtimeRecords.length > 0) {
      await Overtime.updateMany(
        { _id: { $in: payroll.overtimeRecords } },
        { paymentStatus: 'paid', payroll: payroll._id }
      );
    } else {
      await Overtime.updateMany(
        {
          employee: payroll.employeeId,
          status: 'approved',
          paymentStatus: { $ne: 'paid' },
          startAt: { $gte: payroll.fromDate, $lte: payroll.toDate }
        },
        { paymentStatus: 'paid', payroll: payroll._id }
      );
    }

    const populated = await payroll.populate([
      { path: 'employeeId', select: 'fullName email department position' },
      { path: 'overtimeRecords', select: 'workedHours approvedHours calculationRate paymentStatus' },
      { path: 'leaveRecords', select: 'type startDate endDate reason' }
    ]);

    res.status(200).json({
      success: true,
      message: `Payroll status updated to ${status}. Linked overtimes updated to paid.`,
      data: populated
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

    // Unlink overtime records
    await Overtime.updateMany(
      { payroll: req.params.id },
      { $unset: { payroll: 1 }, paymentStatus: 'unpaid' }
    );

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
