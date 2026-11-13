import PurchaseOrder from '../models/PurchaseOrder.js';
import GoodsReceipt from '../models/GoodsReceipt.js';
import StockRequest from '../models/StockRequest.js';
import StaffReturn from '../models/StaffReturn.js';
import StockMovement from '../models/StockMovement.js';
import StockAdjustment from '../models/StockAdjustment.js';
import StockBalance from '../models/StockBalance.js';
import InventoryItem from '../models/InventoryItem.js';
import Supplier from '../models/Supplier.js';
import Warehouse from '../models/Warehouse.js';

// HR Models
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Overtime from '../models/Overtime.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Payroll from '../models/Payroll.js';

// CRM Models
import Lead from '../models/Lead.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Invoice from '../models/Invoice.js';
import CustomerPayment from '../models/CustomerPayment.js';
import Service from '../models/Service.js';

// Production Models
import ProductionJob from '../models/ProductionJob.js';
import Machine from '../models/Machine.js';
import MachineMaintenance from '../models/MachineMaintenance.js';
import MachineCheckup from '../models/MachineCheckup.js';
import ProductionWastage from '../models/ProductionWastage.js';

// Finance Models
import Account from '../models/Account.js';
import JournalEntry from '../models/JournalEntry.js';
import BankAccount from '../models/BankAccount.js';
import SupplierBill from '../models/SupplierBill.js';
import ExpenseVoucher from '../models/ExpenseVoucher.js';
import TaxPeriodRecord from '../models/TaxPeriodRecord.js';

import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * Helper to compute date range from timeframe parameter
 */
