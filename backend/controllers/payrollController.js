import Payroll from '../models/Payroll.js';
import Employee from '../models/Employee.js';
import Overtime from '../models/Overtime.js';
import LeaveRequest from '../models/LeaveRequest.js';
import CompanySetting from '../models/CompanySetting.js';
import { computePayslip } from '../utils/payrollCalculator.js';
import { recordApprovalEvent } from '../utils/approvalHelper.js';

/**
 * Helper to resolve logged in employee ID safely
 */
const resolveUserEmployeeId = async (user) => {
  if (!user) return null;
  if (user.employee?._id) {
    return user.employee._id;
  }
  if (user.employee) {
    return user.employee;
  }
  const emp = await Employee.findOne({
    $or: [
      { user: user._id },
      { email: user.email?.toLowerCase() }
    ]
  });
  return emp ? emp._id : null;
};

// Helper to resolve employee ID from request body or user
const resolveEmployeeId = async (req) => {
  if (req.body?.employeeId && req.user && (req.user.roles?.includes('admin') || req.user.roles?.includes('hr') || req.user.roles?.includes('manager'))) {
    return req.body.employeeId;
  }
  if (req.user?.employee?._id) {
    return req.user.employee._id;
  }
  if (req.user?.employee) {
    return req.user.employee;
  }
  if (req.user) {
    const employee = await Employee.findOne({ email: req.user.email?.toLowerCase() });
    if (employee) {
      return employee._id;
    }
  }
  if (req.body?.employeeId) {
    return req.body.employeeId;
  }
  return null;
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

  // Load company settings for statutory rates, working hours, and currency
  const setting = await CompanySetting.findOne().sort({ createdAt: -1 });
  const empPensionPercent = setting?.payrollSettings?.employeePensionPercent ?? 7;
  const employerPensionPercent = setting?.payrollSettings?.employerPensionPercent ?? 11;
  const standardDailyHours = setting?.workSchedule?.standardDailyHours ?? 8;
  const otRateRegular = setting?.payrollSettings?.overtimeRateRegular ?? 1.5;
  const otRateWeekend = setting?.payrollSettings?.overtimeRateWeekend ?? 1.5;
  const otRateHoliday = setting?.payrollSettings?.overtimeRateHoliday ?? 2.0;

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
  // Standard monthly working hours = 26 working days * standard daily hours
  const monthlyWorkingHours = 26 * standardDailyHours;
  const hourlyRate = baseSalary / (monthlyWorkingHours || 208);

  for (const ot of approvedOvertimes) {
    const hours = ot.approvedHours > 0 ? ot.approvedHours : ot.workedHours;
    let rate = ot.calculationRate;
    if (!rate || isNaN(rate)) {
      if (ot.type === 'holiday') rate = otRateHoliday;
      else if (ot.type === 'weekend') rate = otRateWeekend;
      else rate = otRateRegular;
    }
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

  // 3. Statutory Deductions (Pension configured % & Income Tax)
  const pension = Math.round((baseSalary * empPensionPercent) / 100);
  deductions.push({
    name: `Pension Contribution (${empPensionPercent}%)`,
    amount: pension
  });

  const employerPension = Math.round((baseSalary * employerPensionPercent) / 100);

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
    employerContributions: {
      pensionEmployer: employerPension
    },
    overtimeRecords: approvedOvertimes.map((o) => o._id),
    leaveRecords: acceptedLeaves.map((l) => l._id),
    summary: {
      totalOtHours,
      totalOtAmount,
      overtimeCount: approvedOvertimes.length,
      unpaidLeaveDays,
      unpaidLeaveDeduction,
      paidLeaveDays,
      leaveCount: acceptedLeaves.length,
      empPensionPercent,
      employerPensionPercent,
      employerPensionContribution: employerPension
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
      earnings = [],
      deductions = [],
      totalGross,
      totalDeduction,
      totalNet,
      createdBy,
      baseSalary,
      overtimeHours,
      overtimeRate,
      allowances,
      unpaidLeaveDays,
      paymentMethod,
      bankDetails,
      remarks,
      payslipReference: customReference
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

    const effectiveBaseSalary = baseSalary !== undefined ? Number(baseSalary) : (employee.baseSalary || 0);

    const parsedMonth = month || new Date(fromDate).getMonth() + 1;
    const parsedYear = year || new Date(fromDate).getFullYear();
    const payslipReference = customReference || `PAY-${parsedYear}-${String(parsedMonth).padStart(2, '0')}-${employee._id.toString().slice(-4).toUpperCase()}`;

    // Load company settings
    const setting = await CompanySetting.findOne().sort({ createdAt: -1 });
    const empPensionRate = setting?.payrollSettings?.employeePensionPercent ?? 7;
    const orgPensionRate = setting?.payrollSettings?.employerPensionPercent ?? 11;
    const standardDailyHours = setting?.workSchedule?.standardDailyHours ?? 8;
    const defaultOtRate = setting?.payrollSettings?.overtimeRateRegular ?? 1.5;
    const companyCurrency = setting?.currency || 'ETB';

    // Compute automatic statutory deductions & net
    const computed = computePayslip({
      baseSalary: effectiveBaseSalary,
      overtimeHours: overtimeHours !== undefined ? Number(overtimeHours) : approvedOvertimes.reduce((s, o) => s + (o.approvedHours || o.workedHours || 0), 0),
      overtimeRate: Number(overtimeRate) || defaultOtRate,
      allowances: allowances || {},
      deductions: typeof deductions === 'object' && !Array.isArray(deductions) ? deductions : {},
      unpaidLeaveDays: unpaidLeaveDays !== undefined ? Number(unpaidLeaveDays) : 0,
      dailyHours: standardDailyHours,
      employeePensionPercent: empPensionRate,
      employerPensionPercent: orgPensionRate
    });

    const finalGross = totalGross !== undefined
      ? Number(totalGross)
      : (Array.isArray(earnings) && earnings.length > 0
          ? earnings.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
          : computed.totalGross);

    const finalDeduction = totalDeduction !== undefined
      ? Number(totalDeduction)
      : (Array.isArray(deductions) && deductions.length > 0
          ? deductions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
          : computed.totalDeduction);

    const finalNet = totalNet !== undefined
      ? Number(totalNet)
      : (finalGross - finalDeduction);

    const payroll = await Payroll.create({
      employeeId,
      payslipReference,
      month: parsedMonth,
      year: parsedYear,
      fromDate: from,
      toDate: to,
      currency: currency || companyCurrency,
      type: type || 'salary',
      baseSalary: effectiveBaseSalary,
      overtimeHours: computed.overtimeHours,
      overtimeAmount: computed.overtimeAmount,
      allowances: computed.allowances,
      deductions: computed.deductions,
      employerContributions: computed.employerContributions,
      earnings: Array.isArray(earnings) ? earnings : [],
      overtimeRecords: overtimeIds,
      leaveRecords: leaveIds,
      totalGross: finalGross,
      totalDeduction: finalDeduction,
      totalNet: finalNet,
      paymentMethod: paymentMethod || 'bank_transfer',
      bankDetails: bankDetails || {
        bankName: employee.accountDetails?.[0]?.bankName || employee.accountDetails?.bankName || employee.branch || 'Commercial Bank of Ethiopia',
        accountNumber: employee.accountDetails?.[0]?.number || employee.accountDetails?.number || '',
        holderName: employee.accountDetails?.[0]?.holderName || employee.accountDetails?.holderName || employee.fullName
      },
      createdBy: createdBy || req.user?._id || null,
      status: 'unpaid',
      remarks
    });

    // Link this payroll to the overtime records
    if (overtimeIds.length > 0) {
      await Overtime.updateMany(
        { _id: { $in: overtimeIds } },
        { payroll: payroll._id }
      );
    }

    const populated = await payroll.populate([
      { path: 'employeeId', select: 'fullName email department position baseSalary accountDetails profileImage nationalId' },
      { path: 'overtimeRecords', select: 'workedHours approvedHours calculationRate startAt' },
      { path: 'leaveRecords', select: 'type startDate endDate reason' },
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

    // Load company settings
    const setting = await CompanySetting.findOne().sort({ createdAt: -1 });
    const empPensionRate = setting?.payrollSettings?.employeePensionPercent ?? 7;
    const orgPensionRate = setting?.payrollSettings?.employerPensionPercent ?? 11;
    const standardDailyHours = setting?.workSchedule?.standardDailyHours ?? 8;
    const defaultOtRate = setting?.payrollSettings?.overtimeRateRegular ?? 1.5;
    const companyCurrency = setting?.currency || 'ETB';

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

      // Find accepted unpaid leaves for this period
      const acceptedLeaves = await LeaveRequest.find({
        employee: emp._id,
        decision: 'accepted',
        startDate: { $lte: endPeriod },
        endDate: { $gte: startPeriod }
      });

      let unpaidLeaveDays = 0;
      for (const leave of acceptedLeaves) {
        if (leave.type === 'unpaid') {
          const lStart = new Date(Math.max(new Date(leave.startDate), startPeriod));
          const lEnd = new Date(Math.min(new Date(leave.endDate), endPeriod));
          if (lEnd >= lStart) {
            unpaidLeaveDays += Math.ceil((lEnd - lStart) / (1000 * 60 * 60 * 24)) + 1;
          }
        }
      }

      // Compute statutory deductions, income tax, pension, and net
      const computed = computePayslip({
        baseSalary: emp.baseSalary || 0,
        overtimeHours: totalApprovedOvertimeHours,
        overtimeRate: defaultOtRate,
        allowances: {},
        deductions: {},
        unpaidLeaveDays,
        dailyHours: standardDailyHours,
        employeePensionPercent: empPensionRate,
        employerPensionPercent: orgPensionRate
      });

      const payslipReference = `PAY-${targetYear}-${String(targetMonth).padStart(2, '0')}-${emp._id.toString().slice(-4).toUpperCase()}`;

      const overtimeIds = overtimes.map((o) => o._id);
      const leaveIds = acceptedLeaves.map((l) => l._id);

      const payroll = await Payroll.create({
        employeeId: emp._id,
        payslipReference,
        month: targetMonth,
        year: targetYear,
        fromDate: startPeriod,
        toDate: endPeriod,
        currency: companyCurrency,
        type: 'salary',
        baseSalary: computed.baseSalary,
        overtimeHours: computed.overtimeHours,
        overtimeAmount: computed.overtimeAmount,
        allowances: computed.allowances,
        deductions: computed.deductions,
        employerContributions: computed.employerContributions,
        overtimeRecords: overtimeIds,
        leaveRecords: leaveIds,
        totalGross: computed.totalGross,
        totalDeduction: computed.totalDeduction,
        totalNet: computed.totalNet,
        paymentMethod: 'bank_transfer',
        bankDetails: {
          accountNumber: emp.accountDetails?.[0]?.number || emp.accountDetails?.number || '',
          holderName: emp.accountDetails?.[0]?.holderName || emp.accountDetails?.holderName || emp.fullName,
          bankName: emp.branch || 'Commercial Bank of Ethiopia'
        },
        createdBy: req.user?._id || null,
        status: 'unpaid'
      });

      // Link overtime records to this payroll
      if (overtimeIds.length > 0) {
        await Overtime.updateMany(
          { _id: { $in: overtimeIds } },
          { payroll: payroll._id }
        );
      }

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
      .populate('overtimeRecords', 'workedHours approvedHours calculationRate startAt')
      .populate('leaveRecords', 'type startDate endDate reason')
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
      .populate('employeeId', 'fullName email department position baseSalary accountDetails profileImage nationalId')
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
      .populate('employeeId', 'fullName email department position baseSalary accountDetails profileImage nationalId')
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
      .populate('employeeId', 'fullName email department position baseSalary accountDetails profileImage nationalId')
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
    const approverId = req.user?._id || req.body?.approvedBy;
    const remarks = req.body?.remarks || 'Approved by HR/Finance';

    if (!approverId) {
      return res.status(400).json({
        success: false,
        message: 'approvedBy user reference is required'
      });
    }

    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      {
        approvedBy: approverId,
        remarks
      },
      { new: true }
    )
      .populate('employeeId', 'fullName email department position baseSalary accountDetails profileImage nationalId')
      .populate('overtimeRecords', 'workedHours approvedHours calculationRate startAt')
      .populate('leaveRecords', 'type startDate endDate reason')
      .populate('approvedBy', 'fullName email');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    // Log in ApprovalHistory
    try {
      await recordApprovalEvent({
        referenceType: 'payroll',
        referenceId: payroll._id,
        action: 'approved',
        user: req.user,
        comment: remarks || `Payroll for ${payroll.month || ''}/${payroll.year || ''} approved`
      });
    } catch (histErr) {
      console.warn('Approval history logging warning:', histErr.message);
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

      const parsedMonth = from.getMonth() + 1;
      const parsedYear = from.getFullYear();
      const payslipReference = `PAY-${parsedYear}-${String(parsedMonth).padStart(2, '0')}-${emp._id.toString().slice(-4).toUpperCase()}`;

      const payroll = await Payroll.create({
        employeeId: emp._id,
        payslipReference,
        month: parsedMonth,
        year: parsedYear,
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
    const { status = 'paid', paidAt = new Date(), paymentMethod } = req.body;

    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    payroll.status = status;
    payroll.paidAt = paidAt;
    if (paymentMethod) payroll.paymentMethod = paymentMethod;
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
          employee: payroll.employeeId?._id || payroll.employeeId,
          status: 'approved',
          paymentStatus: { $ne: 'paid' },
          startAt: { $gte: payroll.fromDate, $lte: payroll.toDate }
        },
        { paymentStatus: 'paid', payroll: payroll._id }
      );
    }

    // Log in ApprovalHistory
    try {
      await recordApprovalEvent({
        referenceType: 'payroll',
        referenceId: payroll._id,
        action: 'paid',
        user: req.user,
        comment: `Disbursed ${payroll.totalNet} ${payroll.currency} via ${payroll.paymentMethod || 'standard'}`
      });
    } catch (histErr) {
      console.warn('Approval history logging warning:', histErr.message);
    }

    const populated = await payroll.populate([
      { path: 'employeeId', select: 'fullName email department position baseSalary accountDetails profileImage nationalId' },
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
