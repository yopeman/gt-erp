/**
 * Ethiopian Personal Income Tax (PIT) computation (Proclamation No. 979/2016)
 * @param {number} taxableIncome Monthly taxable gross income in ETB
 * @returns {number} Income tax amount rounded to 2 decimal places
 */
export const calculateEthiopianIncomeTax = (taxableIncome) => {
  const income = Number(taxableIncome) || 0;
  if (income <= 600) {
    return 0;
  }
  if (income <= 1650) {
    return Number(((income * 0.10) - 60).toFixed(2));
  }
  if (income <= 3200) {
    return Number(((income * 0.15) - 142.50).toFixed(2));
  }
  if (income <= 5250) {
    return Number(((income * 0.20) - 302.50).toFixed(2));
  }
  if (income <= 7800) {
    return Number(((income * 0.25) - 565.00).toFixed(2));
  }
  if (income <= 10900) {
    return Number(((income * 0.30) - 955.00).toFixed(2));
  }
  return Number(((income * 0.35) - 1500.00).toFixed(2));
};

/**
 * Calculate Ethiopian Pension Contributions
 * @param {number} baseSalary Monthly base salary
 * @param {number} empRate Employee pension % (standard: 7)
 * @param {number} orgRate Employer pension % (standard: 11)
 */
export const calculatePension = (baseSalary, empRate = 7, orgRate = 11) => {
  const salary = Number(baseSalary) || 0;
  const employeePension = Number(((salary * empRate) / 100).toFixed(2));
  const employerPension = Number(((salary * orgRate) / 100).toFixed(2));

  return {
    employeePension,
    employerPension,
    totalPension: Number((employeePension + employerPension).toFixed(2))
  };
};

/**
 * Calculate hourly rate based on 30 working days / 8 hours per day standard
 */
export const calculateHourlyRate = (baseSalary, standardHoursPerMonth = 240) => {
  const salary = Number(baseSalary) || 0;
  if (standardHoursPerMonth <= 0) return 0;
  return Number((salary / standardHoursPerMonth).toFixed(2));
};

/**
 * Comprehensive payroll slip generator
 */
export const computePayslip = ({
  baseSalary = 0,
  overtimeHours = 0,
  overtimeRate = 1.5,
  allowances = {},
  deductions = {},
  unpaidLeaveDays = 0,
  dailyHours = 8
}) => {
  const base = Math.max(0, Number(baseSalary) || 0);

  // 1. Calculate Overtime earnings
  const hourlyRate = calculateHourlyRate(base, 30 * dailyHours);
  const overtimeAmount = Number((overtimeHours * hourlyRate * (overtimeRate || 1.5)).toFixed(2));

  // 2. Aggregate Allowances
  const transportAllowance = Number(allowances.transport) || 0;
  const housingAllowance = Number(allowances.housing) || 0;
  const bonusAllowance = Number(allowances.bonus) || 0;
  const otherAllowance = Number(allowances.other) || 0;
  const totalAllowances = Number(
    (transportAllowance + housingAllowance + bonusAllowance + otherAllowance).toFixed(2)
  );

  // 3. Unpaid leave deduction
  const dailyRate = Number((base / 30).toFixed(2));
  const unpaidLeaveDeduction = Number((unpaidLeaveDays * dailyRate).toFixed(2));

  // 4. Gross calculation
  const totalGross = Number((base + overtimeAmount + totalAllowances).toFixed(2));

  // 5. Taxable income: base + overtime + bonus + housing (transport may have exemptions, treat taxable gross)
  const taxableIncome = Math.max(0, totalGross - unpaidLeaveDeduction);
  const incomeTax = calculateEthiopianIncomeTax(taxableIncome);

  // 6. Pension
  const { employeePension, employerPension } = calculatePension(base);

  // 7. Other deductions
  const loanOrAdvance = Number(deductions.loanOrAdvance) || 0;
  const otherDeduction = Number(deductions.other) || 0;

  const totalDeduction = Number(
    (incomeTax + employeePension + unpaidLeaveDeduction + loanOrAdvance + otherDeduction).toFixed(2)
  );

  const totalNet = Number((totalGross - totalDeduction).toFixed(2));

  return {
    baseSalary: base,
    overtimeHours,
    overtimeAmount,
    allowances: {
      transport: transportAllowance,
      housing: housingAllowance,
      bonus: bonusAllowance,
      other: otherAllowance,
      total: totalAllowances
    },
    deductions: {
      incomeTax,
      pensionEmployee: employeePension,
      unpaidLeave: unpaidLeaveDeduction,
      loanOrAdvance,
      other: otherDeduction,
      total: totalDeduction
    },
    employerContributions: {
      pensionEmployer: employerPension
    },
    totalGross,
    totalDeduction,
    totalNet
  };
};

export default {
  calculateEthiopianIncomeTax,
  calculatePension,
  calculateHourlyRate,
  computePayslip
};