const parseDateRange = (timeframe, customStart, customEnd) => {
  const now = new Date();
  let start = new Date();
  let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (timeframe) {
    case 'daily':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;

    case 'weekly':
      // Last 7 days
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      break;

    case 'monthly':
      // Start of current month
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;

    case 'yearly':
      // Start of current year
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;

    case 'custom':
      if (customStart) {
        start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
      } else {
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      if (customEnd) {
        end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
      }
      break;

    default:
      // Default to monthly
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }

  return { start, end };
};

/**
 * Get Comprehensive Operations & Financial Report
 * Dedicated multi-actor analytics with Daily / Weekly / Monthly / Yearly / Custom filtering
 */
export const getComprehensiveReport = async (req, res) => {
  try {
    const {
      timeframe = 'monthly',
      startDate,
      endDate,
      actor = 'all', // 'all' | 'storekeeper' | 'purchaser' | 'employee' | 'manager'
      warehouse,
      department,
      vatStatus // 'all' | 'with_vat' | 'without_vat'
    } = req.query;

    const { start, end } = parseDateRange(timeframe, startDate, endDate);

    const userRoles = req.user?.roles || [];
    const isPureEmployee =
      userRoles.includes('employee') &&
      !userRoles.some((r) => ['admin', 'manager', 'storekeeper', 'purchaser', 'finance'].includes(r));

    // Common Date Filter
    const dateQuery = { $gte: start, $lte: end };

    // ==========================================
    // 1. PURCHASING & PROCUREMENT AGGREGATION
    // ==========================================
    const poQuery = {
      orderDate: dateQuery,
      status: { $nin: ['cancelled', 'rejected'] }
    };
    if (warehouse) poQuery.warehouse = warehouse;
    if (vatStatus === 'with_vat') poQuery.taxAmount = { $gt: 0 };
    if (vatStatus === 'without_vat') poQuery.taxAmount = { $lte: 0 };

    const purchaseOrders = await PurchaseOrder.find(poQuery)
      .populate('supplier', 'supplierName supplierCode')
      .populate('warehouse', 'warehouseName warehouseCode')
      .populate('items.item', 'itemName itemCode')
      .sort({ orderDate: -1 })
      .lean();

    let totalSpend = 0;
    let totalVatAmount = 0;
    let withVatCount = 0;
    let withVatSpend = 0;
    let withoutVatCount = 0;
    let withoutVatSpend = 0;
    let totalCreditSpend = 0;
    let totalCashSpend = 0;
    const spendBySupplierMap = {};

    purchaseOrders.forEach((po) => {
      const gTotal = Number(po.grandTotal || 0);
      const tax = Number(po.taxAmount || 0);

      totalSpend += gTotal;
      totalVatAmount += tax;

      if (tax > 0) {
        withVatCount++;
        withVatSpend += gTotal;
      } else {
        withoutVatCount++;
        withoutVatSpend += gTotal;
      }

      if (po.paymentType === 'credit') {
        totalCreditSpend += gTotal;
      } else {
        totalCashSpend += gTotal;
      }

      const suppName = po.supplier?.supplierName || 'Unknown Supplier';
      spendBySupplierMap[suppName] = (spendBySupplierMap[suppName] || 0) + gTotal;
    });

    const spendBySupplier = Object.entries(spendBySupplierMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    // ==========================================
    // 2. GOODS RECEIPTS (INWARD GRN) AGGREGATION
    // ==========================================
    const grQuery = { receiptDate: dateQuery };
    if (warehouse) grQuery.warehouse = warehouse;

    const goodsReceipts = await GoodsReceipt.find(grQuery)
      .populate('supplier', 'supplierName')
      .populate('warehouse', 'warehouseName')
      .populate('items.item', 'itemName itemCode')
      .lean();

    let totalGrnCount = goodsReceipts.length;
    let totalAcceptedItemsQty = 0;
    let totalDamagedItemsQty = 0;

    goodsReceipts.forEach((gr) => {
      (gr.items || []).forEach((itm) => {
        totalAcceptedItemsQty += Number(itm.acceptedQuantity || itm.receivedQuantity || 0);
        totalDamagedItemsQty += Number(itm.damagedQuantity || 0);
      });
    });

    // ==========================================
    // 3. MATERIAL REQUISITIONS (OUTWARD SIV)
    // ==========================================
    const reqQuery = { createdAt: dateQuery };
    if (warehouse) reqQuery.warehouse = warehouse;
    if (department) reqQuery.department = department;

    if (isPureEmployee) {
      const empId = req.user?.employee?._id || req.user?.employee;
      reqQuery.$or = [
        { requestedBy: req.user._id },
        ...(empId ? [{ requestedBy: empId }] : [])
      ];
    }

    const stockRequests = await StockRequest.find(reqQuery)
      .populate('warehouse', 'warehouseName warehouseCode')
      .populate('items.item', 'itemName itemCode')
      .populate('requestedBy', 'fullName email department')
      .sort({ createdAt: -1 })
      .lean();

    let totalRequestsCount = stockRequests.length;
    let approvedRequestsCount = 0;
    let completedRequestsCount = 0;
    let pendingRequestsCount = 0;
    let totalIssuedItemsQty = 0;
    const consumptionByDeptMap = {};
    const consumptionByItemMap = {};

    stockRequests.forEach((reqItem) => {
      if (reqItem.status === 'completed') completedRequestsCount++;
      else if (reqItem.status === 'approved' || reqItem.status === 'partially issued') approvedRequestsCount++;
      else if (reqItem.status === 'pending') pendingRequestsCount++;

      const dept = reqItem.department || 'General';
      (reqItem.items || []).forEach((i) => {
        const issuedQty = Number(i.issuedQuantity || (reqItem.status === 'completed' ? i.approvedQuantity : 0));
        totalIssuedItemsQty += issuedQty;
        consumptionByDeptMap[dept] = (consumptionByDeptMap[dept] || 0) + issuedQty;

        const itName = i.item?.itemName || 'Material';
        consumptionByItemMap[itName] = (consumptionByItemMap[itName] || 0) + issuedQty;
      });
    });

    const consumptionByDept = Object.entries(consumptionByDeptMap)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity);

    const topConsumedItems = Object.entries(consumptionByItemMap)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);

    // ==========================================
    // 4. STAFF MATERIAL RETURNS (SRV)
    // ==========================================
    const staffReturnQuery = { createdAt: dateQuery };
    if (warehouse) staffReturnQuery.warehouse = warehouse;
    if (department) staffReturnQuery.department = department;

    if (isPureEmployee) {
      const empId = req.user?.employee?._id || req.user?.employee;
      staffReturnQuery.$or = [
        { returnedBy: req.user._id },
        ...(empId ? [{ returnedBy: empId }] : [])
      ];
    }

    const staffReturns = await StaffReturn.find(staffReturnQuery)
      .populate('warehouse', 'warehouseName')
      .populate('items.item', 'itemName itemCode')
      .populate('returnedBy', 'fullName department')
      .populate('originalStockRequest', 'requestNumber')
      .sort({ createdAt: -1 })
      .lean();

    let totalReturnsCount = staffReturns.length;
    let restockedReturnsCount = 0;
    let goodReturnedQty = 0;
    let damagedReturnedQty = 0;
    let scrapReturnedQty = 0;

    staffReturns.forEach((ret) => {
      if (ret.status === 'received') restockedReturnsCount++;
      (ret.items || []).forEach((itm) => {
        const q = Number(itm.acceptedQuantity || itm.quantity || 0);
        if (itm.condition === 'good') goodReturnedQty += q;
        else if (itm.condition === 'damaged') damagedReturnedQty += q;
        else if (itm.condition === 'scrap') scrapReturnedQty += q;
      });
    });

    // ==========================================
    // 5. STOCK MOVEMENTS LEDGER SUMMARY
    // ==========================================
    const movementQuery = { movementDate: dateQuery };
    if (warehouse) movementQuery.warehouse = warehouse;

    const movements = await StockMovement.find(movementQuery)
      .populate('item', 'itemName itemCode')
      .populate('warehouse', 'warehouseName')
      .sort({ movementDate: -1 })
      .limit(200)
      .lean();

    const movementsByType = {
      purchaseReceipt: 0,
      stockIssue: 0,
      stockReturn: 0,
      transfer: 0,
      adjustment: 0,
      damaged: 0
    };

    movements.forEach((m) => {
      switch (m.movementType) {
        case 'purchase receipt':
          movementsByType.purchaseReceipt++;
          break;
        case 'stock issue':
          movementsByType.stockIssue++;
          break;
        case 'return':
          movementsByType.stockReturn++;
          break;
        case 'stock transfer in':
        case 'stock transfer out':
          movementsByType.transfer++;
          break;
        case 'adjustment':
          movementsByType.adjustment++;
          break;
        case 'damaged':
          movementsByType.damaged++;
          break;
      }
    });

    // ==========================================
    // 6. INVENTORY VALUATION & AUDIT STATUS
    // ==========================================
    const balances = await StockBalance.find(warehouse ? { warehouse } : {})
      .populate('item', 'unitCost itemName itemCode minStockLevel')
      .populate('warehouse', 'warehouseName')
      .lean();

    let totalValuation = 0;
    let lowStockCount = 0;

    balances.forEach((b) => {
      const q = Number(b.quantityOnHand || 0);
      const cost = Number(b.item?.unitCost || 0);
      totalValuation += q * cost;
      if (b.item?.minStockLevel && q <= b.item.minStockLevel) {
        lowStockCount++;
      }
    });

    // Construct unified activity log for data grid & export
    const unifiedLog = [];

    // Add Purchase Orders to log
    purchaseOrders.slice(0, 100).forEach((po) => {
      unifiedLog.push({
        id: po._id,
        date: po.orderDate || po.createdAt,
        type: 'Purchase Order',
        referenceNumber: po.purchaseOrderNumber,
        actor: po.supplier?.supplierName || 'Supplier',
        department: 'Purchasing',
        warehouse: po.warehouse?.warehouseName || 'Warehouse',
        status: po.status,
        amount: po.grandTotal,
        vatStatus: po.taxAmount > 0 ? `With VAT (${po.taxAmount.toLocaleString()} ETB)` : 'Without VAT (0%)',
        details: `${po.items?.length || 0} line item(s)`
      });
    });

    // Add Material Requests to log
    stockRequests.slice(0, 100).forEach((sr) => {
      unifiedLog.push({
        id: sr._id,
        date: sr.createdAt,
        type: 'Material Requisition (SIV)',
        referenceNumber: sr.requestNumber,
        actor: sr.requestedBy?.fullName || 'Employee',
        department: sr.department,
        warehouse: sr.warehouse?.warehouseName || 'Warehouse',
        status: sr.status,
        amount: null,
        vatStatus: 'N/A',
        details: sr.purpose || `${sr.items?.length || 0} item(s)`
      });
    });

    // Add Staff Returns to log
    staffReturns.slice(0, 100).forEach((ret) => {
      unifiedLog.push({
        id: ret._id,
        date: ret.createdAt,
        type: 'Staff Material Return (SRV)',
        referenceNumber: ret.returnNumber,
        actor: ret.returnedBy?.fullName || 'Staff Member',
        department: ret.department,
        warehouse: ret.warehouse?.warehouseName || 'Warehouse',
        status: ret.status,
        amount: null,
        vatStatus: 'N/A',
        details: ret.reason || `${ret.items?.length || 0} returned item(s)`
      });
    });

    // Sort unified log descending by date
    unifiedLog.sort((a, b) => new Date(b.date) - new Date(a.date));

    return sendSuccess(res, 'Comprehensive operational report generated successfully', {
      timeframe,
      range: {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      },
      actorScope: actor,
      summary: {
        totalSpend,
        totalVatAmount,
        totalPOs: purchaseOrders.length,
        withVatCount,
        withVatSpend,
        withoutVatCount,
        withoutVatSpend,
        totalCreditSpend,
        totalCashSpend,
        totalGrnCount,
        totalAcceptedItemsQty,
        totalDamagedItemsQty,
        totalRequestsCount,
        approvedRequestsCount,
        completedRequestsCount,
        pendingRequestsCount,
        totalIssuedItemsQty,
        totalReturnsCount,
        restockedReturnsCount,
        goodReturnedQty,
        damagedReturnedQty,
        scrapReturnedQty,
        totalValuation,
        lowStockCount,
        movementsCount: movements.length
      },
      analytics: {
        spendBySupplier,
        consumptionByDept,
        topConsumedItems,
        movementsByType
      },
      unifiedLog
    });
  } catch (error) {
    console.error('Failed to generate comprehensive report:', error);
    return sendError(res, 'Failed to generate operational report', 500, error);
  }
};

/**
 * =============================================================
 * 2. HR & WORKFORCE ANALYTICS REPORT
 * =============================================================
 */
export const getHrReport = async (req, res) => {
  try {
    const { timeframe = 'monthly', startDate, endDate, department } = req.query;
    const { start, end } = parseDateRange(timeframe, startDate, endDate);
    const dateQuery = { $gte: start, $lte: end };

    // Employees breakdown
    const empFilter = {};
    if (department && department !== 'all') empFilter.department = department;
    const allEmployees = await Employee.find(empFilter)
      .select('fullName employeeId department position employmentStatus basicSalary joinedDate')
      .lean();

    const totalHeadcount = allEmployees.length;
    const byDepartmentMap = {};
    const byStatusMap = {};
    let totalBaseSalary = 0;

    allEmployees.forEach((emp) => {
      const dept = emp.department || 'Unassigned';
      byDepartmentMap[dept] = (byDepartmentMap[dept] || 0) + 1;
      const st = emp.employmentStatus || 'active';
      byStatusMap[st] = (byStatusMap[st] || 0) + 1;
      totalBaseSalary += Number(emp.basicSalary || 0);
    });

    const headcountByDept = Object.entries(byDepartmentMap).map(([name, count]) => ({ name, count }));

    // Attendance stats
    const attFilter = { date: dateQuery };
    const attendances = await Attendance.find(attFilter)
      .populate('employee', 'fullName department')
      .lean();

    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let onLeaveCount = 0;
    let totalLateMinutes = 0;

    attendances.forEach((att) => {
      if (att.status === 'present') presentCount++;
      else if (att.status === 'late') {
        lateCount++;
        totalLateMinutes += Number(att.lateMinutes || 0);
      } else if (att.status === 'absent') absentCount++;
      else if (att.status === 'on_leave') onLeaveCount++;
    });

    const totalAttendanceRecords = attendances.length;
    const attendanceRate = totalAttendanceRecords > 0
      ? Number(((presentCount + lateCount) / totalAttendanceRecords * 100).toFixed(1))
      : 100;

    // Overtime stats
    const otFilter = { startAt: dateQuery };
    const overtimes = await Overtime.find(otFilter)
      .populate('employee', 'fullName department basicSalary')
      .lean();

    let totalWorkedOtHours = 0;
    let totalApprovedOtHours = 0;
    let totalOtCost = 0;
    const otByDeptMap = {};

    overtimes.forEach((ot) => {
      const wh = Number(ot.workedHours || 0);
      const ah = Number(ot.approvedHours || 0);
      totalWorkedOtHours += wh;
      totalApprovedOtHours += ah;

      const rate = Number(ot.calculationRate || 1.5);
      const baseSalary = Number(ot.employee?.basicSalary || 8000);
      const hourlyRate = baseSalary / 160;
      const cost = ah * rate * hourlyRate;
      totalOtCost += cost;

      const dept = ot.employee?.department || 'General';
      otByDeptMap[dept] = (otByDeptMap[dept] || 0) + ah;
    });

    const otByDept = Object.entries(otByDeptMap).map(([name, hours]) => ({ name, hours }));

    // Leave stats
    const leaveFilter = { startDate: dateQuery };
    const leaves = await LeaveRequest.find(leaveFilter)
      .populate('employee', 'fullName department')
      .lean();

    let approvedLeavesCount = 0;
    let pendingLeavesCount = 0;
    let rejectedLeavesCount = 0;
    let totalLeaveDays = 0;
    const leaveByTypeMap = {};

    leaves.forEach((l) => {
      if (l.status === 'approved') {
        approvedLeavesCount++;
        totalLeaveDays += Number(l.numberOfDays || 1);
      } else if (l.status === 'pending') pendingLeavesCount++;
      else if (l.status === 'rejected') rejectedLeavesCount++;

      const lType = l.type || 'annual';
      leaveByTypeMap[lType] = (leaveByTypeMap[lType] || 0) + (Number(l.numberOfDays) || 1);
    });

    const leaveByType = Object.entries(leaveByTypeMap).map(([name, days]) => ({ name, days }));

    // Payroll summary
    const payrollFilter = { createdAt: dateQuery };
    const payrolls = await Payroll.find(payrollFilter).lean();

    let totalGrossPayroll = 0;
    let totalNetPayroll = 0;
    let totalPayrollTax = 0;
    let totalPayrollPension = 0;

    payrolls.forEach((p) => {
      totalGrossPayroll += Number(p.grossSalary || 0);
      totalNetPayroll += Number(p.netSalary || 0);
      totalPayrollTax += Number(p.tax || 0);
      totalPayrollPension += Number(p.pension || 0);
    });

    // Unified HR activity log for table
    const unifiedLog = [];
    attendances.slice(0, 40).forEach((att) => {
      unifiedLog.push({
        id: att._id,
        date: att.date,
        type: 'Attendance',
        referenceNumber: att.employee?.fullName || 'Employee',
        department: att.employee?.department || 'General',
        details: att.status === 'late' ? `Late arrival (${att.lateMinutes || 0} min)` : `Status: ${att.status}`,
        metric: att.status,
        status: att.status
      });
    });

    overtimes.slice(0, 40).forEach((ot) => {
      unifiedLog.push({
        id: ot._id,
        date: ot.startAt,
        type: 'Overtime',
        referenceNumber: ot.employee?.fullName || 'Employee',
        department: ot.employee?.department || 'General',
        details: `${ot.reason || 'Overtime'} (${ot.type || 'calendar'})`,
        metric: `${ot.approvedHours || ot.workedHours} hrs`,
        status: ot.status || 'approved'
      });
    });

    leaves.slice(0, 40).forEach((l) => {
      unifiedLog.push({
        id: l._id,
        date: l.startDate,
        type: 'Leave Request',
        referenceNumber: l.employee?.fullName || 'Employee',
        department: l.employee?.department || 'General',
        details: `${l.type} leave (${l.reason || 'N/A'})`,
        metric: `${l.numberOfDays} days`,
        status: l.status
      });
    });

    unifiedLog.sort((a, b) => new Date(b.date) - new Date(a.date));

    return sendSuccess(res, 'HR operational report generated', {
      timeframe,
      range: { startDate: start.toISOString(), endDate: end.toISOString() },
      summary: {
        totalHeadcount,
        activeHeadcount: byStatusMap.active || totalHeadcount,
        attendanceRate,
        presentCount,
        lateCount,
        absentCount,
        totalLateMinutes,
        totalApprovedOtHours,
        totalWorkedOtHours,
        totalOtCost,
        approvedLeavesCount,
        pendingLeavesCount,
        totalLeaveDays,
        totalGrossPayroll,
        totalNetPayroll,
        totalPayrollTax
      },
      analytics: {
        headcountByDept,
        byStatusMap,
        otByDept,
        leaveByType
      },
      unifiedLog
    });
  } catch (error) {
    console.error('Failed to generate HR report:', error);
    return sendError(res, 'Failed to generate HR report', 500, error);
  }
};

/**
 * =============================================================
 * 3. CRM & SALES PERFORMANCE REPORT
 * =============================================================
 */
export const getCrmReport = async (req, res) => {
  try {
    const { timeframe = 'monthly', startDate, endDate, status } = req.query;
    const { start, end } = parseDateRange(timeframe, startDate, endDate);
    const dateQuery = { $gte: start, $lte: end };

    // 1. Leads
    const leadFilter = { createdAt: dateQuery };
    if (status && status !== 'all') leadFilter.status = status;
    const leads = await Lead.find(leadFilter).lean();

    const totalLeads = leads.length;
    const leadsByStatusMap = {};
    let convertedLeadsCount = 0;

    leads.forEach((ld) => {
      const st = ld.status || 'new';
      leadsByStatusMap[st] = (leadsByStatusMap[st] || 0) + 1;
      if (st === 'converted') convertedLeadsCount++;
    });

    const conversionRate = totalLeads > 0
      ? Number(((convertedLeadsCount / totalLeads) * 100).toFixed(1))
      : 0;

    const leadsByStatus = Object.entries(leadsByStatusMap).map(([name, count]) => ({ name, count }));

    // 2. Printing Orders
    const orderFilter = { orderDate: dateQuery };
    const orders = await Order.find(orderFilter)
      .populate('customer', 'companyName contactPerson')
      .populate('items.service', 'name category')
      .sort({ orderDate: -1 })
      .lean();

    let totalOrdersCount = orders.length;
    let totalSalesRevenue = 0;
    let totalEstimatedCost = 0;
    let completedOrdersCount = 0;
    let inProductionOrdersCount = 0;
    let pendingOrdersCount = 0;
    const ordersByStatusMap = {};
    const revenueByServiceMap = {};
    const spendByCustomerMap = {};

    orders.forEach((ord) => {
      const gTotal = Number(ord.financials?.grandTotal || ord.totalAmount || 0);
      const estCost = Number(ord.financials?.estimatedCost?.totalEstimatedCost || 0);
      totalSalesRevenue += gTotal;
      totalEstimatedCost += estCost;

      const st = ord.orderStatus || 'pending';
      ordersByStatusMap[st] = (ordersByStatusMap[st] || 0) + 1;
      if (st === 'completed' || st === 'delivered') completedOrdersCount++;
      else if (st === 'in_production') inProductionOrdersCount++;
      else if (st === 'pending' || st === 'confirmed') pendingOrdersCount++;

      const custName = ord.customer?.companyName || ord.customer?.contactPerson || 'Unknown Client';
      spendByCustomerMap[custName] = (spendByCustomerMap[custName] || 0) + gTotal;

      (ord.items || []).forEach((item) => {
        const sName = item.service?.name || item.customServiceName || 'Print Service';
        const itemTotal = Number(item.totalPrice || (item.quantity * item.unitPrice) || 0);
        revenueByServiceMap[sName] = (revenueByServiceMap[sName] || 0) + itemTotal;
      });
    });

    const ordersByStatus = Object.entries(ordersByStatusMap).map(([name, count]) => ({ name, count }));
    const revenueByService = Object.entries(revenueByServiceMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    const topCustomers = Object.entries(spendByCustomerMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    // 3. Invoices & Receivables
    const invoiceFilter = { issueDate: dateQuery };
    const invoices = await Invoice.find(invoiceFilter)
      .populate('customer', 'companyName contactPerson')
      .lean();

    let totalInvoicedAmount = 0;
    let totalPaidInvoicesAmount = 0;
    let totalUnpaidReceivables = 0;

    invoices.forEach((inv) => {
      const invTotal = Number(inv.grandTotal || 0);
      const invPaid = Number(inv.paidAmount || 0);
      totalInvoicedAmount += invTotal;
      totalPaidInvoicesAmount += invPaid;
      totalUnpaidReceivables += Math.max(0, invTotal - invPaid);
    });

    // Unified CRM Log
    const unifiedLog = [];
    orders.slice(0, 50).forEach((ord) => {
      unifiedLog.push({
        id: ord._id,
        date: ord.orderDate || ord.createdAt,
        type: 'Sales Order',
        referenceNumber: ord.orderNumber,
        actor: ord.customer?.companyName || ord.customer?.contactPerson || 'Customer',
        department: 'Sales & CRM',
        details: `${ord.items?.length || 1} line item(s) - ${ord.paymentStatus || 'unpaid'}`,
        amount: ord.financials?.grandTotal || ord.totalAmount,
        status: ord.orderStatus
      });
    });

    leads.slice(0, 30).forEach((ld) => {
      unifiedLog.push({
        id: ld._id,
        date: ld.createdAt,
        type: 'Lead Prospect',
        referenceNumber: ld.leadNumber,
        actor: ld.companyName || ld.contactPerson || 'Prospect',
        department: 'Business Dev',
        details: `${ld.interestLevel || 'medium'} interest - ${ld.source || 'Direct'}`,
        amount: ld.estimatedValue || 0,
        status: ld.status
      });
    });

    invoices.slice(0, 30).forEach((inv) => {
      unifiedLog.push({
        id: inv._id,
        date: inv.issueDate || inv.createdAt,
        type: 'Tax Invoice',
        referenceNumber: inv.invoiceNumber,
        actor: inv.customer?.companyName || 'Client',
        department: 'Finance & Billing',
        details: `Due: ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'Immediate'}`,
        amount: inv.grandTotal,
        status: inv.paymentStatus
      });
    });

    unifiedLog.sort((a, b) => new Date(b.date) - new Date(a.date));

    return sendSuccess(res, 'CRM and sales report generated', {
      timeframe,
      range: { startDate: start.toISOString(), endDate: end.toISOString() },
      summary: {
        totalLeads,
        convertedLeadsCount,
        conversionRate,
        totalOrdersCount,
        completedOrdersCount,
        inProductionOrdersCount,
        pendingOrdersCount,
        totalSalesRevenue,
        totalEstimatedCost,
        estimatedProfitMargin: totalSalesRevenue > 0
          ? Number((((totalSalesRevenue - totalEstimatedCost) / totalSalesRevenue) * 100).toFixed(1))
          : 0,
        totalInvoicedAmount,
        totalPaidInvoicesAmount,
        totalUnpaidReceivables
      },
      analytics: {
        leadsByStatus,
        ordersByStatus,
        revenueByService,
        topCustomers
      },
      unifiedLog
    });
  } catch (error) {
    console.error('Failed to generate CRM report:', error);
    return sendError(res, 'Failed to generate CRM report', 500, error);
  }
};

/**
 * =============================================================
 * 4. PRODUCTION & MACHINE OPERATIONS REPORT
 * =============================================================
 */
export const getProductionReport = async (req, res) => {
  try {
    const { timeframe = 'monthly', startDate, endDate, machine } = req.query;
    const { start, end } = parseDateRange(timeframe, startDate, endDate);
    const dateQuery = { $gte: start, $lte: end };

    // 1. Production Jobs
    const jobFilter = { createdAt: dateQuery };
    const jobs = await ProductionJob.find(jobFilter)
      .populate('order', 'orderNumber priority')
      .populate('stages.machine', 'name machineCode')
      .sort({ createdAt: -1 })
      .lean();

    let totalJobsCount = jobs.length;
    let completedJobsCount = 0;
    let inProgressJobsCount = 0;
    let onHoldJobsCount = 0;
    let totalPlannedQuantity = 0;
    let totalCompletedQuantity = 0;
    const jobsByStatusMap = {};
    const jobsByStageMap = {};

    jobs.forEach((job) => {
      const st = job.status || 'scheduled';
      jobsByStatusMap[st] = (jobsByStatusMap[st] || 0) + 1;
      if (st === 'completed') completedJobsCount++;
      else if (st === 'in_progress') inProgressJobsCount++;
      else if (st === 'on_hold') onHoldJobsCount++;

      totalPlannedQuantity += Number(job.plannedQuantity || 0);
      totalCompletedQuantity += Number(job.completedQuantity || 0);

      const activeStage = (job.stages || []).find((s) => s.status === 'in_progress') || job.stages?.[0];
      const stageName = activeStage?.stageName || 'General Production';
      jobsByStageMap[stageName] = (jobsByStageMap[stageName] || 0) + 1;
    });

    const jobsByStatus = Object.entries(jobsByStatusMap).map(([name, count]) => ({ name, count }));
    const jobsByStage = Object.entries(jobsByStageMap).map(([name, count]) => ({ name, count }));

    // 2. Machines Fleet Status
    const machines = await Machine.find().lean();
    const totalMachines = machines.length;
    const machineStatusMap = { running: 0, idle: 0, maintenance: 0, breakdown: 0 };

    machines.forEach((m) => {
      const st = m.status || 'idle';
      if (machineStatusMap[st] !== undefined) machineStatusMap[st]++;
      else machineStatusMap.idle++;
    });

    const machineUptimePercent = totalMachines > 0
      ? Number((((machineStatusMap.running + machineStatusMap.idle) / totalMachines) * 100).toFixed(1))
      : 100;

    // 3. Machine Maintenance & Checkups
    const maintFilter = { createdAt: dateQuery };
    if (machine) maintFilter.machine = machine;
    const maintenances = await MachineMaintenance.find(maintFilter)
      .populate('machine', 'name machineCode')
      .lean();

    let totalMaintenanceTickets = maintenances.length;
    let activeMaintenanceCount = 0;
    let totalMaintenanceCost = 0;

    maintenances.forEach((m) => {
      if (m.status !== 'completed' && m.status !== 'cancelled') activeMaintenanceCount++;
      totalMaintenanceCost += Number(m.cost || 0);
    });

    // 4. Production Spoilage & Wastage
    const wasteFilter = { createdAt: dateQuery };
    const wastages = await ProductionWastage.find(wasteFilter)
      .populate('job', 'jobNumber')
      .populate('machine', 'name machineCode')
      .populate('items.materialItem', 'itemName itemCode')
      .lean();

    let totalWastageRecords = wastages.length;
    let totalWastedQuantity = 0;
    let totalWastageCost = 0;
    const wastageByReasonMap = {};
    const wastageByStageMap = {};

    wastages.forEach((w) => {
      const wStage = w.stage || 'production';
      wastageByStageMap[wStage] = (wastageByStageMap[wStage] || 0) + 1;

      (w.items || []).forEach((itm) => {
        const qty = Number(itm.quantity || 0);
        const cost = Number(itm.totalCost || (qty * (itm.unitCost || 0)) || 0);
        totalWastedQuantity += qty;
        totalWastageCost += cost;

        const reason = itm.reason || 'General Spoilage';
        wastageByReasonMap[reason] = (wastageByReasonMap[reason] || 0) + cost;
      });
    });

    const wastageByReason = Object.entries(wastageByReasonMap)
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost);

    const wastageByStage = Object.entries(wastageByStageMap).map(([name, count]) => ({ name, count }));

    // Unified Production Log
    const unifiedLog = [];
    jobs.slice(0, 40).forEach((j) => {
      unifiedLog.push({
        id: j._id,
        date: j.createdAt,
        type: 'Production Job',
        referenceNumber: j.jobNumber,
        machineOrEntity: j.stages?.[0]?.machine?.name || 'Production Line',
        stageOrDetails: `${j.stages?.length || 1} stage(s) • Target: ${j.plannedQuantity || 0}`,
        quantity: j.completedQuantity || 0,
        cost: 0,
        status: j.status
      });
    });

    wastages.slice(0, 40).forEach((w) => {
      const itmCount = w.items?.length || 1;
      const totalCost = (w.items || []).reduce((acc, curr) => acc + (Number(curr.totalCost) || 0), 0);
      unifiedLog.push({
        id: w._id,
        date: w.createdAt,
        type: 'Wastage & Spoilage',
        referenceNumber: w.wastageNumber || 'WASTE',
        machineOrEntity: w.machine?.name || 'Floor Spoilage',
        stageOrDetails: `${w.stage || 'Print'} • ${itmCount} waste line(s)`,
        quantity: (w.items || []).reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0),
        cost: totalCost,
        status: w.status || 'reported'
      });
    });

    maintenances.slice(0, 30).forEach((m) => {
      unifiedLog.push({
        id: m._id,
        date: m.createdAt,
        type: 'Machine Maintenance',
        referenceNumber: m.ticketNumber || 'MAINT',
        machineOrEntity: m.machine?.name || 'Machine Ticket',
        stageOrDetails: `${m.maintenanceType || 'repair'} • ${m.description || ''}`,
        quantity: 0,
        cost: m.cost || 0,
        status: m.status
      });
    });

    unifiedLog.sort((a, b) => new Date(b.date) - new Date(a.date));

    return sendSuccess(res, 'Production and machine operations report generated', {
      timeframe,
      range: { startDate: start.toISOString(), endDate: end.toISOString() },
      summary: {
        totalJobsCount,
        completedJobsCount,
        inProgressJobsCount,
        onHoldJobsCount,
        totalPlannedQuantity,
        totalCompletedQuantity,
        totalMachines,
        machineStatusMap,
        machineUptimePercent,
        totalMaintenanceTickets,
        activeMaintenanceCount,
        totalMaintenanceCost,
        totalWastageRecords,
        totalWastedQuantity,
        totalWastageCost
      },
      analytics: {
        jobsByStatus,
        jobsByStage,
        wastageByReason,
        wastageByStage,
        machineFleet: machines.map((m) => ({
          id: m._id,
          code: m.machineCode,
          name: m.name,
          category: m.category,
          status: m.status
        }))
      },
      unifiedLog
    });
  } catch (error) {
    console.error('Failed to generate production report:', error);
    return sendError(res, 'Failed to generate production report', 500, error);
  }
};

/**
 * =============================================================
 * 5. FINANCE & GENERAL LEDGER REPORT
 * =============================================================
 */
export const getFinanceReport = async (req, res) => {
  try {
    const { timeframe = 'monthly', startDate, endDate } = req.query;
    const { start, end } = parseDateRange(timeframe, startDate, endDate);
    const dateQuery = { $gte: start, $lte: end };

    // 1. Revenue from Invoices
    const invoices = await Invoice.find({ issueDate: dateQuery }).lean();
    let totalGrossRevenue = 0;
    let totalVatCollected = 0;
    let totalPaymentsReceived = 0;

    invoices.forEach((inv) => {
      totalGrossRevenue += Number(inv.grandTotal || 0);
      totalVatCollected += Number(inv.taxAmount || 0);
      totalPaymentsReceived += Number(inv.paidAmount || 0);
    });

    // 2. Accounts Payable & Supplier Bills
    const bills = await SupplierBill.find({ billDate: dateQuery })
      .populate('supplier', 'supplierName supplierCode')
      .sort({ billDate: -1 })
      .lean();

    let totalBillsAmount = 0;
    let totalBillsPaid = 0;
    let totalBillsOutstanding = 0;
    const apAging = { current: 0, thirtyDays: 0, sixtyDaysPlus: 0 };

    bills.forEach((b) => {
      const gTotal = Number(b.financials?.grandTotal || 0);
      const paid = Number(b.financials?.paidAmount || 0);
      const rem = Number(b.financials?.remainingBalance || Math.max(0, gTotal - paid));
      totalBillsAmount += gTotal;
      totalBillsPaid += paid;
      totalBillsOutstanding += rem;

      const daysOverdue = Math.floor((Date.now() - new Date(b.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysOverdue <= 0) apAging.current += rem;
      else if (daysOverdue <= 30) apAging.thirtyDays += rem;
      else apAging.sixtyDaysPlus += rem;
    });

    // 3. Operating Expenses from Expense Vouchers
    const expenses = await ExpenseVoucher.find({ expenseDate: dateQuery })
      .populate('expenseAccount', 'accountName accountCode')
      .lean();

    let totalOperatingExpenses = 0;
    const expensesByCostCenterMap = {};

    expenses.forEach((exp) => {
      const net = Number(exp.netPaidAmount || exp.amount || 0);
      totalOperatingExpenses += net;
      const cc = exp.costCenter || 'administration';
      expensesByCostCenterMap[cc] = (expensesByCostCenterMap[cc] || 0) + net;
    });

    const expensesByCostCenter = Object.entries(expensesByCostCenterMap).map(([name, amount]) => ({ name, amount }));

    // 4. Cash & Bank Accounts Liquid Reserves
    const bankAccounts = await BankAccount.find({ isActive: true }).lean();
    let totalBankReserves = 0;
    bankAccounts.forEach((ba) => {
      totalBankReserves += Number(ba.currentBalance || 0);
    });

    // 5. Tax Compliance Records
    const taxRecords = await TaxPeriodRecord.find({ periodStart: dateQuery }).lean();
    let totalVatPayable = 0;
    let totalWithholdingTaxPayable = 0;
    let totalPayrollTaxPayable = 0;

    taxRecords.forEach((tr) => {
      totalVatPayable += Number(tr.vatPayable || 0);
      totalWithholdingTaxPayable += Number(tr.withholdingTaxPayable || 0);
      totalPayrollTaxPayable += Number(tr.payrollTaxPayable || 0);
    });

    // 6. Journal Entries Summary
    const journalEntriesCount = await JournalEntry.countDocuments({ entryDate: dateQuery });

    // Net Financial Calculations
    const grossProfit = totalGrossRevenue - totalBillsAmount;
    const netOperatingProfit = grossProfit - totalOperatingExpenses;

    // Unified Finance Log
    const unifiedLog = [];
    bills.slice(0, 40).forEach((b) => {
      unifiedLog.push({
        id: b._id,
        date: b.billDate,
        type: 'Supplier Bill (AP)',
        referenceNumber: b.billNumber,
        party: b.supplier?.supplierName || 'Vendor',
        category: 'Procurement & Inventory',
        amount: b.financials?.grandTotal || 0,
        vat: b.financials?.vatAmount || 0,
        status: b.paymentStatus
      });
    });

    expenses.slice(0, 40).forEach((exp) => {
      unifiedLog.push({
        id: exp._id,
        date: exp.expenseDate,
        type: 'Expense Voucher',
        referenceNumber: exp.voucherNumber,
        party: exp.vendorName || 'Service Provider',
        category: exp.costCenter || 'Operating Expense',
        amount: exp.netPaidAmount || exp.amount || 0,
        vat: exp.vatAmount || 0,
        status: exp.status || 'approved'
      });
    });

    invoices.slice(0, 30).forEach((inv) => {
      unifiedLog.push({
        id: inv._id,
        date: inv.issueDate,
        type: 'Customer Invoice (AR)',
        referenceNumber: inv.invoiceNumber,
        party: 'Customer Revenue',
        category: 'Sales Revenue',
        amount: inv.grandTotal || 0,
        vat: inv.taxAmount || 0,
        status: inv.paymentStatus
      });
    });

    unifiedLog.sort((a, b) => new Date(b.date) - new Date(a.date));

    return sendSuccess(res, 'Finance general ledger and financial statements report generated', {
      timeframe,
      range: { startDate: start.toISOString(), endDate: end.toISOString() },
      summary: {
        totalGrossRevenue,
        totalVatCollected,
        totalPaymentsReceived,
        totalBillsAmount,
        totalBillsPaid,
        totalBillsOutstanding,
        totalOperatingExpenses,
        grossProfit,
        netOperatingProfit,
        totalBankReserves,
        totalVatPayable,
        totalWithholdingTaxPayable,
        totalPayrollTaxPayable,
        journalEntriesCount
      },
      analytics: {
        apAging,
        expensesByCostCenter,
        bankAccounts: bankAccounts.map((b) => ({
          id: b._id,
          bankName: b.bankName,
          accountNumber: b.accountNumber,
          balance: b.currentBalance,
          currency: b.currency
        }))
      },
      unifiedLog
    });
  } catch (error) {
    console.error('Failed to generate finance report:', error);
    return sendError(res, 'Failed to generate finance report', 500, error);
  }
};

